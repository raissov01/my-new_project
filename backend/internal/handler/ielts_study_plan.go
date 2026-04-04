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
		raw, err := callOpenAIChatCompletion(h.openAIKey, h.openAIModel, prompt, h.timeout)
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

	// Get previous active plan for version tracking
	var prevPlan models.IELTSStudyPlan
	var prevVersion int
	var prevPlanID *string
	if err := h.db.Where("user_id = ? AND status = ?", userID, "active").
		Order("created_at DESC").First(&prevPlan).Error; err == nil {
		prevVersion = prevPlan.Version
		prevPlanID = &prevPlan.ID
	}

	// Archive any existing active plans for this user
	h.db.Model(&models.IELTSStudyPlan{}).
		Where("user_id = ? AND status = ?", userID, "active").
		Updates(map[string]any{"status": "archived", "version_reason": "replaced by new generation"})

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

	// Build LLM prompt — generates both readable strategy guide AND actionable task checklist
	prompt := fmt.Sprintf(`You are a premium IELTS preparation coach. Create a comprehensive, personalized study roadmap.

Student profile:
- Current Band: %s
- Target Band: %s
- Exam Type: %s
- Exam Date: %s
- Weekly Study Hours: %d
- Weak Sections: %s
- Strengths: %s
- Struggles: %s

Return ONLY valid JSON (no markdown, no backticks):
{
  "overview": "2-3 paragraph strategy overview: what the student should focus on, why their weak areas matter, and the overall approach",
  "strategy": {
    "whatToFocusFirst": "What to prioritize in the first 2 weeks",
    "urgentSkills": "Which skills need immediate attention and why",
    "stableSkills": "Which skills are already decent and need maintenance only",
    "commonMistakes": "What mistakes are likely slowing this student down",
    "dailyStructure": "Recommended daily study structure (morning/afternoon/evening)",
    "timingStrategy": "How to manage time during practice and actual exam"
  },
  "phases": [
    {
      "name": "Foundation",
      "weeks": "Week 1-2",
      "goal": "Build core skills and identify weak patterns",
      "actions": "What to do in this phase",
      "avoid": "What NOT to do yet",
      "expectedProgress": "What improvement to expect by end of phase"
    }
  ],
  "weeklyGoals": [
    {
      "week": 1,
      "focus": "Main focus area",
      "tasks": [
        {
          "day": "Monday",
          "skill": "reading",
          "activity": "Timed reading passage practice",
          "durationMinutes": 45,
          "details": "Detailed step-by-step instructions",
          "howTo": "Specific technique to use",
          "whatToAvoid": "Common mistakes for this task",
          "whyItMatters": "Why this task helps reach the target band"
        }
      ]
    }
  ],
  "prioritySkills": ["writing", "speaking"],
  "tips": ["Specific actionable tip 1", "Specific actionable tip 2"],
  "moduleGuide": {
    "listening": "2-3 sentences on how to improve listening for this student",
    "reading": "2-3 sentences on reading improvement strategy",
    "writing": "2-3 sentences on writing improvement strategy",
    "speaking": "2-3 sentences on speaking improvement strategy"
  },
  "examCountdown": "What to do in the final 7-10 days before the exam"
}

Include all 4 weeks. Each week should have tasks for Monday through Sunday. Distribute %d hours/week across tasks. Skills: reading, writing, listening, speaking, vocabulary, grammar. Make the overview and strategy sections detailed and personal, not generic.`,
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
		Version:       prevVersion + 1,
		VersionReason: "initial",
		ParentPlanID:  prevPlanID,
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
		"version":       plan.Version,
		"versionReason": plan.VersionReason,
		"parentPlanId":  plan.ParentPlanID,
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

// ── Task Completion ─────────────────────────────────────────────────────────

type completeTaskRequest struct {
	PlanID   string `json:"planId"`
	Week     int    `json:"week"`
	Day      string `json:"day"`
	Skill    string `json:"skill"`
	Activity string `json:"activity"`
	Status   string `json:"status"`
	Note     string `json:"note"`
}

func (h *IELTSStudyPlanHandler) CompleteTask(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var req completeTaskRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	validStatuses := map[string]bool{"completed": true, "skipped": true, "partial": true, "pending": true}
	if !validStatuses[req.Status] {
		writeError(w, http.StatusBadRequest, "status must be completed, skipped, partial, or pending", nil)
		return
	}

	// Upsert: find existing or create new
	var existing models.IELTSTaskCompletion
	result := h.db.Where("user_id = ? AND plan_id = ? AND week = ? AND day = ? AND skill = ?",
		userID, req.PlanID, req.Week, req.Day, req.Skill).First(&existing)

	if result.Error == nil {
		// Update existing
		updates := map[string]any{"status": req.Status}
		if strings.TrimSpace(req.Note) != "" {
			note := strings.TrimSpace(req.Note)
			updates["note"] = &note
		}
		h.db.Model(&existing).Updates(updates)
		writeJSON(w, http.StatusOK, existing)
		return
	}

	// Create new
	var note *string
	if strings.TrimSpace(req.Note) != "" {
		n := strings.TrimSpace(req.Note)
		note = &n
	}

	completion := models.IELTSTaskCompletion{
		UserID:   userID,
		PlanID:   req.PlanID,
		Week:     req.Week,
		Day:      req.Day,
		Skill:    req.Skill,
		Activity: req.Activity,
		Status:   req.Status,
		Note:     note,
	}

	if err := h.db.Create(&completion).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save task completion", err)
		return
	}

	writeJSON(w, http.StatusCreated, completion)
}

func (h *IELTSStudyPlanHandler) GetTaskCompletions(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	planID := r.URL.Query().Get("planId")
	if planID == "" {
		writeError(w, http.StatusBadRequest, "planId required", nil)
		return
	}

	var completions []models.IELTSTaskCompletion
	if err := h.db.Where("user_id = ? AND plan_id = ?", userID, planID).
		Order("week ASC, day ASC").Find(&completions).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load completions", err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"completions": completions})
}

// GetRoadmapProgress returns aggregated progress stats for the dashboard.
func (h *IELTSStudyPlanHandler) GetRoadmapProgress(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	// Get active plan
	var plan models.IELTSStudyPlan
	err := h.db.Where("user_id = ? AND status = ?", userID, "active").
		Order("created_at DESC").First(&plan).Error
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"progress": nil})
		return
	}

	// Count completions
	var totalTasks int64
	var completedTasks int64
	var skippedTasks int64

	h.db.Model(&models.IELTSTaskCompletion{}).
		Where("user_id = ? AND plan_id = ?", userID, plan.ID).Count(&totalTasks)
	h.db.Model(&models.IELTSTaskCompletion{}).
		Where("user_id = ? AND plan_id = ? AND status = ?", userID, plan.ID, "completed").Count(&completedTasks)
	h.db.Model(&models.IELTSTaskCompletion{}).
		Where("user_id = ? AND plan_id = ? AND status = ?", userID, plan.ID, "skipped").Count(&skippedTasks)

	// Count total planned tasks from plan data
	planData := parseJSONBField(plan.PlanData)
	totalPlannedTasks := 0
	if pd, ok := planData.(map[string]any); ok {
		if weeks, ok := pd["weeklyGoals"].([]any); ok {
			for _, w := range weeks {
				if wk, ok := w.(map[string]any); ok {
					if tasks, ok := wk["tasks"].([]any); ok {
						totalPlannedTasks += len(tasks)
					}
				}
			}
		}
	}

	// Days until exam
	daysLeft := -1
	if plan.ExamDate != nil && *plan.ExamDate != "" {
		if examDate, err := time.Parse("2006-01-02", *plan.ExamDate); err == nil {
			daysLeft = int(time.Until(examDate).Hours() / 24)
			if daysLeft < 0 {
				daysLeft = 0
			}
		}
	}

	// Determine current week (based on plan creation date)
	daysSinceCreation := int(time.Since(plan.CreatedAt).Hours() / 24)
	currentWeek := (daysSinceCreation / 7) + 1

	// Completion percentage
	completionPct := 0
	if totalPlannedTasks > 0 {
		completionPct = int(float64(completedTasks) / float64(totalPlannedTasks) * 100)
	}

	// Readiness label
	readiness := "just started"
	if completionPct >= 80 {
		readiness = "exam ready"
	} else if completionPct >= 60 {
		readiness = "strong progress"
	} else if completionPct >= 40 {
		readiness = "on track"
	} else if completionPct >= 20 {
		readiness = "building momentum"
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"progress": map[string]any{
			"planId":            plan.ID,
			"targetBand":        plan.TargetBand,
			"currentBand":       plan.CurrentBand,
			"examDate":          plan.ExamDate,
			"examType":          plan.ExamType,
			"daysLeft":          daysLeft,
			"currentWeek":       currentWeek,
			"totalPlannedTasks": totalPlannedTasks,
			"completedTasks":    completedTasks,
			"skippedTasks":      skippedTasks,
			"completionPercent": completionPct,
			"readiness":         readiness,
			"weakSections":      parseJSONBField(plan.WeakSections),
			"prioritySkills":    getPrioritySkills(planData),
		},
	})
}

func getPrioritySkills(planData any) []string {
	if pd, ok := planData.(map[string]any); ok {
		if skills, ok := pd["prioritySkills"].([]any); ok {
			result := make([]string, 0, len(skills))
			for _, s := range skills {
				if str, ok := s.(string); ok {
					result = append(result, str)
				}
			}
			return result
		}
	}
	return nil
}

// ── Plan Version History ────────────────────────────────────────────────────

func (h *IELTSStudyPlanHandler) GetPlanHistory(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var plans []models.IELTSStudyPlan
	if err := h.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(20).
		Find(&plans).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to load plan history", err)
		return
	}

	serialized := make([]map[string]any, 0, len(plans))
	for _, p := range plans {
		serialized = append(serialized, serializeStudyPlan(p))
	}

	writeJSON(w, http.StatusOK, map[string]any{"plans": serialized})
}

// ── Weekly Reflection ───────────────────────────────────────────────────────

type reflectionRequest struct {
	PlanID     string `json:"planId"`
	Week       int    `json:"week"`
	Completed  string `json:"completed"`
	Difficult  string `json:"difficult"`
	Improved   string `json:"improved"`
	SlowedDown string `json:"slowedDown"`
	NextWeek   string `json:"nextWeek"`
}

func (h *IELTSStudyPlanHandler) SubmitReflection(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var req reflectionRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	if req.NextWeek == "" {
		req.NextWeek = "same"
	}

	// Generate AI coach note based on reflection
	var coachNote *string
	if h.openAIKey != "" || h.geminiKey != "" {
		prompt := fmt.Sprintf(`You are a supportive IELTS study coach. Based on this weekly reflection, write a brief, encouraging coaching note (2-3 sentences max). Be specific and actionable.

Student reflection for Week %d:
- What they completed: %s
- What was difficult: %s
- What improved: %s
- What slowed them down: %s
- Next week preference: %s

Write a short coaching note:`, req.Week, req.Completed, req.Difficult, req.Improved, req.SlowedDown, req.NextWeek)

		raw, _, err := h.callLLM(prompt)
		if err == nil {
			note := strings.TrimSpace(raw)
			// Remove any JSON wrapping if the LLM returned JSON
			note = strings.Trim(note, "\"")
			coachNote = &note
		}
	}

	var completed, difficult, improved, slowedDown *string
	if s := strings.TrimSpace(req.Completed); s != "" {
		completed = &s
	}
	if s := strings.TrimSpace(req.Difficult); s != "" {
		difficult = &s
	}
	if s := strings.TrimSpace(req.Improved); s != "" {
		improved = &s
	}
	if s := strings.TrimSpace(req.SlowedDown); s != "" {
		slowedDown = &s
	}

	reflection := models.IELTSWeeklyReflection{
		UserID:     userID,
		PlanID:     req.PlanID,
		Week:       req.Week,
		Completed:  completed,
		Difficult:  difficult,
		Improved:   improved,
		SlowedDown: slowedDown,
		NextWeek:   req.NextWeek,
		CoachNote:  coachNote,
	}

	if err := h.db.Create(&reflection).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to save reflection", err)
		return
	}

	writeJSON(w, http.StatusCreated, reflection)
}

func (h *IELTSStudyPlanHandler) GetReflections(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	planID := r.URL.Query().Get("planId")
	if planID == "" {
		writeError(w, http.StatusBadRequest, "planId required", nil)
		return
	}

	var reflections []models.IELTSWeeklyReflection
	if err := h.db.Where("user_id = ? AND plan_id = ?", userID, planID).
		Order("week ASC").Find(&reflections).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to load reflections", err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"reflections": reflections})
}

// ── Adaptive Check ──────────────────────────────────────────────────────────

// CheckAdaptive analyzes whether the roadmap needs adjustment.
// Returns one of: "stable", "suggest_catchup", "suggest_rebalance", "suggest_rebuild"
func (h *IELTSStudyPlanHandler) CheckAdaptive(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var plan models.IELTSStudyPlan
	if err := h.db.Where("user_id = ? AND status = ?", userID, "active").
		Order("created_at DESC").First(&plan).Error; err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"status": "no_plan"})
		return
	}

	// Calculate current week
	daysSinceCreation := int(time.Since(plan.CreatedAt).Hours() / 24)
	currentWeek := (daysSinceCreation / 7) + 1

	// Count planned tasks per week from plan data
	planData := parseJSONBField(plan.PlanData)
	weekTaskCounts := make(map[int]int)
	if pd, ok := planData.(map[string]any); ok {
		if weeks, ok := pd["weeklyGoals"].([]any); ok {
			for _, w := range weeks {
				if wk, ok := w.(map[string]any); ok {
					weekNum := 1
					if wn, ok := wk["week"].(float64); ok {
						weekNum = int(wn)
					}
					if tasks, ok := wk["tasks"].([]any); ok {
						weekTaskCounts[weekNum] = len(tasks)
					}
				}
			}
		}
	}

	// Count completed tasks per week
	var completions []models.IELTSTaskCompletion
	h.db.Where("user_id = ? AND plan_id = ? AND status = ?", userID, plan.ID, "completed").Find(&completions)

	weekCompletedCounts := make(map[int]int)
	for _, c := range completions {
		weekCompletedCounts[c.Week]++
	}

	// Analyze the last 2 weeks
	week1 := currentWeek - 1
	week2 := currentWeek - 2

	week1Planned := weekTaskCounts[week1]
	week1Done := weekCompletedCounts[week1]
	week2Planned := weekTaskCounts[week2]
	week2Done := weekCompletedCounts[week2]

	// Determine adaptation level
	status := "stable"
	message := "You are on track. Keep going!"
	level := 0 // 0=stable, 1=catchup, 2=rebalance, 3=rebuild

	week1Rate := 0.0
	if week1Planned > 0 {
		week1Rate = float64(week1Done) / float64(week1Planned)
	}
	week2Rate := 0.0
	if week2Planned > 0 {
		week2Rate = float64(week2Done) / float64(week2Planned)
	}

	// Level 1: a few missed tasks in current/last week → suggest catch-up
	if currentWeek >= 2 && week1Planned > 0 && week1Rate < 0.6 {
		status = "suggest_catchup"
		message = "You missed some tasks last week. Consider catching up on the important ones this week."
		level = 1
	}

	// Level 2: whole week is weak → suggest rebalance
	if currentWeek >= 2 && week1Planned > 0 && week1Rate < 0.3 {
		status = "suggest_rebalance"
		message = "Last week was light on progress. We recommend redistributing tasks for this week."
		level = 2
	}

	// Level 3: 2 consecutive weeks of underperformance → suggest rebuild
	if currentWeek >= 3 && week1Planned > 0 && week2Planned > 0 && week1Rate < 0.4 && week2Rate < 0.4 {
		status = "suggest_rebuild"
		message = "You have been off-plan for about 2 weeks. We recommend generating a revised roadmap to get back on track."
		level = 3
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status":      status,
		"level":       level,
		"message":     message,
		"currentWeek": currentWeek,
		"lastWeek": map[string]any{
			"planned":        week1Planned,
			"completed":      week1Done,
			"completionRate": week1Rate,
		},
		"twoWeeksAgo": map[string]any{
			"planned":        week2Planned,
			"completed":      week2Done,
			"completionRate": week2Rate,
		},
	})
}
