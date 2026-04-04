package models

import "time"

// IELTSAttempt represents a single exam attempt (full mock, section practice, etc.).
type IELTSAttempt struct {
	ID              string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID          string     `gorm:"type:uuid;not null;index" json:"userId"`
	AttemptType     string     `gorm:"not null;check:attempt_type IN ('full_mock','section_practice','writing_practice','speaking_practice')" json:"attemptType"`
	MockType        string     `gorm:"not null;default:'cambridge_style'" json:"mockType"`
	ExamSet         string     `gorm:"not null;default:''" json:"examSet"`
	Section         string     `gorm:"not null;default:'full'" json:"section"`
	BandTarget      string     `gorm:"not null;default:'6.5'" json:"bandTarget"`
	Status          string     `gorm:"not null;default:'in_progress';check:status IN ('in_progress','completed','abandoned')" json:"status"`
	StrictMode      bool       `gorm:"not null;default:false" json:"strictMode"`
	Answers         *string    `gorm:"type:jsonb" json:"answers"`
	SectionProgress *string    `gorm:"type:jsonb" json:"sectionProgress"`
	ViolationCount  int        `gorm:"not null;default:0" json:"violationCount"`
	Results         *string    `gorm:"type:jsonb" json:"results"`
	TimeTakenSecs   int        `gorm:"not null;default:0" json:"timeTakenSecs"`
	StartedAt       time.Time  `gorm:"autoCreateTime" json:"startedAt"`
	CompletedAt     *time.Time `json:"completedAt"`
	LastSavedAt     time.Time  `gorm:"autoUpdateTime" json:"lastSavedAt"`
	CreatedAt       time.Time  `gorm:"autoCreateTime" json:"createdAt"`
}

func (IELTSAttempt) TableName() string {
	return "ielts_attempts"
}

// IELTSViolation logs a single exam-mode violation event.
type IELTSViolation struct {
	ID         string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	AttemptID  string    `gorm:"type:uuid;not null;index" json:"attemptId"`
	UserID     string    `gorm:"type:uuid;not null;index" json:"userId"`
	Type       string    `gorm:"not null;check:type IN ('tab_switch','fullscreen_exit','copy','paste','right_click','dev_tools','blur')" json:"type"`
	Details    *string   `gorm:"type:text" json:"details"`
	OccurredAt time.Time `gorm:"autoCreateTime" json:"occurredAt"`
}

func (IELTSViolation) TableName() string {
	return "ielts_violations"
}
