package handler

import (
	"errors"
	"log"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/service"
)

// Profile handles HTTP requests for the authenticated user's profile.
type Profile struct {
	svc *service.Profile
	env string
}

func NewProfile(svc *service.Profile, env string) *Profile {
	return &Profile{svc: svc, env: env}
}

func (h *Profile) isDev() bool {
	return h.env == "development"
}

func (h *Profile) GetMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	resp, err := h.svc.GetMe(r.Context(), userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "profile not found", err)
			return
		}

		log.Printf("profile error: %v", err)
		msg := "failed to load profile"
		if h.isDev() {
			msg = err.Error()
		}
		writeError(w, http.StatusInternalServerError, msg, err)
		return
	}

	writeJSON(w, http.StatusOK, resp)
}
