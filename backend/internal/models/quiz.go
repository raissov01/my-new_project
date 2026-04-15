package models

import "time"

// Quiz is a Quizizz-style multiple-choice quiz owned by a user.
type Quiz struct {
	ID                   string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID               string    `gorm:"type:uuid;not null;index" json:"userId"`
	Title                string    `gorm:"not null" json:"title"`
	Description          *string   `json:"description"`
	Subject              *string   `gorm:"index" json:"subject"`
	IsPublic             bool      `gorm:"not null;default:false" json:"isPublic"`
	TimePerQuestion      int       `gorm:"not null;default:30" json:"timePerQuestion"`
	ShuffleOptions       bool      `gorm:"not null;default:true" json:"shuffleOptions"`
	ShowAnswerAnimations bool      `gorm:"not null;default:true" json:"showAnswerAnimations"`
	CreatedAt            time.Time `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt            time.Time `gorm:"autoUpdateTime" json:"updatedAt"`

	User      User           `gorm:"foreignKey:UserID" json:"-"`
	Questions []QuizQuestion `gorm:"foreignKey:QuizID;constraint:OnDelete:CASCADE" json:"questions,omitempty"`
}

func (Quiz) TableName() string {
	return "quizzes"
}

// QuizQuestion is a single question inside a quiz. Supports multiple types via QuestionType:
//   - mcq        : OptionA..D + CorrectOption ('a'|'b'|'c'|'d')
//   - true_false : CorrectOption ('t'|'f')
//   - fill_blank : BlankAnswer
//   - reorder    : ReorderItems (JSON-encoded canonical order)
type QuizQuestion struct {
	ID            string  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	QuizID        string  `gorm:"type:uuid;not null;index:idx_quiz_questions_quiz_order,priority:1" json:"quizId"`
	QuestionText  string  `gorm:"not null" json:"questionText"`
	QuestionType  string  `gorm:"type:varchar(20);not null;default:'mcq'" json:"questionType"`
	OptionA       string  `json:"optionA"`
	OptionB       string  `json:"optionB"`
	OptionC       string  `json:"optionC"`
	OptionD       string  `json:"optionD"`
	CorrectOption string  `gorm:"type:varchar(2)" json:"correctOption"`
	BlankAnswer   *string `gorm:"type:text" json:"blankAnswer,omitempty"`
	ReorderItems  *string `gorm:"type:jsonb" json:"reorderItems,omitempty"`
	ImageURL      *string `gorm:"type:text" json:"imageUrl,omitempty"`
	Explanation   *string `gorm:"type:text" json:"explanation,omitempty"`

	OrderIndex int       `gorm:"not null;default:0;index:idx_quiz_questions_quiz_order,priority:2" json:"orderIndex"`
	CreatedAt  time.Time `gorm:"autoCreateTime" json:"createdAt"`

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
// SelectedOption is used for mcq / true_false (a-d, t, f).
// TextAnswer is used for fill_blank.
// OrderAnswer is a JSON-encoded array of items in the order the user submitted (reorder).
type QuizAttemptAnswer struct {
	ID             string  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	AttemptID      string  `gorm:"type:uuid;not null;index" json:"attemptId"`
	QuestionID     *string `gorm:"type:uuid;index" json:"questionId"`
	SelectedOption *string `gorm:"type:varchar(2)" json:"selectedOption"`
	TextAnswer     *string `gorm:"type:text" json:"textAnswer,omitempty"`
	OrderAnswer    *string `gorm:"type:jsonb" json:"orderAnswer,omitempty"`
	IsCorrect      bool    `gorm:"not null;default:false" json:"isCorrect"`
	TimeSpent      int     `gorm:"not null;default:0" json:"timeSpent"`

	Attempt  QuizAttempt   `gorm:"foreignKey:AttemptID;constraint:OnDelete:CASCADE" json:"-"`
	Question *QuizQuestion `gorm:"foreignKey:QuestionID;constraint:OnDelete:SET NULL" json:"-"`
}

func (QuizAttemptAnswer) TableName() string {
	return "quiz_attempt_answers"
}
