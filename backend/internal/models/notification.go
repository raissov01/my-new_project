package models

import "time"

// Notification is an in-app message rendered in the navbar bell dropdown.
// Web Push subscriptions live in push_subscriptions and are dispatched
// independently — a record here does NOT trigger a push.
type Notification struct {
	ID        string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID    string    `gorm:"type:uuid;not null;index"                       json:"-"`
	Type      string    `gorm:"type:varchar(64);not null"                      json:"type"`
	Title     string    `gorm:"not null"                                       json:"title"`
	Body      string    `gorm:"not null;default:''"                            json:"body"`
	Link      *string   `                                                      json:"link,omitempty"`
	IsRead    bool      `gorm:"not null;default:false"                         json:"isRead"`
	CreatedAt time.Time `gorm:"autoCreateTime"                                 json:"createdAt"`
}

func (Notification) TableName() string {
	return "notifications"
}
