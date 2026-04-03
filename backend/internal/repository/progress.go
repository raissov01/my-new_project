package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/midoriya/flashlearn-backend/internal/model"
)

type Progress struct {
	pool *pgxpool.Pool
}

func NewProgress(pool *pgxpool.Pool) *Progress {
	return &Progress{pool: pool}
}

func (r *Progress) UpsertCardResult(ctx context.Context, userID, flashcardID string, correct bool) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin progress tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var existing ProgressRow
	var existingFound bool
	err = tx.QueryRow(ctx,
		`SELECT times_seen, times_correct, times_incorrect, is_weak, review_interval,
		        next_review_at::text, last_studied_at::text
		 FROM study_progress
		 WHERE user_id = $1 AND flashcard_id = $2`,
		userID, flashcardID,
	).Scan(
		&existing.TimesSeen,
		&existing.TimesCorrect,
		&existing.TimesIncorrect,
		&existing.IsWeak,
		&existing.ReviewInterval,
		&existing.NextReviewAt,
		&existing.LastStudiedAt,
	)
	if err == nil {
		existingFound = true
	} else if err != nil && err != pgx.ErrNoRows {
		return fmt.Errorf("load existing progress: %w", err)
	}

	now := time.Now().UTC()
	nextInterval := 1
	timesSeen := 1
	timesCorrect := 0
	timesIncorrect := 0
	isWeak := !correct

	if correct {
		timesCorrect = 1
	}
	if !correct {
		timesIncorrect = 1
	}

	if existingFound {
		timesSeen = existing.TimesSeen + 1
		timesCorrect += existing.TimesCorrect
		timesIncorrect += existing.TimesIncorrect
		if correct {
			nextInterval = existing.ReviewInterval * 2
			if nextInterval < 1 {
				nextInterval = 1
			}
			if nextInterval > 30 {
				nextInterval = 30
			}
			isWeak = existing.IsWeak && (timesCorrect < timesIncorrect)
		} else {
			nextInterval = 1
			isWeak = true
		}

		_, err = tx.Exec(ctx,
			`UPDATE study_progress
			 SET times_seen = $3,
			     times_correct = $4,
			     times_incorrect = $5,
			     is_weak = $6,
			     review_interval = $7,
			     next_review_at = $8,
			     last_studied_at = $9,
			     last_reviewed_at = $9
			 WHERE user_id = $1 AND flashcard_id = $2`,
			userID,
			flashcardID,
			timesSeen,
			timesCorrect,
			timesIncorrect,
			isWeak,
			nextInterval,
			now.AddDate(0, 0, nextInterval),
			now,
		)
		if err != nil {
			return fmt.Errorf("update progress: %w", err)
		}
	} else {
		_, err = tx.Exec(ctx,
			`INSERT INTO study_progress (
					user_id, flashcard_id, times_seen, times_correct, times_incorrect,
					is_weak, review_interval, next_review_at, last_studied_at, last_reviewed_at, created_at
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, NOW())`,
			userID,
			flashcardID,
			timesSeen,
			timesCorrect,
			timesIncorrect,
			isWeak,
			nextInterval,
			now.AddDate(0, 0, nextInterval),
			now,
		)
		if err != nil {
			return fmt.Errorf("insert progress: %w", err)
		}
	}

	return tx.Commit(ctx)
}

// ProfileStats holds the profile fields needed for reward computation.
type ProfileStats struct {
	StreakDays     int
	Points         int
	LastActiveDate *string
}

// GetProfileStats fetches streak, points, and last active date.
func (r *Progress) GetProfileStats(ctx context.Context, userID string) (ProfileStats, error) {
	var s ProfileStats
	var lastActive *string
	err := r.pool.QueryRow(ctx,
		`SELECT COALESCE(streak_days, 0), COALESCE(points, 0), last_active_date
		 FROM users WHERE id = $1`, userID,
	).Scan(&s.StreakDays, &s.Points, &lastActive)
	s.LastActiveDate = lastActive
	return s, err
}

// UpdateProfileStats updates streak, points, and last active date.
func (r *Progress) UpdateProfileStats(ctx context.Context, userID string, streak, points int, lastActive string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE users SET streak_days = $2, points = $3, last_active_date = $4 WHERE id = $1`,
		userID, streak, points, lastActive,
	)
	return err
}

// ProgressRow is a raw study_progress row.
type ProgressRow struct {
	TimesSeen      int
	TimesCorrect   int
	TimesIncorrect int
	IsWeak         bool
	ReviewInterval int
	NextReviewAt   string
	LastStudiedAt  string
}

// GetAllProgress fetches all study_progress rows for a user.
func (r *Progress) GetAllProgress(ctx context.Context, userID string) ([]ProgressRow, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT times_seen, times_correct, times_incorrect, is_weak, review_interval,
		        next_review_at::text, last_studied_at::text
		 FROM study_progress WHERE user_id = $1`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []ProgressRow
	for rows.Next() {
		var p ProgressRow
		if err := rows.Scan(&p.TimesSeen, &p.TimesCorrect, &p.TimesIncorrect,
			&p.IsWeak, &p.ReviewInterval, &p.NextReviewAt, &p.LastStudiedAt); err != nil {
			return nil, err
		}
		result = append(result, p)
	}
	return result, rows.Err()
}

func (r *Progress) GetSetProgress(ctx context.Context, userID, setID string) (map[string]model.SetProgressRow, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT
				sp.id,
				sp.user_id,
				sp.flashcard_id,
				sp.times_seen,
				sp.times_correct,
				sp.times_incorrect,
				sp.is_weak,
				sp.review_interval,
				COALESCE(sp.next_review_at, NOW())::text,
				COALESCE(sp.last_reviewed_at, sp.last_studied_at, NOW())::text,
				COALESCE(sp.last_studied_at, NOW())::text,
				COALESCE(sp.created_at, NOW())::text
			FROM study_progress sp
			JOIN flashcards f ON f.id = sp.flashcard_id
			WHERE sp.user_id = $1
		  AND f.set_id = $2`,
		userID, setID,
	)
	if err != nil {
		return nil, fmt.Errorf("get set progress: %w", err)
	}
	defer rows.Close()

	result := make(map[string]model.SetProgressRow)
	for rows.Next() {
		var row model.SetProgressRow
		if err := rows.Scan(
			&row.ID,
			&row.UserID,
			&row.FlashcardID,
			&row.TimesSeen,
			&row.TimesCorrect,
			&row.TimesIncorrect,
			&row.IsWeak,
			&row.ReviewInterval,
			&row.NextReviewAt,
			&row.LastReviewedAt,
			&row.LastStudiedAt,
			&row.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan set progress: %w", err)
		}
		result[row.FlashcardID] = row
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate set progress rows: %w", err)
	}

	return result, nil
}

// GetUserStats aggregates study statistics for the dashboard.
func (r *Progress) GetUserStats(ctx context.Context, userID string) (*model.UserStats, error) {
	profile, err := r.GetProfileStats(ctx, userID)
	if err != nil {
		return nil, err
	}

	progress, err := r.GetAllProgress(ctx, userID)
	if err != nil {
		return nil, err
	}

	today := time.Now().Format("2006-01-02")
	yesterday := time.Now().Add(-24 * time.Hour).Format("2006-01-02")
	now := time.Now()

	var totalStudied, totalCorrect, totalIncorrect int
	var dueToday, weakCards, mastered, totalWithProgress int
	dayCounts := make(map[string]int)

	for _, p := range progress {
		totalStudied += p.TimesSeen
		totalCorrect += p.TimesCorrect
		totalIncorrect += p.TimesIncorrect
		totalWithProgress++

		day := p.LastStudiedAt[:10]
		dayCounts[day]++

		if p.IsWeak {
			weakCards++
		}
		if p.ReviewInterval >= 14 {
			mastered++
		}
		if p.NextReviewAt[:10] <= today {
			dueToday++
		}
	}

	accuracy := 0
	if total := totalCorrect + totalIncorrect; total > 0 {
		accuracy = totalCorrect * 100 / total
	}

	// Recent 7-day activity
	activity := make([]model.DayActivity, 7)
	for i := 6; i >= 0; i-- {
		d := now.AddDate(0, 0, -i).Format("2006-01-02")
		activity[6-i] = model.DayActivity{Date: d, Count: dayCounts[d]}
	}

	level := profile.Points/100 + 1
	xpProgress := profile.Points % 100
	studiedToday := profile.LastActiveDate != nil && *profile.LastActiveDate == today
	streakAtRisk := profile.StreakDays > 0 && profile.LastActiveDate != nil && *profile.LastActiveDate == yesterday

	return &model.UserStats{
		TotalStudied:   totalStudied,
		TotalCorrect:   totalCorrect,
		TotalIncorrect: totalIncorrect,
		Accuracy:       accuracy,
		StreakDays:     profile.StreakDays,
		Points:         profile.Points,
		XPLevel:        level,
		XPProgress:     xpProgress,
		LevelName:      levelName(level),
		StudiedToday:   studiedToday,
		StreakAtRisk:   streakAtRisk,
		RecentActivity: activity,
		Smart: model.SmartStats{
			DueToday:          dueToday,
			WeakCards:         weakCards,
			Mastered:          mastered,
			TotalWithProgress: totalWithProgress,
		},
	}, nil
}

func levelName(level int) string {
	switch {
	case level >= 20:
		return "Master"
	case level >= 10:
		return "Skilled"
	case level >= 5:
		return "Focused"
	default:
		return "Beginner"
	}
}

// ToggleWeakCard sets or unsets the is_weak flag.
func (r *Progress) ToggleWeakCard(ctx context.Context, userID, flashcardID string, isWeak bool) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO study_progress (
			user_id,
			flashcard_id,
			is_weak,
			times_seen,
			times_correct,
			times_incorrect,
			review_interval,
			next_review_at,
			last_studied_at,
			last_reviewed_at,
			created_at
		)
		 VALUES ($1, $2, $3, 0, 0, 0, 1, NOW() + INTERVAL '1 day', NOW(), NOW(), NOW())
		 ON CONFLICT (user_id, flashcard_id) DO UPDATE SET is_weak = $3`,
		userID, flashcardID, isWeak,
	)
	return err
}

// SavePomodoroPreferences upserts pomodoro settings.
func (r *Progress) SavePomodoroPreferences(ctx context.Context, userID string, prefs model.PomodoroPreferences) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO pomodoro_preferences (user_id, work_minutes, break_minutes, updated_at)
		 VALUES ($1, $2, $3, NOW())
		 ON CONFLICT (user_id) DO UPDATE SET work_minutes = $2, break_minutes = $3, updated_at = NOW()`,
		userID, prefs.WorkMinutes, prefs.BreakMinutes,
	)
	return err
}

// GetPomodoroPreferences fetches pomodoro settings.
func (r *Progress) GetPomodoroPreferences(ctx context.Context, userID string) (model.PomodoroPreferences, error) {
	var p model.PomodoroPreferences
	err := r.pool.QueryRow(ctx,
		`SELECT work_minutes, break_minutes FROM pomodoro_preferences WHERE user_id = $1`, userID,
	).Scan(&p.WorkMinutes, &p.BreakMinutes)
	if err != nil {
		return model.PomodoroPreferences{WorkMinutes: 25, BreakMinutes: 5}, nil
	}
	return p, nil
}

// SavePomodoroSession records a completed pomodoro session.
func (r *Progress) SavePomodoroSession(ctx context.Context, userID string, input model.PomodoroSessionInput) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO pomodoro_sessions (user_id, set_id, study_mode, preset, work_minutes, break_minutes,
		 cards_reviewed, correct_answers, completed, finished_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())`,
		userID, input.SetID, input.StudyMode, input.Preset,
		input.WorkMinutes, input.BreakMinutes,
		input.CardsReviewed, input.CorrectCount,
	)
	return err
}
