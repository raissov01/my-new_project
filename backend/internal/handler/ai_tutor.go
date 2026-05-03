package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/aicost"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"github.com/midoriya/flashlearn-backend/internal/service"
	"gorm.io/gorm"
)

type scenarioResp struct {
	ID               string   `json:"id"`
	Slug             string   `json:"slug"`
	Title            string   `json:"title"`
	Description      string   `json:"description"`
	Level            string   `json:"level"`
	Category         string   `json:"category"`
	Icon             string   `json:"icon"`
	EstimatedMinutes int      `json:"estimatedMinutes"`
	PersonaName      string   `json:"personaName"`
	StudentGoal      string   `json:"studentGoal"`
	SuccessCriteria  []string `json:"successCriteria"`
	VocabFocus       []string `json:"vocabFocus"`
}

func toScenarioResp(sc models.AIScenario) scenarioResp {
	r := scenarioResp{
		ID:               sc.ID,
		Slug:             sc.Slug,
		Title:            sc.Title,
		Description:      sc.Description,
		Level:            sc.Level,
		Category:         sc.Category,
		Icon:             sc.Icon,
		EstimatedMinutes: sc.EstimatedMinutes,
		PersonaName:      sc.PersonaName,
		StudentGoal:      sc.StudentGoal,
	}
	if sc.SuccessCriteria != nil {
		_ = json.Unmarshal([]byte(*sc.SuccessCriteria), &r.SuccessCriteria)
	}
	if sc.VocabFocus != nil {
		_ = json.Unmarshal([]byte(*sc.VocabFocus), &r.VocabFocus)
	}
	return r
}

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
	resp := make([]scenarioResp, len(scenarios))
	for i, sc := range scenarios {
		resp[i] = toScenarioResp(sc)
	}
	jsonOK(w, map[string]any{"scenarios": resp})
}

// GET /tutor/scenarios/:slug
func (h *AITutorHandler) GetScenario(w http.ResponseWriter, r *http.Request) {
	slug := pathVal(r, "slug")
	sc, err := h.svc.GetScenario(slug)
	if err != nil {
		jsonErr(w, "scenario not found", http.StatusNotFound)
		return
	}
	jsonOK(w, map[string]any{"scenario": toScenarioResp(*sc)})
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
		if errors.Is(err, aicost.ErrBudgetExceeded) {
			jsonErr(w, "AI daily budget reached — try again later or contact an admin", http.StatusTooManyRequests)
			return
		}
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
