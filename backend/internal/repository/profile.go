package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/midoriya/flashlearn-backend/internal/model"
)

// Profile reads profile data from PostgreSQL.
type Profile struct {
	pool *pgxpool.Pool
}

func NewProfile(pool *pgxpool.Pool) *Profile {
	return &Profile{pool: pool}
}

func (r *Profile) GetByID(ctx context.Context, userID string) (*model.Profile, error) {
	query := `
		SELECT
			id,
			email,
			full_name,
			username,
			avatar_url,
			bio,
			created_at,
			streak_days,
			last_active_date,
			points,
			role
		FROM public.users
		WHERE id = $1
	`

	var profile model.Profile
	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&profile.ID,
		&profile.Email,
		&profile.FullName,
		&profile.Username,
		&profile.AvatarURL,
		&profile.Bio,
		&profile.CreatedAt,
		&profile.StreakDays,
		&profile.LastActiveDate,
		&profile.Points,
		&profile.Role,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, err
		}
		return nil, fmt.Errorf("get profile by id: %w", err)
	}

	return &profile, nil
}
