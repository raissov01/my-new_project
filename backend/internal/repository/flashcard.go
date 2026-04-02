package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/midoriya/flashlearn-backend/internal/model"
)

type Flashcard struct {
	pool *pgxpool.Pool
}

func NewFlashcard(pool *pgxpool.Pool) *Flashcard {
	return &Flashcard{pool: pool}
}

// CreateSet inserts a new flashcard_set and its cards.
func (r *Flashcard) CreateSet(ctx context.Context, userID string, req model.CreateSetRequest) (string, error) {
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return "", fmt.Errorf("authentication required")
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return "", fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var setID string
	err = tx.QueryRow(ctx,
		`INSERT INTO flashcard_sets (user_id, title, description, is_public)
		 VALUES ($1, $2, NULLIF($3, ''), $4) RETURNING id`,
		userID, req.Title, req.Description, req.IsPublic,
	).Scan(&setID)
	if err != nil {
		if pgErr, ok := err.(*pgconn.PgError); ok {
			return "", fmt.Errorf("insert set: %s (%s)", pgErr.Message, pgErr.Code)
		}
		return "", fmt.Errorf("insert set: %w", err)
	}

	for i, card := range req.Cards {
		_, err = tx.Exec(ctx,
			`INSERT INTO flashcards (set_id, term, definition, position) VALUES ($1, $2, $3, $4)`,
			setID, card.Term, card.Definition, i,
		)
		if err != nil {
			if pgErr, ok := err.(*pgconn.PgError); ok {
				return "", fmt.Errorf("insert card %d: %s (%s)", i, pgErr.Message, pgErr.Code)
			}
			return "", fmt.Errorf("insert card %d: %w", i, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		if pgErr, ok := err.(*pgconn.PgError); ok {
			return "", fmt.Errorf("commit: %s (%s)", pgErr.Message, pgErr.Code)
		}
		return "", fmt.Errorf("commit: %w", err)
	}
	return setID, nil
}

// UpdateSet replaces a set's metadata and cards.
func (r *Flashcard) UpdateSet(ctx context.Context, userID, setID string, req model.UpdateSetRequest) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Verify ownership
	var ownerID string
	err = tx.QueryRow(ctx, `SELECT user_id FROM flashcard_sets WHERE id = $1`, setID).Scan(&ownerID)
	if err != nil {
		return fmt.Errorf("set not found: %w", err)
	}
	if ownerID != userID {
		return fmt.Errorf("access denied")
	}

	_, err = tx.Exec(ctx,
		`UPDATE flashcard_sets SET title = $2, description = NULLIF($3, ''), is_public = $4 WHERE id = $1`,
		setID, req.Title, req.Description, req.IsPublic,
	)
	if err != nil {
		return fmt.Errorf("update set: %w", err)
	}

	// Delete old cards, insert new ones (atomic within tx)
	_, err = tx.Exec(ctx, `DELETE FROM flashcards WHERE set_id = $1`, setID)
	if err != nil {
		return fmt.Errorf("delete cards: %w", err)
	}

	for i, card := range req.Cards {
		_, err = tx.Exec(ctx,
			`INSERT INTO flashcards (set_id, term, definition, position) VALUES ($1, $2, $3, $4)`,
			setID, card.Term, card.Definition, i,
		)
		if err != nil {
			return fmt.Errorf("insert card %d: %w", i, err)
		}
	}

	return tx.Commit(ctx)
}

// DeleteSet removes a set and cascades to cards.
func (r *Flashcard) DeleteSet(ctx context.Context, userID, setID string) error {
	result, err := r.pool.Exec(ctx,
		`DELETE FROM flashcard_sets WHERE id = $1 AND user_id = $2`,
		setID, userID,
	)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("set not found or access denied")
	}
	return nil
}

// GetSetByID returns a set with its cards.
func (r *Flashcard) GetSetByID(ctx context.Context, setID, requesterUserID string) (*model.SetDetail, error) {
	var s model.SetDetail
	err := r.pool.QueryRow(ctx,
		`SELECT id, title, description, is_public, user_id, created_at::text
		 FROM flashcard_sets
		 WHERE id = $1
		   AND (is_public = true OR user_id = $2)`,
		setID, requesterUserID,
	).Scan(&s.ID, &s.Title, &s.Description, &s.IsPublic, &s.UserID, &s.CreatedAt)
	if err != nil {
		return nil, err
	}

	rows, err := r.pool.Query(ctx,
		`SELECT id, term, definition FROM flashcards WHERE set_id = $1 ORDER BY position`, setID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var c model.FlashcardInput
		if err := rows.Scan(&c.ID, &c.Term, &c.Definition); err != nil {
			return nil, err
		}
		s.Cards = append(s.Cards, c)
	}

	return &s, rows.Err()
}
