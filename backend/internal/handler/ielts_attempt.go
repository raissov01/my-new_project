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

// IELTSAttemptHandler manages the exam attempt lifecycle.
type IELTSAttemptHandler struct {
	db *gorm.DB
}

func NewIELTSAttempt(db *gorm.DB) *IELTSAttemptHandler {
	return &IELTSAttemptHandler{db: db}
}

// ── Start a new attempt ─────────────────────────────────────────────────────

type startAttemptRequest struct {
	AttemptType string `json:"attemptType"`
	MockType    string `json:"mockType"`
	ExamSet     string `json:"examSet"`
	Section     string `json:"section"`
	BandTarget  string `json:"bandTarget"`
	StrictMode  bool   `json:"strictMode"`
}

func (h *IELTSAttemptHandler) StartAttempt(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var req startAttemptRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	// Validate attempt type
	validTypes := map[string]bool{
		"full_mock": true, "section_practice": true,
		"writing_practice": true, "speaking_practice": true,
	}
	if !validTypes[req.AttemptType] {
		writeError(w, http.StatusBadRequest, "attemptType must be full_mock, section_practice, writing_practice, or speaking_practice", nil)
		return
	}

	// Validate mock type
	if req.MockType == "" {
		req.MockType = "cambridge_style"
	}
	if req.MockType != "cambridge_style" && req.MockType != "predictions" {
		writeError(w, http.StatusBadRequest, "mockType must be cambridge_style or predictions", nil)
		return
	}

	// Validate section
	if req.Section == "" {
		req.Section = "full"
	}
	validSections := map[string]bool{
		"full": true, "reading": true, "listening": true,
		"writing": true, "speaking": true,
	}
	if !validSections[req.Section] {
		writeError(w, http.StatusBadRequest, "section must be full, reading, listening, writing, or speaking", nil)
		return
	}

	if req.BandTarget == "" {
		req.BandTarget = "6.5"
	}

	// Initialize empty JSON for answers and sectionProgress
	emptyJSON := "{}"

	attempt := models.IELTSAttempt{
		UserID:          userID,
		AttemptType:     req.AttemptType,
		MockType:        req.MockType,
		ExamSet:         req.ExamSet,
		Section:         req.Section,
		BandTarget:      req.BandTarget,
		Status:          "in_progress",
		StrictMode:      req.StrictMode,
		Answers:         &emptyJSON,
		SectionProgress: &emptyJSON,
		ViolationCount:  0,
		TimeTakenSecs:   0,
	}

	if err := h.db.Create(&attempt).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create attempt", err)
		return
	}

	writeJSON(w, http.StatusCreated, attempt)
}

// ── Autosave answers ────────────────────────────────────────────────────────

type autoSaveRequest struct {
	Answers         map[string]string `json:"answers"`
	SectionProgress map[string]bool   `json:"sectionProgress"`
	TimeTakenSecs   int               `json:"timeTakenSecs"`
}

func (h *IELTSAttemptHandler) AutoSave(w http.ResponseWriter, r *http.Request) {
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

	var req autoSaveRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	// Verify attempt belongs to user and is in progress
	var attempt models.IELTSAttempt
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

	// Marshal JSON fields
	updates := map[string]any{
		"time_taken_secs": req.TimeTakenSecs,
	}
	if req.Answers != nil {
		answersJSON, _ := json.Marshal(req.Answers)
		s := string(answersJSON)
		updates["answers"] = &s
	}
	if req.SectionProgress != nil {
		progressJSON, _ := json.Marshal(req.SectionProgress)
		s := string(progressJSON)
		updates["section_progress"] = &s
	}

	if err := h.db.Model(&attempt).Updates(updates).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save", err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"lastSavedAt": attempt.LastSavedAt,
	})
}

// ── Complete attempt ────────────────────────────────────────────────────────

type completeAttemptRequest struct {
	Answers       map[string]string `json:"answers"`
	TimeTakenSecs int               `json:"timeTakenSecs"`
	Results       map[string]any    `json:"results"`
}

func (h *IELTSAttemptHandler) Complete(w http.ResponseWriter, r *http.Request) {
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

	var req completeAttemptRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	var attempt models.IELTSAttempt
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
	updates := map[string]any{
		"status":          "completed",
		"time_taken_secs": req.TimeTakenSecs,
		"completed_at":    &now,
	}

	if req.Answers != nil {
		answersJSON, _ := json.Marshal(req.Answers)
		s := string(answersJSON)
		updates["answers"] = &s
	}
	if req.Results != nil {
		resultsJSON, _ := json.Marshal(req.Results)
		s := string(resultsJSON)
		updates["results"] = &s
	}

	if err := h.db.Model(&attempt).Updates(updates).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to complete attempt", err)
		return
	}

	// Reload for response
	h.db.First(&attempt, "id = ?", attemptID)
	writeJSON(w, http.StatusOK, attempt)
}

// ── Abandon attempt ─────────────────────────────────────────────────────────

func (h *IELTSAttemptHandler) Abandon(w http.ResponseWriter, r *http.Request) {
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

	var attempt models.IELTSAttempt
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
	h.db.Model(&attempt).Updates(map[string]any{
		"status":       "abandoned",
		"completed_at": &now,
	})

	writeJSON(w, http.StatusOK, map[string]string{"status": "abandoned"})
}

// ── Get single attempt ──────────────────────────────────────────────────────

func (h *IELTSAttemptHandler) GetAttempt(w http.ResponseWriter, r *http.Request) {
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

	var attempt models.IELTSAttempt
	if err := h.db.Where("id = ? AND user_id = ?", attemptID, userID).First(&attempt).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			writeError(w, http.StatusNotFound, "attempt not found", nil)
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to load attempt", err)
		return
	}

	writeJSON(w, http.StatusOK, attempt)
}

// ── List user attempts ──────────────────────────────────────────────────────

func (h *IELTSAttemptHandler) ListAttempts(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	q := h.db.Where("user_id = ?", userID).Order("created_at DESC")

	// Optional filters
	if status := r.URL.Query().Get("status"); status != "" {
		q = q.Where("status = ?", status)
	}
	if attemptType := r.URL.Query().Get("attemptType"); attemptType != "" {
		q = q.Where("attempt_type = ?", attemptType)
	}

	// Pagination
	limit := 20
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 100 {
			limit = n
		}
	}
	offset := 0
	if o := r.URL.Query().Get("offset"); o != "" {
		if n, err := strconv.Atoi(o); err == nil && n >= 0 {
			offset = n
		}
	}

	var attempts []models.IELTSAttempt
	if err := q.Limit(limit).Offset(offset).Find(&attempts).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list attempts", err)
		return
	}

	// Get total count for pagination
	var total int64
	countQ := h.db.Model(&models.IELTSAttempt{}).Where("user_id = ?", userID)
	if status := r.URL.Query().Get("status"); status != "" {
		countQ = countQ.Where("status = ?", status)
	}
	if attemptType := r.URL.Query().Get("attemptType"); attemptType != "" {
		countQ = countQ.Where("attempt_type = ?", attemptType)
	}
	countQ.Count(&total)

	writeJSON(w, http.StatusOK, map[string]any{
		"attempts": attempts,
		"total":    total,
		"limit":    limit,
		"offset":   offset,
	})
}

// ── Log violation ───────────────────────────────────────────────────────────

type logViolationRequest struct {
	Type    string `json:"type"`
	Details string `json:"details"`
}

func (h *IELTSAttemptHandler) LogViolation(w http.ResponseWriter, r *http.Request) {
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

	var req logViolationRequest
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

	// Verify attempt belongs to user
	var attempt models.IELTSAttempt
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

	// Create violation record
	var details *string
	if strings.TrimSpace(req.Details) != "" {
		d := strings.TrimSpace(req.Details)
		details = &d
	}

	violation := models.IELTSViolation{
		AttemptID: attemptID,
		UserID:    userID,
		Type:      req.Type,
		Details:   details,
	}

	if err := h.db.Create(&violation).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to log violation", err)
		return
	}

	// Increment violation count on attempt
	h.db.Model(&attempt).Update("violation_count", gorm.Expr("violation_count + 1"))

	writeJSON(w, http.StatusCreated, map[string]any{
		"id":             violation.ID,
		"violationCount": attempt.ViolationCount + 1,
	})
}

// ── Get violations for attempt ──────────────────────────────────────────────

func (h *IELTSAttemptHandler) GetViolations(w http.ResponseWriter, r *http.Request) {
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

	// Verify attempt belongs to user
	var count int64
	h.db.Model(&models.IELTSAttempt{}).Where("id = ? AND user_id = ?", attemptID, userID).Count(&count)
	if count == 0 {
		writeError(w, http.StatusNotFound, "attempt not found", nil)
		return
	}

	var violations []models.IELTSViolation
	if err := h.db.Where("attempt_id = ?", attemptID).Order("occurred_at ASC").Find(&violations).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load violations", err)
		return
	}

	writeJSON(w, http.StatusOK, violations)
}
