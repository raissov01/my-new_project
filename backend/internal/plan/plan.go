// Package plan models the freemium tier system: free vs pro,
// the new-signup trial window, per-feature daily quotas, and the
// HTTP error contract for paywall responses.
package plan

import (
	"errors"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// TrialDays is the auto-granted Pro window starting at User.CreatedAt.
// New signups get full Pro limits for this many days without a credit card.
const TrialDays = 3

type Tier string

const (
	TierFree Tier = "free"
	TierPro  Tier = "pro"
)

// Feature is the stable string key used in the feature_usage_events table
// and exposed in /billing/status. Adding a new gated feature means:
//   1. add a const here
//   2. add an entry to FreeLimits below
//   3. call CheckAndConsume in the corresponding handler
type Feature string

const (
	FeatureQuizAI        Feature = "quiz_ai"
	FeatureIELTSWriting  Feature = "ielts_writing"
	FeatureIELTSSpeaking Feature = "ielts_speaking"
	FeatureChat          Feature = "chat"
	FeatureMining        Feature = "mining"
	FeatureEngSim        Feature = "engsim"
)

// FreeLimits is the daily cap for free-tier users (rolling 24h window).
// A value of 0 means "not gated by plan" (free and pro both unlimited via
// this mechanism — the handler may still enforce a separate anti-abuse cap).
//
// Pro / trial users are unlimited regardless of the value here.
var FreeLimits = map[Feature]int{
	FeatureQuizAI:        0, // quizzes stay free for everyone (anti-abuse cap lives in the handler)
	FeatureIELTSWriting:  2,
	FeatureIELTSSpeaking: 2,
	FeatureChat:          50,
	FeatureMining:        3,
	FeatureEngSim:        3,
}

// ErrQuotaExceeded is returned by CheckAndConsume when a free user is over
// the daily cap for the requested feature. Handlers should map this to an
// HTTP 402 with WritePaywall.
var ErrQuotaExceeded = errors.New("daily feature quota exceeded")

// IsEffectivelyPro returns true if the loaded user counts as Pro right now,
// either because they are subscribed or because they are still inside the
// new-signup trial window.
func IsEffectivelyPro(u *models.User) bool {
	if u == nil {
		return false
	}
	if u.Plan == "pro" {
		return true
	}
	return time.Since(u.CreatedAt) < TrialDays*24*time.Hour
}

// EffectiveTier loads only the fields needed to evaluate the tier.
func EffectiveTier(db *gorm.DB, userID string) (Tier, error) {
	if userID == "" {
		return TierFree, nil
	}
	var u models.User
	if err := db.Select("id, plan, created_at").Where("id = ?", userID).First(&u).Error; err != nil {
		return TierFree, err
	}
	if IsEffectivelyPro(&u) {
		return TierPro, nil
	}
	return TierFree, nil
}
