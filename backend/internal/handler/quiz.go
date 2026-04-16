package handler

import (
	"log"
	"net/http"
	"strings"

	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/model"
	"github.com/midoriya/flashlearn-backend/internal/repository"
	"github.com/midoriya/flashlearn-backend/internal/service"
)

// QuizHandler serves HTTP routes for the Quizizz-style quiz module.
type QuizHandler struct {
	svc *service.Quiz
	env string
}

func NewQuiz(svc *service.Quiz, env string) *QuizHandler {
	return &QuizHandler{svc: svc, env: env}
}

func (h *QuizHandler) isDev() bool {
	return h.env == "development"
}

func (h *QuizHandler) errorMessage(err error, fallback string) string {
	if h.isDev() {
		return err.Error()
	}
	return fallback
}

// GetOverview handles GET /api/v1/quizzes/overview
func (h *QuizHandler) GetOverview(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	filters := repository.QuizListFilters{
		Search:  r.URL.Query().Get("q"),
		Subject: r.URL.Query().Get("subject"),
		Tag:     r.URL.Query().Get("tag"),
		Sort:    r.URL.Query().Get("sort"),
	}

	items, err := h.svc.GetOverview(r.Context(), userID, filters)
	if err != nil {
		log.Printf("quiz overview error: %v", err)
		writeError(w, http.StatusInternalServerError, h.errorMessage(err, "failed to load quizzes"), err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// GetMine handles GET /api/v1/quizzes/mine
func (h *QuizHandler) GetMine(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	filters := repository.QuizListFilters{
		Search:   r.URL.Query().Get("q"),
		Subject:  r.URL.Query().Get("subject"),
		Tag:      r.URL.Query().Get("tag"),
		Sort:     r.URL.Query().Get("sort"),
		OnlyMine: true,
	}

	items, err := h.svc.GetOverview(r.Context(), userID, filters)
	if err != nil {
		log.Printf("quiz mine error: %v", err)
		writeError(w, http.StatusInternalServerError, h.errorMessage(err, "failed to load quizzes"), err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// GetQuiz handles GET /api/v1/quizzes/{quizID}
func (h *QuizHandler) GetQuiz(w http.ResponseWriter, r *http.Request) {
	quizID := r.PathValue("quizID")
	userID, _ := middleware.UserIDFromContext(r.Context())

	detail, err := h.svc.GetByID(r.Context(), quizID, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "quiz not found", err)
		return
	}
	writeJSON(w, http.StatusOK, detail)
}

// CreateQuiz handles POST /api/v1/quizzes
func (h *QuizHandler) CreateQuiz(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || strings.TrimSpace(userID) == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var req model.CreateQuizRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	quizID, err := h.svc.CreateQuiz(r.Context(), userID, req)
	if err != nil {
		status, msg := classifyQuizError(err, "failed to create quiz")
		if h.isDev() {
			msg = err.Error()
		}
		writeError(w, status, msg, err)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{"id": quizID})
}

// UpdateQuiz handles PUT /api/v1/quizzes/{quizID}
func (h *QuizHandler) UpdateQuiz(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || strings.TrimSpace(userID) == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}
	quizID := r.PathValue("quizID")

	var req model.UpdateQuizRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	if err := h.svc.UpdateQuiz(r.Context(), userID, quizID, req); err != nil {
		status, msg := classifyQuizError(err, "failed to update quiz")
		if h.isDev() {
			msg = err.Error()
		}
		writeError(w, status, msg, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// CloneQuiz handles POST /api/v1/quizzes/{quizID}/clone
func (h *QuizHandler) CloneQuiz(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || strings.TrimSpace(userID) == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}
	quizID := r.PathValue("quizID")

	newID, err := h.svc.CloneQuiz(r.Context(), userID, quizID)
	if err != nil {
		status, msg := classifyQuizError(err, "failed to clone quiz")
		if h.isDev() {
			msg = err.Error()
		}
		writeError(w, status, msg, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"id": newID})
}

// DeleteQuiz handles DELETE /api/v1/quizzes/{quizID}
func (h *QuizHandler) DeleteQuiz(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || strings.TrimSpace(userID) == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}
	quizID := r.PathValue("quizID")

	if err := h.svc.DeleteQuiz(r.Context(), userID, quizID); err != nil {
		status, msg := classifyQuizError(err, "failed to delete quiz")
		if h.isDev() {
			msg = err.Error()
		}
		writeError(w, status, msg, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// SubmitAttempt handles POST /api/v1/quizzes/{quizID}/attempts
func (h *QuizHandler) SubmitAttempt(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || strings.TrimSpace(userID) == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}
	quizID := r.PathValue("quizID")

	var req model.SubmitAttemptRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	result, err := h.svc.SubmitAttempt(r.Context(), userID, quizID, req)
	if err != nil {
		status, msg := classifyQuizError(err, "failed to submit attempt")
		if h.isDev() {
			msg = err.Error()
		}
		writeError(w, status, msg, err)
		return
	}
	writeJSON(w, http.StatusCreated, result)
}

// ListAttempts handles GET /api/v1/quizzes/{quizID}/attempts
func (h *QuizHandler) ListAttempts(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || strings.TrimSpace(userID) == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}
	quizID := r.PathValue("quizID")

	items, err := h.svc.ListAttempts(r.Context(), userID, quizID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, h.errorMessage(err, "failed to load attempts"), err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// GetAttempt handles GET /api/v1/quizzes/attempts/{attemptID}
func (h *QuizHandler) GetAttempt(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || strings.TrimSpace(userID) == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}
	attemptID := r.PathValue("attemptID")

	result, err := h.svc.GetAttempt(r.Context(), userID, attemptID)
	if err != nil {
		status := http.StatusNotFound
		if strings.Contains(err.Error(), "access denied") {
			status = http.StatusForbidden
		}
		writeError(w, status, h.errorMessage(err, "attempt not found"), err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

// GetQuestionStats handles GET /api/v1/quizzes/{quizID}/stats
// Only the quiz owner can access this endpoint.
func (h *QuizHandler) GetQuestionStats(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || strings.TrimSpace(userID) == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}
	quizID := r.PathValue("quizID")

	stats, err := h.svc.GetQuestionStats(r.Context(), userID, quizID)
	if err != nil {
		status, msg := classifyQuizError(err, "failed to load stats")
		if h.isDev() {
			msg = err.Error()
		}
		writeError(w, status, msg, err)
		return
	}
	writeJSON(w, http.StatusOK, stats)
}

// classifyQuizError maps common service-layer errors to HTTP status codes.
func classifyQuizError(err error, fallbackMsg string) (int, string) {
	msg := err.Error()
	switch {
	case strings.Contains(msg, "access denied"):
		return http.StatusForbidden, "access denied"
	case strings.Contains(msg, "not found"):
		return http.StatusNotFound, "quiz not found"
	case strings.Contains(msg, "authentication required"):
		return http.StatusUnauthorized, "authentication required"
	case strings.Contains(msg, "title is required"),
		strings.Contains(msg, "title is too long"),
		strings.Contains(msg, "at least"),
		strings.Contains(msg, "must be"),
		strings.Contains(msg, "may not exceed"),
		strings.Contains(msg, "is required"),
		strings.Contains(msg, "correct option"),
		strings.Contains(msg, "has no questions"),
		strings.Contains(msg, "four options"):
		return http.StatusBadRequest, msg
	}
	return http.StatusInternalServerError, fallbackMsg
}

// GetRecentAttempts handles GET /api/v1/quizzes/dashboard/recent-attempts
func (h *QuizHandler) GetRecentAttempts(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}
	items, err := h.svc.GetRecentAttempts(r.Context(), userID, 5)
	if err != nil {
		writeError(w, http.StatusInternalServerError, h.errorMessage(err, "failed to load recent attempts"), err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// GetRecommendedPractice handles GET /api/v1/quizzes/dashboard/recommended
func (h *QuizHandler) GetRecommendedPractice(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}
	items, err := h.svc.GetRecommendedPractice(r.Context(), userID, 5)
	if err != nil {
		writeError(w, http.StatusInternalServerError, h.errorMessage(err, "failed to load recommendations"), err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}
