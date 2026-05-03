package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/service"
)

// QuizAIGenerateHandler handles POST /api/v1/quizzes/ai-generate.
type QuizAIGenerateHandler struct {
	svc *service.QuizAIGenerateService
}

func NewQuizAIGenerate(svc *service.QuizAIGenerateService) *QuizAIGenerateHandler {
	return &QuizAIGenerateHandler{svc: svc}
}

func (h *QuizAIGenerateHandler) Generate(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || strings.TrimSpace(userID) == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var req struct {
		Text    string `json:"text"`
		Count   int    `json:"count"`
		Subject string `json:"subject"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	if len([]rune(strings.TrimSpace(req.Text))) < 50 {
		writeError(w, http.StatusBadRequest, "text too short (min 50 characters)", nil)
		return
	}

	if req.Count <= 0 {
		req.Count = 10
	}

	result, err := h.svc.Generate(userID, req.Text, req.Subject, req.Count)
	if err != nil {
		if errors.Is(err, service.ErrDailyLimitReached) {
			writeError(w, http.StatusTooManyRequests, "daily generation limit reached (10 per day)", nil)
			return
		}
		if errors.Is(err, service.ErrBudgetExceeded) {
			writeError(w, http.StatusTooManyRequests, "AI daily budget reached — try again later or contact an admin", nil)
			return
		}
		writeError(w, http.StatusBadGateway, "AI generation failed: "+err.Error(), err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"questions":      result.Questions,
		"meta": map[string]any{
			"model":          result.Model,
			"generatedCount": len(result.Questions),
			"remainingToday": result.RemainingToday,
		},
	})
}
