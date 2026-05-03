package handler

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// ResendWebhookHandler ingests Resend webhook events
// (https://resend.com/docs/dashboard/webhooks/introduction) into delivery_events
// so the admin Deliverability dashboard reflects what happened *after* we
// handed an email to Resend (delivered, opened, clicked, bounced, complained).
//
// Each event is appended as a fresh row with channel="email" and kind set to
// the original transactional kind we sent (or "email_event" if we couldn't
// correlate). Bounces and failures are stored with status="error" so they
// drag down the success-rate the dashboard displays.
type ResendWebhookHandler struct {
	db     *gorm.DB
	secret []byte // raw bytes of the webhook signing key (whsec_<base64>)
}

func NewResendWebhook(db *gorm.DB, signingSecret string) *ResendWebhookHandler {
	h := &ResendWebhookHandler{db: db}
	if strings.HasPrefix(signingSecret, "whsec_") {
		raw, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(signingSecret, "whsec_"))
		if err == nil {
			h.secret = raw
		}
	}
	return h
}

// Receive handles POST /webhooks/resend.
//
// Verifies the Svix signature (Resend webhooks ride on Svix) before parsing.
// Always returns 200 once the signature checks out, even if we couldn't
// understand the event payload — Resend retries on non-2xx, and a confused
// admin webhook should not cause a retry loop.
func (h *ResendWebhookHandler) Receive(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 256*1024))
	if err != nil {
		writeError(w, http.StatusBadRequest, "could not read body", err)
		return
	}

	if len(h.secret) > 0 {
		svixID := r.Header.Get("svix-id")
		svixTS := r.Header.Get("svix-timestamp")
		svixSig := r.Header.Get("svix-signature")
		if !h.verify(svixID, svixTS, body, svixSig) {
			writeError(w, http.StatusUnauthorized, "invalid signature", nil)
			return
		}
	}

	var evt struct {
		Type      string `json:"type"`
		CreatedAt string `json:"created_at"`
		Data      struct {
			EmailID string   `json:"email_id"`
			To      []string `json:"to"`
			From    string   `json:"from"`
			Subject string   `json:"subject"`
			Reason  string   `json:"reason"`
			Bounce  struct {
				Type    string `json:"type"`
				Message string `json:"message"`
			} `json:"bounce"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &evt); err != nil {
		log.Printf("resend-webhook: failed to parse: %v", err)
		writeJSON(w, http.StatusOK, map[string]string{"status": "ignored"})
		return
	}

	// Map Resend's verb-form event names ("email.delivered") to short status
	// strings stored on delivery_events. Unknown events still get recorded
	// so a future admin can see what we ignored.
	status, kind := classifyResendEvent(evt.Type)

	to := ""
	if len(evt.Data.To) > 0 {
		to = evt.Data.To[0]
	}

	row := models.DeliveryEvent{
		Channel:   "email",
		Kind:      kind,
		Recipient: to,
		Status:    status,
	}
	if status == "error" {
		// Bounce reason takes priority; fall back to top-level reason.
		switch {
		case evt.Data.Bounce.Message != "":
			row.Error = evt.Data.Bounce.Type + ": " + evt.Data.Bounce.Message
		case evt.Data.Reason != "":
			row.Error = evt.Data.Reason
		default:
			row.Error = evt.Type
		}
	}

	if h.db != nil {
		if err := h.db.Create(&row).Error; err != nil {
			log.Printf("resend-webhook: failed to insert delivery_events row: %v", err)
		}
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func classifyResendEvent(t string) (status, kind string) {
	switch t {
	case "email.delivered":
		return "delivered", "webhook:delivered"
	case "email.opened":
		return "opened", "webhook:opened"
	case "email.clicked":
		return "clicked", "webhook:clicked"
	case "email.bounced", "email.failed":
		return "error", "webhook:bounced"
	case "email.complained":
		return "error", "webhook:complained"
	case "email.delivery_delayed":
		return "delayed", "webhook:delayed"
	case "email.sent":
		// Resend's "sent" event arrives ~immediately after our SDK send. We
		// already log "sent" from the SDK side, so storing this would double
		// the count — record it under a distinct kind so the byKind panel
		// still reflects webhook activity without skewing the success rate.
		return "sent", "webhook:sent"
	}
	return "unknown", "webhook:" + t
}

// verify checks the Svix-style HMAC: sha256("<id>.<ts>.<body>"), base64-encoded,
// compared against any v1=... entry in the space-separated svix-signature header.
func (h *ResendWebhookHandler) verify(id, ts string, body []byte, sigHeader string) bool {
	if id == "" || ts == "" || sigHeader == "" {
		return false
	}
	mac := hmac.New(sha256.New, h.secret)
	mac.Write([]byte(id + "." + ts + "."))
	mac.Write(body)
	expected := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	for _, part := range strings.Split(sigHeader, " ") {
		// Each entry is like "v1,<base64>". Other versions are ignored.
		v := strings.SplitN(part, ",", 2)
		if len(v) != 2 || v[0] != "v1" {
			continue
		}
		if subtle.ConstantTimeCompare([]byte(v[1]), []byte(expected)) == 1 {
			return true
		}
	}
	return false
}
