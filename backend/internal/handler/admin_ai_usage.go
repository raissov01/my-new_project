package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// AdminAIUsageHandler exposes read-only aggregations over ai_usage_events
// for the superadmin "AI cost" dashboard. All routes are gated by
// RequireSuperadmin upstream.
type AdminAIUsageHandler struct {
	db *gorm.DB
}

func NewAdminAIUsage(db *gorm.DB) *AdminAIUsageHandler {
	return &AdminAIUsageHandler{db: db}
}

type aiUsageWindow struct {
	Events       int64   `json:"events"`
	ErrorEvents  int64   `json:"errorEvents"`
	PromptTokens int64   `json:"promptTokens"`
	CompletionTokens int64 `json:"completionTokens"`
	CostUSD      float64 `json:"costUsd"`
	AvgLatencyMs float64 `json:"avgLatencyMs"`
}

type aiUsageBreakdownRow struct {
	Key      string  `json:"key"`
	Events   int64   `json:"events"`
	Tokens   int64   `json:"tokens"`
	CostUSD  float64 `json:"costUsd"`
}

type aiUsageSummaryResponse struct {
	Last24h      aiUsageWindow         `json:"last24h"`
	Last7d       aiUsageWindow         `json:"last7d"`
	Last30d      aiUsageWindow         `json:"last30d"`
	ByModel      []aiUsageBreakdownRow `json:"byModel"`
	ByFeature    []aiUsageBreakdownRow `json:"byFeature"`
	ByProvider   []aiUsageBreakdownRow `json:"byProvider"`
	TopUsers     []aiUsageBreakdownRow `json:"topUsers"`
}

// Summary handles GET /admin/ai-usage/summary.
//
// Returns rolling 24h / 7d / 30d totals plus top breakdowns by model,
// feature, provider, and user (over the last 30d window so per-user costs
// don't get lost in noise from older events).
func (h *AdminAIUsageHandler) Summary(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	windowSQL := `
		SELECT
		  COUNT(*)                                                AS events,
		  COUNT(*) FILTER (WHERE error <> '')                     AS error_events,
		  COALESCE(SUM(prompt_tokens), 0)                         AS prompt_tokens,
		  COALESCE(SUM(completion_tokens), 0)                     AS completion_tokens,
		  COALESCE(SUM(cost_usd), 0)::float8                      AS cost_usd,
		  COALESCE(AVG(latency_ms) FILTER (WHERE error = ''), 0)::float8 AS avg_latency_ms
		FROM ai_usage_events
		WHERE created_at >= NOW() - ?::interval`

	type windowScan struct {
		Events           int64
		ErrorEvents      int64
		PromptTokens     int64
		CompletionTokens int64
		CostUsd          float64
		AvgLatencyMs     float64
	}
	scanWindow := func(interval string) (aiUsageWindow, error) {
		var s windowScan
		if err := h.db.WithContext(ctx).Raw(windowSQL, interval).Scan(&s).Error; err != nil {
			return aiUsageWindow{}, err
		}
		return aiUsageWindow{
			Events:           s.Events,
			ErrorEvents:      s.ErrorEvents,
			PromptTokens:     s.PromptTokens,
			CompletionTokens: s.CompletionTokens,
			CostUSD:          s.CostUsd,
			AvgLatencyMs:     s.AvgLatencyMs,
		}, nil
	}

	last24h, err := scanWindow("24 hours")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to summarize ai usage (24h)", err)
		return
	}
	last7d, err := scanWindow("7 days")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to summarize ai usage (7d)", err)
		return
	}
	last30d, err := scanWindow("30 days")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to summarize ai usage (30d)", err)
		return
	}

	loadBreakdown := func(column, joinSQL string, limit int) ([]aiUsageBreakdownRow, error) {
		query := `
			SELECT
			  ` + column + ` AS key,
			  COUNT(*)                                  AS events,
			  COALESCE(SUM(prompt_tokens + completion_tokens), 0) AS tokens,
			  COALESCE(SUM(cost_usd), 0)::float8        AS cost_usd
			FROM ai_usage_events e
			` + joinSQL + `
			WHERE e.created_at >= NOW() - INTERVAL '30 days'
			GROUP BY ` + column + `
			ORDER BY cost_usd DESC, events DESC
			LIMIT ?`
		var out []aiUsageBreakdownRow
		if err := h.db.WithContext(ctx).Raw(query, limit).Scan(&out).Error; err != nil {
			return nil, err
		}
		return out, nil
	}

	byModel, err := loadBreakdown("e.model", "", 20)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load model breakdown", err)
		return
	}
	byFeature, err := loadBreakdown("e.feature", "", 20)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load feature breakdown", err)
		return
	}
	byProvider, err := loadBreakdown("e.provider", "", 10)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load provider breakdown", err)
		return
	}

	// Top users: render a friendly key (username or email) instead of UUID.
	topUsersSQL := `
		SELECT
		  COALESCE(NULLIF(u.username, ''), u.email, e.user_id::text, 'anonymous') AS key,
		  COUNT(*)                                                                AS events,
		  COALESCE(SUM(prompt_tokens + completion_tokens), 0)                     AS tokens,
		  COALESCE(SUM(cost_usd), 0)::float8                                      AS cost_usd
		FROM ai_usage_events e
		LEFT JOIN users u ON u.id = e.user_id
		WHERE e.created_at >= NOW() - INTERVAL '30 days'
		GROUP BY key
		ORDER BY cost_usd DESC, events DESC
		LIMIT 20`
	var topUsers []aiUsageBreakdownRow
	if err := h.db.WithContext(ctx).Raw(topUsersSQL).Scan(&topUsers).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load top users", err)
		return
	}

	if byModel == nil {
		byModel = []aiUsageBreakdownRow{}
	}
	if byFeature == nil {
		byFeature = []aiUsageBreakdownRow{}
	}
	if byProvider == nil {
		byProvider = []aiUsageBreakdownRow{}
	}
	if topUsers == nil {
		topUsers = []aiUsageBreakdownRow{}
	}

	writeJSON(w, http.StatusOK, aiUsageSummaryResponse{
		Last24h:    last24h,
		Last7d:     last7d,
		Last30d:    last30d,
		ByModel:    byModel,
		ByFeature:  byFeature,
		ByProvider: byProvider,
		TopUsers:   topUsers,
	})
}

type aiUsageDailyPoint struct {
	Day      string  `json:"day"`
	Events   int64   `json:"events"`
	Tokens   int64   `json:"tokens"`
	CostUSD  float64 `json:"costUsd"`
	Errors   int64   `json:"errors"`
}

// Daily handles GET /admin/ai-usage/daily?days=30.
//
// Returns one point per UTC day for the requested window. Days with zero
// events are filled in (via a generate_series), so the chart renders a
// continuous line instead of skipping gaps.
func (h *AdminAIUsageHandler) Daily(w http.ResponseWriter, r *http.Request) {
	days := 30
	if raw := strings.TrimSpace(r.URL.Query().Get("days")); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 && n <= 365 {
			days = n
		}
	}

	query := `
		WITH series AS (
		  SELECT generate_series(
		    (CURRENT_DATE - (?::int - 1) * INTERVAL '1 day')::date,
		    CURRENT_DATE,
		    INTERVAL '1 day'
		  )::date AS day
		),
		agg AS (
		  SELECT
		    (created_at AT TIME ZONE 'UTC')::date AS day,
		    COUNT(*)                              AS events,
		    SUM(prompt_tokens + completion_tokens) AS tokens,
		    SUM(cost_usd)::float8                  AS cost_usd,
		    COUNT(*) FILTER (WHERE error <> '')   AS errors
		  FROM ai_usage_events
		  WHERE created_at >= CURRENT_DATE - (?::int - 1) * INTERVAL '1 day'
		  GROUP BY 1
		)
		SELECT
		  to_char(s.day, 'YYYY-MM-DD')           AS day,
		  COALESCE(a.events,   0)                AS events,
		  COALESCE(a.tokens,   0)                AS tokens,
		  COALESCE(a.cost_usd, 0)::float8        AS cost_usd,
		  COALESCE(a.errors,   0)                AS errors
		FROM series s
		LEFT JOIN agg a ON a.day = s.day
		ORDER BY s.day ASC`

	var rows []aiUsageDailyPoint
	if err := h.db.WithContext(r.Context()).Raw(query, days, days).Scan(&rows).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load daily ai usage", err)
		return
	}
	if rows == nil {
		rows = []aiUsageDailyPoint{}
	}
	writeJSON(w, http.StatusOK, rows)
}

type aiCostSettingsResponse struct {
	DailyUserUSDCap   float64 `json:"dailyUserUsdCap"`
	DailyGlobalUSDCap float64 `json:"dailyGlobalUsdCap"`
	UpdatedAt         string  `json:"updatedAt"`
}

// Settings handles GET /admin/ai-usage/settings.
//
// Returns the current caps (or defaults if no row has been written yet).
// A zero cap means "unlimited" — the budget check skips that dimension.
func (h *AdminAIUsageHandler) Settings(w http.ResponseWriter, r *http.Request) {
	var s models.AICostSetting
	err := h.db.WithContext(r.Context()).First(&s, "id = 1").Error
	if err != nil && err != gorm.ErrRecordNotFound {
		writeError(w, http.StatusInternalServerError, "failed to load ai cost settings", err)
		return
	}
	resp := aiCostSettingsResponse{
		DailyUserUSDCap:   s.DailyUserUSDCap,
		DailyGlobalUSDCap: s.DailyGlobalUSDCap,
	}
	if !s.UpdatedAt.IsZero() {
		resp.UpdatedAt = s.UpdatedAt.UTC().Format("2006-01-02T15:04:05Z")
	}
	writeJSON(w, http.StatusOK, resp)
}

// UpdateSettings handles PATCH /admin/ai-usage/settings.
//
// Upserts the singleton row at id=1. Negative values are rejected; zero is
// allowed and means "unlimited" for that dimension.
func (h *AdminAIUsageHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	var body struct {
		DailyUserUSDCap   float64 `json:"dailyUserUsdCap"`
		DailyGlobalUSDCap float64 `json:"dailyGlobalUsdCap"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}
	if body.DailyUserUSDCap < 0 || body.DailyGlobalUSDCap < 0 {
		writeError(w, http.StatusBadRequest, "caps must be >= 0", nil)
		return
	}

	row := models.AICostSetting{
		ID:                1,
		DailyUserUSDCap:   body.DailyUserUSDCap,
		DailyGlobalUSDCap: body.DailyGlobalUSDCap,
	}
	if uid, ok := middleware.UserIDFromContext(r.Context()); ok && uid != "" {
		row.UpdatedBy = &uid
	}
	if err := h.db.WithContext(r.Context()).Save(&row).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save ai cost settings", err)
		return
	}
	writeJSON(w, http.StatusOK, aiCostSettingsResponse{
		DailyUserUSDCap:   row.DailyUserUSDCap,
		DailyGlobalUSDCap: row.DailyGlobalUSDCap,
		UpdatedAt:         row.UpdatedAt.UTC().Format("2006-01-02T15:04:05Z"),
	})
}

type aiCostBlockRow struct {
	ID        string  `json:"id"`
	UserID    *string `json:"userId,omitempty"`
	Username  string  `json:"username,omitempty"`
	Email     string  `json:"email,omitempty"`
	Feature   string  `json:"feature"`
	Reason    string  `json:"reason"`
	UsageUSD  float64 `json:"usageUsd"`
	CapUSD    float64 `json:"capUsd"`
	CreatedAt string  `json:"createdAt"`
}

// Blocks handles GET /admin/ai-usage/blocks?limit=50.
//
// Most-recent-first list of refused AI calls so admins can spot abuse or
// runaway features that keep tripping the cap.
func (h *AdminAIUsageHandler) Blocks(w http.ResponseWriter, r *http.Request) {
	limit := 50
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 && n <= 500 {
			limit = n
		}
	}

	type scan struct {
		ID        string
		UserID    *string
		Username  *string
		Email     *string
		Feature   string
		Reason    string
		UsageUSD  float64
		CapUSD    float64
		CreatedAt string
	}
	q := `
		SELECT
		  b.id,
		  b.user_id,
		  u.username,
		  u.email,
		  b.feature,
		  b.reason,
		  b.usage_usd::float8 AS usage_usd,
		  b.cap_usd::float8   AS cap_usd,
		  to_char(b.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
		FROM ai_cost_blocks b
		LEFT JOIN users u ON u.id = b.user_id
		ORDER BY b.created_at DESC
		LIMIT ?`
	var rows []scan
	if err := h.db.WithContext(r.Context()).Raw(q, limit).Scan(&rows).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load ai cost blocks", err)
		return
	}

	out := make([]aiCostBlockRow, 0, len(rows))
	for _, s := range rows {
		row := aiCostBlockRow{
			ID:        s.ID,
			UserID:    s.UserID,
			Feature:   s.Feature,
			Reason:    s.Reason,
			UsageUSD:  s.UsageUSD,
			CapUSD:    s.CapUSD,
			CreatedAt: s.CreatedAt,
		}
		if s.Username != nil {
			row.Username = *s.Username
		}
		if s.Email != nil {
			row.Email = *s.Email
		}
		out = append(out, row)
	}
	writeJSON(w, http.StatusOK, out)
}
