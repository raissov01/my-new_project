package models

import "time"

// PushSubscription stores a browser Web Push endpoint + ECDH keys for a user.
// One user may have subscriptions from multiple devices/browsers.
type PushSubscription struct {
	ID        string    `gorm:"primaryKey;default:gen_random_uuid()"  json:"-"`
	UserID    string    `gorm:"not null;index"                        json:"-"`
	Endpoint  string    `gorm:"not null;uniqueIndex"                  json:"endpoint"`
	P256DH    string    `gorm:"column:p256dh;not null"               json:"-"`
	Auth      string    `gorm:"not null"                              json:"-"`
	CreatedAt time.Time `json:"-"`
}
