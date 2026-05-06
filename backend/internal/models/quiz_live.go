package models

import "time"

// QuizLiveSession represents a teacher-hosted live game session.
// Status lifecycle: lobby → active → finished.
// Mode: teacher_paced (teacher clicks Next) or self_paced (each student advances independently).
type QuizLiveSession struct {
	ID              string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	QuizID          string     `gorm:"type:uuid;not null;index" json:"quizId"`
	HostUserID      string     `gorm:"type:uuid;not null" json:"hostUserId"`
	JoinCode        string     `gorm:"type:varchar(8);not null;uniqueIndex" json:"joinCode"`
	Mode            string     `gorm:"type:varchar(20);not null;default:'teacher_paced'" json:"mode"` // teacher_paced | self_paced
	Status          string     `gorm:"type:varchar(20);not null;default:'lobby'" json:"status"`       // lobby | active | finished
	CurrentQuestion int        `gorm:"not null;default:0" json:"currentQuestion"`
	AllowAnonymous  bool       `gorm:"not null;default:true" json:"allowAnonymous"`
	TeamMode        bool       `gorm:"not null;default:false" json:"teamMode"`
	TeamCount       int        `gorm:"not null;default:2" json:"teamCount"`
	CreatedAt       time.Time  `gorm:"autoCreateTime" json:"createdAt"`
	StartedAt       *time.Time `json:"startedAt,omitempty"`
	FinishedAt      *time.Time `json:"finishedAt,omitempty"`

	Quiz         Quiz                  `gorm:"foreignKey:QuizID;constraint:OnDelete:CASCADE" json:"-"`
	Participants []QuizLiveParticipant `gorm:"foreignKey:SessionID;constraint:OnDelete:CASCADE" json:"participants,omitempty"`
}

func (QuizLiveSession) TableName() string { return "quiz_live_sessions" }

// QuizLiveParticipant is a player in a live session.
// UserID is nil for anonymous players.
type QuizLiveParticipant struct {
	ID          string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	SessionID   string     `gorm:"type:uuid;not null;index" json:"sessionId"`
	UserID      *string    `gorm:"type:uuid;index" json:"userId,omitempty"`
	DisplayName string     `gorm:"type:varchar(60);not null" json:"displayName"`
	Score       int        `gorm:"not null;default:0" json:"score"`
	Streak      int        `gorm:"not null;default:0" json:"streak"`
	TeamID      int        `gorm:"not null;default:0" json:"teamId"`
	IsOnline    bool       `gorm:"not null;default:true" json:"isOnline"`
	IsSpectator bool       `gorm:"not null;default:false" json:"isSpectator"`
	LastSeenAt  *time.Time `json:"lastSeenAt,omitempty"`
	KickedAt    *time.Time `json:"kickedAt,omitempty"`
	JoinedAt    time.Time  `gorm:"autoCreateTime" json:"joinedAt"`
	FinishedAt  *time.Time `json:"finishedAt,omitempty"`

	Session QuizLiveSession `gorm:"foreignKey:SessionID;constraint:OnDelete:CASCADE" json:"-"`
}

func (QuizLiveParticipant) TableName() string { return "quiz_live_participants" }

// QuizLiveAnswer records a single participant's answer to one question in a live session.
type QuizLiveAnswer struct {
	ID             string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	SessionID      string    `gorm:"type:uuid;not null;index:idx_live_ans_uniq,priority:1" json:"sessionId"`
	ParticipantID  string    `gorm:"type:uuid;not null;index:idx_live_ans_uniq,priority:2" json:"participantId"`
	QuestionIndex  int       `gorm:"not null;index:idx_live_ans_uniq,priority:3" json:"questionIndex"`
	SelectedOption *string   `gorm:"type:varchar(2)" json:"selectedOption,omitempty"`
	TextAnswer     *string   `gorm:"type:text" json:"textAnswer,omitempty"`
	IsCorrect      bool      `gorm:"not null;default:false" json:"isCorrect"`
	TimeSpent      int       `gorm:"not null;default:0" json:"timeSpent"`
	PointsEarned   int       `gorm:"not null;default:0" json:"pointsEarned"`
	AnsweredAt     time.Time `gorm:"autoCreateTime" json:"answeredAt"`
}

func (QuizLiveAnswer) TableName() string { return "quiz_live_answers" }
