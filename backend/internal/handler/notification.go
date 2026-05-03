package handler

import (
	"net/http"
	"strconv"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// NotificationHandler serves the in-app bell dropdown.
type NotificationHandler struct {
	db *gorm.DB
}

func NewNotification(db *gorm.DB) *NotificationHandler {
	return &NotificationHandler{db: db}
}

type notificationListResponse struct {
	Items       []models.Notification `json:"items"`
	UnreadCount int64                 `json:"unreadCount"`
}

// GET /notifications?limit=20
func (h *NotificationHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		jsonErr(w, "authentication required", http.StatusUnauthorized)
		return
	}

	limit := 20
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 100 {
			limit = n
		}
	}

	var items []models.Notification
	if err := h.db.
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Find(&items).Error; err != nil {
		jsonErr(w, "failed to load notifications", http.StatusInternalServerError)
		return
	}

	var unread int64
	h.db.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = FALSE", userID).
		Count(&unread)

	jsonOK(w, notificationListResponse{Items: items, UnreadCount: unread})
}

// POST /notifications/:id/read — mark a single notification as read.
func (h *NotificationHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		jsonErr(w, "authentication required", http.StatusUnauthorized)
		return
	}
	id := r.PathValue("id")
	if id == "" {
		jsonErr(w, "missing id", http.StatusBadRequest)
		return
	}

	res := h.db.Model(&models.Notification{}).
		Where("id = ? AND user_id = ?", id, userID).
		Update("is_read", true)
	if res.Error != nil {
		jsonErr(w, "failed to mark read", http.StatusInternalServerError)
		return
	}
	jsonOK(w, map[string]any{"ok": true, "updated": res.RowsAffected})
}

// POST /notifications/read-all — mark every unread row for this user as read.
func (h *NotificationHandler) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		jsonErr(w, "authentication required", http.StatusUnauthorized)
		return
	}

	res := h.db.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = FALSE", userID).
		Update("is_read", true)
	if res.Error != nil {
		jsonErr(w, "failed to mark all read", http.StatusInternalServerError)
		return
	}
	jsonOK(w, map[string]any{"ok": true, "updated": res.RowsAffected})
}

// Create inserts a notification for a user. Internal helper — call from
// other handlers/services when something happens that should surface in
// the bell dropdown. Errors are swallowed; missing notifications are not
// worth failing the originating action over.
func (h *NotificationHandler) Create(userID, ntype, title, body string, link *string) {
	if userID == "" || title == "" {
		return
	}
	n := models.Notification{
		UserID: userID,
		Type:   ntype,
		Title:  title,
		Body:   body,
		Link:   link,
	}
	_ = h.db.Create(&n).Error
}
