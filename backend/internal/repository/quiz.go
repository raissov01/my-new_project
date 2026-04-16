package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/midoriya/flashlearn-backend/internal/model"
)

// encodeStringArray serializes a slice of strings to a JSON string pointer
// for storage in a JSONB column. Returns nil for empty input so the column
// stores SQL NULL rather than an empty array.
func encodeStringArray(items []string) *string {
	if len(items) == 0 {
		return nil
	}
	buf, err := json.Marshal(items)
	if err != nil {
		return nil
	}
	s := string(buf)
	return &s
}

// decodeStringArray parses a JSONB-stored string pointer back into a slice.
// Returns nil for NULL or invalid JSON so callers can distinguish "not set"
// from "empty array".
func decodeStringArray(src *string) []string {
	if src == nil || *src == "" {
		return nil
	}
	var out []string
	if err := json.Unmarshal([]byte(*src), &out); err != nil {
		return nil
	}
	return out
}

// normalizeBlank lowercases and trims whitespace so fill_blank grading is
// forgiving about case and leading/trailing spaces.
func normalizeBlank(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

// nullableString returns a pointer to s for non-empty strings, or nil so the
// target column receives SQL NULL instead of an empty string.
func nullableString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// stringSlicesEqual reports whether two string slices contain the same items
// in the same positions. Used for reorder grading.
func stringSlicesEqual(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

// Quiz reads/writes quiz data from PostgreSQL via raw pgx.
type Quiz struct {
	pool *pgxpool.Pool
}

func NewQuiz(pool *pgxpool.Pool) *Quiz {
	return &Quiz{pool: pool}
}

// QuizListFilters narrows the library query.
type QuizListFilters struct {
	Search     string
	Subject    string
	Tag        string
	Sort       string
	OnlyMine   bool
	IncludeAll bool
}

// GetOverview returns quizzes visible to the user — their own plus public ones.
// When OnlyMine is true, only the user's own quizzes are returned.
func (r *Quiz) GetOverview(ctx context.Context, userID string, filters QuizListFilters) ([]model.QuizOverview, error) {
	var where []string
	args := []any{userID}

	if filters.OnlyMine {
		where = append(where, "q.user_id = $1")
	} else {
		where = append(where, "(q.is_public = true OR q.user_id = $1)")
	}

	if s := strings.TrimSpace(filters.Subject); s != "" {
		args = append(args, s)
		where = append(where, fmt.Sprintf("q.subject = $%d", len(args)))
	}

	if s := strings.TrimSpace(filters.Search); s != "" {
		args = append(args, "%"+s+"%")
		where = append(where, fmt.Sprintf("(q.title ILIKE $%d OR q.description ILIKE $%d)", len(args), len(args)))
	}

	if s := strings.ToLower(strings.TrimSpace(filters.Tag)); s != "" {
		args = append(args, s)
		where = append(where, fmt.Sprintf("EXISTS (SELECT 1 FROM public.quiz_tags qt WHERE qt.quiz_id = q.id AND qt.tag = $%d)", len(args)))
	}

	orderBy := "v.updated_at DESC"
	switch filters.Sort {
	case "played":
		orderBy = "attempts_count DESC, v.updated_at DESC"
	case "rated":
		orderBy = "average_percentage DESC, attempts_count DESC"
	case "newest":
		orderBy = "v.created_at DESC"
	}

	query := fmt.Sprintf(`
		WITH visible AS (
			SELECT
				q.id,
				q.user_id,
				q.title,
				q.description,
				q.subject,
				q.is_public,
				q.time_per_question,
				q.shuffle_options,
				q.show_answer_animations,
				q.power_ups_enabled,
				COALESCE(q.created_at, NOW()) AS created_at,
				COALESCE(q.updated_at, COALESCE(q.created_at, NOW())) AS updated_at
			FROM public.quizzes q
			WHERE %s
		),
		q_counts AS (
			SELECT quiz_id, COUNT(*)::int AS question_count
			FROM public.quiz_questions
			WHERE quiz_id IN (SELECT id FROM visible)
			GROUP BY quiz_id
		),
		a_stats AS (
			SELECT
				quiz_id,
				COUNT(*)::int AS attempts_count,
				COALESCE(ROUND(AVG(percentage)), 0)::int AS average_percentage,
				MAX(CASE WHEN user_id = $1 THEN percentage END) AS best_percentage
			FROM public.quiz_attempts
			WHERE quiz_id IN (SELECT id FROM visible)
			  AND completed_at IS NOT NULL
			GROUP BY quiz_id
		),
		t_agg AS (
			SELECT quiz_id, array_agg(tag ORDER BY tag) AS tags
			FROM public.quiz_tags
			WHERE quiz_id IN (SELECT id FROM visible)
			GROUP BY quiz_id
		)
		SELECT
			v.id,
			v.user_id,
			NULLIF(u.full_name, '') AS author_name,
			v.title,
			v.description,
			v.subject,
			v.is_public,
			v.time_per_question,
			v.shuffle_options,
			v.show_answer_animations,
			v.power_ups_enabled,
			v.created_at,
			v.updated_at,
			COALESCE(qc.question_count, 0) AS question_count,
			COALESCE(a.attempts_count, 0) AS attempts_count,
			COALESCE(a.average_percentage, 0) AS average_percentage,
			a.best_percentage,
			COALESCE(t.tags, '{}') AS tags
		FROM visible v
		LEFT JOIN public.users u ON u.id = v.user_id
		LEFT JOIN q_counts qc ON qc.quiz_id = v.id
		LEFT JOIN a_stats a ON a.quiz_id = v.id
		LEFT JOIN t_agg t ON t.quiz_id = v.id
		ORDER BY %s
	`, strings.Join(where, " AND "), orderBy)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("get quiz overview: %w", err)
	}
	defer rows.Close()

	items := make([]model.QuizOverview, 0)
	for rows.Next() {
		var item model.QuizOverview
		var createdAt, updatedAt time.Time

		if err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.AuthorName,
			&item.Title,
			&item.Description,
			&item.Subject,
			&item.IsPublic,
			&item.TimePerQuestion,
			&item.ShuffleOptions,
			&item.ShowAnswerAnimations,
			&item.PowerUpsEnabled,
			&createdAt,
			&updatedAt,
			&item.QuestionCount,
			&item.AttemptsCount,
			&item.AveragePercentage,
			&item.BestPercentage,
			&item.Tags,
		); err != nil {
			return nil, fmt.Errorf("scan quiz overview: %w", err)
		}

		item.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		item.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate quiz overview rows: %w", err)
	}

	return items, nil
}

// GetByID loads a quiz with its questions, visible to the user if public or owned.
// CorrectOption is only populated when the requester is the author.
func (r *Quiz) GetByID(ctx context.Context, quizID, requesterUserID string) (*model.QuizDetail, error) {
	var d model.QuizDetail
	var createdAt, updatedAt time.Time

	err := r.pool.QueryRow(ctx, `
		SELECT
			q.id,
			q.user_id,
			NULLIF(u.full_name, '') AS author_name,
			q.title,
			q.description,
			q.subject,
			q.is_public,
			q.time_per_question,
			q.shuffle_options,
			q.show_answer_animations,
			q.power_ups_enabled,
			COALESCE(q.created_at, NOW()),
			COALESCE(q.updated_at, COALESCE(q.created_at, NOW()))
		FROM public.quizzes q
		LEFT JOIN public.users u ON u.id = q.user_id
		WHERE q.id = $1
		  AND (q.is_public = true OR q.user_id::text = $2)
	`, quizID, requesterUserID).Scan(
		&d.ID,
		&d.UserID,
		&d.AuthorName,
		&d.Title,
		&d.Description,
		&d.Subject,
		&d.IsPublic,
		&d.TimePerQuestion,
		&d.ShuffleOptions,
		&d.ShowAnswerAnimations,
		&d.PowerUpsEnabled,
		&createdAt,
		&updatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("quiz not found: %w", err)
	}

	d.CreatedAt = createdAt.UTC().Format(time.RFC3339)
	d.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
	d.IsAuthor = d.UserID == requesterUserID

	qRows, err := r.pool.Query(ctx, `
		SELECT id, question_text, question_type,
		       COALESCE(option_a, ''), COALESCE(option_b, ''),
		       COALESCE(option_c, ''), COALESCE(option_d, ''),
		       correct_option, blank_answer, reorder_items,
		       image_url, explanation, hint, order_index
		FROM public.quiz_questions
		WHERE quiz_id = $1
		ORDER BY order_index, created_at
	`, quizID)
	if err != nil {
		return nil, fmt.Errorf("load questions: %w", err)
	}
	defer qRows.Close()

	d.Questions = make([]model.QuizQuestionDTO, 0)
	for qRows.Next() {
		var q model.QuizQuestionDTO
		var correct, blank, reorderJSON, imageURL, explanation, hint *string
		if err := qRows.Scan(
			&q.ID,
			&q.QuestionText,
			&q.QuestionType,
			&q.OptionA,
			&q.OptionB,
			&q.OptionC,
			&q.OptionD,
			&correct,
			&blank,
			&reorderJSON,
			&imageURL,
			&explanation,
			&hint,
			&q.OrderIndex,
		); err != nil {
			return nil, fmt.Errorf("scan question: %w", err)
		}
		q.CorrectOption = correct
		q.BlankAnswer = blank
		q.ReorderItems = decodeStringArray(reorderJSON)
		q.ImageURL = imageURL
		q.Explanation = explanation
		q.Hint = hint

		d.Questions = append(d.Questions, q)
	}
	if err := qRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate questions: %w", err)
	}

	d.QuestionCount = len(d.Questions)

	if err := r.pool.QueryRow(ctx, `
		SELECT
			COUNT(*)::int,
			COALESCE(ROUND(AVG(percentage)), 0)::int
		FROM public.quiz_attempts
		WHERE quiz_id = $1 AND completed_at IS NOT NULL
	`, quizID).Scan(&d.AttemptsCount, &d.AveragePercentage); err != nil {
		return nil, fmt.Errorf("load attempt stats: %w", err)
	}

	tagRows, err := r.pool.Query(ctx,
		`SELECT tag FROM public.quiz_tags WHERE quiz_id = $1 ORDER BY tag`,
		quizID,
	)
	if err != nil {
		return nil, fmt.Errorf("load tags: %w", err)
	}
	defer tagRows.Close()
	d.Tags = make([]string, 0)
	for tagRows.Next() {
		var tag string
		if err := tagRows.Scan(&tag); err != nil {
			return nil, fmt.Errorf("scan tag: %w", err)
		}
		d.Tags = append(d.Tags, tag)
	}

	return &d, nil
}

// CreateQuiz inserts a quiz and all its questions atomically.
func (r *Quiz) CreateQuiz(ctx context.Context, userID string, req model.CreateQuizRequest) (string, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return "", fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var quizID string
	err = tx.QueryRow(ctx, `
		INSERT INTO quizzes (user_id, title, description, subject, is_public, time_per_question, shuffle_options, show_answer_animations, power_ups_enabled, created_at, updated_at)
		VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), $5, $6, $7, $8, $9, NOW(), NOW())
		RETURNING id
	`,
		userID, req.Title, req.Description, req.Subject,
		req.IsPublic, req.TimePerQuestion, req.ShuffleOptions, req.ShowAnswerAnimations, req.PowerUpsEnabled,
	).Scan(&quizID)
	if err != nil {
		return "", fmt.Errorf("insert quiz: %w", err)
	}

	rows := make([][]any, 0, len(req.Questions))
	for i, q := range req.Questions {
		qType := q.QuestionType
		if qType == "" {
			qType = "mcq"
		}
		rows = append(rows, []any{
			quizID,
			q.QuestionText,
			qType,
			nullableString(q.OptionA),
			nullableString(q.OptionB),
			nullableString(q.OptionC),
			nullableString(q.OptionD),
			nullableString(q.CorrectOption),
			nullableString(q.BlankAnswer),
			encodeStringArray(q.ReorderItems),
			nullableString(q.ImageURL),
			nullableString(q.Explanation),
			nullableString(q.Hint),
			i,
			time.Now().UTC(),
		})
	}

	if len(rows) > 0 {
		if _, err := tx.CopyFrom(
			ctx,
			pgx.Identifier{"quiz_questions"},
			[]string{
				"quiz_id",
				"question_text",
				"question_type",
				"option_a",
				"option_b",
				"option_c",
				"option_d",
				"correct_option",
				"blank_answer",
				"reorder_items",
				"image_url",
				"explanation",
				"hint",
				"order_index",
				"created_at",
			},
			pgx.CopyFromRows(rows),
		); err != nil {
			return "", fmt.Errorf("bulk insert questions: %w", err)
		}
	}

	if err := insertQuizTags(ctx, tx, quizID, req.Tags); err != nil {
		return "", err
	}

	if err := tx.Commit(ctx); err != nil {
		return "", fmt.Errorf("commit: %w", err)
	}
	return quizID, nil
}

// insertQuizTags writes the full tag set for a quiz. Caller is responsible
// for wiping previous rows first on updates — this helper only inserts.
func insertQuizTags(ctx context.Context, tx pgx.Tx, quizID string, tags []string) error {
	if len(tags) == 0 {
		return nil
	}
	rows := make([][]any, 0, len(tags))
	for _, t := range tags {
		rows = append(rows, []any{quizID, t, time.Now().UTC()})
	}
	if _, err := tx.CopyFrom(
		ctx,
		pgx.Identifier{"quiz_tags"},
		[]string{"quiz_id", "tag", "created_at"},
		pgx.CopyFromRows(rows),
	); err != nil {
		return fmt.Errorf("insert tags: %w", err)
	}
	return nil
}

// UpdateQuiz replaces a quiz's metadata and questions.
// Questions with a matching existing ID are updated in place so attempt
// history remains valid; missing ones are inserted; removed ones are deleted.
func (r *Quiz) UpdateQuiz(ctx context.Context, userID, quizID string, req model.UpdateQuizRequest) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var ownerID string
	err = tx.QueryRow(ctx, `SELECT user_id FROM quizzes WHERE id = $1`, quizID).Scan(&ownerID)
	if err != nil {
		return fmt.Errorf("quiz not found: %w", err)
	}
	if ownerID != userID {
		return fmt.Errorf("access denied")
	}

	if _, err := tx.Exec(ctx, `
		UPDATE quizzes
		SET title = $2,
		    description = NULLIF($3, ''),
		    subject = NULLIF($4, ''),
		    is_public = $5,
		    time_per_question = $6,
		    shuffle_options = $7,
		    show_answer_animations = $8,
		    power_ups_enabled = $9,
		    updated_at = NOW()
		WHERE id = $1
	`,
		quizID, req.Title, req.Description, req.Subject,
		req.IsPublic, req.TimePerQuestion, req.ShuffleOptions, req.ShowAnswerAnimations, req.PowerUpsEnabled,
	); err != nil {
		return fmt.Errorf("update quiz: %w", err)
	}

	existingRows, err := tx.Query(ctx, `SELECT id FROM quiz_questions WHERE quiz_id = $1`, quizID)
	if err != nil {
		return fmt.Errorf("load existing questions: %w", err)
	}
	existingIDs := make(map[string]struct{})
	for existingRows.Next() {
		var id string
		if err := existingRows.Scan(&id); err != nil {
			existingRows.Close()
			return fmt.Errorf("scan existing question id: %w", err)
		}
		existingIDs[id] = struct{}{}
	}
	if err := existingRows.Err(); err != nil {
		existingRows.Close()
		return fmt.Errorf("iterate existing questions: %w", err)
	}
	existingRows.Close()

	keptIDs := make([]string, 0, len(req.Questions))
	for i, q := range req.Questions {
		id := ""
		if q.ID != nil {
			id = strings.TrimSpace(*q.ID)
		}
		qType := q.QuestionType
		if qType == "" {
			qType = "mcq"
		}
		args := []any{
			id,                              // $1
			quizID,                          // $2
			q.QuestionText,                  // $3
			qType,                           // $4
			nullableString(q.OptionA),       // $5
			nullableString(q.OptionB),       // $6
			nullableString(q.OptionC),       // $7
			nullableString(q.OptionD),       // $8
			nullableString(q.CorrectOption), // $9
			nullableString(q.BlankAnswer),   // $10
			encodeStringArray(q.ReorderItems), // $11
			nullableString(q.ImageURL),      // $12
			nullableString(q.Explanation),   // $13
			i,                               // $14 (order_index)
			nullableString(q.Hint),          // $15
		}
		if _, ok := existingIDs[id]; ok {
			if _, err := tx.Exec(ctx, `
				UPDATE quiz_questions
				SET question_text  = $3,
				    question_type  = $4,
				    option_a       = $5,
				    option_b       = $6,
				    option_c       = $7,
				    option_d       = $8,
				    correct_option = $9,
				    blank_answer   = $10,
				    reorder_items  = $11,
				    image_url      = $12,
				    explanation    = $13,
				    order_index    = $14,
				    hint           = $15
				WHERE id = $1 AND quiz_id = $2
			`, args...); err != nil {
				return fmt.Errorf("update question %d: %w", i, err)
			}
			keptIDs = append(keptIDs, id)
			continue
		}

		var newID string
		err := tx.QueryRow(ctx, `
			INSERT INTO quiz_questions (
				quiz_id, question_text, question_type,
				option_a, option_b, option_c, option_d,
				correct_option, blank_answer, reorder_items,
				image_url, explanation, order_index, hint, created_at
			)
			VALUES ($2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
			RETURNING id
		`, args...).Scan(&newID)
		if err != nil {
			return fmt.Errorf("insert question %d: %w", i, err)
		}
		keptIDs = append(keptIDs, newID)
	}

	if len(keptIDs) == 0 {
		if _, err := tx.Exec(ctx, `DELETE FROM quiz_questions WHERE quiz_id = $1`, quizID); err != nil {
			return fmt.Errorf("delete questions: %w", err)
		}
	} else if _, err := tx.Exec(ctx,
		`DELETE FROM quiz_questions WHERE quiz_id = $1 AND NOT (id = ANY($2::uuid[]))`,
		quizID, keptIDs,
	); err != nil {
		return fmt.Errorf("delete removed questions: %w", err)
	}

	// Replace-all strategy for tags: the expected set is small (≤10) and
	// users rarely edit them, so a blind delete+insert beats diffing.
	if _, err := tx.Exec(ctx, `DELETE FROM quiz_tags WHERE quiz_id = $1`, quizID); err != nil {
		return fmt.Errorf("delete tags: %w", err)
	}
	if err := insertQuizTags(ctx, tx, quizID, req.Tags); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// DeleteQuiz removes a quiz owned by the user. Cascades to questions and attempts.
func (r *Quiz) DeleteQuiz(ctx context.Context, userID, quizID string) error {
	result, err := r.pool.Exec(ctx, `DELETE FROM quizzes WHERE id = $1 AND user_id = $2`, quizID, userID)
	if err != nil {
		return fmt.Errorf("delete quiz: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("quiz not found or access denied")
	}
	return nil
}

// CloneQuiz copies a quiz (plus all its questions) into a new private quiz
// owned by userID. The source must be visible to the user — public quizzes
// or quizzes the user owns. The clone is always created as private so the
// user can edit freely before publishing.
func (r *Quiz) CloneQuiz(ctx context.Context, userID, sourceQuizID string) (string, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return "", fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Verify visibility and load the source metadata.
	var srcTitle string
	var srcDescription, srcSubject *string
	var srcTimePerQuestion int
	var srcShuffle, srcShowAnimations, srcPowerUps bool
	err = tx.QueryRow(ctx, `
		SELECT title, description, subject, time_per_question, shuffle_options, show_answer_animations, power_ups_enabled
		FROM quizzes
		WHERE id = $1
		  AND (is_public = true OR user_id::text = $2)
	`, sourceQuizID, userID).Scan(
		&srcTitle, &srcDescription, &srcSubject,
		&srcTimePerQuestion, &srcShuffle, &srcShowAnimations, &srcPowerUps,
	)
	if err != nil {
		return "", fmt.Errorf("source quiz not found: %w", err)
	}

	// Title gets a " (copy)" suffix so the user can tell the clone apart
	// in their library even before editing.
	clonedTitle := srcTitle + " (copy)"
	if len(clonedTitle) > 200 {
		clonedTitle = clonedTitle[:200]
	}

	var newQuizID string
	if err := tx.QueryRow(ctx, `
		INSERT INTO quizzes (
			user_id, title, description, subject, is_public,
			time_per_question, shuffle_options, show_answer_animations, power_ups_enabled,
			created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, false, $5, $6, $7, $8, NOW(), NOW())
		RETURNING id
	`,
		userID, clonedTitle, srcDescription, srcSubject,
		srcTimePerQuestion, srcShuffle, srcShowAnimations, srcPowerUps,
	).Scan(&newQuizID); err != nil {
		return "", fmt.Errorf("insert clone: %w", err)
	}

	// Copy all questions in one statement — server-side SELECT ... INSERT
	// is faster than round-tripping each row through the app layer and
	// preserves order_index naturally.
	if _, err := tx.Exec(ctx, `
		INSERT INTO quiz_questions (
			quiz_id, question_text, question_type,
			option_a, option_b, option_c, option_d,
			correct_option, blank_answer, reorder_items,
			image_url, explanation, order_index, created_at
		)
		SELECT $1, question_text, question_type,
		       option_a, option_b, option_c, option_d,
		       correct_option, blank_answer, reorder_items,
		       image_url, explanation, order_index, NOW()
		FROM quiz_questions
		WHERE quiz_id = $2
		ORDER BY order_index, created_at
	`, newQuizID, sourceQuizID); err != nil {
		return "", fmt.Errorf("copy questions: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO quiz_tags (quiz_id, tag, created_at)
		SELECT $1, tag, NOW() FROM quiz_tags WHERE quiz_id = $2
	`, newQuizID, sourceQuizID); err != nil {
		return "", fmt.Errorf("copy tags: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return "", fmt.Errorf("commit clone: %w", err)
	}
	return newQuizID, nil
}

// questionAnswerRow holds the canonical data needed for server-side grading.
type questionAnswerRow struct {
	ID            string
	QuestionText  string
	QuestionType  string
	OptionA       string
	OptionB       string
	OptionC       string
	OptionD       string
	CorrectOption *string
	BlankAnswer   *string
	ReorderItems  []string
	ImageURL      *string
	Explanation   *string
	OrderIndex    int
}

// SubmitAttempt grades the attempt on the server and persists the result.
// The client's selected options are trusted only as selections — correctness
// is recomputed from the database.
func (r *Quiz) SubmitAttempt(ctx context.Context, userID, quizID string, req model.SubmitAttemptRequest) (*model.AttemptResult, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var isPublic bool
	var ownerID string
	if err := tx.QueryRow(ctx,
		`SELECT is_public, user_id FROM quizzes WHERE id = $1`, quizID,
	).Scan(&isPublic, &ownerID); err != nil {
		return nil, fmt.Errorf("quiz not found: %w", err)
	}
	if !isPublic && ownerID != userID {
		return nil, fmt.Errorf("access denied")
	}

	rows, err := tx.Query(ctx, `
		SELECT id, question_text, question_type,
		       COALESCE(option_a, ''), COALESCE(option_b, ''),
		       COALESCE(option_c, ''), COALESCE(option_d, ''),
		       correct_option, blank_answer, reorder_items,
		       image_url, explanation, order_index
		FROM quiz_questions
		WHERE quiz_id = $1
		ORDER BY order_index, created_at
	`, quizID)
	if err != nil {
		return nil, fmt.Errorf("load questions: %w", err)
	}
	defer rows.Close()

	questions := make(map[string]questionAnswerRow)
	order := make([]string, 0)
	for rows.Next() {
		var q questionAnswerRow
		var reorderJSON *string
		if err := rows.Scan(
			&q.ID, &q.QuestionText, &q.QuestionType,
			&q.OptionA, &q.OptionB, &q.OptionC, &q.OptionD,
			&q.CorrectOption, &q.BlankAnswer, &reorderJSON,
			&q.ImageURL, &q.Explanation, &q.OrderIndex,
		); err != nil {
			return nil, fmt.Errorf("scan question: %w", err)
		}
		q.ReorderItems = decodeStringArray(reorderJSON)
		questions[q.ID] = q
		order = append(order, q.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate questions: %w", err)
	}
	rows.Close()

	if len(questions) == 0 {
		return nil, fmt.Errorf("quiz has no questions")
	}

	submitted := make(map[string]model.AttemptAnswerInput, len(req.Answers))
	for _, a := range req.Answers {
		submitted[a.QuestionID] = a
	}

	score := 0
	totalTime := 0
	graded := make([]model.AttemptAnswerResult, 0, len(order))
	for _, qid := range order {
		q := questions[qid]
		a, hasAnswer := submitted[qid]

		var selected *string
		var textAnswer *string
		var orderAnswer []string
		var isCorrect bool
		timeSpent := 0

		if hasAnswer {
			timeSpent = a.TimeSpent
			switch q.QuestionType {
			case "fill_blank":
				if a.TextAnswer != nil {
					t := strings.TrimSpace(*a.TextAnswer)
					if t != "" {
						textAnswer = &t
						if q.BlankAnswer != nil &&
							normalizeBlank(t) == normalizeBlank(*q.BlankAnswer) {
							isCorrect = true
							score++
						}
					}
				}
			case "reorder":
				if len(a.OrderAnswer) > 0 {
					submittedOrder := make([]string, len(a.OrderAnswer))
					for i, it := range a.OrderAnswer {
						submittedOrder[i] = strings.TrimSpace(it)
					}
					orderAnswer = submittedOrder
					if stringSlicesEqual(submittedOrder, q.ReorderItems) {
						isCorrect = true
						score++
					}
				}
			case "true_false":
				if a.SelectedOption != nil {
					normalized := strings.ToLower(strings.TrimSpace(*a.SelectedOption))
					if normalized == "t" || normalized == "f" {
						selected = &normalized
						if q.CorrectOption != nil && normalized == *q.CorrectOption {
							isCorrect = true
							score++
						}
					}
				}
			case "mcq_multi":
				if a.SelectedOption != nil {
					submitted := strings.ToLower(strings.TrimSpace(*a.SelectedOption))
					if submitted != "" {
						selected = &submitted
						if q.CorrectOption != nil && mcqMultiMatch(submitted, *q.CorrectOption) {
							isCorrect = true
							score++
						}
					}
				}
			default: // mcq
				if a.SelectedOption != nil {
					normalized := strings.ToLower(strings.TrimSpace(*a.SelectedOption))
					if normalized == "a" || normalized == "b" || normalized == "c" || normalized == "d" {
						selected = &normalized
						if q.CorrectOption != nil && normalized == *q.CorrectOption {
							isCorrect = true
							score++
						}
					}
				}
			}
		}
		totalTime += timeSpent

		correctStr := ""
		if q.CorrectOption != nil {
			correctStr = *q.CorrectOption
		}

		graded = append(graded, model.AttemptAnswerResult{
			QuestionID:     q.ID,
			QuestionText:   q.QuestionText,
			QuestionType:   q.QuestionType,
			OptionA:        q.OptionA,
			OptionB:        q.OptionB,
			OptionC:        q.OptionC,
			OptionD:        q.OptionD,
			SelectedOption: selected,
			CorrectOption:  correctStr,
			TextAnswer:     textAnswer,
			BlankAnswer:    q.BlankAnswer,
			OrderAnswer:    orderAnswer,
			ReorderItems:   q.ReorderItems,
			ImageURL:       q.ImageURL,
			Explanation:    q.Explanation,
			IsCorrect:      isCorrect,
			TimeSpent:      timeSpent,
			OrderIndex:     q.OrderIndex,
		})
	}

	total := len(order)
	percentage := 0
	if total > 0 {
		percentage = int((float64(score) / float64(total)) * 100)
	}

	startedAt := time.Now().UTC().Add(-time.Duration(totalTime) * time.Second)
	if req.StartedAt != "" {
		if parsed, err := time.Parse(time.RFC3339, req.StartedAt); err == nil {
			startedAt = parsed.UTC()
		}
	}
	completedAt := time.Now().UTC()

	var attemptID string
	if err := tx.QueryRow(ctx, `
		INSERT INTO quiz_attempts (quiz_id, user_id, score, total_questions, percentage, time_spent, started_at, completed_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`,
		quizID, userID, score, total, percentage, totalTime, startedAt, completedAt,
	).Scan(&attemptID); err != nil {
		return nil, fmt.Errorf("insert attempt: %w", err)
	}

	for _, g := range graded {
		qid := g.QuestionID
		if _, err := tx.Exec(ctx, `
			INSERT INTO quiz_attempt_answers (
				attempt_id, question_id, selected_option,
				text_answer, order_answer, is_correct, time_spent
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`,
			attemptID, qid, g.SelectedOption,
			g.TextAnswer, encodeStringArray(g.OrderAnswer),
			g.IsCorrect, g.TimeSpent,
		); err != nil {
			return nil, fmt.Errorf("insert answer for %s: %w", qid, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}

	return &model.AttemptResult{
		ID:             attemptID,
		QuizID:         quizID,
		Score:          score,
		TotalQuestions: total,
		Percentage:     percentage,
		TimeSpent:      totalTime,
		StartedAt:      startedAt.Format(time.RFC3339),
		CompletedAt:    completedAt.Format(time.RFC3339),
		Answers:        graded,
	}, nil
}

// ListAttemptsForUser returns a user's attempt history for a given quiz.
func (r *Quiz) ListAttemptsForUser(ctx context.Context, userID, quizID string) ([]model.AttemptSummary, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, quiz_id, score, total_questions, percentage, time_spent, started_at, completed_at
		FROM quiz_attempts
		WHERE user_id = $1 AND quiz_id = $2 AND completed_at IS NOT NULL
		ORDER BY completed_at DESC
	`, userID, quizID)
	if err != nil {
		return nil, fmt.Errorf("list attempts: %w", err)
	}
	defer rows.Close()

	items := make([]model.AttemptSummary, 0)
	for rows.Next() {
		var s model.AttemptSummary
		var startedAt, completedAt time.Time
		if err := rows.Scan(
			&s.ID, &s.QuizID, &s.Score, &s.TotalQuestions,
			&s.Percentage, &s.TimeSpent, &startedAt, &completedAt,
		); err != nil {
			return nil, fmt.Errorf("scan attempt: %w", err)
		}
		s.StartedAt = startedAt.UTC().Format(time.RFC3339)
		s.CompletedAt = completedAt.UTC().Format(time.RFC3339)
		items = append(items, s)
	}
	return items, rows.Err()
}

// GetAttempt returns a full attempt (with answers) for the user who took it
// or for the quiz author.
func (r *Quiz) GetAttempt(ctx context.Context, userID, attemptID string) (*model.AttemptResult, error) {
	var (
		res         model.AttemptResult
		startedAt   time.Time
		completedAt time.Time
		attemptUser string
		quizOwner   string
	)

	err := r.pool.QueryRow(ctx, `
		SELECT a.id, a.quiz_id, a.score, a.total_questions, a.percentage,
		       a.time_spent, a.started_at, a.completed_at, a.user_id, q.user_id
		FROM quiz_attempts a
		JOIN quizzes q ON q.id = a.quiz_id
		WHERE a.id = $1
	`, attemptID).Scan(
		&res.ID, &res.QuizID, &res.Score, &res.TotalQuestions, &res.Percentage,
		&res.TimeSpent, &startedAt, &completedAt, &attemptUser, &quizOwner,
	)
	if err != nil {
		return nil, fmt.Errorf("attempt not found: %w", err)
	}

	if attemptUser != userID && quizOwner != userID {
		return nil, fmt.Errorf("access denied")
	}

	res.StartedAt = startedAt.UTC().Format(time.RFC3339)
	res.CompletedAt = completedAt.UTC().Format(time.RFC3339)

	rows, err := r.pool.Query(ctx, `
		SELECT
			aa.question_id,
			COALESCE(qq.question_text, ''),
			COALESCE(qq.question_type, 'mcq'),
			COALESCE(qq.option_a, ''),
			COALESCE(qq.option_b, ''),
			COALESCE(qq.option_c, ''),
			COALESCE(qq.option_d, ''),
			aa.selected_option,
			COALESCE(qq.correct_option, ''),
			aa.text_answer,
			qq.blank_answer,
			aa.order_answer,
			qq.reorder_items,
			qq.image_url,
			qq.explanation,
			aa.is_correct,
			aa.time_spent,
			COALESCE(qq.order_index, 0)
		FROM quiz_attempt_answers aa
		LEFT JOIN quiz_questions qq ON qq.id = aa.question_id
		WHERE aa.attempt_id = $1
		ORDER BY COALESCE(qq.order_index, 0)
	`, attemptID)
	if err != nil {
		return nil, fmt.Errorf("load attempt answers: %w", err)
	}
	defer rows.Close()

	res.Answers = make([]model.AttemptAnswerResult, 0)
	for rows.Next() {
		var a model.AttemptAnswerResult
		var questionID *string
		var orderAnswerJSON, reorderItemsJSON *string
		if err := rows.Scan(
			&questionID,
			&a.QuestionText,
			&a.QuestionType,
			&a.OptionA, &a.OptionB, &a.OptionC, &a.OptionD,
			&a.SelectedOption,
			&a.CorrectOption,
			&a.TextAnswer,
			&a.BlankAnswer,
			&orderAnswerJSON,
			&reorderItemsJSON,
			&a.ImageURL,
			&a.Explanation,
			&a.IsCorrect,
			&a.TimeSpent,
			&a.OrderIndex,
		); err != nil {
			return nil, fmt.Errorf("scan answer: %w", err)
		}
		if questionID != nil {
			a.QuestionID = *questionID
		}
		a.OrderAnswer = decodeStringArray(orderAnswerJSON)
		a.ReorderItems = decodeStringArray(reorderItemsJSON)
		res.Answers = append(res.Answers, a)
	}

	return &res, rows.Err()
}

// GetRecentAttempts returns the user's most recent completed quiz attempts
// across all quizzes, enriched with quiz title.
func (r *Quiz) GetRecentAttempts(ctx context.Context, userID string, limit int) ([]model.RecentAttemptItem, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT
			a.id            AS attempt_id,
			a.quiz_id,
			COALESCE(q.title, 'Quiz') AS quiz_title,
			a.score,
			a.total_questions,
			a.percentage,
			a.completed_at
		FROM quiz_attempts a
		LEFT JOIN quizzes q ON q.id = a.quiz_id
		WHERE a.user_id = $1 AND a.completed_at IS NOT NULL
		ORDER BY a.completed_at DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("recent attempts: %w", err)
	}
	defer rows.Close()

	items := make([]model.RecentAttemptItem, 0, limit)
	for rows.Next() {
		var it model.RecentAttemptItem
		var completedAt time.Time
		if err := rows.Scan(
			&it.AttemptID,
			&it.QuizID,
			&it.QuizTitle,
			&it.Score,
			&it.TotalQuestions,
			&it.Percentage,
			&completedAt,
		); err != nil {
			return nil, fmt.Errorf("scan recent attempt: %w", err)
		}
		it.CompletedAt = completedAt.UTC().Format(time.RFC3339)
		items = append(items, it)
	}
	return items, rows.Err()
}

// GetRecommendedPractice returns quizzes where the user's best score is below
// the given threshold (0-100). Results are ordered by last-attempt date so
// recently-touched quizzes appear first.
func (r *Quiz) GetRecommendedPractice(ctx context.Context, userID string, threshold, limit int) ([]model.RecommendedQuizItem, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT
			a.quiz_id,
			COALESCE(q.title, 'Quiz')   AS quiz_title,
			MAX(a.percentage)           AS best_percentage,
			COUNT(*)::int               AS attempts_count,
			MAX(a.completed_at)         AS last_attempt_at
		FROM quiz_attempts a
		LEFT JOIN quizzes q ON q.id = a.quiz_id
		WHERE a.user_id = $1 AND a.completed_at IS NOT NULL
		GROUP BY a.quiz_id, q.title
		HAVING MAX(a.percentage) < $2
		ORDER BY MAX(a.completed_at) DESC
		LIMIT $3
	`, userID, threshold, limit)
	if err != nil {
		return nil, fmt.Errorf("recommended practice: %w", err)
	}
	defer rows.Close()

	items := make([]model.RecommendedQuizItem, 0, limit)
	for rows.Next() {
		var it model.RecommendedQuizItem
		var lastAt time.Time
		if err := rows.Scan(
			&it.QuizID,
			&it.QuizTitle,
			&it.BestPercentage,
			&it.AttemptsCount,
			&lastAt,
		); err != nil {
			return nil, fmt.Errorf("scan recommended: %w", err)
		}
		it.LastAttemptAt = lastAt.UTC().Format(time.RFC3339)
		items = append(items, it)
	}
	return items, rows.Err()
}

// GetQuestionStats returns per-question accuracy for a quiz. Only the quiz
// owner should call this endpoint; the caller is responsible for the auth check.
func (r *Quiz) GetQuestionStats(ctx context.Context, quizID string) (*model.QuizStatsResponse, error) {
	// Total completed attempts for this quiz.
	var totalAttempts int
	if err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM quiz_attempts WHERE quiz_id = $1 AND completed_at IS NOT NULL`,
		quizID,
	).Scan(&totalAttempts); err != nil {
		return nil, fmt.Errorf("count attempts: %w", err)
	}

	rows, err := r.pool.Query(ctx, `
		SELECT
			qq.id              AS question_id,
			qq.question_text,
			qq.question_type,
			qq.order_index,
			COUNT(qaa.id)      AS total_count,
			COALESCE(SUM(CASE WHEN qaa.is_correct THEN 1 ELSE 0 END), 0) AS correct_count
		FROM quiz_questions qq
		LEFT JOIN quiz_attempt_answers qaa
			ON qaa.question_id = qq.id
			AND qaa.attempt_id IN (
				SELECT id FROM quiz_attempts
				WHERE quiz_id = $1 AND completed_at IS NOT NULL
			)
		WHERE qq.quiz_id = $1
		GROUP BY qq.id, qq.question_text, qq.question_type, qq.order_index
		ORDER BY qq.order_index ASC
	`, quizID)
	if err != nil {
		return nil, fmt.Errorf("question stats query: %w", err)
	}
	defer rows.Close()

	questions := make([]model.QuestionStat, 0)
	for rows.Next() {
		var qs model.QuestionStat
		if err := rows.Scan(
			&qs.QuestionID,
			&qs.QuestionText,
			&qs.QuestionType,
			&qs.OrderIndex,
			&qs.TotalCount,
			&qs.CorrectCount,
		); err != nil {
			return nil, fmt.Errorf("scan question stat: %w", err)
		}
		if qs.TotalCount > 0 {
			qs.Accuracy = int(float64(qs.CorrectCount) / float64(qs.TotalCount) * 100)
		}
		questions = append(questions, qs)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &model.QuizStatsResponse{
		TotalAttempts: totalAttempts,
		Questions:     questions,
	}, nil
}

// mcqMultiMatch compares two comma-separated option strings as sorted sets.
// e.g. mcqMultiMatch("c,a", "a,c") → true
func mcqMultiMatch(submitted, correct string) bool {
	parse := func(s string) []string {
		parts := strings.Split(s, ",")
		out := make([]string, 0, len(parts))
		for _, p := range parts {
			p = strings.TrimSpace(strings.ToLower(p))
			if p != "" {
				out = append(out, p)
			}
		}
		sort.Strings(out)
		return out
	}
	s := parse(submitted)
	c := parse(correct)
	if len(s) != len(c) {
		return false
	}
	for i := range s {
		if s[i] != c[i] {
			return false
		}
	}
	return true
}
