package service

import (
	"context"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/model"
	"github.com/midoriya/flashlearn-backend/internal/repository"
)

type Progress struct {
	repo *repository.Progress
}

func NewProgress(repo *repository.Progress) *Progress {
	return &Progress{repo: repo}
}

// SaveSessionResults processes card answers, updates progress, streak, XP, and returns rewards.
func (s *Progress) SaveSessionResults(ctx context.Context, userID string, results []model.CardResult) (*model.SaveSessionResponse, error) {
	if len(results) == 0 {
		return &model.SaveSessionResponse{}, nil
	}

	// 1. Fetch current profile stats
	profile, err := s.repo.GetProfileStats(ctx, userID)
	if err != nil {
		errMsg := "failed to fetch profile"
		return &model.SaveSessionResponse{Error: &errMsg}, nil
	}

	// 2. Upsert each card result (parallel-safe since they're separate rows)
	for _, r := range results {
		if err := s.repo.UpsertCardResult(ctx, userID, r.FlashcardID, r.Correct); err != nil {
			errMsg := "failed to save card result"
			return &model.SaveSessionResponse{Error: &errMsg}, nil
		}
	}

	// 3. Calculate streak
	today := time.Now().Format("2006-01-02")
	yesterday := time.Now().Add(-24 * time.Hour).Format("2006-01-02")

	streak := profile.StreakDays
	if profile.LastActiveDate == nil || *profile.LastActiveDate != today {
		if profile.LastActiveDate != nil && *profile.LastActiveDate == yesterday {
			streak++
		} else {
			streak = 1
		}
	}

	// 4. Calculate points
	correct := 0
	for _, r := range results {
		if r.Correct {
			correct++
		}
	}
	points := calculatePoints(len(results), correct)
	newPoints := profile.Points + points

	// 5. Update profile
	if err := s.repo.UpdateProfileStats(ctx, userID, streak, newPoints, today); err != nil {
		errMsg := "failed to update profile"
		return &model.SaveSessionResponse{Error: &errMsg}, nil
	}

	// 6. Build reward
	prevLevel := profile.Points/100 + 1
	currLevel := newPoints/100 + 1

	// Calculate accuracy change
	progress, _ := s.repo.GetAllProgress(ctx, userID)
	var totalCorrect, totalIncorrect int
	for _, p := range progress {
		totalCorrect += p.TimesCorrect
		totalIncorrect += p.TimesIncorrect
	}
	newAccuracy := 0
	if total := totalCorrect + totalIncorrect; total > 0 {
		newAccuracy = totalCorrect * 100 / total
	}

	reward := &model.StudyReward{
		PointsEarned:   points,
		StreakDays:      streak,
		PreviousPoints: profile.Points,
		CurrentPoints:  newPoints,
		PreviousLevel:  prevLevel,
		CurrentLevel:   currLevel,
		LevelName:      levelName(currLevel),
		Accuracy:       newAccuracy,
	}

	return &model.SaveSessionResponse{Reward: reward}, nil
}

func calculatePoints(total, correct int) int {
	incorrect := total - correct
	base := correct*10 + incorrect*4
	completion := 5
	perfect := 0
	if correct == total && total > 0 {
		perfect = 20
	}
	return base + completion + perfect
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

// GetUserStats returns aggregated study statistics.
func (s *Progress) GetUserStats(ctx context.Context, userID string) (*model.UserStats, error) {
	return s.repo.GetUserStats(ctx, userID)
}

// ToggleWeakCard sets or unsets the weak flag.
func (s *Progress) ToggleWeakCard(ctx context.Context, userID, flashcardID string, isWeak bool) error {
	return s.repo.ToggleWeakCard(ctx, userID, flashcardID, isWeak)
}

// GetPomodoroPreferences returns pomodoro settings.
func (s *Progress) GetPomodoroPreferences(ctx context.Context, userID string) (model.PomodoroPreferences, error) {
	return s.repo.GetPomodoroPreferences(ctx, userID)
}

// SavePomodoroPreferences saves pomodoro settings.
func (s *Progress) SavePomodoroPreferences(ctx context.Context, userID string, prefs model.PomodoroPreferences) error {
	return s.repo.SavePomodoroPreferences(ctx, userID, prefs)
}

// SavePomodoroSession records a completed session.
func (s *Progress) SavePomodoroSession(ctx context.Context, userID string, input model.PomodoroSessionInput) error {
	return s.repo.SavePomodoroSession(ctx, userID, input)
}
