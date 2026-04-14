package models

import "time"

// ClassGroup is a teacher-created classroom.
type ClassGroup struct {
	ID        string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	OwnerID   string    `gorm:"type:uuid;not null;index" json:"ownerId"`
	Name      string    `gorm:"not null" json:"name"`
	JoinCode  string    `gorm:"uniqueIndex;not null" json:"joinCode"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"createdAt"`

	Owner   User               `gorm:"foreignKey:OwnerID" json:"-"`
	Members []ClassGroupMember `gorm:"foreignKey:GroupID" json:"members,omitempty"`
}

func (ClassGroup) TableName() string {
	return "class_groups"
}

// ClassGroupMember is a student or owner in a class.
type ClassGroupMember struct {
	ID       string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	GroupID  string    `gorm:"type:uuid;not null;uniqueIndex:idx_group_user" json:"groupId"`
	UserID   string    `gorm:"type:uuid;not null;uniqueIndex:idx_group_user" json:"userId"`
	Role     string    `gorm:"not null;default:'student'" json:"role"`
	JoinedAt time.Time `gorm:"autoCreateTime" json:"joinedAt"`

	Group ClassGroup `gorm:"foreignKey:GroupID" json:"-"`
	User  User       `gorm:"foreignKey:UserID" json:"-"`
}

func (ClassGroupMember) TableName() string {
	return "class_group_members"
}

// ClassChallenge is a challenge assigned to a class.
type ClassChallenge struct {
	ID        string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	GroupID   string    `gorm:"type:uuid;not null;index" json:"groupId"`
	SetID     string    `gorm:"type:uuid;not null" json:"setId"`
	Title     string    `gorm:"not null" json:"title"`
	Deadline  *time.Time `json:"deadline"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"createdAt"`

	Group ClassGroup   `gorm:"foreignKey:GroupID" json:"-"`
	Set   FlashcardSet `gorm:"foreignKey:SetID" json:"-"`
}

func (ClassChallenge) TableName() string {
	return "class_challenges"
}

// ClassChallengeParticipant tracks which students joined a class challenge.
type ClassChallengeParticipant struct {
	ID          string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ChallengeID string    `gorm:"type:uuid;not null;uniqueIndex:idx_challenge_user" json:"challengeId"`
	UserID      string    `gorm:"type:uuid;not null;uniqueIndex:idx_challenge_user" json:"userId"`
	JoinedAt    time.Time `gorm:"autoCreateTime" json:"joinedAt"`
}

func (ClassChallengeParticipant) TableName() string {
	return "class_challenge_participants"
}

// ClassSetAssignment stores a set assigned to a classroom.
type ClassSetAssignment struct {
	ID         string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	GroupID    string     `gorm:"type:uuid;not null;index" json:"groupId"`
	SetID      string     `gorm:"type:uuid;not null;index" json:"setId"`
	AssignedBy *string    `gorm:"type:uuid" json:"assignedBy"`
	Deadline   *time.Time `json:"deadline"`
	CreatedAt  time.Time  `gorm:"autoCreateTime" json:"createdAt"`
}

func (ClassSetAssignment) TableName() string {
	return "class_set_assignments"
}

// ClassQuizAssignment stores a quiz assigned to a classroom.
type ClassQuizAssignment struct {
	ID         string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	GroupID    string     `gorm:"type:uuid;not null;uniqueIndex:idx_class_quiz_group_quiz,priority:1" json:"groupId"`
	QuizID     string     `gorm:"type:uuid;not null;uniqueIndex:idx_class_quiz_group_quiz,priority:2" json:"quizId"`
	AssignedBy *string    `gorm:"type:uuid" json:"assignedBy"`
	Deadline   *time.Time `json:"deadline"`
	CreatedAt  time.Time  `gorm:"autoCreateTime" json:"createdAt"`
}

func (ClassQuizAssignment) TableName() string {
	return "class_quiz_assignments"
}

// ChallengeAttempt is a user's submission for a set challenge.
type ChallengeAttempt struct {
	ID             string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID         string    `gorm:"type:uuid;not null;index" json:"userId"`
	SetID          string    `gorm:"type:uuid;not null;index" json:"setId"`
	CompletionTime int       `gorm:"not null" json:"completionTime"`
	Accuracy       int       `gorm:"not null" json:"accuracy"`
	TotalCorrect   int       `gorm:"not null" json:"totalCorrect"`
	TotalIncorrect int       `gorm:"not null" json:"totalIncorrect"`
	CompletedAt    time.Time `gorm:"autoCreateTime" json:"completedAt"`

	User User         `gorm:"foreignKey:UserID" json:"-"`
	Set  FlashcardSet `gorm:"foreignKey:SetID" json:"-"`
}

func (ChallengeAttempt) TableName() string {
	return "challenge_attempts"
}

// ClassChallengeAttempt records a student's challenge submission inside a class.
type ClassChallengeAttempt struct {
	ID             string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ChallengeID    string    `gorm:"type:uuid;not null;index" json:"challengeId"`
	UserID         string    `gorm:"type:uuid;not null;index" json:"userId"`
	SetID          string    `gorm:"type:uuid;not null;index" json:"setId"`
	CompletionTime int       `gorm:"not null" json:"completionTime"`
	Accuracy       int       `gorm:"not null" json:"accuracy"`
	TotalCorrect   int       `gorm:"not null" json:"totalCorrect"`
	TotalIncorrect int       `gorm:"not null" json:"totalIncorrect"`
	CompletedAt    time.Time `gorm:"autoCreateTime" json:"completedAt"`
}

func (ClassChallengeAttempt) TableName() string {
	return "class_challenge_attempts"
}

// PomodoroPreference stores user's pomodoro settings.
type PomodoroPreference struct {
	ID           string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID       string    `gorm:"type:uuid;uniqueIndex;not null" json:"userId"`
	WorkMinutes  int       `gorm:"not null;default:25" json:"workMinutes"`
	BreakMinutes int       `gorm:"not null;default:5" json:"breakMinutes"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime" json:"updatedAt"`
}

func (PomodoroPreference) TableName() string {
	return "pomodoro_preferences"
}

// PomodoroSession records a completed study session.
type PomodoroSession struct {
	ID             string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID         string    `gorm:"type:uuid;not null;index" json:"userId"`
	SetID          *string   `gorm:"type:uuid" json:"setId"`
	StudyMode      string    `gorm:"not null" json:"studyMode"`
	Preset         string    `gorm:"not null" json:"preset"`
	WorkMinutes    int       `gorm:"not null" json:"workMinutes"`
	BreakMinutes   int       `gorm:"not null" json:"breakMinutes"`
	CardsReviewed  int       `gorm:"not null;default:0" json:"cardsReviewed"`
	CorrectAnswers int       `gorm:"not null;default:0" json:"correctAnswers"`
	Completed      bool      `gorm:"not null;default:true" json:"completed"`
	FinishedAt     time.Time `gorm:"autoCreateTime" json:"finishedAt"`
}

func (PomodoroSession) TableName() string {
	return "pomodoro_sessions"
}
