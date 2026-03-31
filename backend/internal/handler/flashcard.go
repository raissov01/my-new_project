package handler

import (
	"net/http"

	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/model"
	"github.com/midoriya/flashlearn-backend/internal/service"
)

type FlashcardHandler struct {
	svc *service.Flashcard
	env string
}

func NewFlashcard(svc *service.Flashcard, env string) *FlashcardHandler {
	return &FlashcardHandler{svc: svc, env: env}
}

// CreateSet handles POST /api/v1/sets
func (h *FlashcardHandler) CreateSet(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())

	var req model.CreateSetRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	setID, err := h.svc.CreateSet(r.Context(), userID, req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{"id": setID})
}

// UpdateSet handles PUT /api/v1/sets/{setID}
func (h *FlashcardHandler) UpdateSet(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())
	setID := r.PathValue("setID")

	var req model.UpdateSetRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	if err := h.svc.UpdateSet(r.Context(), userID, setID, req); err != nil {
		if err.Error() == "access denied" {
			writeError(w, http.StatusForbidden, "access denied", nil)
			return
		}
		writeError(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// DeleteSet handles DELETE /api/v1/sets/{setID}
func (h *FlashcardHandler) DeleteSet(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())
	setID := r.PathValue("setID")

	if err := h.svc.DeleteSet(r.Context(), userID, setID); err != nil {
		writeError(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// GetSet handles GET /api/v1/sets/{setID}
func (h *FlashcardHandler) GetSet(w http.ResponseWriter, r *http.Request) {
	setID := r.PathValue("setID")

	set, err := h.svc.GetSetByID(r.Context(), setID)
	if err != nil {
		writeError(w, http.StatusNotFound, "set not found", err)
		return
	}

	writeJSON(w, http.StatusOK, set)
}
