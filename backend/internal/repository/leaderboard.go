package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/midoriya/flashlearn-backend/internal/model"
)

// viewForPeriod maps the API period parameter to the materialized view name.
var viewForPeriod = map[string]string{
	"daily":   "leaderboard_daily",
	"weekly":  "leaderboard_weekly",
	"alltime": "leaderboard_stats",
}

// Leaderboard handles all leaderboard database queries.
type Leaderboard struct {
	pool *pgxpool.Pool
}

func NewLeaderboard(pool *pgxpool.Pool) *Leaderboard {
	return &Leaderboard{pool: pool}
}

// GetTopN returns the top N users from the given period's materialized view.
func (r *Leaderboard) GetTopN(ctx context.Context, period string, limit int) ([]model.LeaderboardRow, error) {
	view, ok := viewForPeriod[period]
	if !ok {
		view = "leaderboard_stats"
	}

	// Using fmt.Sprintf for the view name is safe here because it comes from
	// our own allowlist above, not user input.
	query := fmt.Sprintf(`
		SELECT
			user_id,
			username,
			avatar_url,
			total_cards_reviewed,
			total_correct,
			completed_sessions,
			total_study_minutes,
			ranking_score
		FROM %s
		WHERE ranking_score > 0
		ORDER BY ranking_score DESC
		LIMIT $1
	`, view)

	rows, err := r.pool.Query(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("query %s: %w", view, err)
	}
	defer rows.Close()

	var result []model.LeaderboardRow
	rank := 0
	for rows.Next() {
		rank++
		var row model.LeaderboardRow
		err := rows.Scan(
			&row.UserID,
			&row.Username,
			&row.AvatarURL,
			&row.TotalCardsReviewed,
			&row.TotalCorrect,
			&row.CompletedSessions,
			&row.TotalStudyMinutes,
			&row.RankingScore,
		)
		if err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}
		row.Rank = rank
		result = append(result, row)
	}

	return result, rows.Err()
}

// GetUserRank returns the rank (1-indexed) and score for a specific user.
// Returns (0, 0, nil) if the user has no entry.
func (r *Leaderboard) GetUserRank(ctx context.Context, period string, userID string) (int, int, error) {
	view, ok := viewForPeriod[period]
	if !ok {
		view = "leaderboard_stats"
	}

	// Count how many users have a higher score, then +1 = user's rank
	query := fmt.Sprintf(`
		WITH user_score AS (
			SELECT ranking_score FROM %s WHERE user_id = $1
		)
		SELECT
			COALESCE((SELECT COUNT(*) + 1 FROM %s WHERE ranking_score > (SELECT ranking_score FROM user_score)), 0)::int AS rank,
			COALESCE((SELECT ranking_score FROM user_score), 0)::int AS score
	`, view, view)

	var rank, score int
	err := r.pool.QueryRow(ctx, query, userID).Scan(&rank, &score)
	if err != nil {
		return 0, 0, fmt.Errorf("user rank: %w", err)
	}
	return rank, score, nil
}
