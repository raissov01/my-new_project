package models

import "time"

// AIQuizGenerationLog records every AI quiz generation attempt by a user.
// Used to enforce the daily per-user rate limit without Redis.
type AIQuizGenerationLog struct {
	ID        string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID    string    `gorm:"type:uuid;not null;index" json:"userId"`
	Count     int       `gorm:"not null;default:1" json:"count"` // number of questions requested
	CreatedAt time.Time `gorm:"autoCreateTime" json:"createdAt"`
}

func (AIQuizGenerationLog) TableName() string {
	return "ai_quiz_generation_logs"
}
