package handler

import (
	"net/http"
	"strings"

	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/model"
	"github.com/midoriya/flashlearn-backend/internal/service"
)

type Progress struct {
	svc *service.Progress
	env string
}

func NewProgress(svc *service.Progress, env string) *Progress {
	return &Progress{svc: svc, env: env}
}

// SaveSession handles POST /api/v1/progress/session
func (h *Progress) SaveSession(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var req model.SaveSessionRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	if len(req.Results) == 0 {
		writeError(w, http.StatusBadRequest, "results array is empty", nil)
		return
	}

	resp, err := h.svc.SaveSessionResults(r.Context(), userID, req.Results)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save session", err)
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

// GetStats handles GET /api/v1/progress/stats
func (h *Progress) GetStats(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	stats, err := h.svc.GetUserStats(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get stats", err)
		return
	}

	writeJSON(w, http.StatusOK, stats)
}

func (h *Progress) GetSetProgress(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}
	setID := strings.TrimSpace(r.PathValue("setID"))
	if setID == "" {
		writeError(w, http.StatusBadRequest, "set id is required", nil)
		return
	}

	progress, err := h.svc.GetSetProgress(r.Context(), userID, setID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get set progress", err)
		return
	}

	writeJSON(w, http.StatusOK, progress)
}

// ToggleWeak handles POST /api/v1/progress/toggle-weak
func (h *Progress) ToggleWeak(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var req struct {
		FlashcardID string `json:"flashcardId"`
		IsWeak      bool   `json:"isWeak"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	if err := h.svc.ToggleWeakCard(r.Context(), userID, req.FlashcardID, req.IsWeak); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to toggle weak", err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// GetPomodoro handles GET /api/v1/pomodoro/preferences
func (h *Progress) GetPomodoro(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	prefs, err := h.svc.GetPomodoroPreferences(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get preferences", err)
		return
	}

	writeJSON(w, http.StatusOK, prefs)
}

// SavePomodoro handles POST /api/v1/pomodoro/preferences
func (h *Progress) SavePomodoro(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var prefs model.PomodoroPreferences
	if err := decodeJSON(r, &prefs); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	if prefs.WorkMinutes < 5 || prefs.WorkMinutes > 60 {
		writeError(w, http.StatusBadRequest, "work_minutes must be 5-60", nil)
		return
	}
	if prefs.BreakMinutes < 1 || prefs.BreakMinutes > 30 {
		writeError(w, http.StatusBadRequest, "break_minutes must be 1-30", nil)
		return
	}

	if err := h.svc.SavePomodoroPreferences(r.Context(), userID, prefs); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save preferences", err)
		return
	}

	writeJSON(w, http.StatusOK, prefs)
}

// SavePomodoroSession handles POST /api/v1/pomodoro/session
func (h *Progress) SavePomodoroSession(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var input model.PomodoroSessionInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	if err := h.svc.SavePomodoroSession(r.Context(), userID, input); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save session", err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
