package models

import "time"

// FlashcardSet is a collection of flashcards owned by a user.
type FlashcardSet struct {
	ID          string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID      string    `gorm:"type:uuid;not null;index" json:"userId"`
	Title       string    `gorm:"not null" json:"title"`
	Description *string   `json:"description"`
	IsPublic    bool      `gorm:"not null;default:true" json:"isPublic"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime" json:"updatedAt"`

	User       User        `gorm:"foreignKey:UserID" json:"-"`
	Flashcards []Flashcard `gorm:"foreignKey:SetID" json:"flashcards,omitempty"`
}

func (FlashcardSet) TableName() string {
	return "flashcard_sets"
}

// Flashcard is a single term-definition card in a set.
type Flashcard struct {
	ID         string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	SetID      string    `gorm:"type:uuid;not null;index" json:"setId"`
	Term       string    `gorm:"not null" json:"term"`
	Definition string    `gorm:"not null" json:"definition"`
	Position   int       `gorm:"not null;default:0" json:"position"`
	CreatedAt  time.Time `gorm:"autoCreateTime" json:"createdAt"`

	Set FlashcardSet `gorm:"foreignKey:SetID" json:"-"`
}

func (Flashcard) TableName() string {
	return "flashcards"
}

// StudyProgress tracks spaced repetition data per user+card.
type StudyProgress struct {
	ID             string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID         string    `gorm:"type:uuid;not null;uniqueIndex:idx_user_flashcard" json:"userId"`
	FlashcardID    string    `gorm:"type:uuid;not null;uniqueIndex:idx_user_flashcard" json:"flashcardId"`
	TimesSeen      int       `gorm:"not null;default:0" json:"timesSeen"`
	TimesCorrect   int       `gorm:"not null;default:0" json:"timesCorrect"`
	TimesIncorrect int       `gorm:"not null;default:0" json:"timesIncorrect"`
	IsWeak         bool      `gorm:"not null;default:false" json:"isWeak"`
	ReviewInterval int       `gorm:"not null;default:1" json:"reviewInterval"`
	NextReviewAt   time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"nextReviewAt"`
	LastReviewedAt *time.Time `json:"lastReviewedAt"`
	LastStudiedAt  time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"lastStudiedAt"`
	CreatedAt      time.Time `gorm:"autoCreateTime" json:"createdAt"`
}

func (StudyProgress) TableName() string {
	return "study_progress"
}
