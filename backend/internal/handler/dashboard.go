package handler

import (
	"log"
	"net/http"

	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/service"
)

// Dashboard handles HTTP requests for teacher and student dashboard summaries.
type Dashboard struct {
	svc *service.Dashboard
	env string
}

func NewDashboard(svc *service.Dashboard, env string) *Dashboard {
	return &Dashboard{svc: svc, env: env}
}

func (h *Dashboard) isDev() bool {
	return h.env == "development"
}

func (h *Dashboard) GetTeacherSummary(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	resp, err := h.svc.GetTeacherSummary(r.Context(), userID)
	if err != nil {
		log.Printf("teacher dashboard error: %v", err)
		msg := "failed to load teacher dashboard"
		if h.isDev() {
			msg = err.Error()
		}
		writeError(w, http.StatusInternalServerError, msg, err)
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *Dashboard) GetStudentSummary(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	resp, err := h.svc.GetStudentSummary(r.Context(), userID)
	if err != nil {
		log.Printf("student dashboard error: %v", err)
		msg := "failed to load student dashboard"
		if h.isDev() {
			msg = err.Error()
		}
		writeError(w, http.StatusInternalServerError, msg, err)
		return
	}

	writeJSON(w, http.StatusOK, resp)
}
