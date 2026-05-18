package handler

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/aicost"
	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

type IELTSStudyPlanHandler struct {
	db             *gorm.DB
	openAIKey      string
	openAIModel    string
	claudeKey      string
	claudeModel    string
	claudeFallback string
	claudeURL      string
	timeout        time.Duration
}

func NewIELTSStudyPlan(db *gorm.DB, openAIKey, openAIModel, claudeKey, claudeModel, claudeFallback, claudeURL string, timeout time.Duration) *IELTSStudyPlanHandler {
	if timeout < 30*time.Second {
		timeout = 60 * time.Second
	}
	// GPT-5 is too slow for study plan generation (45s+ timeout).
	// Use gpt-4.1-mini for fast, reliable responses.
	planModel := openAIModel
	if planModel == "gpt-5" || planModel == "o3" || planModel == "o4-mini" {
		planModel = "gpt-4.1-mini"
	}
	return &IELTSStudyPlanHandler{
		db: db, openAIKey: openAIKey, openAIModel: planModel,
		claudeKey: claudeKey, claudeModel: claudeModel, claudeFallback: claudeFallback, claudeURL: claudeURL,
		timeout: timeout,
	}
}

// buildHistoryBlock returns a human-readable summary of the user's actual
// performance on the platform — recent writing criteria, speaking criteria,
// completed mock attempts. Returned text is embedded in the LLM prompt so
// the plan reacts to the measured gap rather than the self-reported band.
// Returns an empty string when the user has no history.
func (h *IELTSStudyPlanHandler) buildHistoryBlock(userID string) string {
	var b strings.Builder

	// Recent writing submissions (with criterion breakdown).
	var writing []models.IELTSWritingSubmission
	h.db.Where("user_id = ?", userID).Order("created_at DESC").Limit(5).Find(&writing)
	if len(writing) > 0 {
		var sumOverall, sumTA, sumCC, sumLR, sumGR float64
		for _, w := range writing {
			sumOverall += w.OverallBand
			sumTA += w.TaskAchievement
			sumCC += w.Coherence
			sumLR += w.LexicalResource
			sumGR += w.Grammar
		}
		n := float64(len(writing))
		fmt.Fprintf(&b, "WRITING — %d recent submissions, avg overall band %.1f\n", len(writing), sumOverall/n)
		fmt.Fprintf(&b, "  avg criteria: TaskAchievement %.1f · CoherenceCohesion %.1f · LexicalResource %.1f · GrammarRange %.1f\n",
			sumTA/n, sumCC/n, sumLR/n, sumGR/n)
		// Show the lowest 1-2 individual attempts so the LLM sees variance.
		for i, w := range writing {
			if i >= 3 {
				break
			}
			fmt.Fprintf(&b, "  · %s overall %.1f (TA %.1f, CC %.1f, LR %.1f, GR %.1f)\n",
				w.TaskType, w.OverallBand, w.TaskAchievement, w.Coherence, w.LexicalResource, w.Grammar)
		}
	}

	// Recent speaking sessions.
	var speaking []models.IELTSSpeakingSession
	h.db.Where("user_id = ?", userID).Order("created_at DESC").Limit(5).Find(&speaking)
	if len(speaking) > 0 {
		var sumOverall, sumFC, sumLR, sumGR, sumPR float64
		for _, s := range speaking {
			sumOverall += s.OverallBand
			sumFC += s.FluencyCoherence
			sumLR += s.LexicalResource
			sumGR += s.Grammar
			sumPR += s.Pronunciation
		}
		n := float64(len(speaking))
		fmt.Fprintf(&b, "SPEAKING — %d recent sessions, avg overall band %.1f\n", len(speaking), sumOverall/n)
		fmt.Fprintf(&b, "  avg criteria: FluencyCoherence %.1f · LexicalResource %.1f · GrammarRange %.1f · Pronunciation %.1f\n",
			sumFC/n, sumLR/n, sumGR/n, sumPR/n)
		for i, s := range speaking {
			if i >= 3 {
				break
			}
			fmt.Fprintf(&b, "  · %s overall %.1f (FC %.1f, LR %.1f, GR %.1f, PR %.1f)\n",
				s.Part, s.OverallBand, s.FluencyCoherence, s.LexicalResource, s.Grammar, s.Pronunciation)
		}
	}

	// Completed mock attempts — pull section bands out of the Results JSONB.
	var attempts []models.IELTSAttempt
	h.db.Where("user_id = ? AND status = 'completed'", userID).
		Order("completed_at DESC").Limit(5).Find(&attempts)
	mockLines := 0
	for _, a := range attempts {
		if a.AttemptType != "full_mock" || a.Results == nil {
			continue
		}
		var parsed map[string]any
		if err := json.Unmarshal([]byte(*a.Results), &parsed); err != nil {
			continue
		}
		// Section bands are stored under various keys depending on the mock
		// pipeline; pick whichever map exists.
		bands, _ := parsed["bandScores"].(map[string]any)
		if bands == nil {
			bands, _ = parsed["sectionBands"].(map[string]any)
		}
		if bands == nil {
			continue
		}
		if mockLines == 0 {
			b.WriteString("MOCK EXAMS — completed full mocks\n")
		}
		parts := []string{}
		for _, section := range []string{"reading", "listening", "writing", "speaking", "overall"} {
			if v, ok := bands[section]; ok {
				if f, ok := v.(float64); ok {
					parts = append(parts, fmt.Sprintf("%s %.1f", section, f))
				}
			}
		}
		if len(parts) > 0 {
			date := ""
			if a.CompletedAt != nil {
				date = a.CompletedAt.Format("2006-01-02")
			}
			fmt.Fprintf(&b, "  · %s — %s\n", date, strings.Join(parts, ", "))
			mockLines++
		}
		if mockLines >= 3 {
			break
		}
	}

	if b.Len() == 0 {
		return "No recorded attempts yet on the platform — base the plan on the self-reported levels but flag that the first week should include a baseline mock test to verify the starting band."
	}
	return b.String()
}

// platformContentBlock describes the StudyWithRaissov platform features the
// student already has access to. The LLM is told to embed direct platform
// references in tasks ("Open the Reading simulator and complete one Cambridge
// 18 passage") instead of pointing students at outside resources.
func platformContentBlock() string {
	return `Available platform features (use these by name in task instructions — never recommend external books or paid services):
- /ielts/simulator — full Cambridge-style mocks (reading, listening, writing, speaking) with strict timing. Tasks like "Complete one full simulator reading section (60 min)" map here.
- /ielts/listening — individual listening clips with scripts and questions for short focused practice.
- /ielts/writing — guided Task 1 + Task 2 with AI feedback; criteria breakdown (TA, CC, LR, GR) on submit.
- /ielts/speaking — individual Part 1 / Part 2 / Part 3 prompts with AI feedback (FC, LR, GR, Pronunciation).
- /ielts/dashboard — live progress, weakness analysis, band trend.
- /ielts/study-plan — this roadmap with weekly check-ins and reflections.
- /flashcards — vocabulary and grammar sets the student can study (use for "vocabulary" and "grammar" tasks).
When you write task.activity or task.howTo, mention the specific platform area and what the student should do there (e.g. "Open /ielts/writing and submit one Task 2 essay on the assigned topic; review the AI Coherence feedback").`
}

// ── LLM call ────────────────────────────────────────────────────────────────

func (h *IELTSStudyPlanHandler) callLLM(prompt string) (string, string, error) {
	start := time.Now()

	// Per-provider timeout MUST be small enough that the whole chain finishes
	// before the Next.js server-action call is killed by the upstream proxy
	// (~60-100s on most hosts). 45s per provider × 3 providers ≈ 135s worst case,
	// but in practice a single provider returns within 30-50s.
	perProviderTimeout := 45 * time.Second
	if h.timeout > 0 && h.timeout < perProviderTimeout {
		perProviderTimeout = h.timeout
	}

	// Primary: Claude (DO AI) — model configured via CLAUDE_MODEL env.
	if strings.TrimSpace(h.claudeKey) != "" && strings.TrimSpace(h.claudeURL) != "" {
		callStart := time.Now()
		raw, usage, err := callClaudeChatCompletion(h.claudeKey, h.claudeModel, h.claudeURL, "", prompt, perProviderTimeout)
		aicost.Record(h.db, aicost.Event{
			Feature: "ielts_study_plan", Model: h.claudeModel,
			PromptTokens: usage.Prompt, CompletionTokens: usage.Completion,
			Latency: time.Since(callStart), Err: err,
		})
		if err == nil {
			log.Printf("[study-plan-llm] success via Claude: model=%s time=%v len=%d", h.claudeModel, time.Since(start), len(raw))
			return raw, h.claudeModel, nil
		}
		log.Printf("[study-plan-llm] Claude primary failed: %v", err)

		// Claude fallback model
		if strings.TrimSpace(h.claudeFallback) != "" && h.claudeFallback != h.claudeModel {
			callStart := time.Now()
			raw, usage, err = callClaudeChatCompletion(h.claudeKey, h.claudeFallback, h.claudeURL, "", prompt, perProviderTimeout)
			aicost.Record(h.db, aicost.Event{
				Feature: "ielts_study_plan", Model: h.claudeFallback,
				PromptTokens: usage.Prompt, CompletionTokens: usage.Completion,
				Latency: time.Since(callStart), Err: err,
			})
			if err == nil {
				log.Printf("[study-plan-llm] success via Claude fallback: model=%s time=%v len=%d", h.claudeFallback, time.Since(start), len(raw))
				return raw, h.claudeFallback, nil
			}
			log.Printf("[study-plan-llm] Claude fallback failed: %v", err)
		}
	}

	// Fallback: OpenAI.
	if strings.TrimSpace(h.openAIKey) != "" {
		callStart := time.Now()
		raw, usage, err := callOpenAIChatCompletion(h.openAIKey, h.openAIModel, "", prompt, perProviderTimeout)
		aicost.Record(h.db, aicost.Event{
			Feature: "ielts_study_plan", Model: h.openAIModel,
			PromptTokens: usage.Prompt, CompletionTokens: usage.Completion,
			Latency: time.Since(callStart), Err: err,
		})
		if err == nil {
			log.Printf("[study-plan-llm] success via OpenAI: model=%s time=%v len=%d", h.openAIModel, time.Since(start), len(raw))
			return raw, h.openAIModel, nil
		}
		log.Printf("[study-plan-llm] OpenAI %s failed: %v", h.openAIModel, err)
	}

	log.Printf("[study-plan-llm] all providers failed (total: %v)", time.Since(start))
	return "", "", fmt.Errorf("all AI providers failed")
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

	if h.claudeKey == "" && h.openAIKey == "" {
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

	// Persist the job up front and kick off generation in the background.
	// The HTTP handler returns immediately so the upstream proxy / Next.js
	// server-action does not time out on a slow LLM call. The frontend polls
	// GET /ielts/study-plan/jobs/:id for completion.
	questionnaireBytes, _ := json.Marshal(req)
	questionnaireStr := string(questionnaireBytes)
	job := models.IELTSStudyPlanJob{
		UserID:        userID,
		Status:        "pending",
		Questionnaire: &questionnaireStr,
	}
	if err := h.db.Create(&job).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to enqueue job", err)
		return
	}

	go h.runPlanGeneration(job.ID, userID, req)

	writeJSON(w, http.StatusAccepted, map[string]any{
		"jobId":  job.ID,
		"status": "pending",
	})
}

// GetPlanJob returns the current state of an asynchronous study-plan generation job.
func (h *IELTSStudyPlanHandler) GetPlanJob(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	jobID := strings.TrimSpace(r.PathValue("jobID"))
	if jobID == "" {
		writeError(w, http.StatusBadRequest, "jobID is required", nil)
		return
	}

	var job models.IELTSStudyPlanJob
	if err := h.db.Where("id = ? AND user_id = ?", jobID, userID).First(&job).Error; err != nil {
		writeError(w, http.StatusNotFound, "job not found", err)
		return
	}

	resp := map[string]any{
		"jobId":  job.ID,
		"status": job.Status,
	}
	if job.ErrorMessage != nil {
		resp["error"] = *job.ErrorMessage
	}
	if job.Status == "done" && job.PlanID != nil {
		var plan models.IELTSStudyPlan
		if err := h.db.Where("id = ?", *job.PlanID).First(&plan).Error; err == nil {
			resp["plan"] = serializeStudyPlan(plan)
		}
	}
	writeJSON(w, http.StatusOK, resp)
}

// runPlanGeneration executes the LLM call and persists the resulting plan.
// It MUST be called in a goroutine — it intentionally does not use the HTTP
// request context, so it survives the original HTTP connection closing.
func (h *IELTSStudyPlanHandler) runPlanGeneration(jobID, userID string, req generatePlanRequest) {
	defer func() {
		if rec := recover(); rec != nil {
			log.Printf("[study-plan-job] panic in job %s: %v", jobID, rec)
			h.failJob(jobID, fmt.Sprintf("internal panic: %v", rec))
		}
	}()

	now := time.Now()
	h.db.Model(&models.IELTSStudyPlanJob{}).
		Where("id = ?", jobID).
		Updates(map[string]any{"status": "running", "started_at": now})

	// Calculate total weeks dynamically from exam date
	totalWeeks := 4 // default
	if strings.TrimSpace(req.ExamDate) != "" {
		if examDate, err := time.Parse("2006-01-02", strings.TrimSpace(req.ExamDate)); err == nil {
			daysUntil := int(time.Until(examDate).Hours() / 24)
			if daysUntil > 0 {
				totalWeeks = daysUntil / 7
				if daysUntil%7 > 2 {
					totalWeeks++ // round up partial weeks
				}
			}
			if totalWeeks < 2 {
				totalWeeks = 2
			}
			if totalWeeks > 16 {
				totalWeeks = 16 // cap at 4 months
			}
		}
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
		"totalWeeks":   totalWeeks,
	}
	questionnaireJSON, _ := json.Marshal(questionnaire)

	// Ground the plan in the student's actual platform performance instead of
	// relying solely on self-reported `currentBand`. The LLM gets a structured
	// "Recent performance" block — averages, last few writing/speaking criterion
	// scores, last completed mock band scores. Tasks and tone should react to
	// the gap between the self-reported band and the measured one.
	historyBlock := h.buildHistoryBlock(userID)
	platformBlock := platformContentBlock()

	// Build LLM prompt — dynamic weeks, milestones, gamification, detailed daily plan
	prompt := fmt.Sprintf(`You are a premium IELTS preparation coach with 15+ years of experience. Create a comprehensive, personalized study roadmap.

Student profile (self-reported):
- Current Band: %s
- Target Band: %s
- Exam Type: %s
- Exam Date: %s
- Total Preparation Time: %d weeks
- Weekly Study Hours: %d
- Weak Sections: %s
- Strengths: %s
- Struggles: %s

Recent measured performance on this platform (ground every recommendation in these numbers — they override the self-reported band when they disagree):
%s
%s

IMPORTANT: Generate a plan for exactly %d weeks (the full preparation period). Each week MUST have tasks for Monday through Sunday. Distribute %d hours/week across tasks.

Return ONLY valid JSON (no markdown, no backticks):
{
  "totalWeeks": %d,
  "overview": "3-4 paragraph detailed strategy overview: diagnose the student's current level, explain why their weak areas matter, describe the overall approach phase by phase, and set realistic expectations for improvement. Be personal and specific, not generic.",
  "strategy": {
    "whatToFocusFirst": "What to prioritize in the first phase and why (2-3 sentences)",
    "urgentSkills": "Which skills need immediate attention — explain exactly what's holding the student back",
    "stableSkills": "Which skills are already decent and need maintenance only",
    "commonMistakes": "3-4 specific mistakes students at this band level make and how to avoid them",
    "dailyStructure": "Recommended daily study structure with morning/afternoon/evening breakdown and rest periods",
    "timingStrategy": "How to manage time during practice and actual exam — section-by-section timing advice",
    "weeklyCheckpoint": "What the student should evaluate every Sunday to stay on track"
  },
  "phases": [
    {
      "name": "Foundation",
      "weeks": "Week 1-2",
      "goal": "Build core skills and identify weak patterns",
      "actions": "Detailed list of what to do in this phase",
      "avoid": "What NOT to do yet and why",
      "expectedProgress": "What measurable improvement to expect by end of phase",
      "milestone": "Specific achievement that marks this phase as complete (e.g., 'Complete 3 timed reading passages under 20 min each')",
      "xpReward": 100
    }
  ],
  "weeklyGoals": [
    {
      "week": 1,
      "focus": "Main focus area for this week",
      "weeklyTarget": "One specific measurable target for the week (e.g., 'Score 6+ on 2 practice writing tasks')",
      "motivationalNote": "Short encouraging message for this week (1-2 sentences)",
      "tasks": [
        {
          "day": "Monday",
          "skill": "reading",
          "activity": "Timed reading passage practice",
          "durationMinutes": 45,
          "details": "Detailed step-by-step instructions for this specific task",
          "howTo": "Specific technique to use with examples",
          "whatToAvoid": "Common mistakes for this task",
          "whyItMatters": "Why this task directly helps reach the target band",
          "xpReward": 15,
          "difficulty": "easy"
        }
      ]
    }
  ],
  "milestones": [
    {
      "week": 2,
      "title": "Foundation Complete",
      "description": "You've built your study habits and identified your weak patterns",
      "badge": "foundation",
      "xpBonus": 50
    },
    {
      "week": 4,
      "title": "Halfway Hero",
      "description": "You're halfway through your preparation — great discipline!",
      "badge": "halfway",
      "xpBonus": 100
    }
  ],
  "prioritySkills": ["writing", "speaking"],
  "tips": ["Specific actionable tip 1", "Specific actionable tip 2", "Tip 3", "Tip 4", "Tip 5"],
  "moduleGuide": {
    "listening": "3-4 sentences on how to improve listening for this student, with specific exercise types",
    "reading": "3-4 sentences on reading improvement strategy with technique names",
    "writing": "3-4 sentences on writing improvement strategy with task-specific advice",
    "speaking": "3-4 sentences on speaking improvement strategy with practice methods"
  },
  "examCountdown": "Detailed day-by-day plan for the final 7-10 days before the exam, including what to review, what to avoid, sleep/nutrition advice, and exam-day morning routine",
  "dailyGoal": {
    "tasksPerDay": 2,
    "minutesPerDay": %d,
    "description": "Complete your daily study tasks to earn XP and maintain your streak"
  }
}

IMPORTANT RULES:
- Generate ALL %d weeks with full Monday-Sunday tasks
- Each task must have a difficulty: "easy", "medium", or "hard"
- Each task must have xpReward: easy=10, medium=15, hard=25
- Create 4-6 milestones spread across the preparation period (including start, mid-point, pre-exam, final)
- Each phase xpReward should be 50-200 based on phase importance
- Make tasks progressively harder as weeks advance
- Final 1-2 weeks should focus on full mock exams and review
- The motivationalNote for each week should be unique and encouraging
- Skills: reading, writing, listening, speaking, vocabulary, grammar
- Make everything personal and specific to THIS student's profile and the measured performance above, not generic
- When the student's recent writing or speaking criteria show a specific weakness (e.g. Grammar 4.5, Task Achievement 5.0), every relevant task must explicitly target that criterion — name it in task.howTo and task.whyItMatters
- Tasks must reference platform routes from the "Available platform features" list — do NOT recommend external books, YouTube channels, paid courses, or third-party apps`,
		req.CurrentBand,
		req.TargetBand,
		req.ExamType,
		req.ExamDate,
		totalWeeks,
		req.WeeklyHours,
		strings.Join(req.WeakSections, ", "),
		strings.Join(req.Strengths, ", "),
		strings.Join(req.Struggles, ", "),
		historyBlock,
		platformBlock,
		totalWeeks,
		req.WeeklyHours,
		totalWeeks,
		req.WeeklyHours*60/7,
		totalWeeks,
	)

	raw, modelName, err := h.callLLM(prompt)
	if err != nil {
		log.Printf("[study-plan-job] job %s: LLM failed: %v", jobID, err)
		h.failJob(jobID, "AI plan generation failed: "+err.Error())
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
		log.Printf("[study-plan-job] job %s: failed to save plan: %v", jobID, err)
		h.failJob(jobID, "Failed to save study plan")
		return
	}

	finished := time.Now()
	h.db.Model(&models.IELTSStudyPlanJob{}).
		Where("id = ?", jobID).
		Updates(map[string]any{
			"status":      "done",
			"plan_id":     plan.ID,
			"finished_at": finished,
		})
	log.Printf("[study-plan-job] job %s: completed (planID=%s)", jobID, plan.ID)
}

// failJob marks a job as failed with the given error message.
func (h *IELTSStudyPlanHandler) failJob(jobID, msg string) {
	finished := time.Now()
	h.db.Model(&models.IELTSStudyPlanJob{}).
		Where("id = ?", jobID).
		Updates(map[string]any{
			"status":        "failed",
			"error_message": msg,
			"finished_at":   finished,
		})
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
	PlanID     string `json:"planId"`
	Week       int    `json:"week"`
	Day        string `json:"day"`
	Skill      string `json:"skill"`
	Activity   string `json:"activity"`
	Status     string `json:"status"`
	Note       string `json:"note"`
	Difficulty string `json:"difficulty"`
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

	// Calculate XP reward based on task difficulty
	xpEarned := 0
	wasAlreadyCompleted := false

	// Upsert: find existing or create new
	var existing models.IELTSTaskCompletion
	result := h.db.Where("user_id = ? AND plan_id = ? AND week = ? AND day = ? AND skill = ?",
		userID, req.PlanID, req.Week, req.Day, req.Skill).First(&existing)

	if result.Error == nil {
		wasAlreadyCompleted = existing.Status == "completed"
		// Update existing
		updates := map[string]any{"status": req.Status}
		if strings.TrimSpace(req.Note) != "" {
			note := strings.TrimSpace(req.Note)
			updates["note"] = &note
		}
		h.db.Model(&existing).Updates(updates)

		// Award XP only if transitioning TO completed (not already completed)
		if req.Status == "completed" && !wasAlreadyCompleted {
			xpEarned = calcTaskXP(req.Difficulty)
		}
	} else {
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
		existing = completion

		if req.Status == "completed" {
			xpEarned = calcTaskXP(req.Difficulty)
		}
	}

	// Check for milestone bonuses and daily completion bonus
	var milestoneUnlocked *map[string]any
	if req.Status == "completed" {
		// Daily completion bonus: +5 XP if all tasks for today are done
		var todayTotal int64
		var todayDone int64
		h.db.Model(&models.IELTSTaskCompletion{}).
			Where("user_id = ? AND plan_id = ? AND week = ? AND day = ?", userID, req.PlanID, req.Week, req.Day).
			Count(&todayTotal)
		h.db.Model(&models.IELTSTaskCompletion{}).
			Where("user_id = ? AND plan_id = ? AND week = ? AND day = ? AND status = ?", userID, req.PlanID, req.Week, req.Day, "completed").
			Count(&todayDone)
		if todayTotal > 1 && todayDone == todayTotal {
			xpEarned += 5 // daily completion bonus
		}

		// Weekly completion bonus: +25 XP if all tasks for the week are done
		var weekTotal int64
		var weekDone int64
		h.db.Model(&models.IELTSTaskCompletion{}).
			Where("user_id = ? AND plan_id = ? AND week = ?", userID, req.PlanID, req.Week).
			Count(&weekTotal)
		h.db.Model(&models.IELTSTaskCompletion{}).
			Where("user_id = ? AND plan_id = ? AND week = ? AND status = ?", userID, req.PlanID, req.Week, "completed").
			Count(&weekDone)
		if weekTotal > 1 && weekDone == weekTotal {
			xpEarned += 25 // weekly completion bonus
		}

		// Check milestones from plan data
		var plan models.IELTSStudyPlan
		if err := h.db.Where("id = ? AND user_id = ?", req.PlanID, userID).First(&plan).Error; err == nil {
			milestoneUnlocked = checkMilestoneUnlock(plan, req.Week)
			if milestoneUnlocked != nil {
				if bonus, ok := (*milestoneUnlocked)["xpBonus"].(float64); ok {
					xpEarned += int(bonus)
				}
			}
		}

		// Update user's total IELTS XP
		if xpEarned > 0 {
			h.db.Exec("UPDATE users SET points = COALESCE(points, 0) + ? WHERE id = ?", xpEarned, userID)
		}
	}

	response := map[string]any{
		"task":    existing,
		"xp":     xpEarned,
	}
	if milestoneUnlocked != nil {
		response["milestone"] = *milestoneUnlocked
	}

	status := http.StatusOK
	if result.Error != nil {
		status = http.StatusCreated
	}
	writeJSON(w, status, response)
}

// calcTaskXP returns XP reward based on task difficulty.
func calcTaskXP(difficulty string) int {
	switch strings.ToLower(strings.TrimSpace(difficulty)) {
	case "hard":
		return 25
	case "medium":
		return 15
	case "easy":
		return 10
	default:
		return 15
	}
}

// checkMilestoneUnlock checks if completing a task in the given week unlocks a milestone.
func checkMilestoneUnlock(plan models.IELTSStudyPlan, week int) *map[string]any {
	planData := parseJSONBField(plan.PlanData)
	pd, ok := planData.(map[string]any)
	if !ok {
		return nil
	}
	milestones, ok := pd["milestones"].([]any)
	if !ok {
		return nil
	}
	for _, m := range milestones {
		ms, ok := m.(map[string]any)
		if !ok {
			continue
		}
		mWeek, ok := ms["week"].(float64)
		if !ok {
			continue
		}
		if int(mWeek) == week {
			return &ms
		}
	}
	return nil
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
	totalWeeksInPlan := 0
	if pd, ok := planData.(map[string]any); ok {
		if weeks, ok := pd["weeklyGoals"].([]any); ok {
			totalWeeksInPlan = len(weeks)
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

	// Calculate per-week completion for progress chart
	weeklyProgress := make([]map[string]any, 0)
	for w := 1; w <= totalWeeksInPlan; w++ {
		var wPlanned int64
		var wDone int64
		h.db.Model(&models.IELTSTaskCompletion{}).
			Where("user_id = ? AND plan_id = ? AND week = ?", userID, plan.ID, w).Count(&wPlanned)
		h.db.Model(&models.IELTSTaskCompletion{}).
			Where("user_id = ? AND plan_id = ? AND week = ? AND status = ?", userID, plan.ID, w, "completed").Count(&wDone)

		pct := 0
		if wPlanned > 0 {
			pct = int(float64(wDone) / float64(wPlanned) * 100)
		}
		weeklyProgress = append(weeklyProgress, map[string]any{
			"week":      w,
			"planned":   wPlanned,
			"completed": wDone,
			"percent":   pct,
		})
	}

	// Per-skill breakdown
	skills := []string{"reading", "writing", "listening", "speaking", "vocabulary", "grammar"}
	skillProgress := make(map[string]map[string]int64)
	for _, skill := range skills {
		var sTotal int64
		var sDone int64
		h.db.Model(&models.IELTSTaskCompletion{}).
			Where("user_id = ? AND plan_id = ? AND skill = ?", userID, plan.ID, skill).Count(&sTotal)
		h.db.Model(&models.IELTSTaskCompletion{}).
			Where("user_id = ? AND plan_id = ? AND skill = ? AND status = ?", userID, plan.ID, skill, "completed").Count(&sDone)
		if sTotal > 0 {
			skillProgress[skill] = map[string]int64{"total": sTotal, "completed": sDone}
		}
	}

	// Extract milestones with unlock status
	milestones := extractMilestones(planData, currentWeek, completionPct)

	// IELTS study streak (consecutive days with at least 1 completed task)
	ieltsStreak := calcIELTSStreak(h.db, userID)

	writeJSON(w, http.StatusOK, map[string]any{
		"progress": map[string]any{
			"planId":            plan.ID,
			"targetBand":        plan.TargetBand,
			"currentBand":       plan.CurrentBand,
			"examDate":          plan.ExamDate,
			"examType":          plan.ExamType,
			"daysLeft":          daysLeft,
			"currentWeek":       currentWeek,
			"totalWeeks":        totalWeeksInPlan,
			"totalPlannedTasks": totalPlannedTasks,
			"completedTasks":    completedTasks,
			"skippedTasks":      skippedTasks,
			"completionPercent": completionPct,
			"readiness":         readiness,
			"weakSections":      parseJSONBField(plan.WeakSections),
			"prioritySkills":    getPrioritySkills(planData),
			"weeklyProgress":    weeklyProgress,
			"skillProgress":     skillProgress,
			"milestones":        milestones,
			"ieltsStreak":       ieltsStreak,
		},
	})
}

// extractMilestones pulls milestones from plan data and marks which are unlocked.
func extractMilestones(planData any, currentWeek, completionPct int) []map[string]any {
	pd, ok := planData.(map[string]any)
	if !ok {
		return nil
	}
	raw, ok := pd["milestones"].([]any)
	if !ok {
		return nil
	}
	result := make([]map[string]any, 0, len(raw))
	for _, m := range raw {
		ms, ok := m.(map[string]any)
		if !ok {
			continue
		}
		mWeek := 0
		if w, ok := ms["week"].(float64); ok {
			mWeek = int(w)
		}
		unlocked := currentWeek > mWeek || (currentWeek == mWeek && completionPct >= 50)
		entry := map[string]any{
			"week":        mWeek,
			"title":       ms["title"],
			"description": ms["description"],
			"badge":       ms["badge"],
			"xpBonus":     ms["xpBonus"],
			"unlocked":    unlocked,
		}
		result = append(result, entry)
	}
	return result
}

// calcIELTSStreak counts consecutive days (ending today) with at least one completed IELTS task.
func calcIELTSStreak(db *gorm.DB, userID string) int {
	streak := 0
	for i := 0; i < 365; i++ {
		date := time.Now().AddDate(0, 0, -i).Format("2006-01-02")
		var count int64
		db.Model(&models.IELTSTaskCompletion{}).
			Where("user_id = ? AND status = ? AND DATE(updated_at) = ?", userID, "completed", date).
			Count(&count)
		if count == 0 {
			break
		}
		streak++
	}
	return streak
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
	if h.claudeKey != "" || h.openAIKey != "" {
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

// ── Placement diagnostic ───────────────────────────────────────────────────
//
// Four-skill diagnostic that runs before plan generation so the wizard's
// `currentBand` and `weakSections` are grounded in measured performance
// instead of pure self-report. Two endpoints:
//   GET  /api/v1/ielts/study-plan/placement       — fetch MCQ + W/S prompts
//   POST /api/v1/ielts/study-plan/placement/score — submit answers, get bands
//
// Writing + speaking are graded by a single LLM call (each). Audio is never
// stored — the frontend transcribes via the browser Web Speech API and
// submits the transcript only.

type placementQuestion struct {
	ID       string   `json:"id"`
	Section  string   `json:"section"`
	Title    string   `json:"title"`
	Prompt   string   `json:"prompt"`
	Content  string   `json:"content,omitempty"`
	Options  []string `json:"options"`
}

// Hardcoded micro-prompts for the writing + speaking placement steps. The
// pool is intentionally small — placement is a coarse signal, not a real
// exam task — and a random pick each request prevents users memorising the
// scoring on a retake.
var placementWritingPrompts = []string{
	"Describe a place you visited recently. Say where it is, why you went there, and one thing that stood out to you. Aim for 50-80 words.",
	"Write about a hobby or activity you enjoy. Explain what it involves and why you find it rewarding. Aim for 50-80 words.",
	"Some people prefer to study alone, others prefer to study in a group. Which do you prefer and why? Give one example. Aim for 50-80 words.",
	"Describe a person who has influenced you. Say who they are, how you know them, and what you learned from them. Aim for 50-80 words.",
	"Many cities are becoming more crowded. What is one problem this causes, and what is one possible solution? Aim for 50-80 words.",
}

var placementSpeakingPrompts = []string{
	"Talk about your daily morning routine for about 30 seconds. Mention what time you wake up, what you eat, and how you get to work or school.",
	"Describe your hometown for about 30 seconds. Say where it is, what it is famous for, and what you like or dislike about it.",
	"Talk about a book, film, or TV show you enjoyed for about 30 seconds. Say what it was about and why you liked it.",
	"Describe a typical weekend for you. What do you usually do, and who do you spend time with? Speak for about 30 seconds.",
	"Talk about a goal you want to achieve in the next year. Why is it important to you and how will you work towards it? Speak for about 30 seconds.",
}

func pickPlacementPrompt(pool []string) string {
	if len(pool) == 0 {
		return ""
	}
	//nolint:gosec // placement prompt selection does not need crypto randomness
	return pool[rand.Intn(len(pool))]
}

func (h *IELTSStudyPlanHandler) GetPlacement(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.UserIDFromContext(r.Context()); !ok {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	pick := func(section string, n int) []models.IELTSQuestion {
		var rows []models.IELTSQuestion
		// RANDOM() is fine here — the question pool is small (a few hundred
		// rows per section) and this endpoint is only hit once per user per
		// plan generation.
		h.db.Where("section = ? AND question_type = 'multiple_choice' AND options IS NOT NULL AND answer IS NOT NULL", section).
			Order("RANDOM()").Limit(n).Find(&rows)
		return rows
	}

	reading := pick("reading", 4)
	listening := pick("listening", 4)
	if len(reading)+len(listening) == 0 {
		writeError(w, http.StatusServiceUnavailable, "placement question pool empty", nil)
		return
	}

	out := make([]placementQuestion, 0, len(reading)+len(listening))
	for _, q := range append(reading, listening...) {
		options := []string{}
		if q.Options != nil {
			_ = json.Unmarshal([]byte(*q.Options), &options)
		}
		content := ""
		if q.Content != nil {
			content = *q.Content
		}
		out = append(out, placementQuestion{
			ID:      q.ID,
			Section: q.Section,
			Title:   q.Title,
			Prompt:  q.Prompt,
			Content: content,
			Options: options,
		})
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"questions":      out,
		"writingPrompt":  pickPlacementPrompt(placementWritingPrompts),
		"speakingPrompt": pickPlacementPrompt(placementSpeakingPrompts),
	})
}

type placementScoreRequest struct {
	// Legacy combined map: older frontend builds posted reading + listening
	// answers together under "answers". New clients should send the per-section
	// maps instead. We accept both to keep deploys decoupled.
	Answers            map[string]string `json:"answers"`
	ReadingAnswers     map[string]string `json:"readingAnswers"`
	ListeningAnswers   map[string]string `json:"listeningAnswers"`
	WritingText        string            `json:"writingText"`
	WritingPrompt      string            `json:"writingPrompt"`
	SpeakingTranscript string            `json:"speakingTranscript"`
	SpeakingPrompt     string            `json:"speakingPrompt"`
}

func (h *IELTSStudyPlanHandler) ScorePlacement(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.UserIDFromContext(r.Context()); !ok {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var req placementScoreRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	// Merge the legacy combined map into the per-section maps so downstream
	// logic can ignore the legacy field.
	combined := make(map[string]string, len(req.Answers)+len(req.ReadingAnswers)+len(req.ListeningAnswers))
	for id, v := range req.Answers {
		combined[id] = v
	}
	for id, v := range req.ReadingAnswers {
		combined[id] = v
	}
	for id, v := range req.ListeningAnswers {
		combined[id] = v
	}

	readingTotal, readingCorrect := 0, 0
	listeningTotal, listeningCorrect := 0, 0

	if len(combined) > 0 {
		ids := make([]string, 0, len(combined))
		for id := range combined {
			ids = append(ids, id)
		}

		var rows []models.IELTSQuestion
		if err := h.db.Where("id IN ?", ids).Find(&rows).Error; err != nil {
			writeError(w, http.StatusInternalServerError, "failed to load questions", err)
			return
		}

		for _, q := range rows {
			if q.Answer == nil {
				continue
			}
			given := strings.TrimSpace(strings.ToLower(combined[q.ID]))
			correct := strings.TrimSpace(strings.ToLower(*q.Answer))
			switch q.Section {
			case "reading":
				readingTotal++
				if given != "" && given == correct {
					readingCorrect++
				}
			case "listening":
				listeningTotal++
				if given != "" && given == correct {
					listeningCorrect++
				}
			}
		}
	}

	// Per-skill MCQ bands — nil if the user skipped that section entirely.
	var readingBand, listeningBand *float64
	if readingTotal > 0 {
		b := mcqBandValue(readingCorrect, readingTotal)
		readingBand = &b
	}
	if listeningTotal > 0 {
		b := mcqBandValue(listeningCorrect, listeningTotal)
		listeningBand = &b
	}

	// Writing — LLM scored. Return nil if the user skipped or the call fails.
	var writingBand *float64
	writingFeedback := ""
	if strings.TrimSpace(req.WritingText) != "" && strings.TrimSpace(req.WritingPrompt) != "" {
		if len(strings.Fields(strings.TrimSpace(req.WritingText))) >= 20 {
			band, fb, err := h.scorePlacementWriting(req.WritingPrompt, req.WritingText)
			if err != nil {
				log.Printf("[placement] writing scoring failed: %v", err)
				writingFeedback = "Writing auto-scoring is temporarily unavailable. Your response was received."
			} else {
				writingBand = &band
				writingFeedback = fb
			}
		} else {
			writingFeedback = "Response was too short to score reliably (aim for at least 20 words)."
		}
	}

	// Speaking — LLM scored from the in-browser transcript. Audio is never sent
	// to the server, so an empty transcript means transcription failed client-side.
	var speakingBand *float64
	speakingFeedback := ""
	if strings.TrimSpace(req.SpeakingPrompt) != "" {
		transcript := strings.TrimSpace(req.SpeakingTranscript)
		switch {
		case transcript == "":
			speakingFeedback = "No transcript captured. Try a Chromium-based browser, or record again in a quieter setting."
		case len(strings.Fields(transcript)) < 5:
			speakingFeedback = "Transcript was too short to score reliably."
		default:
			band, fb, err := h.scorePlacementSpeaking(req.SpeakingPrompt, transcript)
			if err != nil {
				log.Printf("[placement] speaking scoring failed: %v", err)
				speakingFeedback = "Speaking auto-scoring is temporarily unavailable. Your transcript was received."
			} else {
				speakingBand = &band
				speakingFeedback = fb
			}
		}
	}

	overallBand, weakSkills := computeOverallAndWeak(readingBand, listeningBand, writingBand, speakingBand)

	// Legacy combined-band string — kept for backwards compatibility with the
	// previous wizard implementation which only reads `estimatedBand`.
	legacyBand := estimatePlacementBand(readingCorrect+listeningCorrect, readingTotal+listeningTotal)
	if overallBand != nil {
		legacyBand = formatBand(*overallBand)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"readingCorrect":   readingCorrect,
		"readingTotal":     readingTotal,
		"listeningCorrect": listeningCorrect,
		"listeningTotal":   listeningTotal,
		"readingBand":      readingBand,
		"listeningBand":    listeningBand,
		"writingBand":      writingBand,
		"writingFeedback":  writingFeedback,
		"speakingBand":     speakingBand,
		"speakingFeedback": speakingFeedback,
		"overallBand":      overallBand,
		"weakSkills":       weakSkills,
		"estimatedBand":    legacyBand,
	})
}

// computeOverallAndWeak averages the available per-skill bands (nil ones are
// ignored) and flags any skill more than 0.5 below the mean as weak.
func computeOverallAndWeak(r, l, wr, s *float64) (*float64, []string) {
	type entry struct {
		name string
		band float64
	}
	entries := make([]entry, 0, 4)
	if r != nil {
		entries = append(entries, entry{"reading", *r})
	}
	if l != nil {
		entries = append(entries, entry{"listening", *l})
	}
	if wr != nil {
		entries = append(entries, entry{"writing", *wr})
	}
	if s != nil {
		entries = append(entries, entry{"speaking", *s})
	}
	if len(entries) == 0 {
		return nil, []string{}
	}
	sum := 0.0
	for _, e := range entries {
		sum += e.band
	}
	avg := sum / float64(len(entries))
	overall := math.Round(avg*2) / 2 // nearest 0.5
	threshold := avg - 0.5
	weak := []string{}
	for _, e := range entries {
		if e.band < threshold {
			weak = append(weak, e.name)
		}
	}
	return &overall, weak
}

// formatBand renders a band float as the canonical "6.5" / "7.0" string.
func formatBand(b float64) string {
	return strconv.FormatFloat(b, 'f', 1, 64)
}

// mcqBandValue maps MCQ accuracy on a section to a numeric IELTS band. Mirrors
// estimatePlacementBand but returns float64 so the per-skill response stays
// uniformly typed alongside the LLM-scored writing/speaking bands.
func mcqBandValue(correct, total int) float64 {
	if total == 0 {
		return 5.5
	}
	pct := float64(correct) / float64(total) * 100
	switch {
	case pct >= 95:
		return 7.5
	case pct >= 85:
		return 7.0
	case pct >= 75:
		return 6.5
	case pct >= 62:
		return 6.0
	case pct >= 50:
		return 5.5
	case pct >= 37:
		return 5.0
	case pct >= 25:
		return 4.5
	default:
		return 4.0
	}
}

// scorePlacementWriting asks the LLM for a single band + one-line note.
// Intentionally lightweight: this is a 50-80 word micro task, not a real
// IELTS essay, so the full criterion breakdown is unnecessary.
func (h *IELTSStudyPlanHandler) scorePlacementWriting(promptText, essay string) (float64, string, error) {
	if h.openAIKey == "" && h.claudeKey == "" {
		return 0, "", fmt.Errorf("no LLM provider configured")
	}
	prompt := fmt.Sprintf(`You are an IELTS Writing examiner. Score this short placement response on the official IELTS band scale (half-band increments from 4.0 to 9.0). Be realistic — most candidates score between 4.5 and 7.0. This is a 50-80 word micro task, so judge proportionally: grammar control, vocabulary range, and task focus matter more than length or full essay development.

Task prompt: %s

Candidate response:
%s

Return ONLY valid JSON in this exact shape:
{"band": 6.0, "brief_feedback": "one short sentence (max 25 words) explaining the band"}`, strings.TrimSpace(promptText), strings.TrimSpace(essay))

	raw, err := h.placementCallLLM(prompt)
	if err != nil {
		return 0, "", err
	}
	var parsed struct {
		Band     float64 `json:"band"`
		Feedback string  `json:"brief_feedback"`
	}
	if err := json.Unmarshal([]byte(raw), &parsed); err != nil {
		return 0, "", fmt.Errorf("parse writing score JSON: %w", err)
	}
	return clampBand(parsed.Band), strings.TrimSpace(parsed.Feedback), nil
}

// scorePlacementSpeaking scores a short transcribed speaking sample. Same
// shape and constraints as scorePlacementWriting — single band + brief note.
func (h *IELTSStudyPlanHandler) scorePlacementSpeaking(promptText, transcript string) (float64, string, error) {
	if h.openAIKey == "" && h.claudeKey == "" {
		return 0, "", fmt.Errorf("no LLM provider configured")
	}
	prompt := fmt.Sprintf(`You are an IELTS Speaking examiner. The candidate spoke for ~30 seconds in response to a placement prompt; their speech was transcribed by the browser (expect minor transcription noise). Score the response on the official IELTS band scale (half-band increments from 4.0 to 9.0). Judge fluency, vocabulary range, and grammar control from the transcript. Pronunciation cannot be assessed from text alone — ignore that criterion. Be realistic — most candidates score between 4.5 and 7.0.

Examiner prompt: %s

Candidate transcript:
%s

Return ONLY valid JSON in this exact shape:
{"band": 6.0, "brief_feedback": "one short sentence (max 25 words) explaining the band"}`, strings.TrimSpace(promptText), strings.TrimSpace(transcript))

	raw, err := h.placementCallLLM(prompt)
	if err != nil {
		return 0, "", err
	}
	var parsed struct {
		Band     float64 `json:"band"`
		Feedback string  `json:"brief_feedback"`
	}
	if err := json.Unmarshal([]byte(raw), &parsed); err != nil {
		return 0, "", fmt.Errorf("parse speaking score JSON: %w", err)
	}
	return clampBand(parsed.Band), strings.TrimSpace(parsed.Feedback), nil
}

// placementCallLLM is a thin, single-attempt wrapper around the providers the
// rest of this handler uses. Placement scoring is a short, cheap call — it
// doesn't need the multi-fallback chain that plan generation uses.
func (h *IELTSStudyPlanHandler) placementCallLLM(prompt string) (string, error) {
	timeout := 25 * time.Second
	if h.timeout > 0 && h.timeout < timeout {
		timeout = h.timeout
	}

	if strings.TrimSpace(h.openAIKey) != "" {
		start := time.Now()
		raw, usage, err := callOpenAIChatCompletion(h.openAIKey, h.openAIModel, "", prompt, timeout)
		aicost.Record(h.db, aicost.Event{
			Feature: "ielts_placement", Model: h.openAIModel,
			PromptTokens: usage.Prompt, CompletionTokens: usage.Completion,
			Latency: time.Since(start), Err: err,
		})
		if err == nil {
			return raw, nil
		}
		log.Printf("[placement-llm] openai failed: %v", err)
	}

	if strings.TrimSpace(h.claudeKey) != "" && strings.TrimSpace(h.claudeURL) != "" {
		start := time.Now()
		raw, usage, err := callClaudeChatCompletion(h.claudeKey, h.claudeModel, h.claudeURL, "", prompt, timeout)
		aicost.Record(h.db, aicost.Event{
			Feature: "ielts_placement", Model: h.claudeModel,
			PromptTokens: usage.Prompt, CompletionTokens: usage.Completion,
			Latency: time.Since(start), Err: err,
		})
		if err == nil {
			return raw, nil
		}
		log.Printf("[placement-llm] claude failed: %v", err)
	}

	return "", fmt.Errorf("all LLM providers failed")
}

// estimatePlacementBand returns a coarse band estimate from a raw 8-question
// MCQ score. The mapping is intentionally conservative — placement is only a
// starting point and the LLM is told it can override with measured perf.
func estimatePlacementBand(correct, total int) string {
	if total == 0 {
		return "5.5"
	}
	pct := float64(correct) / float64(total) * 100
	switch {
	case pct >= 95:
		return "7.5"
	case pct >= 85:
		return "7.0"
	case pct >= 75:
		return "6.5"
	case pct >= 62:
		return "6.0"
	case pct >= 50:
		return "5.5"
	case pct >= 37:
		return "5.0"
	case pct >= 25:
		return "4.5"
	default:
		return "4.0"
	}
}
