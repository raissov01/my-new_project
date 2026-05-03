package models

import "time"

// AIUsageEvent records a single call to an external LLM provider so the
// admin panel can aggregate cost, tokens, and latency by model/feature/user.
//
// One row per finished AI call (success or error). Errored calls still get
// a row with Error set and zero tokens, so the admin can see retry/abuse
// patterns and provider outages.
type AIUsageEvent struct {
	ID               string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID           *string   `gorm:"type:uuid;index"                                json:"userId,omitempty"`
	Feature          string    `gorm:"type:varchar(64);not null;index"                json:"feature"`
	Provider         string    `gorm:"type:varchar(32);not null;index"                json:"provider"`
	Model            string    `gorm:"type:varchar(64);not null;index"                json:"model"`
	PromptTokens     int       `gorm:"not null;default:0"                             json:"promptTokens"`
	CompletionTokens int       `gorm:"not null;default:0"                             json:"completionTokens"`
	CostUSD          float64   `gorm:"type:numeric(10,6);not null;default:0"          json:"costUsd"`
	LatencyMs        int       `gorm:"not null;default:0"                             json:"latencyMs"`
	Error            string    `gorm:"type:text;not null;default:''"                  json:"error,omitempty"`
	CreatedAt        time.Time `gorm:"autoCreateTime;index"                           json:"createdAt"`
}

func (AIUsageEvent) TableName() string {
	return "ai_usage_events"
}
