package models

import "time"

// Quiz is a Quizizz-style multiple-choice quiz owned by a user.
type Quiz struct {
	ID                string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID            string    `gorm:"type:uuid;not null;index" json:"userId"`
	Title             string    `gorm:"not null" json:"title"`
	Description       *string   `json:"description"`
	Subject           *string   `gorm:"index" json:"subject"`
	IsPublic          bool      `gorm:"not null;default:false" json:"isPublic"`
	TimePerQuestion   int       `gorm:"not null;default:30" json:"timePerQuestion"`
	ShuffleOptions    bool      `gorm:"not null;default:true" json:"shuffleOptions"`
	CreatedAt         time.Time `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt         time.Time `gorm:"autoUpdateTime" json:"updatedAt"`

	User      User           `gorm:"foreignKey:UserID" json:"-"`
	Questions []QuizQuestion `gorm:"foreignKey:QuizID;constraint:OnDelete:CASCADE" json:"questions,omitempty"`
}

func (Quiz) TableName() string {
	return "quizzes"
}

// QuizQuestion is a single multiple-choice question inside a quiz.
type QuizQuestion struct {
	ID            string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	QuizID        string    `gorm:"type:uuid;not null;index:idx_quiz_questions_quiz_order,priority:1" json:"quizId"`
	QuestionText  string    `gorm:"not null" json:"questionText"`
	OptionA       string    `gorm:"not null" json:"optionA"`
	OptionB       string    `gorm:"not null" json:"optionB"`
	OptionC       string    `gorm:"not null" json:"optionC"`
	OptionD       string    `gorm:"not null" json:"optionD"`
	CorrectOption string    `gorm:"type:char(1);not null" json:"correctOption"`
	OrderIndex    int       `gorm:"not null;default:0;index:idx_quiz_questions_quiz_order,priority:2" json:"orderIndex"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"createdAt"`

	Quiz Quiz `gorm:"foreignKey:QuizID;constraint:OnDelete:CASCADE" json:"-"`
}

func (QuizQuestion) TableName() string {
	return "quiz_questions"
}

// QuizAttempt records a single play-through of a quiz by a user.
type QuizAttempt struct {
	ID             string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	QuizID         string     `gorm:"type:uuid;not null;index:idx_quiz_attempts_user_quiz,priority:2" json:"quizId"`
	UserID         string     `gorm:"type:uuid;not null;index:idx_quiz_attempts_user_quiz,priority:1" json:"userId"`
	Score          int        `gorm:"not null;default:0" json:"score"`
	TotalQuestions int        `gorm:"not null;default:0" json:"totalQuestions"`
	Percentage     int        `gorm:"not null;default:0" json:"percentage"`
	TimeSpent      int        `gorm:"not null;default:0" json:"timeSpent"`
	StartedAt      time.Time  `gorm:"not null;default:CURRENT_TIMESTAMP" json:"startedAt"`
	CompletedAt    *time.Time `json:"completedAt"`

	Quiz    Quiz                `gorm:"foreignKey:QuizID;constraint:OnDelete:CASCADE" json:"-"`
	User    User                `gorm:"foreignKey:UserID" json:"-"`
	Answers []QuizAttemptAnswer `gorm:"foreignKey:AttemptID;constraint:OnDelete:CASCADE" json:"answers,omitempty"`
}

func (QuizAttempt) TableName() string {
	return "quiz_attempts"
}

// QuizAttemptAnswer captures a single question answer inside an attempt.
type QuizAttemptAnswer struct {
	ID             string  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	AttemptID      string  `gorm:"type:uuid;not null;index" json:"attemptId"`
	QuestionID     *string `gorm:"type:uuid;index" json:"questionId"`
	SelectedOption *string `gorm:"type:char(1)" json:"selectedOption"`
	IsCorrect      bool    `gorm:"not null;default:false" json:"isCorrect"`
	TimeSpent      int     `gorm:"not null;default:0" json:"timeSpent"`

	Attempt  QuizAttempt   `gorm:"foreignKey:AttemptID;constraint:OnDelete:CASCADE" json:"-"`
	Question *QuizQuestion `gorm:"foreignKey:QuestionID;constraint:OnDelete:SET NULL" json:"-"`
}

func (QuizAttemptAnswer) TableName() string {
	return "quiz_attempt_answers"
}
