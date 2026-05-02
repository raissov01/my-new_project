package handler

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/auth"
	"github.com/midoriya/flashlearn-backend/internal/hub"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
	"nhooyr.io/websocket"
)

// AdminLiveWSHandler upgrades cookie-authenticated superadmin requests
// to a WebSocket and pipes hub events to the client.
//
// Auth: this endpoint cannot reuse the InternalAuth + RequireSuperadmin
// middleware that gates the rest of /admin/* because browsers can't set
// custom headers on a WebSocket upgrade. Instead, we read the swr_token
// cookie that the regular login flow sets, validate the JWT, and then
// look up is_superadmin / is_active in the DB ourselves.
type AdminLiveWSHandler struct {
	db        *gorm.DB
	hub       *hub.AdminLiveHub
	jwtSecret string
}

func NewAdminLiveWS(db *gorm.DB, h *hub.AdminLiveHub, jwtSecret string) *AdminLiveWSHandler {
	return &AdminLiveWSHandler{db: db, hub: h, jwtSecret: jwtSecret}
}

// Connect handles GET /admin/live-ws.
func (h *AdminLiveWSHandler) Connect(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("swr_token")
	if err != nil || cookie.Value == "" {
		http.Error(w, `{"error":"authentication required"}`, http.StatusUnauthorized)
		return
	}

	claims, err := auth.ValidateToken(h.jwtSecret, cookie.Value)
	if err != nil {
		http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
		return
	}

	var user models.User
	if err := h.db.Select("id", "is_superadmin", "is_active").
		First(&user, "id = ?", claims.UserID).Error; err != nil {
		http.Error(w, `{"error":"superadmin access required"}`, http.StatusForbidden)
		return
	}
	if !user.IsSuperadmin || !user.IsActive {
		http.Error(w, `{"error":"superadmin access required"}`, http.StatusForbidden)
		return
	}

	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		// Origin checks: dev runs frontend and backend on different ports
		// behind the same nginx, so request Host matches; we still keep this
		// explicit to make intent obvious.
		InsecureSkipVerify: true,
	})
	if err != nil {
		log.Printf("admin-live-ws: accept error: %v", err)
		return
	}
	defer conn.Close(websocket.StatusInternalError, "shutting down")

	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	sub := h.hub.Subscribe()
	defer h.hub.Unsubscribe(sub)

	// Reader goroutine: discards anything the client sends but watches for
	// close so we can tear down promptly.
	go func() {
		for {
			if _, _, err := conn.Read(ctx); err != nil {
				cancel()
				return
			}
		}
	}()

	// Send a hello so the client knows it's authenticated and connected.
	if err := writeJSONMessage(ctx, conn, map[string]any{
		"type": "hello",
		"sent_at": time.Now().UTC(),
	}); err != nil {
		return
	}

	// Heartbeat ticker keeps proxies from idling the connection out and lets
	// the client display a connection-health indicator.
	pingTicker := time.NewTicker(25 * time.Second)
	defer pingTicker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-pingTicker.C:
			if err := writeJSONMessage(ctx, conn, map[string]any{
				"type": "ping",
				"sent_at": time.Now().UTC(),
			}); err != nil {
				return
			}
		case e, ok := <-sub:
			if !ok {
				return
			}
			if err := writeJSONMessage(ctx, conn, map[string]any{
				"type":  "event",
				"event": e,
			}); err != nil {
				return
			}
		}
	}
}

func writeJSONMessage(ctx context.Context, conn *websocket.Conn, payload any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	writeCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	return conn.Write(writeCtx, websocket.MessageText, body)
}
