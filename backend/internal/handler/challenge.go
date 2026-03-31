package handler

import (
	"net/http"

	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/model"
	"github.com/midoriya/flashlearn-backend/internal/service"
)

type ChallengeHandler struct {
	svc *service.ChallengeService
	env string
}

func NewChallengeHandler(svc *service.ChallengeService, env string) *ChallengeHandler {
	return &ChallengeHandler{svc: svc, env: env}
}

// SaveAttempt handles POST /api/v1/challenges/attempt
func (h *ChallengeHandler) SaveAttempt(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())

	var input model.ChallengeAttemptInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	if err := h.svc.SaveAttempt(r.Context(), userID, input); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save attempt", err)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{"status": "ok"})
}

// GetRanking handles GET /api/v1/challenges/ranking/{setID}
func (h *ChallengeHandler) GetRanking(w http.ResponseWriter, r *http.Request) {
	setID := r.PathValue("setID")

	ranking, err := h.svc.GetRanking(r.Context(), setID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error(), nil)
		return
	}

	writeJSON(w, http.StatusOK, ranking)
}

// SaveClassAttempt handles POST /api/v1/challenges/class-attempt
func (h *ChallengeHandler) SaveClassAttempt(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())

	var input model.ClassChallengeAttemptInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	if err := h.svc.SaveClassChallengeAttempt(r.Context(), userID, input); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error(), err)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{"status": "ok"})
}
