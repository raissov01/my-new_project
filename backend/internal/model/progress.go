package model

// CardResult is a single card answer from a study session.
type CardResult struct {
	FlashcardID string `json:"flashcardId"`
	Correct     bool   `json:"correct"`
}

// SaveSessionRequest is the input for saving study session results.
type SaveSessionRequest struct {
	Results []CardResult `json:"results"`
}

// StudyReward is the gamification output after a session.
type StudyReward struct {
	PointsEarned   int     `json:"pointsEarned"`
	StreakDays      int     `json:"streakDays"`
	PreviousPoints int     `json:"previousPoints"`
	CurrentPoints  int     `json:"currentPoints"`
	PreviousLevel  int     `json:"previousLevel"`
	CurrentLevel   int     `json:"currentLevel"`
	LevelName      string  `json:"currentLevelName"`
	Accuracy       int     `json:"currentAccuracy"`
	AccuracyDelta  int     `json:"accuracyDelta"`
}

// SaveSessionResponse is the response from saving a study session.
type SaveSessionResponse struct {
	Error  *string      `json:"error"`
	Reward *StudyReward `json:"reward"`
}

// UserStats holds aggregated study statistics for the dashboard.
type UserStats struct {
	TotalStudied   int            `json:"totalStudied"`
	TotalCorrect   int            `json:"totalCorrect"`
	TotalIncorrect int            `json:"totalIncorrect"`
	Accuracy       int            `json:"accuracy"`
	StreakDays      int            `json:"streakDays"`
	Points         int            `json:"points"`
	XPLevel        int            `json:"xpLevel"`
	XPProgress     int            `json:"xpProgress"`
	LevelName      string         `json:"levelName"`
	StudiedToday   bool           `json:"studiedToday"`
	StreakAtRisk   bool           `json:"streakAtRisk"`
	RecentActivity []DayActivity  `json:"recentActivity"`
	Smart          SmartStats     `json:"smart"`
}

// DayActivity is a single day's study count.
type DayActivity struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

// SmartStats holds spaced repetition summary.
type SmartStats struct {
	DueToday          int `json:"dueToday"`
	WeakCards         int `json:"weakCards"`
	Mastered          int `json:"mastered"`
	TotalWithProgress int `json:"totalWithProgress"`
}

// PomodoroPreferences holds user's pomodoro settings.
type PomodoroPreferences struct {
	WorkMinutes  int `json:"workMinutes"`
	BreakMinutes int `json:"breakMinutes"`
}

// PomodoroSessionInput is input for recording a completed session.
type PomodoroSessionInput struct {
	SetID         *string `json:"setId"`
	StudyMode     string  `json:"studyMode"`
	Preset        string  `json:"preset"`
	WorkMinutes   int     `json:"workMinutes"`
	BreakMinutes  int     `json:"breakMinutes"`
	CardsReviewed int     `json:"cardsReviewed"`
	CorrectCount  int     `json:"correctAnswers"`
}

// SetProgressRow mirrors the progress payload expected by the frontend.
type SetProgressRow struct {
	ID             string  `json:"id"`
	UserID         string  `json:"user_id"`
	FlashcardID    string  `json:"flashcard_id"`
	TimesSeen      int     `json:"times_seen"`
	TimesCorrect   int     `json:"times_correct"`
	TimesIncorrect int     `json:"times_incorrect"`
	IsWeak         bool    `json:"is_weak"`
	ReviewInterval int     `json:"review_interval"`
	NextReviewAt   string  `json:"next_review_at"`
	LastReviewedAt *string `json:"last_reviewed_at"`
	LastStudiedAt  string  `json:"last_studied_at"`
	CreatedAt      string  `json:"created_at"`
}
