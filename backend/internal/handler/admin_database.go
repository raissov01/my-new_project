package handler

import (
	"net/http"
	"strconv"
	"strings"

	"gorm.io/gorm"
)

// AdminDatabaseHandler exposes Postgres' own statistics views for the admin
// "Database" page: per-table sizes, row counts, dead tuples (vacuum
// pressure), and the top long-running activity from pg_stat_activity.
//
// All queries hit pg_catalog / information_schema views directly — no
// extensions required (pg_stat_statements would give us slow-query history
// but we can't assume it's enabled in the prod cluster).
type AdminDatabaseHandler struct {
	db *gorm.DB
}

func NewAdminDatabase(db *gorm.DB) *AdminDatabaseHandler {
	return &AdminDatabaseHandler{db: db}
}

type adminDBTableRow struct {
	Schema       string  `json:"schema"`
	Name         string  `json:"name"`
	RowCount     int64   `json:"rowCount"`
	TotalBytes   int64   `json:"totalBytes"`
	IndexBytes   int64   `json:"indexBytes"`
	DeadTuples   int64   `json:"deadTuples"`
	DeadFraction float64 `json:"deadFraction"`
	LastVacuum   string  `json:"lastVacuum,omitempty"`
	LastAnalyze  string  `json:"lastAnalyze,omitempty"`
}

type adminDBActivityRow struct {
	PID            int    `json:"pid"`
	State          string `json:"state"`
	WaitEvent      string `json:"waitEvent,omitempty"`
	UsernameLogin  string `json:"username,omitempty"`
	ApplicationName string `json:"applicationName,omitempty"`
	ClientAddr     string `json:"clientAddr,omitempty"`
	QueryStart     string `json:"queryStart,omitempty"`
	DurationMs     float64 `json:"durationMs"`
	Query          string `json:"query"`
}

type adminDBSummary struct {
	Database     string             `json:"database"`
	Version      string             `json:"version"`
	SizeBytes    int64              `json:"sizeBytes"`
	Connections  int                `json:"connections"`
	IdleInTx     int                `json:"idleInTransaction"`
	Tables       []adminDBTableRow  `json:"tables"`
	Activity     []adminDBActivityRow `json:"activity"`
}

// Summary handles GET /admin/database. Tables are returned sorted by total
// size (heap+indexes) — that's the dimension admins reach for first when a
// disk-pressure alert fires.
func (h *AdminDatabaseHandler) Summary(w http.ResponseWriter, r *http.Request) {
	limit := 30
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 && n <= 200 {
			limit = n
		}
	}

	ctx := r.Context()
	out := adminDBSummary{}

	if err := h.db.WithContext(ctx).Raw(`SELECT current_database()`).Scan(&out.Database).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "current_database failed", err)
		return
	}
	if err := h.db.WithContext(ctx).Raw(`SELECT version()`).Scan(&out.Version).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "version() failed", err)
		return
	}
	if err := h.db.WithContext(ctx).Raw(
		`SELECT pg_database_size(current_database())`,
	).Scan(&out.SizeBytes).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "pg_database_size failed", err)
		return
	}

	type connectionScan struct {
		State string
		N     int
	}
	var conns []connectionScan
	if err := h.db.WithContext(ctx).Raw(`
		SELECT COALESCE(state, 'unknown') AS state, COUNT(*) AS n
		FROM pg_stat_activity
		WHERE datname = current_database()
		GROUP BY state`).Scan(&conns).Error; err == nil {
		for _, c := range conns {
			out.Connections += c.N
			if c.State == "idle in transaction" {
				out.IdleInTx = c.N
			}
		}
	}

	tablesSQL := `
		SELECT
		  n.nspname                                      AS schema,
		  c.relname                                      AS name,
		  COALESCE(s.n_live_tup, 0)::bigint              AS row_count,
		  pg_total_relation_size(c.oid)::bigint          AS total_bytes,
		  pg_indexes_size(c.oid)::bigint                 AS index_bytes,
		  COALESCE(s.n_dead_tup, 0)::bigint              AS dead_tuples,
		  CASE WHEN COALESCE(s.n_live_tup, 0) > 0
		       THEN s.n_dead_tup::float8 / (s.n_live_tup + s.n_dead_tup)
		       ELSE 0 END                                AS dead_fraction,
		  COALESCE(to_char(GREATEST(s.last_vacuum,  s.last_autovacuum)  AT TIME ZONE 'UTC',
		                   'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '')           AS last_vacuum,
		  COALESCE(to_char(GREATEST(s.last_analyze, s.last_autoanalyze) AT TIME ZONE 'UTC',
		                   'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '')           AS last_analyze
		FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		LEFT JOIN pg_stat_all_tables s ON s.relid = c.oid
		WHERE c.relkind = 'r'
		  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
		ORDER BY pg_total_relation_size(c.oid) DESC
		LIMIT ?`
	if err := h.db.WithContext(ctx).Raw(tablesSQL, limit).Scan(&out.Tables).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "table stats failed", err)
		return
	}
	if out.Tables == nil {
		out.Tables = []adminDBTableRow{}
	}

	activitySQL := `
		SELECT
		  pid,
		  COALESCE(state, '')                                                  AS state,
		  COALESCE(wait_event, '')                                             AS wait_event,
		  COALESCE(usename, '')                                                AS username_login,
		  COALESCE(application_name, '')                                       AS application_name,
		  COALESCE(host(client_addr), '')                                      AS client_addr,
		  COALESCE(to_char(query_start AT TIME ZONE 'UTC',
		                   'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '')                  AS query_start,
		  COALESCE(EXTRACT(EPOCH FROM (NOW() - query_start)) * 1000, 0)::float8 AS duration_ms,
		  LEFT(COALESCE(query, ''), 500)                                       AS query
		FROM pg_stat_activity
		WHERE datname = current_database()
		  AND pid <> pg_backend_pid()
		  AND state <> 'idle'
		ORDER BY query_start NULLS LAST
		LIMIT 25`
	if err := h.db.WithContext(ctx).Raw(activitySQL).Scan(&out.Activity).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "activity query failed", err)
		return
	}
	if out.Activity == nil {
		out.Activity = []adminDBActivityRow{}
	}

	writeJSON(w, http.StatusOK, out)
}
