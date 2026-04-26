package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/midoriya/flashlearn-backend/internal/model"
)

type Leaderboard struct {
	pool *pgxpool.Pool
}

func NewLeaderboard(pool *pgxpool.Pool) *Leaderboard {
	return &Leaderboard{pool: pool}
}

// progressAggrCTE returns a WITH clause fragment for progress_agg.
// alltime → sums cumulative study_progress totals (unchanged semantics).
// daily/weekly → counts rows from study_events for accurate time windowing.
func progressAggrCTE(period string) string {
	if period == "alltime" {
		return `
		progress_agg AS (
			SELECT
				user_id,
				COALESCE(SUM(times_seen), 0)::int    AS total_cards_reviewed,
				COALESCE(SUM(times_correct), 0)::int AS total_correct
			FROM study_progress
			GROUP BY user_id
		)`
	}
	window := studyEventsWindow(period)
	return fmt.Sprintf(`
	progress_agg AS (
		SELECT
			user_id,
			COUNT(*)::int                         AS total_cards_reviewed,
			COUNT(*) FILTER (WHERE correct)::int  AS total_correct
		FROM study_events
		WHERE studied_at >= %s
		GROUP BY user_id
	)`, window)
}

func studyEventsWindow(period string) string {
	switch period {
	case "daily":
		return "date_trunc('day', now())"
	case "weekly":
		return "now() - interval '7 days'"
	default:
		return "'-infinity'::timestamptz"
	}
}

func (r *Leaderboard) GetTopN(ctx context.Context, period string, limit int) ([]model.LeaderboardRow, error) {
	query := fmt.Sprintf(`
		WITH %s,
		pomodoro_agg AS (
			SELECT
				user_id,
				COUNT(*)::int                         AS completed_sessions,
				COALESCE(SUM(work_minutes), 0)::int   AS total_study_minutes
			FROM pomodoro_sessions
			WHERE completed = true AND %s
			GROUP BY user_id
		),
		leaderboard AS (
			SELECT
				u.id AS user_id,
				u.username,
				u.avatar_url,
				COALESCE(p.total_cards_reviewed, 0)::int AS total_cards_reviewed,
				COALESCE(p.total_correct, 0)::int         AS total_correct,
				COALESCE(ps.completed_sessions, 0)::int   AS completed_sessions,
				COALESCE(ps.total_study_minutes, 0)::int  AS total_study_minutes,
				(
					COALESCE(p.total_correct, 0) * 5 +
					COALESCE(p.total_cards_reviewed, 0) * 2 +
					COALESCE(ps.completed_sessions, 0) * 10 +
					COALESCE(ps.total_study_minutes, 0)
				)::int AS ranking_score
			FROM users u
			LEFT JOIN progress_agg p  ON p.user_id  = u.id
			LEFT JOIN pomodoro_agg ps ON ps.user_id = u.id
		)
		SELECT
			user_id,
			username,
			avatar_url,
			total_cards_reviewed,
			total_correct,
			completed_sessions,
			total_study_minutes,
			ranking_score
		FROM leaderboard
		WHERE ranking_score > 0
		ORDER BY
			ranking_score DESC,
			total_correct DESC,
			total_cards_reviewed DESC,
			total_study_minutes DESC,
			username ASC
		LIMIT $1
	`, progressAggrCTE(period), leaderboardWindow("pomodoro_sessions.finished_at", period))

	rows, err := r.pool.Query(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("leaderboard query: %w", err)
	}
	defer rows.Close()

	var result []model.LeaderboardRow
	rank := 0
	for rows.Next() {
		rank++
		var row model.LeaderboardRow
		if err := rows.Scan(
			&row.UserID,
			&row.Username,
			&row.AvatarURL,
			&row.TotalCardsReviewed,
			&row.TotalCorrect,
			&row.CompletedSessions,
			&row.TotalStudyMinutes,
			&row.RankingScore,
		); err != nil {
			return nil, fmt.Errorf("scan leaderboard row: %w", err)
		}
		row.Rank = rank
		result = append(result, row)
	}

	return result, rows.Err()
}

func (r *Leaderboard) GetUserRank(ctx context.Context, period string, userID string) (int, int, error) {
	query := fmt.Sprintf(`
		WITH %s,
		pomodoro_agg AS (
			SELECT
				user_id,
				COUNT(*)::int                        AS completed_sessions,
				COALESCE(SUM(work_minutes), 0)::int  AS total_study_minutes
			FROM pomodoro_sessions
			WHERE completed = true AND %s
			GROUP BY user_id
		),
		leaderboard AS (
			SELECT
				u.id AS user_id,
				u.username,
				(
					COALESCE(p.total_correct, 0) * 5 +
					COALESCE(p.total_cards_reviewed, 0) * 2 +
					COALESCE(ps.completed_sessions, 0) * 10 +
					COALESCE(ps.total_study_minutes, 0)
				)::int AS ranking_score,
				COALESCE(p.total_correct, 0)::int          AS total_correct,
				COALESCE(p.total_cards_reviewed, 0)::int   AS total_cards_reviewed,
				COALESCE(ps.total_study_minutes, 0)::int   AS total_study_minutes
			FROM users u
			LEFT JOIN progress_agg p  ON p.user_id  = u.id
			LEFT JOIN pomodoro_agg ps ON ps.user_id = u.id
		),
		ranked AS (
			SELECT
				user_id,
				ranking_score,
				ROW_NUMBER() OVER (
					ORDER BY
						ranking_score DESC,
						total_correct DESC,
						total_cards_reviewed DESC,
						total_study_minutes DESC,
						username ASC
				)::int AS rank
			FROM leaderboard
			WHERE ranking_score > 0
		)
		SELECT
			COALESCE((SELECT rank          FROM ranked WHERE user_id = $1), 0)::int,
			COALESCE((SELECT ranking_score FROM ranked WHERE user_id = $1), 0)::int
	`, progressAggrCTE(period), leaderboardWindow("pomodoro_sessions.finished_at", period))

	var rank, score int
	if err := r.pool.QueryRow(ctx, query, userID).Scan(&rank, &score); err != nil {
		return 0, 0, fmt.Errorf("leaderboard user rank: %w", err)
	}
	return rank, score, nil
}

func leaderboardWindow(column string, period string) string {
	switch period {
	case "daily":
		return fmt.Sprintf("%s >= date_trunc('day', now())", column)
	case "weekly":
		return fmt.Sprintf("%s >= now() - interval '7 days'", column)
	default:
		return "1 = 1"
	}
}
