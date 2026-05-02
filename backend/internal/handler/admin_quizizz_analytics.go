package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/midoriya/flashlearn-backend/internal/service"
	"gorm.io/gorm"
)

// AdminQuizizzAnalyticsHandler exposes the read-only Quizizz dashboard
// queries. All routes are gated by RequireSuperadmin upstream.
type AdminQuizizzAnalyticsHandler struct {
	svc *service.QuizizzAnalyticsService
}

func NewAdminQuizizzAnalytics(db *gorm.DB) *AdminQuizizzAnalyticsHandler {
	return &AdminQuizizzAnalyticsHandler{svc: service.NewQuizizzAnalytics(db)}
}

// Summary handles GET /admin/quizizz/analytics/summary.
func (h *AdminQuizizzAnalyticsHandler) Summary(w http.ResponseWriter, r *http.Request) {
	summary, err := h.svc.Summary(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to compute summary", err)
		return
	}
	writeJSON(w, http.StatusOK, summary)
}

// Daily handles GET /admin/quizizz/analytics/daily?days=30.
func (h *AdminQuizizzAnalyticsHandler) Daily(w http.ResponseWriter, r *http.Request) {
	days := 30
	if raw := strings.TrimSpace(r.URL.Query().Get("days")); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			days = n
		}
	}
	stats, err := h.svc.Daily(r.Context(), days)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to compute daily stats", err)
		return
	}
	writeJSON(w, http.StatusOK, stats)
}
