package models

import "time"

// DeliveryEvent is one row per email or web-push send attempt. We pool both
// channels into a single table because the admin dashboard wants a unified
// "things we tried to deliver, did they go through?" view; channel-specific
// fields (e.g. push endpoint host) live on Recipient.
//
// Successful sends are recorded with Status="sent" and Error="". Network
// failures or 4xx/5xx from Resend / web-push become Status="error" with the
// upstream message. Status="expired" is push-specific (410 Gone → we drop
// the subscription).
type DeliveryEvent struct {
	ID         string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Channel    string    `gorm:"type:varchar(16);not null;index"                json:"channel"`
	Kind       string    `gorm:"type:varchar(48);not null;index"                json:"kind"`
	Recipient  string    `gorm:"type:varchar(255);not null"                     json:"recipient"`
	UserID     *string   `gorm:"type:uuid;index"                                json:"userId,omitempty"`
	Status     string    `gorm:"type:varchar(16);not null;index"                json:"status"`
	StatusCode int       `gorm:"not null;default:0"                             json:"statusCode"`
	Error      string    `gorm:"type:text;not null;default:''"                  json:"error,omitempty"`
	CreatedAt  time.Time `gorm:"autoCreateTime;index"                           json:"createdAt"`
}

func (DeliveryEvent) TableName() string {
	return "delivery_events"
}
