package models

import "time"

// ChatMessage stores a single message in a user's AI tutor conversation.
type ChatMessage struct {
	ID        string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID    string    `gorm:"type:uuid;not null;index" json:"userId"`
	Role      string    `gorm:"not null;check:role IN ('user','assistant')" json:"role"`
	Content   string    `gorm:"type:text;not null" json:"content"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"createdAt"`
}

func (ChatMessage) TableName() string {
	return "chat_messages"
}
