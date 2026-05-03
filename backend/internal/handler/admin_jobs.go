package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/midoriya/flashlearn-backend/internal/cron"
	"gorm.io/gorm"
)

// AdminJobsHandler exposes a read-only view of the cron scheduler:
// canonical job list, last-run-per-job summary, and recent run history. Also
// supports manually triggering a job out-of-band ("Run now"). All routes are
// gated by RequireSuperadmin upstream.
type AdminJobsHandler struct {
	db        *gorm.DB
	scheduler *cron.Scheduler
}

func NewAdminJobs(db *gorm.DB, scheduler *cron.Scheduler) *AdminJobsHandler {
	return &AdminJobsHandler{db: db, scheduler: scheduler}
}

type adminJobSummary struct {
	Name         string  `json:"name"`
	LastStatus   string  `json:"lastStatus"`
	LastRunAt    string  `json:"lastRunAt"`
	LastDurMs    int     `json:"lastDurationMs"`
	LastError    string  `json:"lastError,omitempty"`
	Runs7d       int     `json:"runs7d"`
	Errors7d     int     `json:"errors7d"`
	SuccessRate  float64 `json:"successRate"`
}

// Summary handles GET /admin/jobs. Returns one row per known job (even if it
// has never run yet — those show with empty status), plus 7d run/error counts
// so admins can spot a job that's been failing for the past week without
// digging into the run history.
func (h *AdminJobsHandler) Summary(w http.ResponseWriter, r *http.Request) {
	names := h.scheduler.JobNames()

	type lastRow struct {
		Name       string
		Status     string
		Error      string
		StartedAt  string
		DurationMs int
	}
	lastSQL := `
		SELECT DISTINCT ON (name)
		  name,
		  status,
		  error,
		  to_char(started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS started_at,
		  duration_ms
		FROM job_runs
		ORDER BY name, started_at DESC`
	var lastRows []lastRow
	if err := h.db.WithContext(r.Context()).Raw(lastSQL).Scan(&lastRows).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load last job runs", err)
		return
	}
	lastByName := make(map[string]lastRow, len(lastRows))
	for _, l := range lastRows {
		lastByName[l.Name] = l
	}

	type weekRow struct {
		Name   string
		Total  int
		Errors int
	}
	weekSQL := `
		SELECT name,
		       COUNT(*)                                AS total,
		       COUNT(*) FILTER (WHERE status='error')  AS errors
		FROM job_runs
		WHERE started_at >= NOW() - INTERVAL '7 days'
		GROUP BY name`
	var weekRows []weekRow
	if err := h.db.WithContext(r.Context()).Raw(weekSQL).Scan(&weekRows).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load 7d job stats", err)
		return
	}
	weekByName := make(map[string]weekRow, len(weekRows))
	for _, wRow := range weekRows {
		weekByName[wRow.Name] = wRow
	}

	out := make([]adminJobSummary, 0, len(names))
	for _, name := range names {
		s := adminJobSummary{Name: name, LastStatus: ""}
		if l, ok := lastByName[name]; ok {
			s.LastStatus = l.Status
			s.LastRunAt = l.StartedAt
			s.LastDurMs = l.DurationMs
			s.LastError = l.Error
		}
		if wRow, ok := weekByName[name]; ok {
			s.Runs7d = wRow.Total
			s.Errors7d = wRow.Errors
			if wRow.Total > 0 {
				s.SuccessRate = float64(wRow.Total-wRow.Errors) / float64(wRow.Total)
			}
		}
		out = append(out, s)
	}
	writeJSON(w, http.StatusOK, out)
}

type adminJobRunRow struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	StartedAt  string `json:"startedAt"`
	FinishedAt string `json:"finishedAt"`
	DurationMs int    `json:"durationMs"`
	Status     string `json:"status"`
	Error      string `json:"error,omitempty"`
}

// History handles GET /admin/jobs/history?limit=100&name=daily-news.
func (h *AdminJobsHandler) History(w http.ResponseWriter, r *http.Request) {
	limit := 100
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 && n <= 500 {
			limit = n
		}
	}
	name := strings.TrimSpace(r.URL.Query().Get("name"))

	args := []any{}
	where := ""
	if name != "" {
		where = "WHERE name = ?"
		args = append(args, name)
	}
	args = append(args, limit)

	q := `
		SELECT
		  id,
		  name,
		  to_char(started_at  AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')                              AS started_at,
		  COALESCE(to_char(finished_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '')               AS finished_at,
		  duration_ms,
		  status,
		  error
		FROM job_runs
		` + where + `
		ORDER BY started_at DESC
		LIMIT ?`
	var rows []adminJobRunRow
	if err := h.db.WithContext(r.Context()).Raw(q, args...).Scan(&rows).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load job history", err)
		return
	}
	if rows == nil {
		rows = []adminJobRunRow{}
	}
	writeJSON(w, http.StatusOK, rows)
}

// RunNow handles POST /admin/jobs/:name/run.
//
// Fires the named job in a goroutine and returns immediately. The actual
// run is recorded in job_runs by the scheduler's normal path, so it shows
// up in History on the next refresh.
func (h *AdminJobsHandler) RunNow(w http.ResponseWriter, r *http.Request) {
	name := pathVal(r, "name")
	if name == "" {
		writeError(w, http.StatusBadRequest, "job name required", nil)
		return
	}
	if err := h.scheduler.RunNow(name); err != nil {
		writeError(w, http.StatusBadRequest, err.Error(), err)
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]string{"status": "started", "name": name})
}
