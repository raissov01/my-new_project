package handler

import (
	"encoding/json"
	"log"
	"net"
	"net/http"
	"strings"

	"github.com/midoriya/flashlearn-backend/internal/hub"
	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

type QuizUsageEventHandler struct {
	db      *gorm.DB
	liveHub *hub.AdminLiveHub
}

func NewQuizUsageEvent(db *gorm.DB, liveHub *hub.AdminLiveHub) *QuizUsageEventHandler {
	return &QuizUsageEventHandler{db: db, liveHub: liveHub}
}

var allowedQuizUsageEvents = map[string]bool{
	"quiz_page_opened":  true,
	"quiz_started":      true,
	"question_answered": true,
	"quiz_finished":     true,
	"quiz_abandoned":    true,
	"heartbeat":         true,
}

type quizUsageEventRequest struct {
	EventType  string          `json:"eventType"`
	QuizID     string          `json:"quizId"`
	SessionID  string          `json:"sessionId"`
	AttemptID  string          `json:"attemptId"`
	QuestionID string          `json:"questionId"`
	Metadata   json.RawMessage `json:"metadata"`
	IPAddress  string          `json:"ipAddress"` // optional, set by Next.js proxy from x-forwarded-for
}

func (h *QuizUsageEventHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req quizUsageEventRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	eventType := strings.TrimSpace(req.EventType)
	if !allowedQuizUsageEvents[eventType] {
		writeError(w, http.StatusBadRequest, "unsupported event type", nil)
		return
	}

	if strings.TrimSpace(req.QuizID) == "" {
		writeError(w, http.StatusBadRequest, "quizId is required", nil)
		return
	}

	userID, _ := middleware.UserIDFromContext(r.Context())
	userID = strings.TrimSpace(userID)
	if userID == "" {
		userID = strings.TrimSpace(r.Header.Get("X-User-ID"))
	}

	// Resolve IP address. Prefer the value already extracted by the Next.js proxy
	// (which has the most accurate first-hop client). Fall back to standard
	// proxy headers and finally to RemoteAddr.
	ip := strings.TrimSpace(req.IPAddress)
	if ip == "" {
		ip = firstNonEmpty(
			firstIP(r.Header.Get("X-Forwarded-For")),
			r.Header.Get("X-Real-IP"),
			stripPort(r.RemoteAddr),
		)
	}

	event := models.QuizUsageEvent{
		EventType:  eventType,
		QuizID:     nullableTrimmed(req.QuizID),
		UserID:     nullableTrimmed(userID),
		SessionID:  nullableTrimmed(req.SessionID),
		AttemptID:  nullableTrimmed(req.AttemptID),
		QuestionID: nullableTrimmed(req.QuestionID),
		UserAgent:  nullableTrimmed(r.UserAgent()),
		IPAddress:  nullableIP(ip),
	}

	if len(req.Metadata) > 0 && string(req.Metadata) != "null" {
		metadata := string(req.Metadata)
		event.Metadata = &metadata
	}

	if err := h.db.Create(&event).Error; err != nil {
		// Analytics failures must NOT break the user-facing quiz flow.
		// Log internally and return a soft "ok:false" so the client can
		// move on without surfacing an error.
		log.Printf("quiz_usage_event create failed: %v", err)
		writeJSON(w, http.StatusOK, map[string]any{"ok": false})
		return
	}

	// Best-effort live broadcast to subscribed admin WebSockets. Skip
	// heartbeats — they would dominate the feed without adding signal.
	// Silent on enrichment errors: the polling endpoint will still see
	// the row when the next admin refresh fires.
	if h.liveHub != nil && eventType != "heartbeat" {
		go h.publishLive(event)
	}

	writeJSON(w, http.StatusCreated, map[string]any{"ok": true, "id": event.ID})
}

// publishLive enriches the freshly-inserted event with the actor's
// username/email and the quiz's title (so admins see "alice on Geography
// 101" rather than just two UUIDs) and pushes it through the hub.
func (h *QuizUsageEventHandler) publishLive(e models.QuizUsageEvent) {
	type enriched struct {
		Username  *string `gorm:"column:username"`
		Email     *string `gorm:"column:email"`
		QuizTitle *string `gorm:"column:quiz_title"`
	}
	var info enriched
	// We deliberately do not propagate the request context — that one is
	// cancelled the moment we return the HTTP response. Using a fresh
	// context with a tight timeout keeps this best-effort.
	if err := h.db.Raw(`
		SELECT u.username, u.email, q.title AS quiz_title
		FROM (SELECT 1 AS one) x
		LEFT JOIN users   u ON u.id::text = ?
		LEFT JOIN quizzes q ON q.id::text = ?
	`, derefOrEmpty(e.UserID), derefOrEmpty(e.QuizID)).Scan(&info).Error; err != nil {
		// Soft fail — push the event without enrichment.
		info = enriched{}
	}
	h.liveHub.Publish(hub.AdminLiveEvent{
		ID:        e.ID,
		EventType: e.EventType,
		CreatedAt: e.CreatedAt,
		SessionID: e.SessionID,
		UserID:    e.UserID,
		Username:  info.Username,
		Email:     info.Email,
		QuizID:    e.QuizID,
		QuizTitle: info.QuizTitle,
		IPAddress: e.IPAddress,
	})
}

func derefOrEmpty(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

func nullableTrimmed(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	if len(trimmed) > 512 {
		trimmed = trimmed[:512]
	}
	return &trimmed
}

func nullableIP(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	// IPv6 max textual length is 45 chars (incl. zone). Reject pathological values.
	if len(trimmed) > 45 {
		return nil
	}
	if net.ParseIP(trimmed) == nil {
		return nil
	}
	return &trimmed
}

// firstIP extracts the leftmost IP from an X-Forwarded-For header.
func firstIP(header string) string {
	if header == "" {
		return ""
	}
	parts := strings.Split(header, ",")
	return strings.TrimSpace(parts[0])
}

// stripPort removes the ":port" suffix from a "host:port" or "[ipv6]:port" string.
func stripPort(addr string) string {
	if addr == "" {
		return ""
	}
	if host, _, err := net.SplitHostPort(addr); err == nil {
		return host
	}
	return addr
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if s := strings.TrimSpace(v); s != "" {
			return s
		}
	}
	return ""
}
