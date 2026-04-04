package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

type IELTSStudyPlanHandler struct {
	db          *gorm.DB
	openAIKey   string
	openAIModel string
	geminiKey   string
	geminiModel string
	timeout     time.Duration
}

func NewIELTSStudyPlan(db *gorm.DB, openAIKey, openAIModel, geminiKey, geminiModel string, timeout time.Duration) *IELTSStudyPlanHandler {
	if timeout < 30*time.Second {
		timeout = 60 * time.Second
	}
	return &IELTSStudyPlanHandler{
		db: db, openAIKey: openAIKey, openAIModel: openAIModel,
		geminiKey: geminiKey, geminiModel: geminiModel, timeout: timeout,
	}
}

// ── LLM call ────────────────────────────────────────────────────────────────

func (h *IELTSStudyPlanHandler) callLLM(prompt string) (string, string, error) {
	if strings.TrimSpace(h.openAIKey) != "" {
		raw, err := callOpenAIRaw(h.openAIKey, h.openAIModel, prompt, h.timeout)
		if err == nil {
			return raw, h.openAIModel, nil
		}
		if strings.TrimSpace(h.geminiKey) == "" {
			return "", "", err
		}
	}

	raw, err := callGeminiRaw(h.geminiKey, h.geminiModel, prompt, h.timeout)
	if err != nil {
		return "", "", err
	}
	return raw, h.geminiModel, nil
}

// ── Generate Plan ───────────────────────────────────────────────────────────

type generatePlanRequest struct {
	TargetBand   string   `json:"targetBand"`
	CurrentBand  string   `json:"currentBand"`
	ExamDate     string   `json:"examDate"`
	ExamType     string   `json:"examType"`
	WeeklyHours  int      `json:"weeklyHours"`
	WeakSections []string `json:"weakSections"`
	Strengths    []string `json:"strengths"`
	Struggles    []string `json:"struggles"`
}

func (h *IELTSStudyPlanHandler) GeneratePlan(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	if h.openAIKey == "" && h.geminiKey == "" {
		writeError(w, http.StatusServiceUnavailable, "AI service is not configured", nil)
		return
	}

	var req generatePlanRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	if strings.TrimSpace(req.TargetBand) == "" {
		writeError(w, http.StatusBadRequest, "targetBand is required", nil)
		return
	}
	if strings.TrimSpace(req.CurrentBand) == "" {
		writeError(w, http.StatusBadRequest, "currentBand is required", nil)
		return
	}
	if req.WeeklyHours <= 0 {
		req.WeeklyHours = 10
	}
	if strings.TrimSpace(req.ExamType) == "" {
		req.ExamType = "academic"
	}

	// Archive any existing active plans for this user
	h.db.Model(&models.IELTSStudyPlan{}).
		Where("user_id = ? AND status = ?", userID, "active").
		Update("status", "archived")

	// Build questionnaire JSON
	questionnaire := map[string]any{
		"targetBand":   req.TargetBand,
		"currentBand":  req.CurrentBand,
		"examDate":     req.ExamDate,
		"examType":     req.ExamType,
		"weeklyHours":  req.WeeklyHours,
		"weakSections": req.WeakSections,
		"strengths":    req.Strengths,
		"struggles":    req.Struggles,
	}
	questionnaireJSON, _ := json.Marshal(questionnaire)

	// Build LLM prompt
	prompt := fmt.Sprintf(`You are an expert IELTS tutor. Create a personalized 4-week study plan based on the following student profile:

- Current Band: %s
- Target Band: %s
- Exam Type: %s
- Exam Date: %s
- Weekly Study Hours Available: %d
- Weak Sections: %s
- Strengths: %s
- Struggles: %s

Create a structured study plan that prioritizes the weak areas while maintaining strengths. Distribute the %d weekly hours across the 4 weeks.

Return ONLY valid JSON with no additional text:
{
  "overview": "A brief overview of the study plan strategy",
  "weeklyGoals": [
    {
      "week": 1,
      "focus": "Main focus area for this week",
      "tasks": [
        { "day": "Monday", "skill": "reading", "activity": "Practice skimming and scanning techniques", "durationMinutes": 45, "details": "Detailed instructions for the activity" }
      ]
    }
  ],
  "prioritySkills": ["writing", "speaking"],
  "tips": ["Practical tip 1", "Practical tip 2"]
}

Include all 4 weeks with daily tasks for each week. Each week should have tasks for Monday through Sunday. Skills should be one of: reading, writing, listening, speaking, vocabulary, grammar.`,
		req.CurrentBand,
		req.TargetBand,
		req.ExamType,
		req.ExamDate,
		req.WeeklyHours,
		strings.Join(req.WeakSections, ", "),
		strings.Join(req.Strengths, ", "),
		strings.Join(req.Struggles, ", "),
		req.WeeklyHours,
	)

	raw, modelName, err := h.callLLM(prompt)
	if err != nil {
		writeError(w, http.StatusBadGateway, "AI plan generation failed: "+err.Error(), err)
		return
	}

	// Try to parse as JSON; if it fails, wrap the raw response
	var planParsed json.RawMessage
	if err := json.Unmarshal([]byte(raw), &planParsed); err != nil {
		fallback := map[string]string{"raw": raw}
		planParsed, _ = json.Marshal(fallback)
	}

	planDataStr := string(planParsed)
	questionnaireStr := string(questionnaireJSON)

	// Marshal JSONB fields
	weakSectionsJSON, _ := json.Marshal(req.WeakSections)
	weakSectionsStr := string(weakSectionsJSON)

	strengthsJSON, _ := json.Marshal(req.Strengths)
	strengthsStr := string(strengthsJSON)

	strugglesJSON, _ := json.Marshal(req.Struggles)
	strugglesStr := string(strugglesJSON)

	var examDate *string
	if strings.TrimSpace(req.ExamDate) != "" {
		ed := strings.TrimSpace(req.ExamDate)
		examDate = &ed
	}

	plan := models.IELTSStudyPlan{
		UserID:        userID,
		TargetBand:    strings.TrimSpace(req.TargetBand),
		CurrentBand:   strings.TrimSpace(req.CurrentBand),
		ExamDate:      examDate,
		ExamType:      req.ExamType,
		WeeklyHours:   req.WeeklyHours,
		WeakSections:  &weakSectionsStr,
		Strengths:     &strengthsStr,
		Struggles:     &strugglesStr,
		PlanData:      &planDataStr,
		Questionnaire: &questionnaireStr,
		Status:        "active",
		GeneratedByAI: true,
		AIModel:       modelName,
	}

	if err := h.db.Create(&plan).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to save study plan", err)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"plan": serializeStudyPlan(plan)})
}

// ── Get Plan ────────────────────────────────────────────────────────────────

func (h *IELTSStudyPlanHandler) GetPlan(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var plan models.IELTSStudyPlan
	err := h.db.Where("user_id = ? AND status = ?", userID, "active").
		Order("created_at DESC").
		First(&plan).Error

	if err == gorm.ErrRecordNotFound {
		writeJSON(w, http.StatusOK, map[string]any{"plan": nil})
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to load study plan", err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"plan": serializeStudyPlan(plan)})
}

// ── Update Plan ─────────────────────────────────────────────────────────────

type updatePlanRequest struct {
	Status string `json:"status"`
}

func (h *IELTSStudyPlanHandler) UpdatePlan(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	planID := r.PathValue("planID")
	if strings.TrimSpace(planID) == "" {
		writeError(w, http.StatusBadRequest, "planID is required", nil)
		return
	}

	var req updatePlanRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	if req.Status != "completed" && req.Status != "archived" {
		writeError(w, http.StatusBadRequest, "status must be completed or archived", nil)
		return
	}

	var plan models.IELTSStudyPlan
	if err := h.db.Where("id = ? AND user_id = ?", planID, userID).First(&plan).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			writeError(w, http.StatusNotFound, "plan not found", nil)
			return
		}
		writeError(w, http.StatusInternalServerError, "Failed to load plan", err)
		return
	}

	plan.Status = req.Status
	if err := h.db.Save(&plan).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update plan", err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"plan": serializeStudyPlan(plan)})
}

// serializeStudyPlan converts the GORM model into a properly structured JSON
// response. JSONB fields stored as *string are parsed into real JSON objects
// so the frontend receives objects, not escaped strings.
func serializeStudyPlan(plan models.IELTSStudyPlan) map[string]any {
	result := map[string]any{
		"id":            plan.ID,
		"userId":        plan.UserID,
		"targetBand":    plan.TargetBand,
		"currentBand":   plan.CurrentBand,
		"examDate":      plan.ExamDate,
		"examType":      plan.ExamType,
		"weeklyHours":   plan.WeeklyHours,
		"status":        plan.Status,
		"generatedByAI": plan.GeneratedByAI,
		"aiModel":       plan.AIModel,
		"createdAt":     plan.CreatedAt,
		"updatedAt":     plan.UpdatedAt,
	}

	// Parse JSONB string fields into real JSON objects
	result["weakSections"] = parseJSONBField(plan.WeakSections)
	result["strengths"] = parseJSONBField(plan.Strengths)
	result["struggles"] = parseJSONBField(plan.Struggles)
	result["planData"] = parseJSONBField(plan.PlanData)
	result["questionnaire"] = parseJSONBField(plan.Questionnaire)

	return result
}

// parseJSONBField takes a *string containing JSON and returns the parsed value.
// If nil or invalid, returns nil.
func parseJSONBField(field *string) any {
	if field == nil || strings.TrimSpace(*field) == "" {
		return nil
	}
	var parsed any
	if err := json.Unmarshal([]byte(*field), &parsed); err != nil {
		return *field
	}
	return parsed
}
