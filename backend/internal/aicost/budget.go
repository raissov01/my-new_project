package aicost

import (
	"errors"
	"log"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// ErrBudgetExceeded is returned by CheckBudget when an LLM call would push
// usage past the configured daily cap. Callers should surface a 429 (or
// equivalent) and stop short of actually issuing the request.
var ErrBudgetExceeded = errors.New("ai daily budget exceeded")

// budgetWindow is how far back we sum cost from ai_usage_events when
// evaluating the cap. Using a rolling 24h window (not a calendar day) means
// a user who burns their cap at 23:59 isn't given a fresh budget at 00:00.
const budgetWindow = 24 * time.Hour

// CheckBudget enforces the per-user and global caps configured in
// ai_cost_settings. Returns ErrBudgetExceeded if either cap is hit; on
// every other failure (no DB, missing settings row, query error) it returns
// nil so observability/budgeting outages never break the AI features they're
// guarding.
//
// Records the refusal into ai_cost_blocks so the admin panel can show
// recent guardrail activations.
func CheckBudget(db *gorm.DB, userID, feature string) error {
	if db == nil {
		return nil
	}

	var setting models.AICostSetting
	if err := db.First(&setting, "id = 1").Error; err != nil {
		// No row yet → "unlimited" until an admin sets a cap.
		return nil
	}

	since := time.Now().Add(-budgetWindow)

	if setting.DailyGlobalUSDCap > 0 {
		var globalUsage float64
		if err := db.Model(&models.AIUsageEvent{}).
			Where("created_at >= ?", since).
			Select("COALESCE(SUM(cost_usd), 0)").
			Scan(&globalUsage).Error; err != nil {
			log.Printf("aicost: global budget query failed: %v", err)
			return nil
		}
		if globalUsage >= setting.DailyGlobalUSDCap {
			recordBlock(db, userID, feature, "global_cap", globalUsage, setting.DailyGlobalUSDCap)
			return ErrBudgetExceeded
		}
	}

	if setting.DailyUserUSDCap > 0 && userID != "" {
		var userUsage float64
		if err := db.Model(&models.AIUsageEvent{}).
			Where("created_at >= ? AND user_id = ?", since, userID).
			Select("COALESCE(SUM(cost_usd), 0)").
			Scan(&userUsage).Error; err != nil {
			log.Printf("aicost: per-user budget query failed: %v", err)
			return nil
		}
		if userUsage >= setting.DailyUserUSDCap {
			recordBlock(db, userID, feature, "user_cap", userUsage, setting.DailyUserUSDCap)
			return ErrBudgetExceeded
		}
	}

	return nil
}

func recordBlock(db *gorm.DB, userID, feature, reason string, usage, cap float64) {
	row := models.AICostBlock{
		Feature:  feature,
		Reason:   reason,
		UsageUSD: usage,
		CapUSD:   cap,
	}
	if userID != "" {
		uid := userID
		row.UserID = &uid
	}
	if err := db.Create(&row).Error; err != nil {
		log.Printf("aicost: failed to record block: %v", err)
	}
}
