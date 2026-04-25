package handler

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

type BillingHandler struct {
	db            *gorm.DB
	webhookSecret string
	checkoutURL   string
}

func NewBilling(db *gorm.DB, webhookSecret, checkoutURL string) *BillingHandler {
	return &BillingHandler{db: db, webhookSecret: webhookSecret, checkoutURL: checkoutURL}
}

// lsWebhookPayload is a minimal representation of a Lemon Squeezy webhook body.
type lsWebhookPayload struct {
	Meta struct {
		EventName  string `json:"event_name"`
		CustomData struct {
			UserID string `json:"user_id"`
		} `json:"custom_data"`
	} `json:"meta"`
	Data struct {
		ID         json.Number `json:"id"`
		Attributes struct {
			Status       string      `json:"status"`
			CustomerID   json.Number `json:"customer_id"`
			OrderID      json.Number `json:"order_id"`
			VariantID    json.Number `json:"variant_id"`
			RenewsAt     *time.Time  `json:"renews_at"`
			EndsAt       *time.Time  `json:"ends_at"`
		} `json:"attributes"`
	} `json:"data"`
}

// Webhook handles POST /api/v1/billing/webhook from Lemon Squeezy.
// It is public but signature-verified.
func (h *BillingHandler) Webhook(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		http.Error(w, "read error", http.StatusBadRequest)
		return
	}

	if h.webhookSecret != "" {
		sig := r.Header.Get("X-Signature")
		if !verifyLSSignature(h.webhookSecret, body, sig) {
			http.Error(w, "invalid signature", http.StatusUnauthorized)
			return
		}
	}

	var payload lsWebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	userID := payload.Meta.CustomData.UserID
	if userID == "" {
		w.WriteHeader(http.StatusOK)
		return
	}

	attr := payload.Data.Attributes
	lsSubID, _ := strconv.ParseInt(payload.Data.ID.String(), 10, 64)
	lsCustID, _ := strconv.ParseInt(attr.CustomerID.String(), 10, 64)
	lsOrderID, _ := strconv.ParseInt(attr.OrderID.String(), 10, 64)
	lsVariantID, _ := strconv.ParseInt(attr.VariantID.String(), 10, 64)

	switch payload.Meta.EventName {
	case "subscription_created", "subscription_updated", "subscription_unpaused":
		periodEnd := attr.RenewsAt
		if periodEnd == nil {
			periodEnd = attr.EndsAt
		}

		sub := models.Subscription{
			UserID:           userID,
			LSSubscriptionID: lsSubID,
			LSCustomerID:     lsCustID,
			LSOrderID:        lsOrderID,
			Status:           attr.Status,
			VariantID:        lsVariantID,
			CurrentPeriodEnd: periodEnd,
		}
		h.db.Where(models.Subscription{LSSubscriptionID: lsSubID}).Assign(sub).FirstOrCreate(&sub)

		plan := "free"
		if attr.Status == "active" || attr.Status == "on_trial" {
			plan = "pro"
		}
		h.db.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
			"plan":           plan,
			"ls_customer_id": lsCustID,
		})

	case "subscription_cancelled":
		h.db.Model(&models.Subscription{}).
			Where("ls_subscription_id = ?", lsSubID).
			Update("status", "cancelled")

	case "subscription_expired", "subscription_paused":
		h.db.Model(&models.Subscription{}).
			Where("ls_subscription_id = ?", lsSubID).
			Update("status", attr.Status)
		h.db.Model(&models.User{}).Where("id = ?", userID).Update("plan", "free")
	}

	w.WriteHeader(http.StatusOK)
}

// Status handles GET /api/v1/billing/status — returns current plan and checkout URL.
func (h *BillingHandler) Status(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var user models.User
	if err := h.db.Select("id, plan, ls_customer_id").Where("id = ?", userID).First(&user).Error; err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	var sub models.Subscription
	hasSub := h.db.Where("user_id = ?", userID).Order("created_at desc").First(&sub).Error == nil

	checkoutURL := ""
	if h.checkoutURL != "" {
		checkoutURL = h.checkoutURL + "?embed=1&checkout[custom][user_id]=" + userID
	}

	type response struct {
		Plan            string     `json:"plan"`
		IsPro           bool       `json:"isPro"`
		CheckoutURL     string     `json:"checkoutURL"`
		SubStatus       string     `json:"subStatus,omitempty"`
		CurrentPeriodEnd *time.Time `json:"currentPeriodEnd,omitempty"`
	}

	resp := response{
		Plan:        user.Plan,
		IsPro:       user.Plan == "pro",
		CheckoutURL: checkoutURL,
	}
	if hasSub {
		resp.SubStatus = sub.Status
		resp.CurrentPeriodEnd = sub.CurrentPeriodEnd
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func verifyLSSignature(secret string, body []byte, sig string) bool {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(sig))
}
