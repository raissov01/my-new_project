// Package delivery records email and web-push send attempts into
// delivery_events so the admin "Deliverability" dashboard can show success
// rate, recent failures, and breakdowns per channel/kind.
//
// Errors are logged, not returned — telemetry writes must never break the
// originating send.
package delivery

import (
	"log"
	"net/url"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// Event is the input to Record. Pass what you have; the recorder fills in
// Status from the presence of Err (or trusts a caller-supplied value if Err
// is nil and StatusCode == 410, which the push path uses for expired subs).
type Event struct {
	Channel    string
	Kind       string
	Recipient  string
	UserID     string
	StatusCode int
	Err        error
	// ExpiredOverride lets callers force Status="expired" (push 410 Gone).
	ExpiredOverride bool
}

func Record(db *gorm.DB, e Event) {
	if db == nil || e.Channel == "" || e.Kind == "" {
		return
	}
	row := models.DeliveryEvent{
		Channel:    e.Channel,
		Kind:       e.Kind,
		Recipient:  truncateRecipient(e.Recipient),
		StatusCode: e.StatusCode,
	}
	if e.UserID != "" {
		uid := e.UserID
		row.UserID = &uid
	}
	switch {
	case e.ExpiredOverride:
		row.Status = "expired"
	case e.Err != nil:
		row.Status = "error"
		row.Error = e.Err.Error()
	default:
		row.Status = "sent"
	}
	if err := db.Create(&row).Error; err != nil {
		log.Printf("delivery: failed to record event: %v", err)
	}
}

// truncateRecipient prevents accidentally storing a 2KB push endpoint URL.
// For email it's a no-op; for push we keep just scheme+host so the admin can
// see "fcm.googleapis.com" / "wns2-bn3p.notify.windows.com" without leaking
// the per-subscription token.
func truncateRecipient(r string) string {
	if len(r) <= 255 {
		return r
	}
	if u, err := url.Parse(r); err == nil && u.Host != "" {
		return u.Scheme + "://" + u.Host
	}
	return r[:255]
}
