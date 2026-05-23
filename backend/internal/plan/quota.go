package plan

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// FeatureUsageEvent is one consumed quota slot. We count rows in a rolling
// 24h window to decide whether a free user is over the cap.
type FeatureUsageEvent struct {
	ID        string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID    string    `gorm:"type:uuid;not null;index:idx_feat_usage,priority:1"`
	Feature   string    `gorm:"type:varchar(64);not null;index:idx_feat_usage,priority:2"`
	CreatedAt time.Time `gorm:"autoCreateTime;index:idx_feat_usage,priority:3"`
}

func (FeatureUsageEvent) TableName() string { return "feature_usage_events" }

const window = 24 * time.Hour

// CheckAndConsume verifies the user has remaining quota for feature and
// records a consumption row. Pro / trial users are recorded but never
// blocked. If the feature is not in FreeLimits or its limit is 0, it is
// treated as ungated.
func CheckAndConsume(db *gorm.DB, userID string, feature Feature) error {
	if db == nil || userID == "" {
		return nil
	}
	tier, err := EffectiveTier(db, userID)
	if err != nil {
		// Don't block users on a transient DB error — fail open.
		return nil
	}
	limit := FreeLimits[feature]
	if tier == TierFree && limit > 0 {
		var used int64
		if err := db.Model(&FeatureUsageEvent{}).
			Where("user_id = ? AND feature = ? AND created_at >= ?", userID, string(feature), time.Now().Add(-window)).
			Count(&used).Error; err != nil {
			return nil
		}
		if used >= int64(limit) {
			return ErrQuotaExceeded
		}
	}
	_ = db.Create(&FeatureUsageEvent{UserID: userID, Feature: string(feature)}).Error
	return nil
}

// FeatureStatus is the per-feature view returned by Status.
type FeatureStatus struct {
	Limit     int `json:"limit"`     // 0 = ungated
	Used      int `json:"used"`      // count in the last 24h
	Remaining int `json:"remaining"` // limit - used, clamped at 0; -1 if unlimited
}

// PlanStatus is the full freemium view for the current user.
type PlanStatus struct {
	Tier        Tier                     `json:"tier"`
	Plan        string                   `json:"plan"`
	InTrial     bool                     `json:"inTrial"`
	TrialEndsAt *time.Time               `json:"trialEndsAt,omitempty"`
	Features    map[string]FeatureStatus `json:"features"`
}

// Status returns the per-feature quota snapshot for the user.
func Status(db *gorm.DB, userID string) (PlanStatus, error) {
	out := PlanStatus{Features: map[string]FeatureStatus{}}
	if db == nil || userID == "" {
		out.Tier = TierFree
		return out, nil
	}
	var u models.User
	if err := db.Select("id, plan, created_at").Where("id = ?", userID).First(&u).Error; err != nil {
		return out, err
	}
	out.Plan = u.Plan
	trialEnds := u.CreatedAt.Add(TrialDays * 24 * time.Hour)
	inTrial := u.Plan != "pro" && time.Now().Before(trialEnds)
	out.InTrial = inTrial
	if inTrial {
		out.TrialEndsAt = &trialEnds
	}
	if IsEffectivelyPro(&u) {
		out.Tier = TierPro
	} else {
		out.Tier = TierFree
	}

	since := time.Now().Add(-window)
	for feat, limit := range FreeLimits {
		fs := FeatureStatus{Limit: limit}
		if out.Tier == TierPro || limit == 0 {
			fs.Remaining = -1
		}
		var used int64
		db.Model(&FeatureUsageEvent{}).
			Where("user_id = ? AND feature = ? AND created_at >= ?", userID, string(feat), since).
			Count(&used)
		fs.Used = int(used)
		if out.Tier == TierFree && limit > 0 {
			fs.Remaining = limit - fs.Used
			if fs.Remaining < 0 {
				fs.Remaining = 0
			}
		}
		out.Features[string(feat)] = fs
	}
	return out, nil
}

// WritePaywall writes a standard 402 JSON response that the frontend can
// use to render the upgrade modal.
func WritePaywall(w http.ResponseWriter, feature Feature) {
	limit := FreeLimits[feature]
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusPaymentRequired)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"error":    "quota_exceeded",
		"feature":  string(feature),
		"limit":    limit,
		"tier":     string(TierFree),
		"upgrade":  "/upgrade",
		"message": "daily free-tier limit reached for this feature",
	})
}
