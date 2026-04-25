package models

import "time"

type Subscription struct {
	ID               string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID           string     `gorm:"type:uuid;not null;uniqueIndex" json:"userId"`
	LSSubscriptionID int64      `gorm:"not null;uniqueIndex" json:"lsSubscriptionId"`
	LSCustomerID     int64      `gorm:"not null;index" json:"lsCustomerId"`
	LSOrderID        int64      `gorm:"not null" json:"lsOrderId"`
	Status           string     `gorm:"not null" json:"status"` // active, cancelled, expired, paused, on_trial
	VariantID        int64      `gorm:"not null" json:"variantId"`
	CurrentPeriodEnd *time.Time `json:"currentPeriodEnd"`
	CreatedAt        time.Time  `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt        time.Time  `gorm:"autoUpdateTime" json:"updatedAt"`
}

func (Subscription) TableName() string { return "subscriptions" }
