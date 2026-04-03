package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/midoriya/flashlearn-backend/internal/model"
)

// Set reads flashcard set data from PostgreSQL.
type Set struct {
	pool *pgxpool.Pool
}

func NewSet(pool *pgxpool.Pool) *Set {
	return &Set{pool: pool}
}

func (r *Set) GetOverviewByUserID(ctx context.Context, userID string) ([]model.SetOverview, error) {
	query := `
			WITH user_sets AS (
				SELECT
					id,
					user_id,
					title,
					description,
					is_public,
					COALESCE(created_at, NOW()) AS created_at,
					COALESCE(updated_at, COALESCE(created_at, NOW())) AS updated_at
				FROM public.flashcard_sets
				WHERE user_id = $1
			),
		set_cards AS (
			SELECT
				f.set_id,
				COUNT(*)::int AS card_count
			FROM public.flashcards f
			JOIN user_sets us ON us.id = f.set_id
			GROUP BY f.set_id
		),
		set_progress AS (
			SELECT
				f.set_id,
				COALESCE(SUM(sp.times_correct), 0)::int AS total_correct,
				COALESCE(SUM(sp.times_correct + sp.times_incorrect), 0)::int AS total_attempts,
				COALESCE(SUM(CASE WHEN sp.is_weak THEN 1 ELSE 0 END), 0)::int AS weak_count,
				COALESCE(SUM(CASE WHEN sp.next_review_at <= NOW() THEN 1 ELSE 0 END), 0)::int AS due_count,
				MAX(sp.last_studied_at) AS last_studied_at
			FROM public.flashcards f
			JOIN user_sets us ON us.id = f.set_id
			LEFT JOIN public.study_progress sp
				ON sp.flashcard_id = f.id
				AND sp.user_id = $1
			GROUP BY f.set_id
		)
		SELECT
			us.id,
			us.user_id,
			us.title,
			us.description,
			us.is_public,
			us.created_at,
			us.updated_at,
			COALESCE(sc.card_count, 0) AS card_count,
			sp.last_studied_at,
			CASE
				WHEN COALESCE(sp.total_attempts, 0) > 0
					THEN ROUND((sp.total_correct::numeric / sp.total_attempts::numeric) * 100)::int
				ELSE 0
			END AS accuracy,
			COALESCE(sp.weak_count, 0) + COALESCE(sp.due_count, 0) AS review_count,
			COALESCE(sp.weak_count, 0) AS weak_count,
			COALESCE(sp.due_count, 0) AS due_count
		FROM user_sets us
		LEFT JOIN set_cards sc ON sc.set_id = us.id
		LEFT JOIN set_progress sp ON sp.set_id = us.id
		ORDER BY us.updated_at DESC
	`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("get set overview by user id: %w", err)
	}
	defer rows.Close()

	items := make([]model.SetOverview, 0)
	for rows.Next() {
		var item model.SetOverview
		var createdAt time.Time
		var updatedAt time.Time
		var lastStudiedAt *time.Time

		if err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.Title,
			&item.Description,
			&item.IsPublic,
			&createdAt,
			&updatedAt,
			&item.CardCount,
			&lastStudiedAt,
			&item.Accuracy,
			&item.ReviewCount,
			&item.WeakCount,
			&item.DueCount,
		); err != nil {
			return nil, fmt.Errorf("scan set overview: %w", err)
		}

		item.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		item.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
		if lastStudiedAt != nil {
			value := lastStudiedAt.UTC().Format(time.RFC3339)
			item.LastStudiedAt = &value
		}

		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate set overview rows: %w", err)
	}

	return items, nil
}

func (r *Set) GetPublicOverview(ctx context.Context) ([]model.SetOverview, error) {
	query := `
			WITH public_sets AS (
				SELECT
					id,
					user_id,
					title,
					description,
					COALESCE(created_at, NOW()) AS created_at,
					COALESCE(updated_at, COALESCE(created_at, NOW())) AS updated_at
				FROM public.flashcard_sets
				WHERE is_public = true
			),
		set_cards AS (
			SELECT
				f.set_id,
				COUNT(*)::int AS card_count
			FROM public.flashcards f
			JOIN public_sets ps ON ps.id = f.set_id
			GROUP BY f.set_id
		)
		SELECT
			ps.id,
			ps.user_id,
			ps.title,
			ps.description,
			ps.created_at,
			ps.updated_at,
			COALESCE(sc.card_count, 0) AS card_count
		FROM public_sets ps
		LEFT JOIN set_cards sc ON sc.set_id = ps.id
		WHERE COALESCE(sc.card_count, 0) > 0
		ORDER BY ps.updated_at DESC
	`

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("get public set overview: %w", err)
	}
	defer rows.Close()

	items := make([]model.SetOverview, 0)
	for rows.Next() {
		var item model.SetOverview
		var createdAt time.Time
		var updatedAt time.Time

		if err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.Title,
			&item.Description,
			&createdAt,
			&updatedAt,
			&item.CardCount,
		); err != nil {
			return nil, fmt.Errorf("scan public set overview: %w", err)
		}

		item.IsPublic = true
		item.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		item.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
		item.Accuracy = 0
		item.ReviewCount = 0
		item.WeakCount = 0
		item.DueCount = 0
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate public set overview rows: %w", err)
	}

	return items, nil
}
