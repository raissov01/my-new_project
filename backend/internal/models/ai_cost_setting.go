package models

import "time"

// AICostSetting holds the daily AI-spend caps enforced before every LLM call.
//
// We store this as a single-row table (id=1) so the admin panel can edit
// thresholds without a deploy. Empty/missing row is treated as "unlimited"
// by the budget check, which lets new environments boot without seed data.
type AICostSetting struct {
	ID                uint      `gorm:"primaryKey;autoIncrement:false" json:"id"`
	DailyUserUSDCap   float64   `gorm:"type:numeric(10,2);not null;default:5.00"   json:"dailyUserUsdCap"`
	DailyGlobalUSDCap float64   `gorm:"type:numeric(10,2);not null;default:100.00" json:"dailyGlobalUsdCap"`
	UpdatedBy         *string   `gorm:"type:uuid"                                  json:"updatedBy,omitempty"`
	UpdatedAt         time.Time `gorm:"autoUpdateTime"                             json:"updatedAt"`
}

func (AICostSetting) TableName() string {
	return "ai_cost_settings"
}

// AICostBlock records each refused AI call (one per blocked attempt) so the
// admin panel can surface "user X tripped the quota at $Y" without re-scanning
// ai_usage_events. Reason is one of "user_cap" or "global_cap".
type AICostBlock struct {
	ID            string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID        *string   `gorm:"type:uuid;index"                                json:"userId,omitempty"`
	Feature       string    `gorm:"type:varchar(64);not null;index"                json:"feature"`
	Reason        string    `gorm:"type:varchar(32);not null"                      json:"reason"`
	UsageUSD      float64   `gorm:"type:numeric(10,4);not null;default:0"          json:"usageUsd"`
	CapUSD        float64   `gorm:"type:numeric(10,2);not null;default:0"          json:"capUsd"`
	CreatedAt     time.Time `gorm:"autoCreateTime;index"                           json:"createdAt"`
}

func (AICostBlock) TableName() string {
	return "ai_cost_blocks"
}
