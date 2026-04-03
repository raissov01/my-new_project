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
		`INSERT INTO flashcard_sets (user_id, title, description, is_public, created_at, updated_at)
		 VALUES ($1, $2, NULLIF($3, ''), $4, NOW(), NOW()) RETURNING id`,
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
			`INSERT INTO flashcards (set_id, term, definition, position, created_at)
			 VALUES ($1, $2, $3, $4, NOW())`,
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
		`UPDATE flashcard_sets
		 SET title = $2,
		     description = NULLIF($3, ''),
		     is_public = $4,
		     updated_at = NOW()
		 WHERE id = $1`,
		setID, req.Title, req.Description, req.IsPublic,
	)
	if err != nil {
		return fmt.Errorf("update set: %w", err)
	}

	existingRows, err := tx.Query(ctx, `SELECT id FROM flashcards WHERE set_id = $1`, setID)
	if err != nil {
		return fmt.Errorf("load existing cards: %w", err)
	}

	existingCardIDs := make(map[string]struct{})
	for existingRows.Next() {
		var cardID string
		if err := existingRows.Scan(&cardID); err != nil {
			existingRows.Close()
			return fmt.Errorf("scan existing card id: %w", err)
		}
		existingCardIDs[cardID] = struct{}{}
	}
	if err := existingRows.Err(); err != nil {
		existingRows.Close()
		return fmt.Errorf("iterate existing cards: %w", err)
	}
	existingRows.Close()

	keptCardIDs := make([]string, 0, len(req.Cards))
	for i, card := range req.Cards {
		cardID := ""
		if card.ID != nil {
			cardID = strings.TrimSpace(*card.ID)
		}
		if _, exists := existingCardIDs[cardID]; exists {
			_, err = tx.Exec(ctx,
				`UPDATE flashcards
				 SET term = $3,
				     definition = $4,
				     position = $5
				 WHERE id = $1
				   AND set_id = $2`,
				cardID, setID, card.Term, card.Definition, i,
			)
			if err != nil {
				return fmt.Errorf("update card %d: %w", i, err)
			}
			keptCardIDs = append(keptCardIDs, cardID)
			continue
		}

		var insertedCardID string
		err = tx.QueryRow(ctx,
			`INSERT INTO flashcards (set_id, term, definition, position, created_at)
			 VALUES ($1, $2, $3, $4, NOW())
			 RETURNING id`,
			setID, card.Term, card.Definition, i,
		).Scan(&insertedCardID)
		if err != nil {
			return fmt.Errorf("insert card %d: %w", i, err)
		}
		keptCardIDs = append(keptCardIDs, insertedCardID)
	}

	if len(keptCardIDs) == 0 {
		_, err = tx.Exec(ctx, `DELETE FROM flashcards WHERE set_id = $1`, setID)
		if err != nil {
			return fmt.Errorf("delete cards: %w", err)
		}
		return tx.Commit(ctx)
	}

	_, err = tx.Exec(ctx, `DELETE FROM flashcards WHERE set_id = $1 AND NOT (id = ANY($2::uuid[]))`, setID, keptCardIDs)
	if err != nil {
		return fmt.Errorf("delete cards: %w", err)
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
		`SELECT
			fs.id,
			fs.title,
			fs.description,
			fs.is_public,
			fs.user_id,
			COALESCE(fs.created_at, NOW())::text
		 FROM flashcard_sets fs
		 WHERE fs.id = $1
		   AND (
		     fs.is_public = true
		     OR fs.user_id::text = $2
		     OR EXISTS (
		       SELECT 1
		       FROM public.class_set_assignments a
		       JOIN public.class_group_members m ON m.group_id = a.group_id
		       WHERE a.set_id = fs.id
		         AND m.user_id::text = $2
		     )
		     OR EXISTS (
		       SELECT 1
		       FROM public.class_challenges c
		       JOIN public.class_group_members m ON m.group_id = c.group_id
		       WHERE c.set_id = fs.id
		         AND m.user_id::text = $2
		     )
		   )`,
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

	s.Cards = make([]model.FlashcardInput, 0)
	for rows.Next() {
		var c model.FlashcardInput
		if err := rows.Scan(&c.ID, &c.Term, &c.Definition); err != nil {
			return nil, err
		}
		s.Cards = append(s.Cards, c)
	}

	return &s, rows.Err()
}
