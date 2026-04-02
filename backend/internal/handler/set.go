package handler

import (
	"log"
	"net/http"

	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/service"
)

// Set handles HTTP requests for flashcard set data.
type Set struct {
	svc *service.Set
	env string
}

func NewSet(svc *service.Set, env string) *Set {
	return &Set{svc: svc, env: env}
}

func (h *Set) isDev() bool {
	return h.env == "development"
}

func (h *Set) GetOverview(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	resp, err := h.svc.GetOverview(r.Context(), userID)
	if err != nil {
		log.Printf("set overview error: %v", err)
		msg := "failed to load sets overview"
		if h.isDev() {
			msg = err.Error()
		}
		writeError(w, http.StatusInternalServerError, msg, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"items": resp,
	})
}

func (h *Set) GetPublicOverview(w http.ResponseWriter, r *http.Request) {
	resp, err := h.svc.GetPublicOverview(r.Context())
	if err != nil {
		log.Printf("public set overview error: %v", err)
		msg := "failed to load public sets"
		if h.isDev() {
			msg = err.Error()
		}
		writeError(w, http.StatusInternalServerError, msg, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"items": resp,
	})
}
