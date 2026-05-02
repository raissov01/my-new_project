// Package service holds business-logic functions that handlers thinly wrap.
//
// This file (quizizz_analytics.go) implements the read-side queries for the
// admin Quizizz analytics dashboard. It centralises one tricky bit of SQL —
// "user_id-priority" active-user dedup — so summary and daily share one
// implementation.
package service

import (
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
)

// QuizizzAnalyticsService is a tiny wrapper around *gorm.DB so callers
// can mock it in tests if needed.
type QuizizzAnalyticsService struct {
	db *gorm.DB
}

func NewQuizizzAnalytics(db *gorm.DB) *QuizizzAnalyticsService {
	return &QuizizzAnalyticsService{db: db}
}

// QuizizzSummary is the response shape for /admin/quizizz/analytics/summary.
type QuizizzSummary struct {
	TodayActiveUsers       int     `json:"today_active_users"`
	WeekActiveUsers        int     `json:"week_active_users"`
	MonthActiveUsers       int     `json:"month_active_users"`
	CurrentlyOnline        int     `json:"currently_online"`
	TotalQuizStarts        int     `json:"total_quiz_starts"`
	TotalQuizFinishes      int     `json:"total_quiz_finishes"`
	CompletionRate         float64 `json:"completion_rate"`
	TotalAnswerSubmissions int     `json:"total_answer_submissions"`
}

// QuizizzDailyStat is one row in the daily-stats response.
type QuizizzDailyStat struct {
	Date           string  `json:"date"`            // YYYY-MM-DD
	ActiveUsers    int     `json:"active_users"`
	QuizStarts     int     `json:"quiz_starts"`
	QuizFinishes   int     `json:"quiz_finishes"`
	CompletionRate float64 `json:"completion_rate"`
}

// activeUserCountSQL counts distinct "people" inside a window using
// user_id-priority dedup: any session that ever logged in is collapsed
// into the user_id; only never-logged-in sessions stay distinct on session_id.
//
// The CTE is deliberately scoped to the same window as the outer query —
// otherwise an old login from last year would collapse a fresh anonymous
// session today.
const activeUserCountSQL = `
WITH session_to_user AS (
  SELECT DISTINCT session_id, user_id
  FROM quiz_usage_events
  WHERE user_id IS NOT NULL
    AND session_id IS NOT NULL
    AND created_at >= ? AND created_at < ?
)
SELECT COUNT(DISTINCT bucket) FROM (
  SELECT COALESCE(e.user_id::text, stu.user_id::text, e.session_id) AS bucket
  FROM quiz_usage_events e
  LEFT JOIN session_to_user stu ON e.session_id = stu.session_id
  WHERE e.created_at >= ? AND e.created_at < ?
) buckets
WHERE bucket IS NOT NULL
`

// activeUsersInWindow runs the dedup CTE between [start, end).
func (s *QuizizzAnalyticsService) activeUsersInWindow(ctx context.Context, start, end time.Time) (int, error) {
	var count int64
	err := s.db.WithContext(ctx).
		Raw(activeUserCountSQL, start, end, start, end).
		Scan(&count).Error
	if err != nil {
		return 0, err
	}
	return int(count), nil
}

// countEventType counts events of a given type in [start, end).
// If start.IsZero(), the window has no lower bound (all-time).
func (s *QuizizzAnalyticsService) countEventType(ctx context.Context, eventType string, start, end time.Time) (int, error) {
	q := s.db.WithContext(ctx).
		Table("quiz_usage_events").
		Where("event_type = ?", eventType)
	if !start.IsZero() {
		q = q.Where("created_at >= ?", start)
	}
	if !end.IsZero() {
		q = q.Where("created_at < ?", end)
	}
	var count int64
	if err := q.Count(&count).Error; err != nil {
		return 0, err
	}
	return int(count), nil
}

// Summary returns the top-line numbers for the admin dashboard.
func (s *QuizizzAnalyticsService) Summary(ctx context.Context) (*QuizizzSummary, error) {
	now := time.Now().UTC()
	startOfToday := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	startOfWeek := startOfToday.AddDate(0, 0, -6)   // 7-day rolling window incl. today
	startOfMonth := startOfToday.AddDate(0, 0, -29) // 30-day rolling window
	online := now.Add(-5 * time.Minute)

	today, err := s.activeUsersInWindow(ctx, startOfToday, now)
	if err != nil {
		return nil, fmt.Errorf("today active: %w", err)
	}
	week, err := s.activeUsersInWindow(ctx, startOfWeek, now)
	if err != nil {
		return nil, fmt.Errorf("week active: %w", err)
	}
	month, err := s.activeUsersInWindow(ctx, startOfMonth, now)
	if err != nil {
		return nil, fmt.Errorf("month active: %w", err)
	}
	onlineCount, err := s.activeUsersInWindow(ctx, online, now)
	if err != nil {
		return nil, fmt.Errorf("online: %w", err)
	}

	starts, err := s.countEventType(ctx, "quiz_started", time.Time{}, time.Time{})
	if err != nil {
		return nil, fmt.Errorf("starts: %w", err)
	}
	finishes, err := s.countEventType(ctx, "quiz_finished", time.Time{}, time.Time{})
	if err != nil {
		return nil, fmt.Errorf("finishes: %w", err)
	}
	answers, err := s.countEventType(ctx, "question_answered", time.Time{}, time.Time{})
	if err != nil {
		return nil, fmt.Errorf("answers: %w", err)
	}

	completion := 0.0
	if starts > 0 {
		completion = float64(finishes) / float64(starts) * 100.0
	}

	return &QuizizzSummary{
		TodayActiveUsers:       today,
		WeekActiveUsers:        week,
		MonthActiveUsers:       month,
		CurrentlyOnline:        onlineCount,
		TotalQuizStarts:        starts,
		TotalQuizFinishes:      finishes,
		CompletionRate:         round2(completion),
		TotalAnswerSubmissions: answers,
	}, nil
}

// dailyAggregate is the per-day raw output we then post-process for active users.
type dailyAggregate struct {
	Day          time.Time `gorm:"column:day"`
	QuizStarts   int       `gorm:"column:quiz_starts"`
	QuizFinishes int       `gorm:"column:quiz_finishes"`
}

// Daily returns one row per day for the last `days` days (most recent last).
//
// We could do everything in one cleverly-windowed CTE, but keeping it as
// (1) a per-day GROUP BY for simple counts and (2) per-day calls to the
// dedup CTE for active users keeps the SQL legible and uses existing indexes.
func (s *QuizizzAnalyticsService) Daily(ctx context.Context, days int) ([]QuizizzDailyStat, error) {
	if days <= 0 {
		days = 30
	}
	if days > 365 {
		days = 365
	}

	now := time.Now().UTC()
	startOfToday := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	rangeStart := startOfToday.AddDate(0, 0, -(days - 1))

	// Fetch starts/finishes per day in one query.
	var rows []dailyAggregate
	err := s.db.WithContext(ctx).Raw(`
		SELECT
		  date_trunc('day', created_at) AS day,
		  COUNT(*) FILTER (WHERE event_type = 'quiz_started')  AS quiz_starts,
		  COUNT(*) FILTER (WHERE event_type = 'quiz_finished') AS quiz_finishes
		FROM quiz_usage_events
		WHERE created_at >= ? AND created_at < ?
		GROUP BY day
		ORDER BY day ASC
	`, rangeStart, now.Add(24*time.Hour)).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	// Index per-day raw data by YYYY-MM-DD so we can fill gap days with zeros.
	type rawDay struct{ starts, finishes int }
	byDay := make(map[string]rawDay, len(rows))
	for _, r := range rows {
		key := r.Day.UTC().Format("2006-01-02")
		byDay[key] = rawDay{starts: r.QuizStarts, finishes: r.QuizFinishes}
	}

	result := make([]QuizizzDailyStat, 0, days)
	for i := 0; i < days; i++ {
		dayStart := rangeStart.AddDate(0, 0, i)
		dayEnd := dayStart.AddDate(0, 0, 1)
		key := dayStart.Format("2006-01-02")

		raw := byDay[key]
		active, err := s.activeUsersInWindow(ctx, dayStart, dayEnd)
		if err != nil {
			return nil, fmt.Errorf("active users for %s: %w", key, err)
		}

		completion := 0.0
		if raw.starts > 0 {
			completion = float64(raw.finishes) / float64(raw.starts) * 100.0
		}

		result = append(result, QuizizzDailyStat{
			Date:           key,
			ActiveUsers:    active,
			QuizStarts:     raw.starts,
			QuizFinishes:   raw.finishes,
			CompletionRate: round2(completion),
		})
	}

	return result, nil
}

func round2(x float64) float64 {
	return float64(int(x*100+0.5)) / 100
}
