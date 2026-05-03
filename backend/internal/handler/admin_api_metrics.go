package handler

import (
	"net/http"

	"github.com/midoriya/flashlearn-backend/internal/apimetrics"
	"github.com/midoriya/flashlearn-backend/internal/database"
)

// AdminAPIMetricsHandler exposes the in-process per-route counters and
// the last AutoMigrate result.
type AdminAPIMetricsHandler struct{}

func NewAdminAPIMetrics() *AdminAPIMetricsHandler {
	return &AdminAPIMetricsHandler{}
}

type apiMetricsMigration struct {
	LastRunAt   string  `json:"lastRunAt"`
	DurationMs  float64 `json:"durationMs"`
	Error       string  `json:"error"`
	OK          bool    `json:"ok"`
}

type apiMetricsResponse struct {
	apimetrics.Snapshot
	Migration apiMetricsMigration `json:"migration"`
}

// GET /admin/api-metrics
func (h *AdminAPIMetricsHandler) Snapshot(w http.ResponseWriter, r *http.Request) {
	snap := apimetrics.Take()

	at, dur, errMsg := database.MigrationStatus()
	migration := apiMetricsMigration{
		Error: errMsg,
		OK:    errMsg == "",
	}
	if !at.IsZero() {
		migration.LastRunAt = at.UTC().Format("2006-01-02T15:04:05Z")
		migration.DurationMs = float64(dur.Microseconds()) / 1000.0
	}

	jsonOK(w, apiMetricsResponse{Snapshot: snap, Migration: migration})
}
