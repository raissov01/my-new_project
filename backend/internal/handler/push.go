package handler

import (
	"encoding/json"
	"fmt"
	"net/http"

	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/midoriya/flashlearn-backend/internal/delivery"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// PushHandler stores and dispatches Web Push subscriptions.
type PushHandler struct {
	db              *gorm.DB
	vapidPublicKey  string
	vapidPrivateKey string
}

func NewPush(db *gorm.DB, pubKey, privKey string) *PushHandler {
	return &PushHandler{db: db, vapidPublicKey: pubKey, vapidPrivateKey: privKey}
}

// GET /push/vapid-public-key — returns VAPID public key (no auth required).
func (h *PushHandler) GetVAPIDPublicKey(w http.ResponseWriter, r *http.Request) {
	jsonOK(w, map[string]any{"publicKey": h.vapidPublicKey})
}

type subscribeBody struct {
	Endpoint string `json:"endpoint"`
	Keys     struct {
		P256DH string `json:"p256dh"`
		Auth   string `json:"auth"`
	} `json:"keys"`
}

// POST /push/subscribe — save browser PushSubscription to DB.
func (h *PushHandler) Subscribe(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	var body subscribeBody
	if err := decodeJSON(r, &body); err != nil || body.Endpoint == "" {
		jsonErr(w, "invalid subscription payload", http.StatusBadRequest)
		return
	}

	sub := models.PushSubscription{
		UserID:   userID,
		Endpoint: body.Endpoint,
		P256DH:   body.Keys.P256DH,
		Auth:     body.Keys.Auth,
	}
	h.db.Where(models.PushSubscription{Endpoint: body.Endpoint}).
		Assign(sub).
		FirstOrCreate(&sub)

	jsonOK(w, map[string]any{"ok": true})
}

// DELETE /push/subscribe — remove a subscription (by endpoint or all for user).
func (h *PushHandler) Unsubscribe(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	var body struct {
		Endpoint string `json:"endpoint"`
	}
	_ = decodeJSON(r, &body)

	if body.Endpoint != "" {
		h.db.Where("user_id = ? AND endpoint = ?", userID, body.Endpoint).
			Delete(&models.PushSubscription{})
	} else {
		h.db.Where("user_id = ?", userID).Delete(&models.PushSubscription{})
	}
	jsonOK(w, map[string]any{"ok": true})
}

// PushPayload is the JSON body sent to each subscriber.
type PushPayload struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	URL   string `json:"url,omitempty"`
	Icon  string `json:"icon,omitempty"`
}

// SendToUser dispatches a push notification to all subscriptions for a user.
// Expired/invalid subscriptions are silently deleted.
func (h *PushHandler) SendToUser(userID string, payload PushPayload) {
	if h.vapidPublicKey == "" || h.vapidPrivateKey == "" {
		return
	}

	var subs []models.PushSubscription
	if err := h.db.Where("user_id = ?", userID).Find(&subs).Error; err != nil {
		return
	}

	data, _ := json.Marshal(payload)

	for _, s := range subs {
		wpSub := &webpush.Subscription{
			Endpoint: s.Endpoint,
			Keys: webpush.Keys{
				P256dh: s.P256DH,
				Auth:   s.Auth,
			},
		}
		resp, err := webpush.SendNotification(data, wpSub, &webpush.Options{
			Subscriber:      "mailto:admin@studywithraissov.com",
			VAPIDPublicKey:  h.vapidPublicKey,
			VAPIDPrivateKey: h.vapidPrivateKey,
			TTL:             30,
		})
		if err != nil {
			delivery.Record(h.db, delivery.Event{
				Channel: "push", Kind: "in_app_notify",
				Recipient: s.Endpoint, UserID: userID, Err: err,
			})
			continue
		}
		statusCode := resp.StatusCode
		resp.Body.Close()

		// 410 Gone = subscription expired; remove it and record as expired.
		if statusCode == http.StatusGone {
			h.db.Delete(&s)
			delivery.Record(h.db, delivery.Event{
				Channel: "push", Kind: "in_app_notify",
				Recipient: s.Endpoint, UserID: userID,
				StatusCode: statusCode, ExpiredOverride: true,
			})
			continue
		}

		ev := delivery.Event{
			Channel: "push", Kind: "in_app_notify",
			Recipient: s.Endpoint, UserID: userID,
			StatusCode: statusCode,
		}
		if statusCode >= 400 {
			ev.Err = fmt.Errorf("webpush %d", statusCode)
		}
		delivery.Record(h.db, ev)
	}
}
