package handler

import (
	"encoding/json"
	"fmt"
	"hash/fnv"
	"math/rand"
	"net/http"
	"sort"
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
	Question    int    `json:"question"`
	QuestionID  string `json:"questionId,omitempty"`
	Section     string `json:"section"`
	Prompt      string `json:"prompt,omitempty"`
	Explanation string `json:"explanation,omitempty"`
	Expected    string `json:"expected"`
	Received    string `json:"received"`
	Correct     bool   `json:"correct"`
	// TimeSpent is the seconds the user spent on this question during the
	// simulator run. Zero means the question was never visited or the run
	// predates per-question time tracking. Only populated for full_mock.
	TimeSpent int `json:"timeSpent,omitempty"`
}

type nuetAttemptResponse struct {
	models.NUETAttempt
	TopicSlug      string                 `json:"topicSlug,omitempty"`
	TopicTitle     string                 `json:"topicTitle,omitempty"`
	PDFTestName    string                 `json:"pdfTestName,omitempty"`
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
	Answer      string   `json:"answer"`
	Explanation string   `json:"explanation"`
}

type nuetAttemptNames struct {
	TopicSlug   string
	TopicTitle  string
	PDFTestName string
}

type nuetPracticeAnswerInput struct {
	QuestionID string `json:"questionId"`
	Choice     string `json:"choice"`
}

type nuetPracticeAttemptRequest struct {
	TopicSlug string                    `json:"topicSlug"`
	Answers   []nuetPracticeAnswerInput `json:"answers"`
}

type nuetPDFTestAttemptRequest struct {
	PDFTestID string   `json:"pdfTestId"`
	Answers   []string `json:"answers"`
}

type nuetSimulatorStartRequest struct {
	Section string `json:"section"`
	Strict  bool   `json:"strict"`
}

type nuetSimulatorSaveRequest struct {
	Answers       map[string]string `json:"answers"`
	Marked        []string          `json:"marked"`
	TimeTakenSecs int               `json:"timeTakenSecs"`
	// TimePerAnswer maps questionID → seconds spent on that question. The
	// frontend accumulates this client-side; we just persist it. Optional —
	// older clients may omit the field entirely.
	TimePerAnswer map[string]int `json:"timePerAnswer,omitempty"`
}

type nuetSimulatorCompleteRequest struct {
	Answers       map[string]string `json:"answers"`
	Marked        []string          `json:"marked"`
	TimeTakenSecs int               `json:"timeTakenSecs"`
	TimePerAnswer map[string]int    `json:"timePerAnswer,omitempty"`
}

type nuetSimulatorQuestion struct {
	ID         string   `json:"id"`
	Number     int      `json:"number"`
	Section    string   `json:"section"`
	Difficulty string   `json:"difficulty"`
	Prompt     string   `json:"prompt"`
	Options    []string `json:"options"`
}

type nuetMockResultItem struct {
	QuestionID  string `json:"questionId"`
	Expected    string `json:"expected"`
	Given       string `json:"given"`
	Correct     bool   `json:"correct"`
	Explanation string `json:"explanation"`
}

type nuetMockStartResponse struct {
	Attempt         nuetAttemptResponse     `json:"attempt"`
	TestName        string                  `json:"testName"`
	Questions       []nuetSimulatorQuestion `json:"questions"`
	DurationMinutes int                     `json:"durationMinutes"`
}

type nuetMockSaveRequest struct {
	Answers       map[string]string `json:"answers"`
	TimeTakenSecs int               `json:"timeTakenSecs"`
}

type nuetMockCompleteRequest struct {
	Answers       map[string]string `json:"answers"`
	TimeTakenSecs int               `json:"timeTakenSecs"`
}

type nuetMockCompleteResponse struct {
	Attempt nuetAttemptResponse  `json:"attempt"`
	Results []nuetMockResultItem `json:"results"`
}

type nuetSimulatorStartResponse struct {
	Attempt         nuetAttemptResponse     `json:"attempt"`
	Questions       []nuetSimulatorQuestion `json:"questions"`
	DurationMinutes int                     `json:"durationMinutes"`
	StrictMode      bool                    `json:"strictMode"`
}

type nuetSimulatorState struct {
	Responses     map[string]string `json:"responses"`
	Marked        []string          `json:"marked,omitempty"`
	TimePerAnswer map[string]int    `json:"timePerAnswer,omitempty"`
}

type nuetLogViolationRequest struct {
	Type    string `json:"type"`
	Details string `json:"details"`
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
			Answer:      normalizeAnswerLetter(question.Answer),
			Explanation: question.Explanation,
		})
	}

	resp := map[string]any{"items": items}
	if topic.ID != "" {
		resp["topic"] = topic
	}
	jsonOK(w, resp)
}

// GET /nuet/daily-challenge[?date=YYYY-MM-DD]
//
// Returns a deterministic 3-question set for the given user/date so that all
// of today's sessions share the same picks. The mix is 2 Math + 1 Critical
// Thinking when both pools are populated; otherwise it falls back to whatever
// is available. userID may be empty (guest); guests share one daily set.
func (h *NUETHandler) DailyChallenge(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())

	dateStr := strings.TrimSpace(r.URL.Query().Get("date"))
	if dateStr == "" {
		dateStr = time.Now().UTC().Format("2006-01-02")
	} else if _, err := time.Parse("2006-01-02", dateStr); err != nil {
		jsonErr(w, "invalid date (expect YYYY-MM-DD)", http.StatusBadRequest)
		return
	}

	seed := dailyChallengeSeed(userID, dateStr)

	mathIDs, err := h.loadDailyChallengeIDs("math")
	if err != nil {
		jsonErr(w, "failed to load math pool", http.StatusInternalServerError)
		return
	}
	ctIDs, err := h.loadDailyChallengeIDs("critical_thinking")
	if err != nil {
		jsonErr(w, "failed to load CT pool", http.StatusInternalServerError)
		return
	}

	pickedIDs := pickDailyChallengeIDs(mathIDs, ctIDs, seed, 3)
	if len(pickedIDs) == 0 {
		jsonOK(w, map[string]any{"date": dateStr, "questions": []any{}})
		return
	}

	var questions []models.NUETQuestion
	if err := h.db.Where("id IN ?", pickedIDs).Find(&questions).Error; err != nil {
		jsonErr(w, "failed to load daily questions", http.StatusInternalServerError)
		return
	}

	byID := make(map[string]models.NUETQuestion, len(questions))
	for _, q := range questions {
		byID[q.ID] = q
	}
	items := make([]nuetQuestionItem, 0, len(pickedIDs))
	for _, id := range pickedIDs {
		question, ok := byID[id]
		if !ok {
			continue
		}
		items = append(items, nuetQuestionItem{
			ID:          question.ID,
			TopicID:     derefNUETString(question.TopicID),
			Section:     question.Section,
			Difficulty:  question.Difficulty,
			Prompt:      question.Prompt,
			Options:     parseNUETStringArray(question.Options),
			Answer:      normalizeAnswerLetter(question.Answer),
			Explanation: question.Explanation,
		})
	}

	jsonOK(w, map[string]any{"date": dateStr, "questions": items})
}

func (h *NUETHandler) loadDailyChallengeIDs(section string) ([]string, error) {
	var ids []string
	if err := h.db.Table("nuet_questions").
		Where("section = ?", section).
		Pluck("id", &ids).Error; err != nil {
		return nil, err
	}
	return ids, nil
}

// dailyChallengeSeed mixes user identity and the date into a 64-bit seed so
// the same (user, day) returns the same 3 questions, while different days or
// different users get a fresh shuffle.
func dailyChallengeSeed(userID, dateStr string) int64 {
	hasher := fnv.New64a()
	hasher.Write([]byte(userID))
	hasher.Write([]byte{'|'})
	hasher.Write([]byte(dateStr))
	return int64(hasher.Sum64())
}

// pickDailyChallengeIDs returns up to `total` question IDs, preferring a
// 2-math + 1-CT mix when both pools are available. Falls back to whichever
// pool has questions when one is empty.
func pickDailyChallengeIDs(mathIDs, ctIDs []string, seed int64, total int) []string {
	rng := rand.New(rand.NewSource(seed))

	mathPool := append([]string(nil), mathIDs...)
	ctPool := append([]string(nil), ctIDs...)
	rng.Shuffle(len(mathPool), func(i, j int) { mathPool[i], mathPool[j] = mathPool[j], mathPool[i] })
	rng.Shuffle(len(ctPool), func(i, j int) { ctPool[i], ctPool[j] = ctPool[j], ctPool[i] })

	mathQuota := 2
	ctQuota := 1
	if total < mathQuota+ctQuota {
		mathQuota = total
		ctQuota = 0
	}

	out := make([]string, 0, total)
	if len(mathPool) >= mathQuota {
		out = append(out, mathPool[:mathQuota]...)
		mathPool = mathPool[mathQuota:]
	} else {
		out = append(out, mathPool...)
		mathPool = nil
	}
	if len(ctPool) >= ctQuota {
		out = append(out, ctPool[:ctQuota]...)
		ctPool = ctPool[ctQuota:]
	} else {
		out = append(out, ctPool...)
		ctPool = nil
	}

	for len(out) < total {
		if len(mathPool) > 0 {
			out = append(out, mathPool[0])
			mathPool = mathPool[1:]
			continue
		}
		if len(ctPool) > 0 {
			out = append(out, ctPool[0])
			ctPool = ctPool[1:]
			continue
		}
		break
	}
	return out
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
		validKeyCount := countNUETAnswerKeys(keys)
		items = append(items, nuetPDFTestItem{
			ID:             test.ID,
			Name:           test.Name,
			TestType:       test.TestType,
			PDFPath:        test.PDFPath,
			MathCount:      test.MathCount,
			CTCount:        test.CTCount,
			QuestionCount:  questionCount,
			AnswerKeyCount: validKeyCount,
			IsScorable:     len(keys) == questionCount && validKeyCount == questionCount,
		})
	}

	jsonOK(w, map[string]any{"items": items})
}

// GET /nuet/pdf-tests/:id
func (h *NUETHandler) GetPDFTest(w http.ResponseWriter, r *http.Request) {
	testID := strings.TrimSpace(r.PathValue("id"))
	if testID == "" {
		jsonErr(w, "missing id", http.StatusBadRequest)
		return
	}

	var test models.NUETPDFTest
	if err := h.db.Where("id = ?", testID).First(&test).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			jsonErr(w, "pdf test not found", http.StatusNotFound)
			return
		}
		jsonErr(w, "failed to load pdf test", http.StatusInternalServerError)
		return
	}

	keys := parseNUETAnswerKeys(test.AnswerKeys)
	questionCount := test.MathCount + test.CTCount
	validKeyCount := countNUETAnswerKeys(keys)
	jsonOK(w, nuetPDFTestItem{
		ID:             test.ID,
		Name:           test.Name,
		TestType:       test.TestType,
		PDFPath:        test.PDFPath,
		MathCount:      test.MathCount,
		CTCount:        test.CTCount,
		QuestionCount:  questionCount,
		AnswerKeyCount: validKeyCount,
		IsScorable:     len(keys) == questionCount && validKeyCount == questionCount,
	})
}

// POST /nuet/mock/:id/start
func (h *NUETHandler) StartMockAttempt(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	testID := strings.TrimSpace(r.PathValue("id"))
	if testID == "" {
		writeError(w, http.StatusBadRequest, "id required", nil)
		return
	}

	var test models.NUETPDFTest
	if err := h.db.Where("id = ?", testID).First(&test).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			writeError(w, http.StatusNotFound, "pdf test not found", nil)
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to load pdf test", err)
		return
	}

	expectedCount := test.MathCount + test.CTCount
	if expectedCount == 0 {
		expectedCount = 60
	}
	questions, err := h.loadNUETQuestionsByPDFTestID(test.ID, expectedCount)
	if err != nil {
		writeError(w, http.StatusConflict, err.Error(), nil)
		return
	}

	questionIDs := make([]string, 0, len(questions))
	items := make([]nuetSimulatorQuestion, 0, len(questions))
	for index, question := range questions {
		number := index + 1
		if question.Position > 0 {
			number = question.Position
		}
		questionIDs = append(questionIDs, question.ID)
		items = append(items, nuetSimulatorQuestion{
			ID:         question.ID,
			Number:     number,
			Section:    question.Section,
			Difficulty: question.Difficulty,
			Prompt:     question.Prompt,
			Options:    parseNUETStringArray(question.Options),
		})
	}

	stateJSON := marshalNUETJSON(map[string]string{})
	questionSetJSON := marshalNUETJSON(questionIDs)
	resultsJSON := marshalNUETJSON([]nuetMockResultItem{})
	testIDRef := test.ID
	attempt := models.NUETAttempt{
		UserID:        userID,
		AttemptType:   "full_mock",
		PDFTestID:     &testIDRef,
		Section:       "full",
		Status:        "in_progress",
		Answers:       &stateJSON,
		QuestionSet:   &questionSetJSON,
		Results:       &resultsJSON,
		TimeTakenSecs: 0,
	}
	if err := h.db.Create(&attempt).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create mock attempt", err)
		return
	}

	writeJSON(w, http.StatusCreated, nuetMockStartResponse{
		Attempt:         buildNUETAttemptResponse(attempt, nil, &nuetScoreMeta{ScoreAvailable: false}, &nuetAttemptNames{PDFTestName: test.Name}),
		TestName:        test.Name,
		Questions:       items,
		DurationMinutes: 120,
	})
}

// PUT /nuet/mock/attempts/:attemptId/save
func (h *NUETHandler) SaveMockAttempt(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	attemptID := strings.TrimSpace(r.PathValue("attemptId"))
	if attemptID == "" {
		writeError(w, http.StatusBadRequest, "attemptId required", nil)
		return
	}

	var req nuetMockSaveRequest
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
	if attempt.PDFTestID == nil || *attempt.PDFTestID == "" {
		writeError(w, http.StatusConflict, "attempt is not a PDF mock attempt", nil)
		return
	}

	answersJSON := marshalNUETJSON(normalizeNUETResponseMap(req.Answers))
	now := time.Now()
	if err := h.db.Model(&attempt).Updates(map[string]any{
		"answers":         &answersJSON,
		"time_taken_secs": req.TimeTakenSecs,
		"last_saved_at":   &now,
	}).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save attempt", err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"saved":       true,
		"lastSavedAt": now,
	})
}

// POST /nuet/mock/attempts/:attemptId/complete
func (h *NUETHandler) CompleteMockAttempt(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	attemptID := strings.TrimSpace(r.PathValue("attemptId"))
	if attemptID == "" {
		writeError(w, http.StatusBadRequest, "attemptId required", nil)
		return
	}

	var req nuetMockCompleteRequest
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
	if attempt.PDFTestID == nil || *attempt.PDFTestID == "" {
		writeError(w, http.StatusConflict, "attempt is not a PDF mock attempt", nil)
		return
	}

	answers := req.Answers
	if answers == nil {
		answers = parseNUETAnswers(attempt.Answers)
	}
	answers = normalizeNUETResponseMap(answers)

	questionIDs := parseNUETQuestionSet(attempt.QuestionSet)
	if len(questionIDs) == 0 {
		var fallback []models.NUETQuestion
		if err := h.db.Where("pdf_test_id = ?", *attempt.PDFTestID).Order("position ASC").Find(&fallback).Error; err != nil {
			writeError(w, http.StatusInternalServerError, "failed to load question set", err)
			return
		}
		for _, question := range fallback {
			questionIDs = append(questionIDs, question.ID)
		}
	}
	if len(questionIDs) == 0 {
		writeError(w, http.StatusConflict, "question set missing for attempt", nil)
		return
	}

	questionMap, err := h.loadNUETQuestionsByIDs(questionIDs)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load questions", err)
		return
	}
	score := scoreNUETSimulatorQuestions(questionMap, questionIDs, answers)
	results := make([]nuetMockResultItem, 0, len(score.Evaluations))
	for _, eval := range score.Evaluations {
		explanation := ""
		if question, ok := questionMap[eval.QuestionID]; ok {
			explanation = question.Explanation
		}
		results = append(results, nuetMockResultItem{
			QuestionID:  eval.QuestionID,
			Expected:    eval.Expected,
			Given:       eval.Received,
			Correct:     eval.Correct,
			Explanation: explanation,
		})
	}

	answersJSON := marshalNUETJSON(answers)
	// Persist evaluations in the same shape the simulator uses so the
	// /nuet/history/[attemptId] review page can read PDF-test attempts via
	// parseNUETStoredEvaluations. The response keeps the legacy `results`
	// array shape for backward compatibility.
	resultsJSON := marshalNUETJSON(map[string]any{
		"evaluations": score.Evaluations,
	})
	now := time.Now()
	if err := h.db.Model(&attempt).Updates(map[string]any{
		"answers":         &answersJSON,
		"results":         &resultsJSON,
		"status":          "completed",
		"time_taken_secs": req.TimeTakenSecs,
		"completed_at":    &now,
		"correct_math":    score.CorrectMath,
		"correct_ct":      score.CorrectCT,
		"score_math":      score.CorrectMath * 120 / 30,
		"score_ct":        score.CorrectCT * 120 / 30,
		"score_total":     (score.CorrectMath * 120 / 30) + (score.CorrectCT * 120 / 30),
	}).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to complete attempt", err)
		return
	}

	if err := h.db.Where("id = ?", attemptID).First(&attempt).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to reload attempt", err)
		return
	}

	names := h.lookupNUETAttemptNames(attempt)
	if names == nil {
		names = &nuetAttemptNames{}
	}
	if names.PDFTestName == "" {
		var test models.NUETPDFTest
		if err := h.db.Select("name").Where("id = ?", *attempt.PDFTestID).First(&test).Error; err == nil {
			names.PDFTestName = test.Name
		}
	}

	writeJSON(w, http.StatusOK, nuetMockCompleteResponse{
		Attempt: buildNUETAttemptResponse(attempt, score.Evaluations, &nuetScoreMeta{
			ScoreAvailable: true,
		}, names),
		Results: results,
	})
}

// POST /nuet/simulator/start
func (h *NUETHandler) StartSimulator(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var req nuetSimulatorStartRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	section, durationMinutes, err := normalizeNUETSimulatorSection(req.Section)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	questions, err := h.loadNUETSimulatorQuestionSet(section)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	questionIDs := make([]string, 0, len(questions))
	simulatorQuestions := make([]nuetSimulatorQuestion, 0, len(questions))
	for index, question := range questions {
		questionIDs = append(questionIDs, question.ID)
		simulatorQuestions = append(simulatorQuestions, nuetSimulatorQuestion{
			ID:         question.ID,
			Number:     index + 1,
			Section:    question.Section,
			Difficulty: question.Difficulty,
			Prompt:     question.Prompt,
			Options:    parseNUETStringArray(question.Options),
		})
	}

	stateJSON := marshalNUETJSON(nuetSimulatorState{
		Responses: map[string]string{},
		Marked:    []string{},
	})
	questionSetJSON := marshalNUETJSON(questionIDs)
	resultJSON := marshalNUETJSON(map[string]any{})
	attempt := models.NUETAttempt{
		UserID:        userID,
		AttemptType:   "full_mock",
		Section:       section,
		Status:        "in_progress",
		StrictMode:    req.Strict,
		Answers:       &stateJSON,
		QuestionSet:   &questionSetJSON,
		Results:       &resultJSON,
		TimeTakenSecs: 0,
	}

	if err := h.db.Create(&attempt).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create simulator attempt", err)
		return
	}

	writeJSON(w, http.StatusCreated, nuetSimulatorStartResponse{
		Attempt:         buildNUETAttemptResponse(attempt, nil, &nuetScoreMeta{ScoreAvailable: false}, nil),
		Questions:       simulatorQuestions,
		DurationMinutes: durationMinutes,
		StrictMode:      req.Strict,
	})
}

// GET /nuet/simulator/:attemptID
//
// Returns the in-progress simulator attempt with its question set, saved
// responses, marked-question IDs, and elapsed time so the client can pick
// up exactly where the user left off. Requires the attempt to belong to
// the caller and to still be in_progress; non-simulator attempts are
// rejected with 409.
func (h *NUETHandler) ResumeSimulator(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	attemptID := strings.TrimSpace(r.PathValue("attemptID"))
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
	if attempt.AttemptType != "full_mock" && attempt.AttemptType != "section_practice" {
		writeError(w, http.StatusConflict, "attempt is not a simulator run", nil)
		return
	}

	questionIDs := parseNUETStringArray(attempt.QuestionSet)
	if len(questionIDs) == 0 {
		writeError(w, http.StatusInternalServerError, "attempt has no question set", nil)
		return
	}

	questionMap, err := h.loadNUETQuestionsByIDs(questionIDs)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load simulator questions", err)
		return
	}

	simulatorQuestions := make([]nuetSimulatorQuestion, 0, len(questionIDs))
	for index, id := range questionIDs {
		question, ok := questionMap[id]
		if !ok {
			continue
		}
		simulatorQuestions = append(simulatorQuestions, nuetSimulatorQuestion{
			ID:         question.ID,
			Number:     index + 1,
			Section:    question.Section,
			Difficulty: question.Difficulty,
			Prompt:     question.Prompt,
			Options:    parseNUETStringArray(question.Options),
		})
	}

	state := parseNUETSimulatorState(attempt.Answers)
	_, durationMinutes, _ := normalizeNUETSimulatorSection(attempt.Section)

	writeJSON(w, http.StatusOK, map[string]any{
		"attempt":         buildNUETAttemptResponse(attempt, nil, &nuetScoreMeta{ScoreAvailable: false}, nil),
		"questions":       simulatorQuestions,
		"durationMinutes": durationMinutes,
		"strictMode":      attempt.StrictMode,
		"responses":       state.Responses,
		"marked":          state.Marked,
		"timePerAnswer":   state.TimePerAnswer,
		"timeTakenSecs":   attempt.TimeTakenSecs,
	})
}

// PUT /nuet/simulator/:attemptID/save
func (h *NUETHandler) SaveSimulator(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	attemptID := strings.TrimSpace(r.PathValue("attemptID"))
	if attemptID == "" {
		writeError(w, http.StatusBadRequest, "attemptID required", nil)
		return
	}

	var req nuetSimulatorSaveRequest
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

	stateJSON := marshalNUETJSON(nuetSimulatorState{
		Responses:     normalizeNUETResponseMap(req.Answers),
		Marked:        req.Marked,
		TimePerAnswer: sanitizeTimePerAnswer(req.TimePerAnswer),
	})
	now := time.Now()
	if err := h.db.Model(&attempt).Updates(map[string]any{
		"answers":         &stateJSON,
		"time_taken_secs": req.TimeTakenSecs,
		"last_saved_at":   &now,
	}).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save simulator", err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"saved":       true,
		"lastSavedAt": now,
	})
}

// PUT /nuet/simulator/:attemptID/complete
func (h *NUETHandler) CompleteSimulator(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	attemptID := strings.TrimSpace(r.PathValue("attemptID"))
	if attemptID == "" {
		writeError(w, http.StatusBadRequest, "attemptID required", nil)
		return
	}

	var req nuetSimulatorCompleteRequest
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

	questionIDs := parseNUETQuestionSet(attempt.QuestionSet)
	if len(questionIDs) == 0 {
		writeError(w, http.StatusConflict, "question set missing for simulator attempt", nil)
		return
	}

	state := parseNUETSimulatorState(attempt.Answers)
	if req.Answers != nil {
		state.Responses = normalizeNUETResponseMap(req.Answers)
	}
	if req.Marked != nil {
		state.Marked = req.Marked
	}
	if req.TimePerAnswer != nil {
		state.TimePerAnswer = sanitizeTimePerAnswer(req.TimePerAnswer)
	}

	questions, err := h.loadNUETQuestionsByIDs(questionIDs)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load simulator questions", err)
		return
	}
	result := scoreNUETSimulatorQuestions(questions, questionIDs, state.Responses)
	for i := range result.Evaluations {
		if t, ok := state.TimePerAnswer[result.Evaluations[i].QuestionID]; ok {
			result.Evaluations[i].TimeSpent = t
		}
	}

	stateJSON := marshalNUETJSON(state)
	resultsJSON := marshalNUETJSON(map[string]any{
		"evaluations": result.Evaluations,
	})
	now := time.Now()
	updates := map[string]any{
		"answers":         &stateJSON,
		"results":         &resultsJSON,
		"status":          "completed",
		"time_taken_secs": req.TimeTakenSecs,
		"completed_at":    &now,
		"correct_math":    result.CorrectMath,
		"correct_ct":      result.CorrectCT,
		"score_math":      result.ScoreMath,
		"score_ct":        result.ScoreCT,
		"score_total":     result.ScoreTotal,
	}
	if err := h.db.Model(&attempt).Updates(updates).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to complete simulator", err)
		return
	}

	if err := h.db.Where("id = ?", attemptID).First(&attempt).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to reload simulator attempt", err)
		return
	}

	writeJSON(w, http.StatusOK, buildNUETAttemptResponse(attempt, result.Evaluations, &nuetScoreMeta{
		ScoreAvailable: true,
	}, nil))
}

// POST /nuet/simulator/:attemptID/violations
func (h *NUETHandler) LogSimulatorViolation(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	attemptID := strings.TrimSpace(r.PathValue("attemptID"))
	if attemptID == "" {
		writeError(w, http.StatusBadRequest, "attemptID required", nil)
		return
	}

	var req nuetLogViolationRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	validTypes := map[string]bool{
		"tab_switch": true, "fullscreen_exit": true, "copy": true,
		"paste": true, "right_click": true, "dev_tools": true, "blur": true,
	}
	if !validTypes[req.Type] {
		writeError(w, http.StatusBadRequest, "invalid violation type", nil)
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
	if !attempt.StrictMode {
		writeError(w, http.StatusConflict, "strict mode is not enabled for this attempt", nil)
		return
	}

	var details *string
	if strings.TrimSpace(req.Details) != "" {
		value := strings.TrimSpace(req.Details)
		details = &value
	}
	violation := models.NUETViolation{
		AttemptID: attemptID,
		UserID:    userID,
		Type:      req.Type,
		Details:   details,
	}
	if err := h.db.Create(&violation).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to log violation", err)
		return
	}
	if err := h.db.Model(&attempt).Update("violation_count", gorm.Expr("violation_count + 1")).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update violation count", err)
		return
	}
	h.db.Select("violation_count").First(&attempt, "id = ?", attemptID)

	status := attempt.Status
	if attempt.ViolationCount >= 5 {
		now := time.Now()
		if err := h.db.Model(&attempt).Updates(map[string]any{
			"status":       "abandoned",
			"completed_at": &now,
		}).Error; err == nil {
			status = "abandoned"
		}
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"id":             violation.ID,
		"violationCount": attempt.ViolationCount,
		"status":         status,
	})
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

	writeJSON(w, http.StatusCreated, buildNUETAttemptResponse(attempt, nil, nil, nil))
}

// POST /nuet/attempts/practice
func (h *NUETHandler) SubmitPracticeAttempt(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var req nuetPracticeAttemptRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}
	req.TopicSlug = strings.TrimSpace(req.TopicSlug)
	if req.TopicSlug == "" {
		writeError(w, http.StatusBadRequest, "topicSlug is required", nil)
		return
	}

	var topic models.NUETTopic
	if err := h.db.Where("slug = ?", req.TopicSlug).First(&topic).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			writeError(w, http.StatusNotFound, "topic not found", nil)
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to load topic", err)
		return
	}

	var questions []models.NUETQuestion
	if err := h.db.Where("topic_id = ?", topic.ID).Order("created_at ASC").Find(&questions).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load topic questions", err)
		return
	}
	if len(questions) == 0 {
		writeError(w, http.StatusNotFound, "no questions found for this topic", nil)
		return
	}

	answersMap := make(map[string]string, len(req.Answers))
	for _, item := range req.Answers {
		questionID := strings.TrimSpace(item.QuestionID)
		if questionID == "" {
			continue
		}
		answersMap[questionID] = normalizeAnswerLetter(item.Choice)
	}

	result := scoreNUETTopicQuestions(questions, answersMap)
	encoded, _ := json.Marshal(answersMap)
	payload := string(encoded)
	now := time.Now()
	topicID := topic.ID
	attempt := models.NUETAttempt{
		UserID:        userID,
		AttemptType:   "topic_practice",
		TopicID:       &topicID,
		Section:       topic.Section,
		Status:        "completed",
		Answers:       &payload,
		CorrectMath:   result.CorrectMath,
		CorrectCT:     result.CorrectCT,
		ScoreMath:     result.ScoreMath,
		ScoreCT:       result.ScoreCT,
		ScoreTotal:    result.ScoreTotal,
		CompletedAt:   &now,
		TimeTakenSecs: 0,
	}

	if err := h.db.Create(&attempt).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save practice attempt", err)
		return
	}

	writeJSON(w, http.StatusCreated, buildNUETAttemptResponse(attempt, result.Evaluations, &nuetScoreMeta{
		ScoreAvailable: result.ScoreAvailable,
		ScoreReason:    result.ScoreReason,
	}, &nuetAttemptNames{
		TopicSlug:  topic.Slug,
		TopicTitle: topic.Title,
	}))
}

// POST /nuet/attempts/pdf-test
func (h *NUETHandler) SubmitPDFTestAttempt(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var req nuetPDFTestAttemptRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}
	req.PDFTestID = strings.TrimSpace(req.PDFTestID)
	if req.PDFTestID == "" {
		writeError(w, http.StatusBadRequest, "pdfTestId is required", nil)
		return
	}

	var test models.NUETPDFTest
	if err := h.db.Where("id = ?", req.PDFTestID).First(&test).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			writeError(w, http.StatusNotFound, "pdf test not found", nil)
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to load pdf test", err)
		return
	}

	answersMap := make(map[string]string, len(req.Answers))
	for i, choice := range req.Answers {
		answersMap[strconv.Itoa(i+1)] = normalizeAnswerLetter(choice)
	}

	result := scoreNUETPDFTest(test, answersMap)
	encoded, _ := json.Marshal(answersMap)
	payload := string(encoded)
	now := time.Now()
	pdfTestID := test.ID
	attempt := models.NUETAttempt{
		UserID:        userID,
		AttemptType:   "pdf_test",
		PDFTestID:     &pdfTestID,
		Section:       "full",
		Status:        "completed",
		Answers:       &payload,
		CorrectMath:   result.CorrectMath,
		CorrectCT:     result.CorrectCT,
		ScoreMath:     result.ScoreMath,
		ScoreCT:       result.ScoreCT,
		ScoreTotal:    result.ScoreTotal,
		CompletedAt:   &now,
		TimeTakenSecs: 0,
	}

	if err := h.db.Create(&attempt).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save pdf attempt", err)
		return
	}

	writeJSON(w, http.StatusCreated, buildNUETAttemptResponse(attempt, result.Evaluations, &nuetScoreMeta{
		ScoreAvailable: result.ScoreAvailable,
		ScoreReason:    result.ScoreReason,
	}, &nuetAttemptNames{
		PDFTestName: test.Name,
	}))
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
	}, h.lookupNUETAttemptNames(attempt)))
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
	names := h.lookupNUETAttemptNames(attempt)
	evaluations := parseNUETStoredEvaluations(attempt.Results)
	h.enrichNUETEvaluations(evaluations)
	writeJSON(w, http.StatusOK, buildNUETAttemptResponse(attempt, evaluations, meta, names))
}

// enrichNUETEvaluations fills missing Prompt/Section fields on evaluations
// by looking up the underlying question. This matters for legacy PDF-test
// attempts whose stored shape (nuetMockResultItem) did not include prompt
// or section. Mutates the slice in place.
func (h *NUETHandler) enrichNUETEvaluations(evaluations []nuetAnswerEvaluation) {
	if len(evaluations) == 0 {
		return
	}
	missing := make([]string, 0)
	for _, ev := range evaluations {
		if ev.QuestionID == "" {
			continue
		}
		if ev.Prompt == "" || ev.Section == "" {
			missing = append(missing, ev.QuestionID)
		}
	}
	if len(missing) == 0 {
		return
	}
	type qrow struct {
		ID      string
		Prompt  string
		Section string
	}
	var rows []qrow
	if err := h.db.Table("nuet_questions").
		Select("id, prompt, section").
		Where("id IN ?", missing).
		Scan(&rows).Error; err != nil {
		return
	}
	byID := make(map[string]qrow, len(rows))
	for _, row := range rows {
		byID[row.ID] = row
	}
	for i := range evaluations {
		row, ok := byID[evaluations[i].QuestionID]
		if !ok {
			continue
		}
		if evaluations[i].Prompt == "" {
			evaluations[i].Prompt = row.Prompt
		}
		if evaluations[i].Section == "" {
			evaluations[i].Section = row.Section
		}
	}
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
		items = append(items, buildNUETAttemptResponse(attempt, nil, h.lookupNUETScoreMeta(attempt), h.lookupNUETAttemptNames(attempt)))
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

	topicAccuracy := h.computeNUETTopicAccuracy(userID)
	weakTopics := pickNUETTopicsByAccuracy(topicAccuracy, 5, false, 1)
	strongTopics := pickNUETTopicsByAccuracy(topicAccuracy, 5, true, 3)

	jsonOK(w, map[string]any{
		"totalAttempts":     totalAttempts,
		"completedAttempts": completedAttempts,
		"bestScoreMath":     bestScore.BestMath,
		"bestScoreCT":       bestScore.BestCT,
		"bestScoreTotal":    bestScore.BestTotal,
		"recentAttempts":    recent,
		"topicCount":        topicCount,
		"materialCount":     materialCount,
		"weakTopics":        weakTopics,
		"strongTopics":      strongTopics,
	})
}

type nuetWeakTopic struct {
	Slug     string  `json:"slug"`
	Title    string  `json:"title"`
	Section  string  `json:"section"`
	Total    int     `json:"total"`
	Correct  int     `json:"correct"`
	Accuracy float64 `json:"accuracy"`
}

// computeNUETTopicAccuracy aggregates per-topic accuracy across all the user's
// completed attempts. The topic_id is taken from each question's row, not
// from the attempt itself, so this works for full mocks that span every
// topic. Returns every topic that has at least one sampled answer, unsorted.
// Callers pick the weakest/strongest via pickNUETTopicsByAccuracy.
func (h *NUETHandler) computeNUETTopicAccuracy(userID string) []nuetWeakTopic {
	var attempts []models.NUETAttempt
	if err := h.db.
		Select("id, results").
		Where("user_id = ? AND status = ? AND results IS NOT NULL", userID, "completed").
		Find(&attempts).Error; err != nil {
		return nil
	}
	if len(attempts) == 0 {
		return nil
	}

	type counter struct {
		correct int
		total   int
	}
	stats := map[string]*counter{}
	questionIDs := map[string]struct{}{}
	for _, a := range attempts {
		for _, ev := range parseNUETStoredEvaluations(a.Results) {
			if ev.QuestionID == "" {
				continue
			}
			questionIDs[ev.QuestionID] = struct{}{}
			cur := stats[ev.QuestionID]
			if cur == nil {
				cur = &counter{}
				stats[ev.QuestionID] = cur
			}
			cur.total++
			if ev.Correct {
				cur.correct++
			}
		}
	}
	if len(questionIDs) == 0 {
		return nil
	}

	ids := make([]string, 0, len(questionIDs))
	for id := range questionIDs {
		ids = append(ids, id)
	}
	type qrow struct {
		ID      string  `gorm:"column:id"`
		TopicID *string `gorm:"column:topic_id"`
	}
	var qrows []qrow
	if err := h.db.Table("nuet_questions").
		Select("id, topic_id").
		Where("id IN ?", ids).
		Scan(&qrows).Error; err != nil {
		return nil
	}
	questionTopic := make(map[string]string, len(qrows))
	for _, q := range qrows {
		if q.TopicID != nil && *q.TopicID != "" {
			questionTopic[q.ID] = *q.TopicID
		}
	}

	topicStats := map[string]*counter{}
	for qid, c := range stats {
		topicID, ok := questionTopic[qid]
		if !ok {
			continue
		}
		bucket := topicStats[topicID]
		if bucket == nil {
			bucket = &counter{}
			topicStats[topicID] = bucket
		}
		bucket.correct += c.correct
		bucket.total += c.total
	}
	if len(topicStats) == 0 {
		return nil
	}

	topicIDs := make([]string, 0, len(topicStats))
	for id := range topicStats {
		topicIDs = append(topicIDs, id)
	}
	var topics []models.NUETTopic
	if err := h.db.Select("id, slug, title, section").
		Where("id IN ?", topicIDs).
		Find(&topics).Error; err != nil {
		return nil
	}
	out := make([]nuetWeakTopic, 0, len(topics))
	for _, topic := range topics {
		bucket, ok := topicStats[topic.ID]
		if !ok || bucket.total == 0 {
			continue
		}
		out = append(out, nuetWeakTopic{
			Slug:     topic.Slug,
			Title:    topic.Title,
			Section:  topic.Section,
			Total:    bucket.total,
			Correct:  bucket.correct,
			Accuracy: float64(bucket.correct) / float64(bucket.total),
		})
	}
	return out
}

// pickNUETTopicsByAccuracy filters rows by minTotal and returns the top-N
// either descending (strongest first) or ascending (weakest first). Ties are
// broken by total sample count (more samples first) so a topic with one lucky
// answer doesn't outrank one with twenty.
func pickNUETTopicsByAccuracy(rows []nuetWeakTopic, limit int, descending bool, minTotal int) []nuetWeakTopic {
	if len(rows) == 0 {
		return nil
	}
	filtered := make([]nuetWeakTopic, 0, len(rows))
	for _, row := range rows {
		if row.Total >= minTotal {
			filtered = append(filtered, row)
		}
	}
	sort.Slice(filtered, func(i, j int) bool {
		if filtered[i].Accuracy != filtered[j].Accuracy {
			if descending {
				return filtered[i].Accuracy > filtered[j].Accuracy
			}
			return filtered[i].Accuracy < filtered[j].Accuracy
		}
		return filtered[i].Total > filtered[j].Total
	})
	if len(filtered) > limit {
		filtered = filtered[:limit]
	}
	return filtered
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
	if attempt.AttemptType == "full_mock" && attempt.Status == "completed" {
		return &nuetScoreMeta{ScoreAvailable: true}
	}
	if attempt.PDFTestID == nil || *attempt.PDFTestID == "" {
		return &nuetScoreMeta{ScoreAvailable: true}
	}

	var test models.NUETPDFTest
	if err := h.db.Select("answer_keys, math_count, ct_count").Where("id = ?", *attempt.PDFTestID).First(&test).Error; err != nil {
		return nil
	}

	total := test.MathCount + test.CTCount
	answerKeys := parseNUETAnswerKeys(test.AnswerKeys)
	if len(answerKeys) == total && countNUETAnswerKeys(answerKeys) == total {
		return &nuetScoreMeta{ScoreAvailable: true}
	}
	return &nuetScoreMeta{
		ScoreAvailable: false,
		ScoreReason:    "This PDF test does not have a complete answer key yet.",
	}
}

func (h *NUETHandler) lookupNUETAttemptNames(attempt models.NUETAttempt) *nuetAttemptNames {
	names := &nuetAttemptNames{}
	if attempt.TopicID != nil && *attempt.TopicID != "" {
		var topic models.NUETTopic
		if err := h.db.Select("slug, title").Where("id = ?", *attempt.TopicID).First(&topic).Error; err == nil {
			names.TopicSlug = topic.Slug
			names.TopicTitle = topic.Title
		}
	}
	if attempt.PDFTestID != nil && *attempt.PDFTestID != "" {
		var test models.NUETPDFTest
		if err := h.db.Select("name").Where("id = ?", *attempt.PDFTestID).First(&test).Error; err == nil {
			names.PDFTestName = test.Name
		}
	}
	if names.TopicSlug == "" && names.TopicTitle == "" && names.PDFTestName == "" {
		return nil
	}
	return names
}

func buildNUETAttemptResponse(
	attempt models.NUETAttempt,
	evaluations []nuetAnswerEvaluation,
	meta *nuetScoreMeta,
	names *nuetAttemptNames,
) nuetAttemptResponse {
	resp := nuetAttemptResponse{
		NUETAttempt: attempt,
		Evaluations: evaluations,
	}
	if names != nil {
		resp.TopicSlug = names.TopicSlug
		resp.TopicTitle = names.TopicTitle
		resp.PDFTestName = names.PDFTestName
	}
	if meta == nil {
		resp.ScoreAvailable = attempt.ScoreTotal > 0 || attempt.CorrectMath > 0 || attempt.CorrectCT > 0
		return resp
	}
	resp.ScoreAvailable = meta.ScoreAvailable
	resp.ScoreReason = meta.ScoreReason
	return resp
}

func (h *NUETHandler) loadNUETSimulatorQuestionSet(section string) ([]models.NUETQuestion, error) {
	loadRandom := func(section string, limit int) ([]models.NUETQuestion, error) {
		var items []models.NUETQuestion
		if err := h.db.Where("section = ?", section).Order("RANDOM()").Limit(limit).Find(&items).Error; err != nil {
			return nil, err
		}
		if len(items) < limit {
			return nil, gorm.ErrRecordNotFound
		}
		return items, nil
	}

	switch section {
	case "math":
		items, err := loadRandom("math", 30)
		if err != nil {
			return nil, errNUETSimulatorQuestionCount("math")
		}
		return items, nil
	case "critical_thinking":
		items, err := loadRandom("critical_thinking", 30)
		if err != nil {
			return nil, errNUETSimulatorQuestionCount("critical_thinking")
		}
		return items, nil
	default:
		mathQuestions, err := loadRandom("math", 30)
		if err != nil {
			return nil, errNUETSimulatorQuestionCount("math")
		}
		ctQuestions, err := loadRandom("critical_thinking", 30)
		if err != nil {
			return nil, errNUETSimulatorQuestionCount("critical_thinking")
		}
		return append(mathQuestions, ctQuestions...), nil
	}
}

func (h *NUETHandler) loadNUETQuestionsByIDs(ids []string) (map[string]models.NUETQuestion, error) {
	var questions []models.NUETQuestion
	if err := h.db.Where("id IN ?", ids).Find(&questions).Error; err != nil {
		return nil, err
	}
	byID := make(map[string]models.NUETQuestion, len(questions))
	for _, question := range questions {
		byID[question.ID] = question
	}
	return byID, nil
}

func (h *NUETHandler) loadNUETQuestionsByPDFTestID(pdfTestID string, expectedCount int) ([]models.NUETQuestion, error) {
	var questions []models.NUETQuestion
	if err := h.db.Where("pdf_test_id = ?", pdfTestID).Order("position ASC, created_at ASC").Find(&questions).Error; err != nil {
		return nil, err
	}
	if len(questions) != expectedCount {
		return nil, &nuetStaticError{
			message: fmt.Sprintf("expected %d extracted questions for this test, found %d", expectedCount, len(questions)),
		}
	}

	seen := make(map[int]bool, len(questions))
	for _, question := range questions {
		if question.Position < 1 || question.Position > expectedCount {
			return nil, &nuetStaticError{
				message: fmt.Sprintf("invalid question position %d in extracted set", question.Position),
			}
		}
		if seen[question.Position] {
			return nil, &nuetStaticError{
				message: fmt.Sprintf("duplicate question position %d in extracted set", question.Position),
			}
		}
		seen[question.Position] = true
	}
	for position := 1; position <= expectedCount; position++ {
		if !seen[position] {
			return nil, &nuetStaticError{
				message: fmt.Sprintf("missing extracted question position %d", position),
			}
		}
	}
	return questions, nil
}

func scoreNUETPDFTest(test models.NUETPDFTest, answers map[string]string) nuetScoreResult {
	keys := parseNUETAnswerKeys(test.AnswerKeys)
	totalQuestions := test.MathCount + test.CTCount
	if len(keys) != totalQuestions || countNUETAnswerKeys(keys) != totalQuestions {
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
			Question:    i + 1,
			QuestionID:  question.ID,
			Section:     question.Section,
			Prompt:      question.Prompt,
			Explanation: question.Explanation,
			Expected:    expected,
			Received:    received,
			Correct:     correct,
		})
	}

	result.ScoreMath = result.CorrectMath * 4
	result.ScoreCT = result.CorrectCT * 4
	result.ScoreTotal = result.ScoreMath + result.ScoreCT
	return result
}

func scoreNUETSimulatorQuestions(
	questionMap map[string]models.NUETQuestion,
	questionIDs []string,
	answers map[string]string,
) nuetScoreResult {
	result := nuetScoreResult{
		ScoreAvailable: true,
		Evaluations:    make([]nuetAnswerEvaluation, 0, len(questionIDs)),
	}

	for index, questionID := range questionIDs {
		question, ok := questionMap[questionID]
		if !ok {
			continue
		}
		expected := normalizeAnswerLetter(question.Answer)
		received := normalizeAnswerLetter(answers[questionID])
		correct := received != "" && received == expected
		if correct {
			if question.Section == "math" {
				result.CorrectMath++
			} else {
				result.CorrectCT++
			}
		}
		result.Evaluations = append(result.Evaluations, nuetAnswerEvaluation{
			Question:    index + 1,
			QuestionID:  question.ID,
			Section:     question.Section,
			Prompt:      question.Prompt,
			Explanation: question.Explanation,
			Expected:    expected,
			Received:    received,
			Correct:     correct,
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

// sanitizeTimePerAnswer drops bogus entries (negative values, zeros, empty
// keys) and caps each per-question time at the simulator's full duration so
// a client clock skew can't poison analytics. Returns nil when nothing
// useful survives — JSON marshaling will then omit the field entirely.
func sanitizeTimePerAnswer(in map[string]int) map[string]int {
	if len(in) == 0 {
		return nil
	}
	const maxPerQuestion = 120 * 60 // 120 minutes — the longest possible mock
	out := make(map[string]int, len(in))
	for qid, secs := range in {
		qid = strings.TrimSpace(qid)
		if qid == "" || secs <= 0 {
			continue
		}
		if secs > maxPerQuestion {
			secs = maxPerQuestion
		}
		out[qid] = secs
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func parseNUETSimulatorState(raw *string) nuetSimulatorState {
	state := nuetSimulatorState{
		Responses: map[string]string{},
		Marked:    []string{},
	}
	if raw == nil || strings.TrimSpace(*raw) == "" {
		return state
	}
	if err := json.Unmarshal([]byte(*raw), &state); err == nil {
		if state.Responses == nil {
			state.Responses = map[string]string{}
		}
		if state.Marked == nil {
			state.Marked = []string{}
		}
		return state
	}

	legacy := map[string]string{}
	if err := json.Unmarshal([]byte(*raw), &legacy); err == nil {
		state.Responses = normalizeNUETResponseMap(legacy)
	}
	return state
}

func parseNUETQuestionSet(raw *string) []string {
	if raw == nil || strings.TrimSpace(*raw) == "" {
		return nil
	}
	var ids []string
	if err := json.Unmarshal([]byte(*raw), &ids); err != nil {
		return nil
	}
	return ids
}

func parseNUETStoredEvaluations(raw *string) []nuetAnswerEvaluation {
	if raw == nil || strings.TrimSpace(*raw) == "" {
		return nil
	}
	// Preferred shape (simulator + new PDF attempts): {"evaluations": [...]}
	var payload struct {
		Evaluations []nuetAnswerEvaluation `json:"evaluations"`
	}
	if err := json.Unmarshal([]byte(*raw), &payload); err == nil && len(payload.Evaluations) > 0 {
		return payload.Evaluations
	}
	// Legacy PDF-test shape: top-level array of nuetMockResultItem. Convert
	// so callers see a single evaluation type. Prompt/section are absent in
	// this shape; the review page falls back gracefully.
	var legacy []nuetMockResultItem
	if err := json.Unmarshal([]byte(*raw), &legacy); err != nil {
		return nil
	}
	out := make([]nuetAnswerEvaluation, 0, len(legacy))
	for i, item := range legacy {
		out = append(out, nuetAnswerEvaluation{
			Question:    i + 1,
			QuestionID:  item.QuestionID,
			Expected:    item.Expected,
			Received:    item.Given,
			Explanation: item.Explanation,
			Correct:     item.Correct,
		})
	}
	return out
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
	for i, key := range keys {
		keys[i] = normalizeAnswerLetter(key)
	}
	return keys
}

func countNUETAnswerKeys(keys []string) int {
	count := 0
	for _, key := range keys {
		if key != "" {
			count++
		}
	}
	return count
}

func normalizeAnswerLetter(value string) string {
	value = strings.ToUpper(strings.TrimSpace(value))
	if value == "" {
		return ""
	}
	switch value[0] {
	case 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H':
		return value[:1]
	default:
		return ""
	}
}

func normalizeNUETResponseMap(in map[string]string) map[string]string {
	out := make(map[string]string, len(in))
	for key, value := range in {
		if strings.TrimSpace(key) == "" {
			continue
		}
		out[key] = normalizeAnswerLetter(value)
	}
	return out
}

func normalizeNUETSimulatorSection(section string) (string, int, error) {
	value := strings.ToLower(strings.TrimSpace(section))
	switch value {
	case "", "full":
		return "full", 120, nil
	case "math":
		return "math", 60, nil
	case "ct", "critical_thinking":
		return "critical_thinking", 60, nil
	default:
		return "", 0, errNUETInvalidSection()
	}
}

func errNUETInvalidSection() error {
	return &nuetStaticError{message: "section must be full, math, or ct"}
}

func errNUETSimulatorQuestionCount(section string) error {
	if section == "critical_thinking" {
		return &nuetStaticError{message: "not enough critical thinking questions to start the simulator"}
	}
	return &nuetStaticError{message: "not enough math questions to start the simulator"}
}

func marshalNUETJSON(value any) string {
	buf, _ := json.Marshal(value)
	return string(buf)
}

type nuetStaticError struct {
	message string
}

func (e *nuetStaticError) Error() string { return e.message }

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
