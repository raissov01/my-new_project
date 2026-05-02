package handler

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/auditlog"
	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// AdminQuizzesHandler — read + moderate quizzes from the superadmin panel.
type AdminQuizzesHandler struct {
	db *gorm.DB
}

func NewAdminQuizzes(db *gorm.DB) *AdminQuizzesHandler {
	return &AdminQuizzesHandler{db: db}
}

type adminQuizRow struct {
	ID              string `json:"id"`
	Title           string `json:"title"`
	OwnerID         string `json:"ownerId"`
	OwnerEmail      string `json:"ownerEmail"`
	OwnerUsername   string `json:"ownerUsername"`
	IsPublic        bool   `json:"isPublic"`
	IsHiddenByAdmin bool   `json:"isHiddenByAdmin"`
	QuestionCount   int    `json:"questionCount"`
	AttemptCount    int    `json:"attemptCount"`
	CreatedAt       string `json:"createdAt"`
}

type adminQuizzesResponse struct {
	Items      []adminQuizRow `json:"items"`
	Total      int64          `json:"total"`
	Page       int            `json:"page"`
	PageSize   int            `json:"pageSize"`
	TotalPages int            `json:"totalPages"`
}

// adminQuizScanRow matches the SELECT columns we use below.
type adminQuizScanRow struct {
	ID              string
	Title           string
	OwnerID         string
	OwnerEmail      string
	OwnerUsername   string
	IsPublic        bool
	IsHiddenByAdmin bool
	QuestionCount   int
	AttemptCount    int
	CreatedAt       string
}

// List handles GET /admin/quizzes.
func (h *AdminQuizzesHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, pageSize := parsePagination(q.Get("page"), q.Get("pageSize"), 25, 100)
	search := strings.TrimSpace(q.Get("search"))
	isPublicFilter := strings.TrimSpace(q.Get("isPublic")) // "true"/"false"/""

	args := []any{}
	where := []string{}
	if search != "" {
		where = append(where, "LOWER(z.title) LIKE ?")
		args = append(args, "%"+strings.ToLower(search)+"%")
	}
	if isPublicFilter == "true" {
		where = append(where, "z.is_public = TRUE")
	} else if isPublicFilter == "false" {
		where = append(where, "z.is_public = FALSE")
	}
	whereSQL := ""
	if len(where) > 0 {
		whereSQL = "WHERE " + strings.Join(where, " AND ")
	}

	// Count first (no joins needed).
	var total int64
	countQuery := "SELECT COUNT(*) FROM quizzes z " + whereSQL
	if err := h.db.WithContext(r.Context()).Raw(countQuery, args...).Scan(&total).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to count quizzes", err)
		return
	}

	listArgs := append([]any{}, args...)
	listArgs = append(listArgs, pageSize, (page-1)*pageSize)
	listQuery := `
		SELECT
		  z.id                     AS id,
		  z.title                  AS title,
		  z.user_id                AS owner_id,
		  COALESCE(u.email,'')     AS owner_email,
		  COALESCE(u.username,'')  AS owner_username,
		  z.is_public              AS is_public,
		  z.is_hidden_by_admin     AS is_hidden_by_admin,
		  COALESCE(qc.cnt, 0)      AS question_count,
		  COALESCE(ac.cnt, 0)      AS attempt_count,
		  to_char(z.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
		FROM quizzes z
		LEFT JOIN users u ON u.id = z.user_id
		LEFT JOIN (SELECT quiz_id, COUNT(*) AS cnt FROM quiz_questions GROUP BY quiz_id) qc ON qc.quiz_id = z.id
		LEFT JOIN (SELECT quiz_id, COUNT(*) AS cnt FROM quiz_attempts  GROUP BY quiz_id) ac ON ac.quiz_id = z.id
		` + whereSQL + `
		ORDER BY z.created_at DESC
		LIMIT ? OFFSET ?`

	var rows []adminQuizScanRow
	if err := h.db.WithContext(r.Context()).Raw(listQuery, listArgs...).Scan(&rows).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list quizzes", err)
		return
	}

	out := make([]adminQuizRow, 0, len(rows))
	for _, r := range rows {
		out = append(out, adminQuizRow{
			ID:              r.ID,
			Title:           r.Title,
			OwnerID:         r.OwnerID,
			OwnerEmail:      r.OwnerEmail,
			OwnerUsername:   r.OwnerUsername,
			IsPublic:        r.IsPublic,
			IsHiddenByAdmin: r.IsHiddenByAdmin,
			QuestionCount:   r.QuestionCount,
			AttemptCount:    r.AttemptCount,
			CreatedAt:       r.CreatedAt,
		})
	}

	writeJSON(w, http.StatusOK, adminQuizzesResponse{
		Items:      out,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages(total, pageSize),
	})
}

type adminQuizPatchRequest struct {
	IsPublic        *bool `json:"isPublic,omitempty"`
	IsHiddenByAdmin *bool `json:"isHiddenByAdmin,omitempty"`
}

// Patch handles PATCH /admin/quizzes/:id.
func (h *AdminQuizzesHandler) Patch(w http.ResponseWriter, r *http.Request) {
	quizID := strings.TrimSpace(r.PathValue("id"))
	if quizID == "" {
		writeError(w, http.StatusBadRequest, "missing quiz id", nil)
		return
	}

	var req adminQuizPatchRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	var before models.Quiz
	if err := h.db.WithContext(r.Context()).First(&before, "id = ?", quizID).Error; err != nil {
		writeError(w, http.StatusNotFound, "quiz not found", err)
		return
	}

	updates := map[string]any{}
	if req.IsPublic != nil {
		updates["is_public"] = *req.IsPublic
	}
	if req.IsHiddenByAdmin != nil {
		updates["is_hidden_by_admin"] = *req.IsHiddenByAdmin
	}
	if len(updates) == 0 {
		writeError(w, http.StatusBadRequest, "no fields to update", nil)
		return
	}

	if err := h.db.WithContext(r.Context()).Model(&before).Updates(updates).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update quiz", err)
		return
	}

	var after models.Quiz
	h.db.WithContext(r.Context()).First(&after, "id = ?", quizID)

	adminID, _ := middleware.UserIDFromContext(r.Context())
	if strings.TrimSpace(adminID) == "" {
		adminID = strings.TrimSpace(r.Header.Get("X-User-ID"))
	}

	auditlog.Record(
		h.db, adminID, "quiz.patch", "quiz", &quizID,
		summarizeQuizAudit(before), summarizeQuizAudit(after),
		ipFromContext(r),
	)

	writeJSON(w, http.StatusOK, summarizeQuizAudit(after))
}

func summarizeQuizAudit(q models.Quiz) map[string]any {
	return map[string]any{
		"id":              q.ID,
		"title":           q.Title,
		"isPublic":        q.IsPublic,
		"isHiddenByAdmin": q.IsHiddenByAdmin,
	}
}

// ── Per-quiz analytics ─────────────────────────────────────────────────────

type quizAnalyticsCounts struct {
	Opens                int     `json:"opens"`
	Starts               int     `json:"starts"`
	Finishes             int     `json:"finishes"`
	Abandons             int     `json:"abandons"`
	DistinctPlayersTotal int     `json:"distinct_players_total"`
	DistinctSignedIn     int     `json:"distinct_signed_in"`
	DistinctGuests       int     `json:"distinct_guests"`
	AvgScore             float64 `json:"avg_score"`
	CompletionRate       float64 `json:"completion_rate"`
}

type quizDailyRow struct {
	Date     string `json:"date"`
	Opens    int    `json:"opens"`
	Starts   int    `json:"starts"`
	Finishes int    `json:"finishes"`
}

type quizRecentAttempt struct {
	ID              string  `json:"id"`
	UserID          *string `json:"user_id,omitempty"`
	Username        *string `json:"username,omitempty"`
	Email           *string `json:"email,omitempty"`
	Score           int     `json:"score"`
	TotalQuestions  int     `json:"total_questions"`
	DurationSeconds int     `json:"duration_seconds"`
	CreatedAt       string  `json:"created_at"`
}

type quizAnalyticsHeader struct {
	ID            string `json:"id"`
	Title         string `json:"title"`
	OwnerID       string `json:"owner_id"`
	OwnerUsername string `json:"owner_username"`
	OwnerEmail    string `json:"owner_email"`
	IsPublic      bool   `json:"is_public"`
	IsHidden      bool   `json:"is_hidden_by_admin"`
	QuestionCount int    `json:"question_count"`
	CreatedAt     string `json:"created_at"`
}

type quizAnalyticsResponse struct {
	Quiz           quizAnalyticsHeader `json:"quiz"`
	Counts         quizAnalyticsCounts `json:"counts"`
	Daily          []quizDailyRow      `json:"daily"`
	RecentAttempts []quizRecentAttempt `json:"recent_attempts"`
	Days           int                 `json:"days"`
}

// Analytics handles GET /admin/quizzes/:id/analytics?days=30.
func (h *AdminQuizzesHandler) Analytics(w http.ResponseWriter, r *http.Request) {
	quizID := strings.TrimSpace(r.PathValue("id"))
	if quizID == "" {
		writeError(w, http.StatusBadRequest, "missing quiz id", nil)
		return
	}

	days := 30
	if raw := strings.TrimSpace(r.URL.Query().Get("days")); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			days = n
		}
	}
	if days > 180 {
		days = 180
	}

	ctx := r.Context()

	// 1) Header — quiz + owner + question count.
	var header quizAnalyticsHeader
	err := h.db.WithContext(ctx).Raw(`
		SELECT
		  z.id::text                                                            AS id,
		  z.title                                                               AS title,
		  z.user_id::text                                                       AS owner_id,
		  COALESCE(u.username, '')                                              AS owner_username,
		  COALESCE(u.email, '')                                                 AS owner_email,
		  z.is_public                                                           AS is_public,
		  z.is_hidden_by_admin                                                  AS is_hidden,
		  COALESCE((SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = z.id), 0) AS question_count,
		  to_char(z.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
		FROM quizzes z
		LEFT JOIN users u ON u.id = z.user_id
		WHERE z.id = ?
	`, quizID).Scan(&header).Error
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load quiz", err)
		return
	}
	if header.ID == "" {
		writeError(w, http.StatusNotFound, "quiz not found", nil)
		return
	}

	// 2) Counts — events + attempts.
	var counts quizAnalyticsCounts
	err = h.db.WithContext(ctx).Raw(`
		SELECT
		  COALESCE(SUM(CASE WHEN event_type = 'quiz_page_opened' THEN 1 ELSE 0 END), 0) AS opens,
		  COALESCE(SUM(CASE WHEN event_type = 'quiz_started'     THEN 1 ELSE 0 END), 0) AS starts,
		  COALESCE(SUM(CASE WHEN event_type = 'quiz_finished'    THEN 1 ELSE 0 END), 0) AS finishes,
		  COALESCE(SUM(CASE WHEN event_type = 'quiz_abandoned'   THEN 1 ELSE 0 END), 0) AS abandons
		FROM quiz_usage_events
		WHERE quiz_id = ?
	`, quizID).Scan(&counts).Error
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load event counts", err)
		return
	}

	var distinct struct {
		Total    int `gorm:"column:total"`
		SignedIn int `gorm:"column:signed_in"`
		Guests   int `gorm:"column:guests"`
	}
	err = h.db.WithContext(ctx).Raw(`
		WITH session_to_user AS (
		  SELECT DISTINCT session_id, user_id
		  FROM quiz_usage_events
		  WHERE quiz_id = ? AND user_id IS NOT NULL AND session_id IS NOT NULL
		),
		buckets AS (
		  SELECT
		    COALESCE(e.user_id::text, stu.user_id::text, e.session_id) AS bucket,
		    (e.user_id IS NOT NULL OR stu.user_id IS NOT NULL)         AS is_signed_in
		  FROM quiz_usage_events e
		  LEFT JOIN session_to_user stu ON e.session_id = stu.session_id
		  WHERE e.quiz_id = ? AND e.event_type IN ('quiz_started','quiz_finished','quiz_page_opened')
		)
		SELECT
		  COUNT(DISTINCT bucket)                                AS total,
		  COUNT(DISTINCT bucket) FILTER (WHERE is_signed_in)    AS signed_in,
		  COUNT(DISTINCT bucket) FILTER (WHERE NOT is_signed_in) AS guests
		FROM buckets
		WHERE bucket IS NOT NULL
	`, quizID, quizID).Scan(&distinct).Error
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to count players", err)
		return
	}
	counts.DistinctPlayersTotal = distinct.Total
	counts.DistinctSignedIn = distinct.SignedIn
	counts.DistinctGuests = distinct.Guests

	// Avg score from attempts.
	var avgRow struct {
		AvgScore *float64 `gorm:"column:avg_score"`
	}
	if err := h.db.WithContext(ctx).Raw(`
		SELECT AVG(score::float / NULLIF(total_questions, 0) * 100) AS avg_score
		FROM quiz_attempts
		WHERE quiz_id = ? AND total_questions > 0
	`, quizID).Scan(&avgRow).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load avg score", err)
		return
	}
	if avgRow.AvgScore != nil {
		counts.AvgScore = roundPct(*avgRow.AvgScore)
	}

	if counts.Starts > 0 {
		counts.CompletionRate = roundPct(float64(counts.Finishes) / float64(counts.Starts) * 100.0)
	}

	// 3) Daily breakdown for last `days` days.
	now := time.Now().UTC()
	startOfToday := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	rangeStart := startOfToday.AddDate(0, 0, -(days - 1))

	var dailyAgg []struct {
		Day      time.Time `gorm:"column:day"`
		Opens    int       `gorm:"column:opens"`
		Starts   int       `gorm:"column:starts"`
		Finishes int       `gorm:"column:finishes"`
	}
	err = h.db.WithContext(ctx).Raw(`
		SELECT
		  date_trunc('day', created_at) AS day,
		  COUNT(*) FILTER (WHERE event_type = 'quiz_page_opened') AS opens,
		  COUNT(*) FILTER (WHERE event_type = 'quiz_started')     AS starts,
		  COUNT(*) FILTER (WHERE event_type = 'quiz_finished')    AS finishes
		FROM quiz_usage_events
		WHERE quiz_id = ? AND created_at >= ? AND created_at < ?
		GROUP BY day
		ORDER BY day ASC
	`, quizID, rangeStart, now.Add(24*time.Hour)).Scan(&dailyAgg).Error
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load daily stats", err)
		return
	}
	type rawDay struct{ opens, starts, finishes int }
	byDay := make(map[string]rawDay, len(dailyAgg))
	for _, r := range dailyAgg {
		byDay[r.Day.UTC().Format("2006-01-02")] = rawDay{r.Opens, r.Starts, r.Finishes}
	}
	daily := make([]quizDailyRow, 0, days)
	for i := 0; i < days; i++ {
		key := rangeStart.AddDate(0, 0, i).Format("2006-01-02")
		raw := byDay[key]
		daily = append(daily, quizDailyRow{
			Date:     key,
			Opens:    raw.opens,
			Starts:   raw.starts,
			Finishes: raw.finishes,
		})
	}

	// 4) Recent attempts (last 20).
	var recent []quizRecentAttempt
	err = h.db.WithContext(ctx).Raw(`
		SELECT
		  a.id::text                   AS id,
		  a.user_id::text              AS user_id,
		  u.username                   AS username,
		  u.email                      AS email,
		  a.score                      AS score,
		  a.total_questions            AS total_questions,
		  COALESCE(a.time_spent, 0)    AS duration_seconds,
		  to_char(a.started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
		FROM quiz_attempts a
		LEFT JOIN users u ON u.id = a.user_id
		WHERE a.quiz_id = ?
		ORDER BY a.started_at DESC
		LIMIT 20
	`, quizID).Scan(&recent).Error
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load recent attempts", err)
		return
	}
	if recent == nil {
		recent = []quizRecentAttempt{}
	}

	writeJSON(w, http.StatusOK, quizAnalyticsResponse{
		Quiz:           header,
		Counts:         counts,
		Daily:          daily,
		RecentAttempts: recent,
		Days:           days,
	})
}

func roundPct(x float64) float64 {
	return float64(int(x*100+0.5)) / 100
}

// ── Invite link analytics ──────────────────────────────────────────────────

type inviteLinkStat struct {
	Token            string  `json:"token"`
	Opens            int     `json:"opens"`
	DistinctVisitors int     `json:"distinct_visitors"`
	SignedInCount    int     `json:"signed_in_count"`
	GuestCount       int     `json:"guest_count"`
	Starts           int     `json:"starts"`
	Finishes         int     `json:"finishes"`
	UseCount         *int    `json:"use_count,omitempty"`
	MaxUses          *int    `json:"max_uses,omitempty"`
	IsActive         *bool   `json:"is_active,omitempty"`
	CreatedAt        *string `json:"created_at,omitempty"`
	LastSeenAt       string  `json:"last_seen_at"`
}

type inviteLinksResponse struct {
	QuizID string           `json:"quiz_id"`
	Links  []inviteLinkStat `json:"links"`
}

// InviteLinks handles GET /admin/quizzes/:id/invite-links — returns
// per-token open/visitor/conversion counts pulled from quiz_usage_events,
// optionally enriched with the row from quiz_invite_links if it still exists.
func (h *AdminQuizzesHandler) InviteLinks(w http.ResponseWriter, r *http.Request) {
	quizID := strings.TrimSpace(r.PathValue("id"))
	if quizID == "" {
		writeError(w, http.StatusBadRequest, "missing quiz id", nil)
		return
	}

	type row struct {
		Token            string     `gorm:"column:token"`
		Opens            int        `gorm:"column:opens"`
		DistinctVisitors int        `gorm:"column:distinct_visitors"`
		SignedInCount    int        `gorm:"column:signed_in_count"`
		GuestCount       int        `gorm:"column:guest_count"`
		Starts           int        `gorm:"column:starts"`
		Finishes         int        `gorm:"column:finishes"`
		UseCount         *int       `gorm:"column:use_count"`
		MaxUses          *int       `gorm:"column:max_uses"`
		IsActive         *bool      `gorm:"column:is_active"`
		CreatedAt        *time.Time `gorm:"column:created_at"`
		LastSeenAt       time.Time  `gorm:"column:last_seen_at"`
	}

	var rows []row
	err := h.db.WithContext(r.Context()).Raw(`
		WITH tokenized AS (
		  SELECT
		    e.metadata->>'inviteToken'                                   AS token,
		    e.event_type                                                 AS event_type,
		    COALESCE(e.user_id::text, e.session_id)                      AS bucket,
		    (e.user_id IS NOT NULL)                                      AS is_signed_in,
		    e.created_at                                                 AS created_at
		  FROM quiz_usage_events e
		  WHERE e.quiz_id = ?
		    AND e.metadata ? 'inviteToken'
		    AND COALESCE(e.metadata->>'inviteToken', '') <> ''
		)
		SELECT
		  t.token                                                       AS token,
		  COUNT(*) FILTER (WHERE t.event_type = 'quiz_page_opened')     AS opens,
		  COUNT(DISTINCT t.bucket)                                      AS distinct_visitors,
		  COUNT(DISTINCT t.bucket) FILTER (WHERE t.is_signed_in)        AS signed_in_count,
		  COUNT(DISTINCT t.bucket) FILTER (WHERE NOT t.is_signed_in)    AS guest_count,
		  COUNT(*) FILTER (WHERE t.event_type = 'quiz_started')         AS starts,
		  COUNT(*) FILTER (WHERE t.event_type = 'quiz_finished')        AS finishes,
		  l.use_count                                                   AS use_count,
		  l.max_uses                                                    AS max_uses,
		  l.is_active                                                   AS is_active,
		  l.created_at                                                  AS created_at,
		  MAX(t.created_at)                                             AS last_seen_at
		FROM tokenized t
		LEFT JOIN quiz_invite_links l ON l.id::text = t.token
		GROUP BY t.token, l.use_count, l.max_uses, l.is_active, l.created_at
		ORDER BY opens DESC, last_seen_at DESC
	`, quizID).Scan(&rows).Error
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load invite link analytics", err)
		return
	}

	out := make([]inviteLinkStat, 0, len(rows))
	for _, r := range rows {
		var createdAt *string
		if r.CreatedAt != nil {
			s := r.CreatedAt.UTC().Format("2006-01-02T15:04:05Z")
			createdAt = &s
		}
		out = append(out, inviteLinkStat{
			Token:            r.Token,
			Opens:            r.Opens,
			DistinctVisitors: r.DistinctVisitors,
			SignedInCount:    r.SignedInCount,
			GuestCount:       r.GuestCount,
			Starts:           r.Starts,
			Finishes:         r.Finishes,
			UseCount:         r.UseCount,
			MaxUses:          r.MaxUses,
			IsActive:         r.IsActive,
			CreatedAt:        createdAt,
			LastSeenAt:       r.LastSeenAt.UTC().Format("2006-01-02T15:04:05Z"),
		})
	}

	writeJSON(w, http.StatusOK, inviteLinksResponse{
		QuizID: quizID,
		Links:  out,
	})
}
