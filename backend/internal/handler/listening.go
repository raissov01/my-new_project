package handler

import (
	"net/http"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// ListeningHandler serves the listening clips API.
type ListeningHandler struct {
	db *gorm.DB
}

func NewListening(db *gorm.DB) *ListeningHandler { return &ListeningHandler{db: db} }

// GET /listening/clips?level=B1&topic=work&source=podcast
func (h *ListeningHandler) ListClips(w http.ResponseWriter, r *http.Request) {
	q := h.db.Model(&models.ListeningClip{})
	if lv := r.URL.Query().Get("level"); lv != "" {
		q = q.Where("level = ?", lv)
	}
	if tp := r.URL.Query().Get("topic"); tp != "" {
		q = q.Where("topic = ?", tp)
	}
	if src := r.URL.Query().Get("source"); src == "podcast" {
		q = q.Where("source_podcast != ''")
	}
	var clips []models.ListeningClip
	if err := q.Order("level, created_at").Find(&clips).Error; err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, map[string]any{"clips": clips})
}

// GET /listening/clips/:id
func (h *ListeningHandler) GetClip(w http.ResponseWriter, r *http.Request) {
	id := pathVal(r, "id")
	var clip models.ListeningClip
	if err := h.db.First(&clip, "id = ?", id).Error; err != nil {
		jsonErr(w, "clip not found", http.StatusNotFound)
		return
	}
	var questions []models.ListeningQuestion
	h.db.Where("clip_id = ?", id).Find(&questions)
	jsonOK(w, map[string]any{"clip": clip, "questions": questions})
}

// POST /listening/progress — record play or completion
func (h *ListeningHandler) RecordProgress(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	var body struct {
		ClipID    string `json:"clipId"`
		Score     int    `json:"score"`
		Completed bool   `json:"completed"`
	}
	if err := decodeJSON(r, &body); err != nil {
		jsonErr(w, err.Error(), http.StatusBadRequest)
		return
	}

	prog := models.UserListeningProgress{
		UserID:     userID,
		ClipID:     body.ClipID,
		PlaysCount: 1,
		BestScore:  body.Score,
	}
	if body.Completed {
		now := time.Now()
		prog.CompletedAt = &now
	}

	// Upsert: increment plays, update best score
	err := h.db.Exec(`
		INSERT INTO user_listening_progress (user_id, clip_id, plays_count, best_score, completed_at)
		VALUES (?, ?, 1, ?, ?)
		ON CONFLICT (user_id, clip_id) DO UPDATE SET
			plays_count = user_listening_progress.plays_count + 1,
			best_score  = GREATEST(user_listening_progress.best_score, EXCLUDED.best_score),
			completed_at = COALESCE(user_listening_progress.completed_at, EXCLUDED.completed_at)
	`, userID, body.ClipID, body.Score, prog.CompletedAt).Error

	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, map[string]any{"ok": true})
}

// GET /listening/progress — list user's completed clips
func (h *ListeningHandler) GetProgress(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	var progress []models.UserListeningProgress
	h.db.Where("user_id = ?", userID).Find(&progress)
	jsonOK(w, map[string]any{"progress": progress})
}

func pathVal(r *http.Request, key string) string { return r.PathValue(key) }
