// Package hub also hosts the admin live-activity broadcaster (alongside
// the existing live-quiz hub in this package). It is a tiny in-process
// pub/sub: every WebSocket subscriber gets a copy of every published
// event, with a small per-client buffer so a slow consumer can't block
// the publisher.
//
// In a multi-replica deployment, only clients connected to the replica
// that received the event will see it through this hub. If you need
// cross-replica fan-out, layer a PostgreSQL LISTEN/NOTIFY (or Redis
// pub/sub) in front of Publish — the WebSocket handler stays unchanged.
package hub

import (
	"sync"
	"time"
)

// AdminLiveEvent is the payload broadcast to every admin WebSocket
// subscriber. It mirrors the JSON shape returned by the polling
// /admin/quizizz/analytics/live endpoint so the frontend can use one
// type for both transports.
type AdminLiveEvent struct {
	ID        string    `json:"id"`
	EventType string    `json:"event_type"`
	CreatedAt time.Time `json:"created_at"`
	SessionID *string   `json:"session_id,omitempty"`
	UserID    *string   `json:"user_id,omitempty"`
	Username  *string   `json:"username,omitempty"`
	Email     *string   `json:"email,omitempty"`
	QuizID    *string   `json:"quiz_id,omitempty"`
	QuizTitle *string   `json:"quiz_title,omitempty"`
	IPAddress *string   `json:"ip_address,omitempty"`
}

// AdminLiveHub fans events out to all subscribed clients.
type AdminLiveHub struct {
	mu          sync.Mutex
	subscribers map[chan AdminLiveEvent]struct{}
}

func NewAdminLiveHub() *AdminLiveHub {
	return &AdminLiveHub{
		subscribers: make(map[chan AdminLiveEvent]struct{}),
	}
}

// Subscribe registers a new client and returns the channel it should
// read from. Cancellation/cleanup is the caller's responsibility — call
// Unsubscribe when the client disconnects to avoid leaking goroutines.
func (h *AdminLiveHub) Subscribe() chan AdminLiveEvent {
	ch := make(chan AdminLiveEvent, 32)
	h.mu.Lock()
	h.subscribers[ch] = struct{}{}
	h.mu.Unlock()
	return ch
}

func (h *AdminLiveHub) Unsubscribe(ch chan AdminLiveEvent) {
	h.mu.Lock()
	if _, ok := h.subscribers[ch]; ok {
		delete(h.subscribers, ch)
		close(ch)
	}
	h.mu.Unlock()
}

// Publish sends the event to every subscriber. Best-effort: if a
// subscriber's buffer is full we drop the event for that client rather
// than blocking the publisher (events are observability data — losing
// one is preferable to stalling quiz traffic).
func (h *AdminLiveHub) Publish(e AdminLiveEvent) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for ch := range h.subscribers {
		select {
		case ch <- e:
		default:
			// Subscriber slow / disconnected — drop silently.
		}
	}
}

// SubscriberCount is exposed for /health-style introspection.
func (h *AdminLiveHub) SubscriberCount() int {
	h.mu.Lock()
	defer h.mu.Unlock()
	return len(h.subscribers)
}
