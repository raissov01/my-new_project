package models

import "time"

// EngSimPlacement stores the result of a user's placement test.
type EngSimPlacement struct {
	ID              string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID          string    `gorm:"type:uuid;not null;uniqueIndex" json:"userId"`
	Level           string    `gorm:"not null" json:"level"`
	Score           int       `gorm:"not null;default:0" json:"score"`
	TotalQuestions  int       `gorm:"not null;default:0" json:"totalQuestions"`
	CorrectAnswers  int       `gorm:"not null;default:0" json:"correctAnswers"`
	DetailedResults string    `gorm:"type:jsonb;not null;default:'{}'" json:"detailedResults"`
	CompletedAt     time.Time `gorm:"not null" json:"completedAt"`
	CreatedAt       time.Time `gorm:"autoCreateTime" json:"createdAt"`
}

func (EngSimPlacement) TableName() string { return "eng_sim_placements" }

// EngSimUnit represents a unit in the learning roadmap.
type EngSimUnit struct {
	ID          string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Level       string    `gorm:"not null;index" json:"level"`
	SortOrder   int       `gorm:"not null;default:0;uniqueIndex" json:"sortOrder"`
	Title       string    `gorm:"not null" json:"title"`
	Description string    `gorm:"type:text;not null;default:''" json:"description"`
	IELTSSkill  string    `gorm:"not null" json:"ieltsSkill"`
	IconEmoji   string    `gorm:"not null;default:'📚'" json:"iconEmoji"`
	Color       string    `gorm:"not null;default:'#6366f1'" json:"color"`
	// BUG-LEARN-002: 'GENERAL' | 'IELTS' — filters which path shows this unit
	Course      string    `gorm:"not null;default:'GENERAL'" json:"course"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"createdAt"`
}

func (EngSimUnit) TableName() string { return "eng_sim_units" }

// EngSimLesson is a single lesson node within a unit.
type EngSimLesson struct {
	ID               string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UnitID           string    `gorm:"type:uuid;not null;index" json:"unitId"`
	SortOrder        int       `gorm:"not null;default:0" json:"sortOrder"`
	Title            string    `gorm:"not null" json:"title"`
	LessonType       string    `gorm:"not null;default:'standard'" json:"lessonType"`
	CachedExercises  *string   `gorm:"type:jsonb" json:"-"`
	CreatedAt        time.Time `gorm:"autoCreateTime" json:"createdAt"`
}

func (EngSimLesson) TableName() string { return "eng_sim_lessons" }

// EngSimLessonSession tracks a user's attempt at a lesson.
type EngSimLessonSession struct {
	ID             string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID         string     `gorm:"type:uuid;not null;index" json:"userId"`
	LessonID       string     `gorm:"type:uuid;not null;index" json:"lessonId"`
	UnitID         string     `gorm:"type:uuid;not null;index" json:"unitId"`
	Status         string     `gorm:"not null;default:'in_progress'" json:"status"`
	Exercises      string     `gorm:"type:jsonb;not null;default:'[]'" json:"exercises"`
	Answers        string     `gorm:"type:jsonb;not null;default:'[]'" json:"answers"`
	TotalExercises int        `gorm:"not null;default:0" json:"totalExercises"`
	CorrectAnswers int        `gorm:"not null;default:0" json:"correctAnswers"`
	XPEarned       int        `gorm:"not null;default:0" json:"xpEarned"`
	StarsEarned    int        `gorm:"not null;default:0" json:"starsEarned"`
	ComboMax       int        `gorm:"not null;default:0" json:"comboMax"`
	HeartsUsed     int        `gorm:"not null;default:0" json:"heartsUsed"`
	TimeTakenSecs  int        `gorm:"not null;default:0" json:"timeTakenSecs"`
	StartedAt      time.Time  `gorm:"autoCreateTime" json:"startedAt"`
	CompletedAt    *time.Time `json:"completedAt"`
}

func (EngSimLessonSession) TableName() string { return "eng_sim_lesson_sessions" }

// EngSimUserProgress tracks overall gamification state per user.
type EngSimUserProgress struct {
	ID               string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID           string     `gorm:"type:uuid;not null;uniqueIndex" json:"userId"`
	CurrentLevel     string     `gorm:"not null;default:'A1'" json:"currentLevel"`
	TotalXP          int        `gorm:"not null;default:0" json:"totalXp"`
	Hearts           int        `gorm:"not null;default:5" json:"hearts"`
	HeartsRefillAt   *time.Time `json:"heartsRefillAt"`
	Gems             int        `gorm:"not null;default:0" json:"gems"`
	CurrentStreak    int        `gorm:"not null;default:0" json:"currentStreak"`
	LongestStreak    int        `gorm:"not null;default:0" json:"longestStreak"`
	LastPracticeDate *string    `json:"lastPracticeDate"`
	LessonsCompleted int        `gorm:"not null;default:0" json:"lessonsCompleted"`
	UpdatedAt        time.Time  `gorm:"autoUpdateTime" json:"updatedAt"`
	CreatedAt        time.Time  `gorm:"autoCreateTime" json:"createdAt"`
}

func (EngSimUserProgress) TableName() string { return "eng_sim_user_progress" }

// EngSimUnitProgress tracks stars earned per unit per user.
type EngSimUnitProgress struct {
	ID          string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID      string     `gorm:"type:uuid;not null;uniqueIndex:idx_engsim_user_unit" json:"userId"`
	UnitID      string     `gorm:"type:uuid;not null;uniqueIndex:idx_engsim_user_unit" json:"unitId"`
	TotalStars  int        `gorm:"not null;default:0" json:"totalStars"`
	MaxStars    int        `gorm:"not null;default:0" json:"maxStars"`
	IsUnlocked  bool       `gorm:"not null;default:false" json:"isUnlocked"`
	CompletedAt *time.Time `json:"completedAt"`
	UpdatedAt   time.Time  `gorm:"autoUpdateTime" json:"updatedAt"`
}

func (EngSimUnitProgress) TableName() string { return "eng_sim_unit_progress" }

// EngSimLessonProgress tracks best result per lesson per user.
type EngSimLessonProgress struct {
	ID           string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID       string     `gorm:"type:uuid;not null;uniqueIndex:idx_engsim_user_lesson" json:"userId"`
	LessonID     string     `gorm:"type:uuid;not null;uniqueIndex:idx_engsim_user_lesson" json:"lessonId"`
	BestStars    int        `gorm:"not null;default:0" json:"bestStars"`
	Attempts     int        `gorm:"not null;default:0" json:"attempts"`
	BestAccuracy int        `gorm:"not null;default:0" json:"bestAccuracy"`
	LastPlayedAt *time.Time `json:"lastPlayedAt"`
}

func (EngSimLessonProgress) TableName() string { return "eng_sim_lesson_progress" }
