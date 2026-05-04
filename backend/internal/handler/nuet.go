package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// NUETHandler bundles all NUET endpoints. NUET (Nazarbayev University
// Entrance Test) has two sections: Mathematics and Critical Thinking,
// 30 MCQ each, 60 minutes per section, scored 0-120 per section.
type NUETHandler struct {
	db *gorm.DB
}

func NewNUET(db *gorm.DB) *NUETHandler {
	return &NUETHandler{db: db}
}

type nuetPDFTestItem struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	TestType       string `json:"testType"`
	PDFPath        string `json:"pdfPath"`
	MathCount      int    `json:"mathCount"`
	CTCount        int    `json:"ctCount"`
	QuestionCount  int    `json:"questionCount"`
	AnswerKeyCount int    `json:"answerKeyCount"`
	IsScorable     bool   `json:"isScorable"`
}

type nuetAnswerEvaluation struct {
	Question int    `json:"question"`
	Section  string `json:"section"`
	Expected string `json:"expected"`
	Received string `json:"received"`
	Correct  bool   `json:"correct"`
}

type nuetAttemptResponse struct {
	models.NUETAttempt
	ScoreAvailable bool                   `json:"scoreAvailable"`
	ScoreReason    string                 `json:"scoreReason,omitempty"`
	Evaluations    []nuetAnswerEvaluation `json:"evaluations,omitempty"`
}

type nuetQuestionItem struct {
	ID          string   `json:"id"`
	TopicID     string   `json:"topicId"`
	Section     string   `json:"section"`
	Difficulty  string   `json:"difficulty"`
	Prompt      string   `json:"prompt"`
	Options     []string `json:"options"`
	Explanation string   `json:"explanation"`
}

// ── Topics ───────────────────────────────────────────────────────────

// GET /nuet/topics?section=math|critical_thinking
func (h *NUETHandler) ListTopics(w http.ResponseWriter, r *http.Request) {
	q := h.db.Model(&models.NUETTopic{}).Order("section ASC, order_index ASC")
	if section := r.URL.Query().Get("section"); section != "" {
		q = q.Where("section = ?", section)
	}
	var topics []models.NUETTopic
	if err := q.Find(&topics).Error; err != nil {
		jsonErr(w, "failed to load topics", http.StatusInternalServerError)
		return
	}
	jsonOK(w, map[string]any{"items": topics})
}

// GET /nuet/topics/:slug
func (h *NUETHandler) GetTopic(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	if slug == "" {
		jsonErr(w, "missing slug", http.StatusBadRequest)
		return
	}
	var topic models.NUETTopic
	if err := h.db.Where("slug = ?", slug).First(&topic).Error; err != nil {
		jsonErr(w, "topic not found", http.StatusNotFound)
		return
	}
	jsonOK(w, topic)
}

// GET /nuet/questions?topicSlug=...&limit=20
func (h *NUETHandler) ListQuestions(w http.ResponseWriter, r *http.Request) {
	q := h.db.Model(&models.NUETQuestion{}).Order("created_at ASC")
	var topic models.NUETTopic

	if topicSlug := strings.TrimSpace(r.URL.Query().Get("topicSlug")); topicSlug != "" {
		if err := h.db.Where("slug = ?", topicSlug).First(&topic).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				jsonErr(w, "topic not found", http.StatusNotFound)
				return
			}
			jsonErr(w, "failed to load topic", http.StatusInternalServerError)
			return
		}
		q = q.Where("topic_id = ?", topic.ID)
	} else if topicID := strings.TrimSpace(r.URL.Query().Get("topicId")); topicID != "" {
		q = q.Where("topic_id = ?", topicID)
	}

	if section := strings.TrimSpace(r.URL.Query().Get("section")); section != "" {
		q = q.Where("section = ?", section)
	}

	limit := parseIntDefault(r.URL.Query().Get("limit"), 20, 1, 100)
	var questions []models.NUETQuestion
	if err := q.Limit(limit).Find(&questions).Error; err != nil {
		jsonErr(w, "failed to load questions", http.StatusInternalServerError)
		return
	}

	items := make([]nuetQuestionItem, 0, len(questions))
	for _, question := range questions {
		items = append(items, nuetQuestionItem{
			ID:          question.ID,
			TopicID:     derefNUETString(question.TopicID),
			Section:     question.Section,
			Difficulty:  question.Difficulty,
			Prompt:      question.Prompt,
			Options:     parseNUETStringArray(question.Options),
			Explanation: question.Explanation,
		})
	}

	resp := map[string]any{"items": items}
	if topic.ID != "" {
		resp["topic"] = topic
	}
	jsonOK(w, resp)
}

// ── PDF mock catalog ─────────────────────────────────────────────────

// GET /nuet/pdf-tests
func (h *NUETHandler) ListPDFTests(w http.ResponseWriter, r *http.Request) {
	var tests []models.NUETPDFTest
	if err := h.db.Order("test_type ASC, name ASC").Find(&tests).Error; err != nil {
		jsonErr(w, "failed to load pdf tests", http.StatusInternalServerError)
		return
	}

	items := make([]nuetPDFTestItem, 0, len(tests))
	for _, test := range tests {
		keys := parseNUETAnswerKeys(test.AnswerKeys)
		questionCount := test.MathCount + test.CTCount
		items = append(items, nuetPDFTestItem{
			ID:             test.ID,
			Name:           test.Name,
			TestType:       test.TestType,
			PDFPath:        test.PDFPath,
			MathCount:      test.MathCount,
			CTCount:        test.CTCount,
			QuestionCount:  questionCount,
			AnswerKeyCount: len(keys),
			IsScorable:     len(keys) == questionCount,
		})
	}

	jsonOK(w, map[string]any{"items": items})
}

// ── Materials (telegram_posts filtered by tags) ──────────────────────

type materialItem struct {
	ID             string   `json:"id"`
	TelegramPostID int64    `json:"telegramPostId"`
	Caption        string   `json:"caption"`
	Text           string   `json:"text"`
	FileName       string   `json:"fileName"`
	FilePath       string   `json:"filePath"`
	MimeType       string   `json:"mimeType"`
	HasMedia       bool     `json:"hasMedia"`
	Tags           []string `json:"tags"`
	PostDate       string   `json:"postDate"`
}

// GET /nuet/materials?section=math|critical_thinking|all&type=mock|book|notes|formulas&topic=algebra&limit=50&offset=0
func (h *NUETHandler) ListMaterials(w http.ResponseWriter, r *http.Request) {
	limit := parseIntDefault(r.URL.Query().Get("limit"), 50, 1, 200)
	offset := parseIntDefault(r.URL.Query().Get("offset"), 0, 0, 100000)

	relevantTags := []string{"nuet", "nuet_math", "nuet_critical_thinking", "tsa", "bmat"}

	q := h.db.Table("telegram_posts").
		Where("tags && ?", pgArray(relevantTags))

	switch r.URL.Query().Get("section") {
	case "math":
		q = q.Where("tags && ?", pgArray([]string{"nuet_math"}))
	case "critical_thinking":
		q = q.Where("tags && ?", pgArray([]string{"nuet_critical_thinking", "tsa", "bmat"}))
	}

	if t := r.URL.Query().Get("type"); t != "" {
		q = q.Where("tags && ?", pgArray([]string{"type_" + t}))
	}
	if topic := r.URL.Query().Get("topic"); topic != "" {
		q = q.Where("tags && ?", pgArray([]string{"topic_" + topic}))
	}
	if r.URL.Query().Get("withFile") == "true" {
		q = q.Where("has_media = true")
	}

	var total int64
	q.Count(&total)

	type row struct {
		ID             string
		TelegramPostID int64
		Caption        string
		Text           string
		FileName       string
		FilePath       string
		MimeType       string
		HasMedia       bool
		Tags           string
		PostDate       string
	}
	var rows []row
	if err := q.
		Select("id, telegram_post_id, caption, text, file_name, file_path, mime_type, has_media, tags::text AS tags, post_date::text AS post_date").
		Order("post_date DESC").
		Limit(limit).Offset(offset).
		Scan(&rows).Error; err != nil {
		jsonErr(w, "failed to load materials", http.StatusInternalServerError)
		return
	}

	items := make([]materialItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, materialItem{
			ID:             row.ID,
			TelegramPostID: row.TelegramPostID,
			Caption:        row.Caption,
			Text:           row.Text,
			FileName:       row.FileName,
			FilePath:       row.FilePath,
			MimeType:       row.MimeType,
			HasMedia:       row.HasMedia,
			Tags:           parsePGArray(row.Tags),
			PostDate:       row.PostDate,
		})
	}

	jsonOK(w, map[string]any{
		"items": items,
		"total": total,
	})
}

// ── Attempt lifecycle ────────────────────────────────────────────────

type nuetStartAttemptRequest struct {
	AttemptType string `json:"attemptType"`
	PDFTestID   string `json:"pdfTestId"`
	TopicID     string `json:"topicId"`
	Section     string `json:"section"`
}

// POST /nuet/attempts
func (h *NUETHandler) StartAttempt(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var req nuetStartAttemptRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	if req.PDFTestID != "" && req.AttemptType == "" {
		req.AttemptType = "pdf_test"
	}
	if req.AttemptType == "" {
		req.AttemptType = "full_mock"
	}
	validTypes := map[string]bool{
		"full_mock": true, "pdf_test": true,
		"topic_practice": true, "section_practice": true,
	}
	if !validTypes[req.AttemptType] {
		writeError(w, http.StatusBadRequest, "invalid attemptType", nil)
		return
	}

	if req.Section == "" {
		req.Section = "full"
	}
	validSections := map[string]bool{
		"full": true, "math": true, "critical_thinking": true,
	}
	if !validSections[req.Section] {
		writeError(w, http.StatusBadRequest, "invalid section", nil)
		return
	}

	var pdfTestID *string
	if req.PDFTestID != "" {
		var test models.NUETPDFTest
		if err := h.db.Select("id").Where("id = ?", req.PDFTestID).First(&test).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				writeError(w, http.StatusNotFound, "pdf test not found", nil)
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to load pdf test", err)
			return
		}
		pdfTestID = &test.ID
	}

	var topicID *string
	if req.TopicID != "" {
		var topic models.NUETTopic
		if err := h.db.Select("id").Where("id = ?", req.TopicID).First(&topic).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				writeError(w, http.StatusNotFound, "topic not found", nil)
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to load topic", err)
			return
		}
		topicID = &topic.ID
	}
	if req.AttemptType == "topic_practice" && topicID == nil {
		writeError(w, http.StatusBadRequest, "topicId is required for topic_practice", nil)
		return
	}
	if req.AttemptType == "pdf_test" && pdfTestID == nil {
		writeError(w, http.StatusBadRequest, "pdfTestId is required for pdf_test", nil)
		return
	}

	emptyAnswers := "{}"
	attempt := models.NUETAttempt{
		UserID:        userID,
		AttemptType:   req.AttemptType,
		PDFTestID:     pdfTestID,
		TopicID:       topicID,
		Section:       req.Section,
		Status:        "in_progress",
		Answers:       &emptyAnswers,
		TimeTakenSecs: 0,
	}

	if err := h.db.Create(&attempt).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create attempt", err)
		return
	}

	writeJSON(w, http.StatusCreated, buildNUETAttemptResponse(attempt, nil, nil))
}

type nuetAutoSaveRequest struct {
	Answers       map[string]string `json:"answers"`
	TimeTakenSecs int               `json:"timeTakenSecs"`
}

// PUT /nuet/attempts/:attemptID/save
func (h *NUETHandler) AutoSaveAttempt(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	attemptID := r.PathValue("attemptID")
	if attemptID == "" {
		writeError(w, http.StatusBadRequest, "attemptID required", nil)
		return
	}

	var req nuetAutoSaveRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	var attempt models.NUETAttempt
	if err := h.db.Where("id = ? AND user_id = ?", attemptID, userID).First(&attempt).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			writeError(w, http.StatusNotFound, "attempt not found", nil)
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to load attempt", err)
		return
	}
	if attempt.Status != "in_progress" {
		writeError(w, http.StatusConflict, "attempt is not in progress", nil)
		return
	}

	updates := map[string]any{
		"time_taken_secs": req.TimeTakenSecs,
	}
	if req.Answers != nil {
		encoded, _ := json.Marshal(req.Answers)
		payload := string(encoded)
		updates["answers"] = &payload
	}

	if err := h.db.Model(&attempt).Updates(updates).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save attempt", err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"saved": true})
}

type nuetCompleteAttemptRequest struct {
	Answers       map[string]string `json:"answers"`
	TimeTakenSecs int               `json:"timeTakenSecs"`
}

// PUT /nuet/attempts/:attemptID/complete
func (h *NUETHandler) CompleteAttempt(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	attemptID := r.PathValue("attemptID")
	if attemptID == "" {
		writeError(w, http.StatusBadRequest, "attemptID required", nil)
		return
	}

	var req nuetCompleteAttemptRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	var attempt models.NUETAttempt
	if err := h.db.Where("id = ? AND user_id = ?", attemptID, userID).First(&attempt).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			writeError(w, http.StatusNotFound, "attempt not found", nil)
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to load attempt", err)
		return
	}
	if attempt.Status != "in_progress" {
		writeError(w, http.StatusConflict, "attempt is not in progress", nil)
		return
	}

	answers := req.Answers
	if answers == nil {
		answers = parseNUETAnswers(attempt.Answers)
	}

	now := time.Now()
	updates := map[string]any{
		"status":          "completed",
		"time_taken_secs": req.TimeTakenSecs,
		"completed_at":    &now,
	}
	if answers != nil {
		encoded, _ := json.Marshal(answers)
		payload := string(encoded)
		updates["answers"] = &payload
	}

	var scoreReason string
	var evaluations []nuetAnswerEvaluation
	scoreAvailable := false

	if attempt.PDFTestID != nil && *attempt.PDFTestID != "" {
		var test models.NUETPDFTest
		if err := h.db.Where("id = ?", *attempt.PDFTestID).First(&test).Error; err != nil {
			writeError(w, http.StatusInternalServerError, "failed to load pdf test", err)
			return
		}

		result := scoreNUETPDFTest(test, answers)
		evaluations = result.Evaluations
		scoreAvailable = result.ScoreAvailable
		scoreReason = result.ScoreReason
		updates["correct_math"] = result.CorrectMath
		updates["correct_ct"] = result.CorrectCT
		updates["score_math"] = result.ScoreMath
		updates["score_ct"] = result.ScoreCT
		updates["score_total"] = result.ScoreTotal
	} else if attempt.AttemptType == "topic_practice" && attempt.TopicID != nil && *attempt.TopicID != "" {
		var questions []models.NUETQuestion
		if err := h.db.Where("topic_id = ?", *attempt.TopicID).Order("created_at ASC").Find(&questions).Error; err != nil {
			writeError(w, http.StatusInternalServerError, "failed to load topic questions", err)
			return
		}
		if len(questions) == 0 {
			scoreReason = "No practice questions are available for this topic yet."
		} else {
			result := scoreNUETTopicQuestions(questions, answers)
			evaluations = result.Evaluations
			scoreAvailable = result.ScoreAvailable
			scoreReason = result.ScoreReason
			updates["correct_math"] = result.CorrectMath
			updates["correct_ct"] = result.CorrectCT
			updates["score_math"] = result.ScoreMath
			updates["score_ct"] = result.ScoreCT
			updates["score_total"] = result.ScoreTotal
		}
	}

	if err := h.db.Model(&attempt).Updates(updates).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to complete attempt", err)
		return
	}

	if err := h.db.Where("id = ?", attemptID).First(&attempt).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to reload attempt", err)
		return
	}

	writeJSON(w, http.StatusOK, buildNUETAttemptResponse(attempt, evaluations, &nuetScoreMeta{
		ScoreAvailable: scoreAvailable,
		ScoreReason:    scoreReason,
	}))
}

// PUT /nuet/attempts/:attemptID/abandon
func (h *NUETHandler) AbandonAttempt(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	attemptID := r.PathValue("attemptID")
	if attemptID == "" {
		writeError(w, http.StatusBadRequest, "attemptID required", nil)
		return
	}

	var attempt models.NUETAttempt
	if err := h.db.Where("id = ? AND user_id = ?", attemptID, userID).First(&attempt).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			writeError(w, http.StatusNotFound, "attempt not found", nil)
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to load attempt", err)
		return
	}
	if attempt.Status != "in_progress" {
		writeError(w, http.StatusConflict, "attempt is not in progress", nil)
		return
	}

	now := time.Now()
	if err := h.db.Model(&attempt).Updates(map[string]any{
		"status":       "abandoned",
		"completed_at": &now,
	}).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to abandon attempt", err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "abandoned"})
}

// GET /nuet/attempts/:attemptID
func (h *NUETHandler) GetAttempt(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	attemptID := r.PathValue("attemptID")
	if attemptID == "" {
		writeError(w, http.StatusBadRequest, "attemptID required", nil)
		return
	}

	var attempt models.NUETAttempt
	if err := h.db.Where("id = ? AND user_id = ?", attemptID, userID).First(&attempt).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			writeError(w, http.StatusNotFound, "attempt not found", nil)
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to load attempt", err)
		return
	}

	meta := h.lookupNUETScoreMeta(attempt)
	writeJSON(w, http.StatusOK, buildNUETAttemptResponse(attempt, nil, meta))
}

// GET /nuet/attempts?status=in_progress|completed|abandoned
func (h *NUETHandler) ListAttempts(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	limit := parseIntDefault(r.URL.Query().Get("limit"), 20, 1, 100)
	offset := parseIntDefault(r.URL.Query().Get("offset"), 0, 0, 100000)

	q := h.db.Where("user_id = ?", userID).Order("created_at DESC")
	if status := r.URL.Query().Get("status"); status != "" {
		q = q.Where("status = ?", status)
	}
	if attemptType := r.URL.Query().Get("attemptType"); attemptType != "" {
		q = q.Where("attempt_type = ?", attemptType)
	}

	var attempts []models.NUETAttempt
	if err := q.Limit(limit).Offset(offset).Find(&attempts).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list attempts", err)
		return
	}

	var total int64
	countQ := h.db.Model(&models.NUETAttempt{}).Where("user_id = ?", userID)
	if status := r.URL.Query().Get("status"); status != "" {
		countQ = countQ.Where("status = ?", status)
	}
	if attemptType := r.URL.Query().Get("attemptType"); attemptType != "" {
		countQ = countQ.Where("attempt_type = ?", attemptType)
	}
	countQ.Count(&total)

	items := make([]nuetAttemptResponse, 0, len(attempts))
	for _, attempt := range attempts {
		items = append(items, buildNUETAttemptResponse(attempt, nil, h.lookupNUETScoreMeta(attempt)))
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"attempts": items,
		"total":    total,
		"limit":    limit,
		"offset":   offset,
	})
}

// ── User dashboard ───────────────────────────────────────────────────

// GET /nuet/dashboard
func (h *NUETHandler) GetDashboard(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		jsonErr(w, "authentication required", http.StatusUnauthorized)
		return
	}

	var totalAttempts int64
	var completedAttempts int64
	h.db.Model(&models.NUETAttempt{}).Where("user_id = ?", userID).Count(&totalAttempts)
	h.db.Model(&models.NUETAttempt{}).Where("user_id = ? AND status = ?", userID, "completed").Count(&completedAttempts)

	var bestScore struct {
		BestMath  int
		BestCT    int
		BestTotal int
	}
	h.db.Model(&models.NUETAttempt{}).
		Where("user_id = ? AND status = ?", userID, "completed").
		Select("COALESCE(MAX(score_math), 0) AS best_math, COALESCE(MAX(score_ct), 0) AS best_ct, COALESCE(MAX(score_total), 0) AS best_total").
		Scan(&bestScore)

	var recent []models.NUETAttempt
	h.db.Where("user_id = ?", userID).
		Order("started_at DESC").
		Limit(5).
		Find(&recent)

	var topicCount int64
	h.db.Model(&models.NUETTopic{}).Count(&topicCount)

	var materialCount int64
	h.db.Table("telegram_posts").
		Where("tags && ?", pgArray([]string{"nuet", "nuet_math", "nuet_critical_thinking", "tsa", "bmat"})).
		Where("has_media = true").
		Count(&materialCount)

	jsonOK(w, map[string]any{
		"totalAttempts":     totalAttempts,
		"completedAttempts": completedAttempts,
		"bestScoreMath":     bestScore.BestMath,
		"bestScoreCT":       bestScore.BestCT,
		"bestScoreTotal":    bestScore.BestTotal,
		"recentAttempts":    recent,
		"topicCount":        topicCount,
		"materialCount":     materialCount,
	})
}

// ── Helpers ──────────────────────────────────────────────────────────

type nuetScoreMeta struct {
	ScoreAvailable bool
	ScoreReason    string
}

type nuetScoreResult struct {
	ScoreAvailable bool
	ScoreReason    string
	CorrectMath    int
	CorrectCT      int
	ScoreMath      int
	ScoreCT        int
	ScoreTotal     int
	Evaluations    []nuetAnswerEvaluation
}

func (h *NUETHandler) lookupNUETScoreMeta(attempt models.NUETAttempt) *nuetScoreMeta {
	if attempt.PDFTestID == nil || *attempt.PDFTestID == "" {
		return &nuetScoreMeta{ScoreAvailable: true}
	}

	var test models.NUETPDFTest
	if err := h.db.Select("answer_keys, math_count, ct_count").Where("id = ?", *attempt.PDFTestID).First(&test).Error; err != nil {
		return nil
	}

	total := test.MathCount + test.CTCount
	answerKeys := parseNUETAnswerKeys(test.AnswerKeys)
	if len(answerKeys) == total {
		return &nuetScoreMeta{ScoreAvailable: true}
	}
	return &nuetScoreMeta{
		ScoreAvailable: false,
		ScoreReason:    "This PDF test does not have a complete answer key yet.",
	}
}

func buildNUETAttemptResponse(
	attempt models.NUETAttempt,
	evaluations []nuetAnswerEvaluation,
	meta *nuetScoreMeta,
) nuetAttemptResponse {
	resp := nuetAttemptResponse{
		NUETAttempt: attempt,
		Evaluations: evaluations,
	}
	if meta == nil {
		resp.ScoreAvailable = attempt.ScoreTotal > 0 || attempt.CorrectMath > 0 || attempt.CorrectCT > 0
		return resp
	}
	resp.ScoreAvailable = meta.ScoreAvailable
	resp.ScoreReason = meta.ScoreReason
	return resp
}

func scoreNUETPDFTest(test models.NUETPDFTest, answers map[string]string) nuetScoreResult {
	keys := parseNUETAnswerKeys(test.AnswerKeys)
	totalQuestions := test.MathCount + test.CTCount
	if len(keys) != totalQuestions {
		return nuetScoreResult{
			ScoreAvailable: false,
			ScoreReason:    "This PDF test does not have a complete answer key yet.",
		}
	}

	result := nuetScoreResult{
		ScoreAvailable: true,
		Evaluations:    make([]nuetAnswerEvaluation, 0, totalQuestions),
	}
	for i, expected := range keys {
		question := i + 1
		section := "math"
		if question > test.MathCount {
			section = "critical_thinking"
		}
		key := strconv.Itoa(question)
		received := normalizeAnswerLetter(answers[key])
		correct := received != "" && received == expected
		if correct {
			if section == "math" {
				result.CorrectMath++
			} else {
				result.CorrectCT++
			}
		}
		result.Evaluations = append(result.Evaluations, nuetAnswerEvaluation{
			Question: question,
			Section:  section,
			Expected: expected,
			Received: received,
			Correct:  correct,
		})
	}

	result.ScoreMath = result.CorrectMath * 4
	result.ScoreCT = result.CorrectCT * 4
	result.ScoreTotal = result.ScoreMath + result.ScoreCT
	return result
}

func scoreNUETTopicQuestions(questions []models.NUETQuestion, answers map[string]string) nuetScoreResult {
	result := nuetScoreResult{
		ScoreAvailable: true,
		Evaluations:    make([]nuetAnswerEvaluation, 0, len(questions)),
	}
	for i, question := range questions {
		expected := normalizeAnswerLetter(question.Answer)
		received := normalizeAnswerLetter(answers[question.ID])
		correct := received != "" && received == expected
		if correct {
			if question.Section == "math" {
				result.CorrectMath++
			} else {
				result.CorrectCT++
			}
		}
		result.Evaluations = append(result.Evaluations, nuetAnswerEvaluation{
			Question: i + 1,
			Section:  question.Section,
			Expected: expected,
			Received: received,
			Correct:  correct,
		})
	}

	result.ScoreMath = result.CorrectMath * 4
	result.ScoreCT = result.CorrectCT * 4
	result.ScoreTotal = result.ScoreMath + result.ScoreCT
	return result
}

func parseNUETAnswers(raw *string) map[string]string {
	if raw == nil || strings.TrimSpace(*raw) == "" {
		return nil
	}
	var answers map[string]string
	if err := json.Unmarshal([]byte(*raw), &answers); err != nil {
		return nil
	}
	return answers
}

func parseNUETStringArray(raw *string) []string {
	if raw == nil || strings.TrimSpace(*raw) == "" {
		return nil
	}
	var items []string
	if err := json.Unmarshal([]byte(*raw), &items); err == nil {
		return items
	}
	return strings.Split(*raw, "\n")
}

func parseNUETAnswerKeys(raw *string) []string {
	if raw == nil || strings.TrimSpace(*raw) == "" {
		return nil
	}
	var keys []string
	if err := json.Unmarshal([]byte(*raw), &keys); err != nil {
		return nil
	}
	out := make([]string, 0, len(keys))
	for _, key := range keys {
		if letter := normalizeAnswerLetter(key); letter != "" {
			out = append(out, letter)
		}
	}
	return out
}

func normalizeAnswerLetter(value string) string {
	value = strings.ToUpper(strings.TrimSpace(value))
	if value == "" {
		return ""
	}
	switch value[0] {
	case 'A', 'B', 'C', 'D', 'E':
		return value[:1]
	default:
		return ""
	}
}

func derefNUETString(value *string) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(*value)
}

func parseIntDefault(s string, def, min, max int) int {
	if s == "" {
		return def
	}
	n, err := strconv.Atoi(s)
	if err != nil || n < min || n > max {
		return def
	}
	return n
}

func pgArray(xs []string) string {
	if len(xs) == 0 {
		return "{}"
	}
	parts := make([]string, len(xs))
	for i, x := range xs {
		x = strings.ReplaceAll(x, `\`, `\\`)
		x = strings.ReplaceAll(x, `"`, `\"`)
		parts[i] = `"` + x + `"`
	}
	return "{" + strings.Join(parts, ",") + "}"
}

func parsePGArray(s string) []string {
	s = strings.TrimSpace(s)
	if s == "" || s == "{}" {
		return nil
	}
	s = strings.TrimPrefix(s, "{")
	s = strings.TrimSuffix(s, "}")
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		p = strings.Trim(p, `"`)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
