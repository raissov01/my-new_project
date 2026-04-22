package handler

import (
	"net/http"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/service"
	"gorm.io/gorm"
)

// AITutorHandler serves the AI roleplay scenarios API.
type AITutorHandler struct {
	svc *service.AITutorService
}

func NewAITutor(db *gorm.DB, openAIKey, openAIModel, claudeKey, claudeModel, claudeURL string, timeout time.Duration) *AITutorHandler {
	return &AITutorHandler{svc: service.NewAITutor(db, openAIKey, openAIModel, claudeKey, claudeModel, claudeURL, timeout)}
}

// GET /tutor/scenarios?level=B1&category=travel
func (h *AITutorHandler) ListScenarios(w http.ResponseWriter, r *http.Request) {
	level := r.URL.Query().Get("level")
	category := r.URL.Query().Get("category")
	scenarios, err := h.svc.ListScenarios(level, category)
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, map[string]any{"scenarios": scenarios})
}

// GET /tutor/scenarios/:slug
func (h *AITutorHandler) GetScenario(w http.ResponseWriter, r *http.Request) {
	slug := pathVal(r, "slug")
	sc, err := h.svc.GetScenario(slug)
	if err != nil {
		jsonErr(w, "scenario not found", http.StatusNotFound)
		return
	}
	jsonOK(w, map[string]any{"scenario": sc})
}

// POST /tutor/conversations — start a new conversation
func (h *AITutorHandler) StartConversation(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	var body struct {
		ScenarioID string `json:"scenarioId"`
	}
	if err := decodeJSON(r, &body); err != nil || body.ScenarioID == "" {
		jsonErr(w, "scenarioId required", http.StatusBadRequest)
		return
	}
	conv, err := h.svc.StartConversation(userID, body.ScenarioID)
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, map[string]any{"conversation": conv})
}

// POST /tutor/conversations/:id/message
func (h *AITutorHandler) SendMessage(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	convID := pathVal(r, "id")
	var body struct {
		Text string `json:"text"`
	}
	if err := decodeJSON(r, &body); err != nil || body.Text == "" {
		jsonErr(w, "text required", http.StatusBadRequest)
		return
	}
	reply, err := h.svc.SendMessage(r.Context(), convID, userID, body.Text)
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, map[string]any{"reply": reply})
}

// POST /tutor/conversations/:id/grade
func (h *AITutorHandler) GradeConversation(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	convID := pathVal(r, "id")
	scores, err := h.svc.GradeConversation(r.Context(), convID, userID)
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, map[string]any{"scores": scores})
}

// GET /tutor/history
func (h *AITutorHandler) GetHistory(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	history, err := h.svc.ListHistory(userID)
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, map[string]any{"history": history})
}
