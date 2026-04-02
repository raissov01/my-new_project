package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/midoriya/flashlearn-backend/internal/model"
)

type Challenge struct {
	pool *pgxpool.Pool
}

func NewChallenge(pool *pgxpool.Pool) *Challenge {
	return &Challenge{pool: pool}
}

// SaveAttempt records a challenge attempt for a set.
func (r *Challenge) SaveAttempt(ctx context.Context, userID string, input model.ChallengeAttemptInput) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO challenge_attempts (user_id, set_id, completion_time, accuracy, total_correct, total_incorrect)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		userID, input.SetID, input.CompletionTime, input.Accuracy,
		input.TotalCorrect, input.TotalIncorrect,
	)
	return err
}

// GetRanking returns ranked entries for a set, best attempt per user.
func (r *Challenge) GetRanking(ctx context.Context, setID string) (*model.ChallengeRankingResponse, error) {
	// Get set info
	var title string
	var isPublic bool
	err := r.pool.QueryRow(ctx,
		`SELECT title, is_public FROM flashcard_sets WHERE id = $1`, setID,
	).Scan(&title, &isPublic)
	if err != nil {
		return nil, fmt.Errorf("set not found")
	}

	// Get best attempt per user, ranked
	rows, err := r.pool.Query(ctx, `
		SELECT DISTINCT ON (ca.user_id)
			ca.user_id, p.username, p.avatar_url,
			ca.accuracy, ca.completion_time, ca.total_incorrect,
			ca.completed_at::text
		FROM challenge_attempts ca
		JOIN users p ON p.id = ca.user_id
		WHERE ca.set_id = $1
		ORDER BY ca.user_id, ca.accuracy DESC, ca.completion_time ASC, ca.total_incorrect ASC, ca.completed_at ASC
	`, setID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []model.ChallengeRankingEntry
	for rows.Next() {
		var e model.ChallengeRankingEntry
		if err := rows.Scan(&e.UserID, &e.Username, &e.AvatarURL,
			&e.Accuracy, &e.CompletionTime, &e.TotalIncorrect, &e.CompletedAt); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Sort and assign ranks (accuracy DESC, time ASC, mistakes ASC)
	// Already done by DISTINCT ON + ORDER BY above, but we need actual ranks
	for i := range entries {
		entries[i].Rank = i + 1
	}

	return &model.ChallengeRankingResponse{
		SetTitle: title,
		IsPublic: isPublic,
		Rows:     entries,
	}, nil
}

// SaveClassChallengeAttempt records a class challenge attempt.
func (r *Challenge) SaveClassChallengeAttempt(ctx context.Context, userID string, input model.ClassChallengeAttemptInput) error {
	// Get set_id from challenge
	var setID string
	err := r.pool.QueryRow(ctx,
		`SELECT set_id FROM class_challenges WHERE id = $1`, input.ChallengeID,
	).Scan(&setID)
	if err != nil {
		return fmt.Errorf("challenge not found")
	}

	_, err = r.pool.Exec(ctx,
		`INSERT INTO class_challenge_attempts (challenge_id, user_id, set_id, completion_time, accuracy, total_correct, total_incorrect)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		input.ChallengeID, userID, setID, input.CompletionTime, input.Accuracy,
		input.TotalCorrect, input.TotalIncorrect,
	)
	return err
}
