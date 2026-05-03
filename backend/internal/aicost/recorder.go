package aicost

import (
	"log"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// Event is the input to Record — assembled by the AI handler around its call
// to the LLM provider. Fields are intentionally permissive: pass what you have.
type Event struct {
	UserID           string
	Feature          string
	Model            string
	PromptTokens     int
	CompletionTokens int
	Latency          time.Duration
	Err              error
}

// Record persists one AI usage row. Errors are logged, not returned —
// observability writes must never break the originating AI feature.
//
// Cost is computed from the local price table. Provider is inferred from
// the model id. Pass an empty UserID for anonymous/system usage.
func Record(db *gorm.DB, e Event) {
	if db == nil || e.Model == "" || e.Feature == "" {
		return
	}
	row := models.AIUsageEvent{
		Feature:          e.Feature,
		Provider:         Provider(e.Model),
		Model:            e.Model,
		PromptTokens:     e.PromptTokens,
		CompletionTokens: e.CompletionTokens,
		CostUSD:          Estimate(e.Model, e.PromptTokens, e.CompletionTokens),
		LatencyMs:        int(e.Latency.Milliseconds()),
	}
	if e.UserID != "" {
		uid := e.UserID
		row.UserID = &uid
	}
	if e.Err != nil {
		row.Error = e.Err.Error()
	}
	if err := db.Create(&row).Error; err != nil {
		log.Printf("aicost: failed to record usage event: %v", err)
	}
}
