package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"github.com/midoriya/flashlearn-backend/internal/models"
)

type ieltsQuestionPayload struct {
	ID            string   `json:"id"`
	Section       string   `json:"section"`
	QuestionType  string   `json:"questionType"`
	Difficulty    string   `json:"difficulty"`
	MockType      string   `json:"mockType"`
	Topic         string   `json:"topic"`
	ExamSet       string   `json:"examSet"`
	QuestionGroup string   `json:"questionGroup"`
	Title         string   `json:"title"`
	Prompt        string   `json:"prompt"`
	Content       string   `json:"content"`
	AudioScript   string   `json:"audioScript"`
	Options       []string `json:"options,omitempty"`
	Answer        string   `json:"answer,omitempty"`
	Explanation   string   `json:"explanation,omitempty"`
	BandTarget    string   `json:"bandTarget,omitempty"`
	PassageNumber int      `json:"passageNumber"`
	SortOrder     int      `json:"sortOrder"`
}

type readingPassagePayload struct {
	PassageNumber int                    `json:"passageNumber"`
	Title         string                 `json:"title"`
	Content       string                 `json:"content"`
	Questions     []ieltsQuestionPayload `json:"questions"`
}

type ieltsMockSectionPayload struct {
	Key             string                  `json:"key"`
	Title           string                  `json:"title"`
	Instructions    string                  `json:"instructions"`
	DurationMinutes int                     `json:"durationMinutes"`
	Questions       []ieltsQuestionPayload  `json:"questions"`
	Passages        []readingPassagePayload `json:"passages,omitempty"`
}

type ieltsMockPayload struct {
	MockType      string                    `json:"mockType"`
	Section       string                    `json:"section"`
	BandTarget    string                    `json:"bandTarget,omitempty"`
	ExamSet       string                    `json:"examSet,omitempty"`
	Sections      []ieltsMockSectionPayload `json:"sections"`
	GeneratedByAI bool                      `json:"generatedByAI"`
}

func (h *IELTSExaminerHandler) GetQuestions(w http.ResponseWriter, r *http.Request) {
	query := h.db.Model(&models.IELTSQuestion{}).Order("sort_order ASC, created_at DESC")

	if section := strings.TrimSpace(r.URL.Query().Get("section")); section != "" {
		query = query.Where("section = ?", section)
	}
	if qType := strings.TrimSpace(r.URL.Query().Get("type")); qType != "" {
		query = query.Where("question_type = ?", qType)
	}
	if mockType := strings.TrimSpace(r.URL.Query().Get("mockType")); mockType != "" {
		query = query.Where("mock_type = ?", mockType)
	}
	if diff := strings.TrimSpace(r.URL.Query().Get("difficulty")); diff != "" {
		query = query.Where("difficulty = ?", diff)
	}
	if topic := strings.TrimSpace(r.URL.Query().Get("topic")); topic != "" {
		query = query.Where("topic = ?", topic)
	}
	if band := strings.TrimSpace(r.URL.Query().Get("band")); band != "" {
		query = query.Where("band_target = ? OR band_target IS NULL", band)
	}
	if examSet := strings.TrimSpace(r.URL.Query().Get("examSet")); examSet != "" {
		query = query.Where("exam_set = ?", examSet)
	}

	limit := 100
	if rawLimit := strings.TrimSpace(r.URL.Query().Get("limit")); rawLimit != "" {
		if parsed, err := strconv.Atoi(rawLimit); err == nil && parsed > 0 && parsed <= 300 {
			limit = parsed
		}
	}

	var questions []models.IELTSQuestion
	if err := query.Limit(limit).Find(&questions).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to load questions", err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"items":   serializeIELTSQuestions(questions),
		"filters": buildIELTSQuestionFilters(questions),
	})
}

func (h *IELTSExaminerHandler) GetMockExam(w http.ResponseWriter, r *http.Request) {
	mockType := strings.TrimSpace(r.URL.Query().Get("mockType"))
	if mockType == "" {
		mockType = "cambridge_style"
	}
	if mockType != "cambridge_style" && mockType != "predictions" {
		writeError(w, http.StatusBadRequest, "mockType must be cambridge_style or predictions", nil)
		return
	}

	section := strings.TrimSpace(r.URL.Query().Get("section"))
	if section == "" {
		section = "full"
	}
	validSections := map[string]bool{
		"full": true, "reading": true, "listening": true, "writing": true, "speaking": true,
	}
	if !validSections[section] {
		writeError(w, http.StatusBadRequest, "section must be full, reading, listening, writing, or speaking", nil)
		return
	}

	bandTarget := strings.TrimSpace(r.URL.Query().Get("band"))
	if bandTarget == "" {
		bandTarget = "6.5"
	}

	sections := []string{"reading", "listening", "writing", "speaking"}
	if section != "full" {
		sections = []string{section}
	}

	examSet := strings.TrimSpace(r.URL.Query().Get("examSet"))
	if examSet == "" {
		var err error
		examSet, err = h.pickExamSet(mockType)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to choose exam set", err)
			return
		}
	}

	responseSections := make([]ieltsMockSectionPayload, 0, len(sections))
	for _, sectionKey := range sections {
		questions, err := h.loadMockQuestions(mockType, examSet, sectionKey, bandTarget)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to load mock section", err)
			return
		}

		serialized := serializeIELTSQuestions(questions)

		payload := ieltsMockSectionPayload{
			Key:             sectionKey,
			Title:           mockSectionTitle(sectionKey),
			Instructions:    mockSectionInstructions(sectionKey),
			DurationMinutes: mockSectionDuration(sectionKey),
			Questions:       serialized,
		}

		// Group reading/listening questions into passages/sections for split-screen UI
		if sectionKey == "reading" || sectionKey == "listening" {
			payload.Passages = groupQuestionsIntoPassages(serialized)
		}

		responseSections = append(responseSections, payload)
	}

	writeJSON(w, http.StatusOK, ieltsMockPayload{
		MockType:      mockType,
		Section:       section,
		BandTarget:    bandTarget,
		ExamSet:       examSet,
		Sections:      responseSections,
		GeneratedByAI: false,
	})
}

func (h *IELTSExaminerHandler) pickExamSet(mockType string) (string, error) {
	var questions []models.IELTSQuestion
	if err := h.db.Model(&models.IELTSQuestion{}).
		Where("mock_type = ?", mockType).
		Order("exam_set ASC, sort_order ASC").
		Find(&questions).Error; err != nil {
		return "", err
	}

	if len(questions) == 0 {
		return "", fmt.Errorf("no questions found for mock type %s", mockType)
	}

	counts := make(map[string]int)
	order := make([]string, 0, len(questions))
	for _, question := range questions {
		if question.ExamSet == "" {
			continue
		}
		if _, exists := counts[question.ExamSet]; !exists {
			order = append(order, question.ExamSet)
		}
		counts[question.ExamSet]++
	}

	if len(order) == 0 {
		return "", fmt.Errorf("no exam set available for mock type %s", mockType)
	}
	best := order[0]
	for _, candidate := range order[1:] {
		if counts[candidate] > counts[best] {
			best = candidate
		}
	}
	return best, nil
}

func (h *IELTSExaminerHandler) loadMockQuestions(mockType, examSet, section, bandTarget string) ([]models.IELTSQuestion, error) {
	query := h.db.Model(&models.IELTSQuestion{}).
		Where("mock_type = ? AND section = ?", mockType, section).
		Order("sort_order ASC, created_at DESC")

	if examSet != "" {
		query = query.Where("exam_set = ?", examSet)
		// When a specific exam set is selected, load ALL its questions
		// regardless of band target. The exam set defines the content;
		// band target is just a preference, not a hard filter.
	} else if bandTarget != "" {
		query = query.Where("band_target = ? OR band_target IS NULL OR band_target = ''", bandTarget)
	}

	var questions []models.IELTSQuestion
	if err := query.Find(&questions).Error; err != nil {
		return nil, err
	}
	return questions, nil
}

func (h *IELTSExaminerHandler) generatePredictionSection(section, bandTarget string) ([]models.IELTSQuestion, error) {
	if h.claudeKey == "" && h.openAIKey == "" && h.geminiKey == "" {
		return nil, fmt.Errorf("ai unavailable")
	}

	switch section {
	case "writing":
		return h.generatePredictionWritingQuestions(bandTarget)
	case "speaking":
		return h.generatePredictionSpeakingQuestions(bandTarget)
	default:
		return nil, fmt.Errorf("ai generation is only enabled for writing and speaking")
	}
}

func (h *IELTSExaminerHandler) generatePredictionWritingQuestions(bandTarget string) ([]models.IELTSQuestion, error) {
	prompt := fmt.Sprintf(`Create original IELTS prediction writing tasks inspired by current exam themes. Target band: %s.

Return only JSON in this shape:
{
  "task1": {
    "title": "short topic title",
    "topic": "topic label",
    "difficulty": "easy|medium|hard",
    "prompt": "complete IELTS Task 1 prompt"
  },
  "task2": {
    "title": "short topic title",
    "topic": "topic label",
    "difficulty": "easy|medium|hard",
    "prompt": "complete IELTS Task 2 prompt"
  }
}`, bandTarget)

	raw, _, err := h.callLLM(prompt)
	if err != nil {
		return nil, err
	}

	var payload struct {
		Task1 struct {
			Title      string `json:"title"`
			Topic      string `json:"topic"`
			Difficulty string `json:"difficulty"`
			Prompt     string `json:"prompt"`
		} `json:"task1"`
		Task2 struct {
			Title      string `json:"title"`
			Topic      string `json:"topic"`
			Difficulty string `json:"difficulty"`
			Prompt     string `json:"prompt"`
		} `json:"task2"`
	}

	if err := json.Unmarshal([]byte(raw), &payload); err != nil {
		return nil, err
	}

	return []models.IELTSQuestion{
		{
			Section:       "writing",
			QuestionType:  "task1",
			Difficulty:    normalizeDifficulty(payload.Task1.Difficulty),
			MockType:      "predictions",
			Topic:         strings.TrimSpace(payload.Task1.Topic),
			ExamSet:       "predictions-live",
			QuestionGroup: "predictions-live-writing",
			Title:         strings.TrimSpace(payload.Task1.Title),
			Prompt:        strings.TrimSpace(payload.Task1.Prompt),
			BandTarget:    stringPtr(strings.TrimSpace(bandTarget)),
			SortOrder:     1,
		},
		{
			Section:       "writing",
			QuestionType:  "task2",
			Difficulty:    normalizeDifficulty(payload.Task2.Difficulty),
			MockType:      "predictions",
			Topic:         strings.TrimSpace(payload.Task2.Topic),
			ExamSet:       "predictions-live",
			QuestionGroup: "predictions-live-writing",
			Title:         strings.TrimSpace(payload.Task2.Title),
			Prompt:        strings.TrimSpace(payload.Task2.Prompt),
			BandTarget:    stringPtr(strings.TrimSpace(bandTarget)),
			SortOrder:     2,
		},
	}, nil
}

func (h *IELTSExaminerHandler) generatePredictionSpeakingQuestions(bandTarget string) ([]models.IELTSQuestion, error) {
	prompt := fmt.Sprintf(`Create an original IELTS Speaking prediction set inspired by current exam themes. Target band: %s.

Return only JSON in this shape:
{
  "part1": {"title":"...", "topic":"...", "difficulty":"easy|medium|hard", "prompt":"..."},
  "part2": {"title":"...", "topic":"...", "difficulty":"easy|medium|hard", "prompt":"...", "points":["...", "...", "...", "..."]},
  "part3": {"title":"...", "topic":"...", "difficulty":"easy|medium|hard", "prompt":"..."}
}`, bandTarget)

	raw, _, err := h.callLLM(prompt)
	if err != nil {
		return nil, err
	}

	var payload struct {
		Part1 struct {
			Title      string `json:"title"`
			Topic      string `json:"topic"`
			Difficulty string `json:"difficulty"`
			Prompt     string `json:"prompt"`
		} `json:"part1"`
		Part2 struct {
			Title      string   `json:"title"`
			Topic      string   `json:"topic"`
			Difficulty string   `json:"difficulty"`
			Prompt     string   `json:"prompt"`
			Points     []string `json:"points"`
		} `json:"part2"`
		Part3 struct {
			Title      string `json:"title"`
			Topic      string `json:"topic"`
			Difficulty string `json:"difficulty"`
			Prompt     string `json:"prompt"`
		} `json:"part3"`
	}

	if err := json.Unmarshal([]byte(raw), &payload); err != nil {
		return nil, err
	}

	return []models.IELTSQuestion{
		{
			Section:       "speaking",
			QuestionType:  "part1",
			Difficulty:    normalizeDifficulty(payload.Part1.Difficulty),
			MockType:      "predictions",
			Topic:         strings.TrimSpace(payload.Part1.Topic),
			ExamSet:       "predictions-live",
			QuestionGroup: "predictions-live-speaking",
			Title:         strings.TrimSpace(payload.Part1.Title),
			Prompt:        strings.TrimSpace(payload.Part1.Prompt),
			BandTarget:    stringPtr(strings.TrimSpace(bandTarget)),
			SortOrder:     1,
		},
		{
			Section:       "speaking",
			QuestionType:  "part2",
			Difficulty:    normalizeDifficulty(payload.Part2.Difficulty),
			MockType:      "predictions",
			Topic:         strings.TrimSpace(payload.Part2.Topic),
			ExamSet:       "predictions-live",
			QuestionGroup: "predictions-live-speaking",
			Title:         strings.TrimSpace(payload.Part2.Title),
			Prompt:        strings.TrimSpace(payload.Part2.Prompt),
			Content:       stringPtr(strings.Join(payload.Part2.Points, "\n")),
			BandTarget:    stringPtr(strings.TrimSpace(bandTarget)),
			SortOrder:     2,
		},
		{
			Section:       "speaking",
			QuestionType:  "part3",
			Difficulty:    normalizeDifficulty(payload.Part3.Difficulty),
			MockType:      "predictions",
			Topic:         strings.TrimSpace(payload.Part3.Topic),
			ExamSet:       "predictions-live",
			QuestionGroup: "predictions-live-speaking",
			Title:         strings.TrimSpace(payload.Part3.Title),
			Prompt:        strings.TrimSpace(payload.Part3.Prompt),
			BandTarget:    stringPtr(strings.TrimSpace(bandTarget)),
			SortOrder:     3,
		},
	}, nil
}

func serializeIELTSQuestions(questions []models.IELTSQuestion) []ieltsQuestionPayload {
	items := make([]ieltsQuestionPayload, 0, len(questions))
	for _, question := range questions {
		items = append(items, ieltsQuestionPayload{
			ID:            question.ID,
			Section:       question.Section,
			QuestionType:  question.QuestionType,
			Difficulty:    question.Difficulty,
			MockType:      question.MockType,
			Topic:         question.Topic,
			ExamSet:       question.ExamSet,
			QuestionGroup: question.QuestionGroup,
			Title:         question.Title,
			Prompt:        question.Prompt,
			Content:       derefString(question.Content),
			AudioScript:   derefString(question.AudioScript),
			Options:       parseJSONStrings(question.Options),
			Answer:        derefString(question.Answer),
			Explanation:   derefString(question.Explanation),
			BandTarget:    derefString(question.BandTarget),
			PassageNumber: question.PassageNumber,
			SortOrder:     question.SortOrder,
		})
	}
	return items
}

// groupQuestionsIntoPassages groups reading questions by PassageNumber.
// Each passage gets its content from the first question in the group (all
// questions in the same passage share the same Content field).
func groupQuestionsIntoPassages(questions []ieltsQuestionPayload) []readingPassagePayload {
	grouped := make(map[int][]ieltsQuestionPayload)
	titles := make(map[int]string)
	contents := make(map[int]string)

	for _, q := range questions {
		pn := q.PassageNumber
		if pn == 0 {
			pn = 1
		}
		grouped[pn] = append(grouped[pn], q)
		if _, ok := titles[pn]; !ok {
			titles[pn] = q.Title
			contents[pn] = q.Content
		}
	}

	passages := make([]readingPassagePayload, 0, len(grouped))
	for pn, qs := range grouped {
		passages = append(passages, readingPassagePayload{
			PassageNumber: pn,
			Title:         titles[pn],
			Content:       contents[pn],
			Questions:     qs,
		})
	}

	sort.Slice(passages, func(i, j int) bool {
		return passages[i].PassageNumber < passages[j].PassageNumber
	})

	return passages
}

func buildIELTSQuestionFilters(questions []models.IELTSQuestion) map[string][]string {
	filters := map[string]map[string]struct{}{
		"sections":     {},
		"types":        {},
		"mockTypes":    {},
		"difficulties": {},
		"topics":       {},
		"bands":        {},
		"examSets":     {},
	}

	for _, question := range questions {
		filters["sections"][question.Section] = struct{}{}
		filters["types"][question.QuestionType] = struct{}{}
		filters["mockTypes"][question.MockType] = struct{}{}
		filters["difficulties"][question.Difficulty] = struct{}{}
		if question.Topic != "" {
			filters["topics"][question.Topic] = struct{}{}
		}
		if question.BandTarget != nil && strings.TrimSpace(*question.BandTarget) != "" {
			filters["bands"][strings.TrimSpace(*question.BandTarget)] = struct{}{}
		}
		if question.ExamSet != "" {
			filters["examSets"][question.ExamSet] = struct{}{}
		}
	}

	result := make(map[string][]string, len(filters))
	for key, value := range filters {
		items := make([]string, 0, len(value))
		for item := range value {
			items = append(items, item)
		}
		sort.Strings(items)
		result[key] = items
	}
	return result
}

func parseJSONStrings(raw *string) []string {
	if raw == nil || strings.TrimSpace(*raw) == "" {
		return nil
	}

	var items []string
	if err := json.Unmarshal([]byte(*raw), &items); err == nil {
		return items
	}

	return strings.Split(*raw, "\n")
}

func derefString(value *string) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(*value)
}

func normalizeDifficulty(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "easy", "medium", "hard":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return "medium"
	}
}

func mockSectionTitle(section string) string {
	switch section {
	case "reading":
		return "Reading"
	case "listening":
		return "Listening"
	case "writing":
		return "Writing"
	case "speaking":
		return "Speaking"
	default:
		if section == "" {
			return "Section"
		}
		return strings.ToUpper(section[:1]) + section[1:]
	}
}

func mockSectionInstructions(section string) string {
	switch section {
	case "reading":
		return "Read the passage carefully, answer each question, and watch paraphrases and keyword traps."
	case "listening":
		return "Play the audio script, take notes quickly, and use the final confirmed detail instead of the first distractor."
	case "writing":
		return "Choose the appropriate task and write in timed exam conditions before requesting AI examiner feedback."
	case "speaking":
		return "Answer naturally, extend your ideas, and use the follow-up questions to simulate a real examiner flow."
	default:
		return "Complete the section in exam conditions."
	}
}

func mockSectionDuration(section string) int {
	switch section {
	case "reading":
		return 60
	case "listening":
		return 30
	case "writing":
		return 60
	case "speaking":
		return 14
	default:
		return 0
	}
}

func stringPtr(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}
