package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/service"
)

// Leaderboard handles HTTP requests for the leaderboard feature.
type Leaderboard struct {
	svc *service.Leaderboard
	env string // "development" or "production"
}

func NewLeaderboard(svc *service.Leaderboard, env string) *Leaderboard {
	return &Leaderboard{svc: svc, env: env}
}

func (h *Leaderboard) isDev() bool {
	return h.env == "development"
}

// GetLeaderboard handles GET /api/v1/leaderboard?period=alltime&limit=20
func (h *Leaderboard) GetLeaderboard(w http.ResponseWriter, r *http.Request) {
	period := r.URL.Query().Get("period")
	if period == "" {
		period = "alltime"
	}
	// Validate period
	switch period {
	case "daily", "weekly", "alltime":
		// ok
	default:
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid period: must be daily, weekly, or alltime"})
		return
	}

	limit := 20
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	// Extract user ID from auth context (may be empty for unauthenticated requests)
	userID, _ := middleware.UserIDFromContext(r.Context())

	resp, err := h.svc.Get(r.Context(), period, limit, userID)
	if err != nil {
		log.Printf("leaderboard error: %v", err)
		msg := "failed to load leaderboard"
		if h.isDev() {
			msg = err.Error()
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": msg})
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
