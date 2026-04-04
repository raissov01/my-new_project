package models

import "time"

// TelegramPost stores a raw incoming Telegram channel post for later processing.
type TelegramPost struct {
	ID             string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TelegramPostID int64     `gorm:"not null;uniqueIndex" json:"telegramPostId"`
	ChannelID      int64     `gorm:"not null;index" json:"channelId"`
	Text           string    `gorm:"type:text;not null;default:''" json:"text"`
	Caption        string    `gorm:"type:text;not null;default:''" json:"caption"`
	RawJSON        string    `gorm:"type:jsonb;not null" json:"rawJson"`
	HasMedia       bool      `gorm:"not null;default:false" json:"hasMedia"`
	PostDate       time.Time `gorm:"not null" json:"postDate"`
	CreatedAt      time.Time `gorm:"autoCreateTime" json:"createdAt"`
}

func (TelegramPost) TableName() string {
	return "telegram_posts"
}
