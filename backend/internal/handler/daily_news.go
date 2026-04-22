package handler

import (
	"net/http"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/service"
	"gorm.io/gorm"
)

type DailyNewsHandler struct {
	svc *service.DailyNewsService
}

func NewDailyNews(db *gorm.DB, openAIKey, openAIModel string, timeout time.Duration) *DailyNewsHandler {
	return &DailyNewsHandler{svc: service.NewDailyNews(db, openAIKey, openAIModel, timeout)}
}

// GET /news/today
func (h *DailyNewsHandler) GetToday(w http.ResponseWriter, r *http.Request) {
	news, err := h.svc.GetToday()
	if err != nil {
		jsonErr(w, "no news available yet", http.StatusNotFound)
		return
	}
	jsonOK(w, map[string]any{"news": news})
}

// GET /news/recent?n=7
func (h *DailyNewsHandler) GetRecent(w http.ResponseWriter, r *http.Request) {
	n := 7
	list, err := h.svc.ListRecent(n)
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, map[string]any{"news": list})
}

// POST /news/cron/generate — called by cron at 06:00 UTC
func (h *DailyNewsHandler) CronGenerate(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.GenerateToday(); err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, map[string]any{"ok": true})
}
