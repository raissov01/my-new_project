package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// IELTSQuestionAdminHandler manages admin CRUD operations on IELTS questions.
type IELTSQuestionAdminHandler struct {
	db *gorm.DB
}

func NewIELTSQuestionAdmin(db *gorm.DB) *IELTSQuestionAdminHandler {
	return &IELTSQuestionAdminHandler{db: db}
}

type questionRequest struct {
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
	Options       []string `json:"options"`
	Answer        string   `json:"answer"`
	Explanation   string   `json:"explanation"`
	BandTarget    string   `json:"bandTarget"`
	SortOrder     int      `json:"sortOrder"`
}

// strPtr converts an empty string to nil or returns a pointer to the trimmed value.
func strPtr(s string) *string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return &s
}

var validSections = map[string]bool{
	"reading": true, "writing": true, "speaking": true, "listening": true,
}

var validQuestionTypes = map[string]bool{
	"task1": true, "task2": true, "part1": true, "part2": true, "part3": true,
	"multiple_choice": true, "fill_blank": true, "true_false": true, "matching": true,
}

var validDifficulties = map[string]bool{
	"easy": true, "medium": true, "hard": true,
}

var validMockTypes = map[string]bool{
	"original": true, "predictions": true, "cambridge_style": true,
}

func validateQuestionRequest(req questionRequest) string {
	if !validSections[req.Section] {
		return "section must be one of: reading, writing, speaking, listening"
	}
	if !validQuestionTypes[req.QuestionType] {
		return "questionType must be one of: task1, task2, part1, part2, part3, multiple_choice, fill_blank, true_false, matching"
	}
	if !validDifficulties[req.Difficulty] {
		return "difficulty must be one of: easy, medium, hard"
	}
	if !validMockTypes[req.MockType] {
		return "mockType must be one of: original, predictions, cambridge_style"
	}
	if strings.TrimSpace(req.Title) == "" {
		return "title is required"
	}
	if strings.TrimSpace(req.Prompt) == "" {
		return "prompt is required"
	}
	return ""
}

func buildQuestionFromRequest(req questionRequest) models.IELTSQuestion {
	var optionsPtr *string
	if len(req.Options) > 0 {
		raw, _ := json.Marshal(req.Options)
		s := string(raw)
		optionsPtr = &s
	}

	return models.IELTSQuestion{
		Section:       req.Section,
		QuestionType:  req.QuestionType,
		Difficulty:    req.Difficulty,
		MockType:      req.MockType,
		Topic:         strings.TrimSpace(req.Topic),
		ExamSet:       strings.TrimSpace(req.ExamSet),
		QuestionGroup: strings.TrimSpace(req.QuestionGroup),
		Title:         strings.TrimSpace(req.Title),
		Prompt:        strings.TrimSpace(req.Prompt),
		Content:       strPtr(req.Content),
		AudioScript:   strPtr(req.AudioScript),
		Options:       optionsPtr,
		Answer:        strPtr(req.Answer),
		Explanation:   strPtr(req.Explanation),
		BandTarget:    strPtr(req.BandTarget),
		SortOrder:     req.SortOrder,
	}
}

// ── CreateQuestion ──────────────────────────────────────────────────────────

func (h *IELTSQuestionAdminHandler) CreateQuestion(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var req questionRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	if msg := validateQuestionRequest(req); msg != "" {
		writeError(w, http.StatusBadRequest, msg, nil)
		return
	}

	question := buildQuestionFromRequest(req)

	if err := h.db.Create(&question).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create question", err)
		return
	}

	writeJSON(w, http.StatusCreated, question)
}

// ── UpdateQuestion ──────────────────────────────────────────────────────────

func (h *IELTSQuestionAdminHandler) UpdateQuestion(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	questionID := r.PathValue("questionID")
	if questionID == "" {
		writeError(w, http.StatusBadRequest, "questionID is required", nil)
		return
	}

	var existing models.IELTSQuestion
	if err := h.db.First(&existing, "id = ?", questionID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			writeError(w, http.StatusNotFound, "question not found", nil)
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to load question", err)
		return
	}

	var req questionRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	if msg := validateQuestionRequest(req); msg != "" {
		writeError(w, http.StatusBadRequest, msg, nil)
		return
	}

	updated := buildQuestionFromRequest(req)
	updated.ID = existing.ID
	updated.CreatedAt = existing.CreatedAt

	if err := h.db.Save(&updated).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update question", err)
		return
	}

	writeJSON(w, http.StatusOK, updated)
}

// ── DeleteQuestion ──────────────────────────────────────────────────────────

func (h *IELTSQuestionAdminHandler) DeleteQuestion(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	questionID := r.PathValue("questionID")
	if questionID == "" {
		writeError(w, http.StatusBadRequest, "questionID is required", nil)
		return
	}

	result := h.db.Delete(&models.IELTSQuestion{}, "id = ?", questionID)
	if result.Error != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete question", result.Error)
		return
	}
	if result.RowsAffected == 0 {
		writeError(w, http.StatusNotFound, "question not found", nil)
		return
	}

	writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
}

// ── BulkCreateQuestions ─────────────────────────────────────────────────────

func (h *IELTSQuestionAdminHandler) BulkCreateQuestions(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var body struct {
		Questions []questionRequest `json:"questions"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	if len(body.Questions) == 0 {
		writeError(w, http.StatusBadRequest, "questions array is required and cannot be empty", nil)
		return
	}

	questions := make([]models.IELTSQuestion, 0, len(body.Questions))
	for i, req := range body.Questions {
		if msg := validateQuestionRequest(req); msg != "" {
			writeError(w, http.StatusBadRequest, fmt.Sprintf("question %d: %s", i, msg), nil)
			return
		}
		questions = append(questions, buildQuestionFromRequest(req))
	}

	err := h.db.Transaction(func(tx *gorm.DB) error {
		for i := range questions {
			if err := tx.Create(&questions[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create questions", err)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]int{"created": len(questions)})
}

// ── GetQuestionStats ────────────────────────────────────────────────────────

func (h *IELTSQuestionAdminHandler) GetQuestionStats(w http.ResponseWriter, r *http.Request) {
	var total int64
	if err := h.db.Model(&models.IELTSQuestion{}).Count(&total).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to count questions", err)
		return
	}

	type groupCount struct {
		Key   string `gorm:"column:key"`
		Count int64  `gorm:"column:count"`
	}

	countByColumn := func(column string) (map[string]int64, error) {
		var rows []groupCount
		err := h.db.Model(&models.IELTSQuestion{}).
			Select(column + " as key, count(*) as count").
			Group(column).
			Find(&rows).Error
		if err != nil {
			return nil, err
		}
		result := make(map[string]int64, len(rows))
		for _, row := range rows {
			result[row.Key] = row.Count
		}
		return result, nil
	}

	bySection, err := countByColumn("section")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to count by section", err)
		return
	}

	byMockType, err := countByColumn("mock_type")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to count by mock type", err)
		return
	}

	byDifficulty, err := countByColumn("difficulty")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to count by difficulty", err)
		return
	}

	var examSetCount int64
	if err := h.db.Model(&models.IELTSQuestion{}).
		Where("exam_set != ''").
		Distinct("exam_set").
		Count(&examSetCount).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to count exam sets", err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"total":        total,
		"bySection":    bySection,
		"byMockType":   byMockType,
		"byDifficulty": byDifficulty,
		"examSetCount": examSetCount,
	})
}
