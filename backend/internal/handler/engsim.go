package handler

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/aicost"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"github.com/midoriya/flashlearn-backend/internal/service"
	"gorm.io/gorm"
)

type EngSimHandler struct {
	db             *gorm.DB
	gamSvc         *service.GamificationService
	claudeKey      string
	claudeModel    string
	claudeFallback string
	claudeURL      string
	openAIKey      string
	openAIModel    string
	timeout        time.Duration
}

func NewEngSim(
	db *gorm.DB,
	claudeKey, claudeModel, claudeFallback, claudeURL string,
	openAIKey, openAIModel string,
	timeout time.Duration,
) *EngSimHandler {
	simModel := openAIModel
	if simModel == "gpt-5" || simModel == "o3" || simModel == "o4-mini" {
		simModel = "gpt-4.1-mini"
	}
	return &EngSimHandler{
		db: db, gamSvc: service.NewGamification(db, nil),
		claudeKey: claudeKey, claudeModel: claudeModel,
		claudeFallback: claudeFallback, claudeURL: claudeURL,
		openAIKey: openAIKey, openAIModel: simModel, timeout: timeout,
	}
}

// ── Placement Test ─────────────────────────────────────────────────────

// GetPlacement returns the user's existing placement or null.
func (h *EngSimHandler) GetPlacement(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	var p models.EngSimPlacement
	err := h.db.Where("user_id = ?", userID).First(&p).Error
	if err != nil {
		jsonOK(w, map[string]any{"placement": nil})
		return
	}
	jsonOK(w, map[string]any{"placement": p})
}

// StartPlacement returns enriched placement test questions.
// Pass ?reset=true to allow retaking even if a result already exists.
func (h *EngSimHandler) StartPlacement(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	retake := r.URL.Query().Get("reset") == "true"

	if !retake {
		var existing models.EngSimPlacement
		if h.db.Where("user_id = ?", userID).First(&existing).Error == nil {
			jsonOK(w, map[string]any{"placement": existing, "alreadyDone": true})
			return
		}
	}

	jsonOK(w, map[string]any{"questions": getEnrichedPlacementQuestions()})
}

// SubmitPlacement saves adaptive placement results.
// The frontend sends the computed level directly; the backend falls back to
// score-based calculation only when level is omitted (old clients).
func (h *EngSimHandler) SubmitPlacement(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")

	var req struct {
		Level          string         `json:"level"`
		VocabLevel     string         `json:"vocabLevel"`
		GrammarLevel   string         `json:"grammarLevel"`
		CorrectAnswers int            `json:"correctAnswers"`
		TotalQuestions int            `json:"totalQuestions"`
		TotalAnswered  int            `json:"totalAnswered"`
		LevelScores    map[string]int `json:"levelScores"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonErr(w, "Invalid request", http.StatusBadRequest)
		return
	}

	assignedLevel := req.Level
	if assignedLevel == "" {
		levels := []string{"A1", "A2", "B1", "B2", "C1", "C2"}
		assignedLevel = "A1"
		for _, lvl := range levels {
			if score, ok := req.LevelScores[lvl]; ok && score >= 2 {
				assignedLevel = lvl
			}
		}
	}

	vocabLevel := req.VocabLevel
	if vocabLevel == "" {
		vocabLevel = assignedLevel
	}
	grammarLevel := req.GrammarLevel
	if grammarLevel == "" {
		grammarLevel = assignedLevel
	}

	totalQ := req.TotalQuestions
	if totalQ == 0 {
		totalQ = req.TotalAnswered
	}

	detailed := map[string]any{
		"vocabLevel":    vocabLevel,
		"grammarLevel":  grammarLevel,
		"levelScores":   req.LevelScores,
		"totalAnswered": req.TotalAnswered,
	}
	detailedJSON, _ := json.Marshal(detailed)

	placement := models.EngSimPlacement{
		UserID:          userID,
		Level:           assignedLevel,
		Score:           req.CorrectAnswers * 100 / max(totalQ, 1),
		TotalQuestions:  totalQ,
		CorrectAnswers:  req.CorrectAnswers,
		DetailedResults: string(detailedJSON),
		CompletedAt:     time.Now(),
	}

	if err := h.db.Create(&placement).Error; err != nil {
		h.db.Where("user_id = ?", userID).Updates(&placement)
	}

	h.ensureUserProgress(userID, assignedLevel)
	h.unlockInitialUnits(userID, assignedLevel)

	jsonOK(w, map[string]any{"placement": placement, "level": assignedLevel})
}

// ── Learning Map ───────────────────────────────────────────────────────

// GetMap returns the General English roadmap (course='GENERAL') with user progress.
func (h *EngSimHandler) GetMap(w http.ResponseWriter, r *http.Request) {
	h.getMapByCourse(w, r, "GENERAL")
}

// GetIELTSMap returns the IELTS roadmap (course='IELTS') with user progress.
func (h *EngSimHandler) GetIELTSMap(w http.ResponseWriter, r *http.Request) {
	h.getMapByCourse(w, r, "IELTS")
}

func (h *EngSimHandler) getMapByCourse(w http.ResponseWriter, r *http.Request, course string) {
	userID := r.Header.Get("X-User-ID")

	// Get units for this course ordered by sort_order
	var units []models.EngSimUnit
	h.db.Where("course = ?", course).Order("sort_order ASC").Find(&units)

	// Get all lessons
	var lessons []models.EngSimLesson
	h.db.Order("sort_order ASC").Find(&lessons)

	// Get user's unit progress
	var unitProgress []models.EngSimUnitProgress
	h.db.Where("user_id = ?", userID).Find(&unitProgress)

	// Get user's lesson progress
	var lessonProgress []models.EngSimLessonProgress
	h.db.Where("user_id = ?", userID).Find(&lessonProgress)

	// Build response
	upMap := map[string]models.EngSimUnitProgress{}
	for _, up := range unitProgress {
		upMap[up.UnitID] = up
	}

	lpMap := map[string]models.EngSimLessonProgress{}
	for _, lp := range lessonProgress {
		lpMap[lp.LessonID] = lp
	}

	type lessonResp struct {
		models.EngSimLesson
		BestStars    int  `json:"bestStars"`
		Attempts     int  `json:"attempts"`
		BestAccuracy int  `json:"bestAccuracy"`
		IsCompleted  bool `json:"isCompleted"`
	}

	type unitResp struct {
		models.EngSimUnit
		Lessons    []lessonResp `json:"lessons"`
		TotalStars int          `json:"totalStars"`
		MaxStars   int          `json:"maxStars"`
		IsUnlocked bool         `json:"isUnlocked"`
	}

	var result []unitResp
	for _, u := range units {
		ur := unitResp{EngSimUnit: u}
		if up, ok := upMap[u.ID]; ok {
			ur.TotalStars = up.TotalStars
			ur.MaxStars = up.MaxStars
			ur.IsUnlocked = up.IsUnlocked
		}

		for _, l := range lessons {
			if l.UnitID != u.ID {
				continue
			}
			lr := lessonResp{EngSimLesson: l}
			if lp, ok := lpMap[l.ID]; ok {
				lr.BestStars = lp.BestStars
				lr.Attempts = lp.Attempts
				lr.BestAccuracy = lp.BestAccuracy
				lr.IsCompleted = lp.BestStars > 0
			}
			ur.Lessons = append(ur.Lessons, lr)
			ur.MaxStars += 3
		}
		result = append(result, ur)
	}

	jsonOK(w, map[string]any{"units": result})
}

// GetProgress returns user's overall simulator progress.
func (h *EngSimHandler) GetProgress(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	progress := h.ensureUserProgress(userID, "A1")
	h.refreshHearts(progress)
	jsonOK(w, map[string]any{"progress": progress})
}

// ── Lesson Flow ────────────────────────────────────────────────────────

// StartLesson generates AI exercises and creates a session.
func (h *EngSimHandler) StartLesson(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	lessonID := r.PathValue("lessonID")

	var req struct {
		Locale string `json:"locale"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	locale := req.Locale
	if locale != "ru" {
		locale = "kk"
	}

	// Get lesson + unit
	var lesson models.EngSimLesson
	if err := h.db.First(&lesson, "id = ?", lessonID).Error; err != nil {
		jsonErr(w, "Lesson not found", http.StatusNotFound)
		return
	}

	var unit models.EngSimUnit
	h.db.First(&unit, "id = ?", lesson.UnitID)

	// Check hearts
	progress := h.ensureUserProgress(userID, unit.Level)
	h.refreshHearts(progress)
	if progress.Hearts <= 0 {
		jsonErr(w, "No hearts left! Wait for them to regenerate.", http.StatusForbidden)
		return
	}

	// Generate exercises (use locale-aware cache if available)
	exerciseCount := 8
	if lesson.LessonType == "boss" {
		exerciseCount = 12
	}

	var cachedPtr *string
	if locale == "ru" {
		cachedPtr = lesson.CachedExercisesRU
	} else {
		cachedPtr = lesson.CachedExercisesKK
	}

	var result string
	if cachedPtr != nil && len(*cachedPtr) > 10 {
		result = *cachedPtr
	} else {
		nativeLang := "Kazakh"
		if locale == "ru" {
			nativeLang = "Russian"
		}
		exerciseTypes := "fill_blank, grammar_choice, word_order, matching, error_correction, translation"
		prompt := fmt.Sprintf(exerciseGenerationPrompt,
			exerciseCount, unit.Level, unit.IELTSSkill,
			unit.Title, lesson.Title, exerciseTypes, unit.Level, nativeLang,
		)
		var err error
		result, err = h.callAI("", prompt)
		if err != nil {
			jsonErr(w, "Failed to generate exercises: "+err.Error(), http.StatusBadGateway)
			return
		}
		// Save to locale-specific cache
		if locale == "ru" {
			h.db.Model(&lesson).Update("cached_exercises_ru", result)
		} else {
			h.db.Model(&lesson).Update("cached_exercises_kk", result)
		}
	}

	// Create session
	session := models.EngSimLessonSession{
		UserID:         userID,
		LessonID:       lessonID,
		UnitID:         lesson.UnitID,
		Status:         "in_progress",
		Exercises:      result,
		Answers:        "[]",
		TotalExercises: exerciseCount,
	}

	if err := h.db.Create(&session).Error; err != nil {
		jsonErr(w, "Failed to create session", http.StatusInternalServerError)
		return
	}

	jsonOK(w, map[string]any{
		"session":   session,
		"exercises": json.RawMessage(result),
	})
}

// SubmitAnswer processes a single answer within a lesson session.
func (h *EngSimHandler) SubmitAnswer(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	lessonID := r.PathValue("lessonID")

	var req struct {
		SessionID    string `json:"sessionId"`
		ExerciseIdx  int    `json:"exerciseIndex"`
		IsCorrect    bool   `json:"isCorrect"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonErr(w, "Invalid request", http.StatusBadRequest)
		return
	}

	var session models.EngSimLessonSession
	if err := h.db.Where("id = ? AND user_id = ? AND lesson_id = ?", req.SessionID, userID, lessonID).First(&session).Error; err != nil {
		jsonErr(w, "Session not found", http.StatusNotFound)
		return
	}

	// Update answers
	var answers []map[string]any
	json.Unmarshal([]byte(session.Answers), &answers)
	answers = append(answers, map[string]any{
		"exerciseIndex": req.ExerciseIdx,
		"isCorrect":     req.IsCorrect,
		"answeredAt":    time.Now(),
	})
	answersJSON, _ := json.Marshal(answers)

	updates := map[string]any{"answers": string(answersJSON)}

	if req.IsCorrect {
		updates["correct_answers"] = gorm.Expr("correct_answers + 1")
	} else {
		updates["hearts_used"] = gorm.Expr("hearts_used + 1")
		// Deduct heart from user progress
		h.db.Model(&models.EngSimUserProgress{}).
			Where("user_id = ? AND hearts > 0", userID).
			Update("hearts", gorm.Expr("hearts - 1"))
	}

	h.db.Model(&session).Updates(updates)

	// Get updated hearts
	progress := h.ensureUserProgress(userID, "")
	h.refreshHearts(progress)

	jsonOK(w, map[string]any{
		"recorded":       true,
		"heartsRemaining": progress.Hearts,
	})
}

// CompleteLesson finalizes a lesson session and awards XP/stars.
func (h *EngSimHandler) CompleteLesson(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	lessonID := r.PathValue("lessonID")

	var req struct {
		SessionID     string `json:"sessionId"`
		TimeTakenSecs int    `json:"timeTakenSecs"`
		ComboMax      int    `json:"comboMax"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonErr(w, "Invalid request", http.StatusBadRequest)
		return
	}

	var session models.EngSimLessonSession
	if err := h.db.Where("id = ? AND user_id = ? AND lesson_id = ?", req.SessionID, userID, lessonID).First(&session).Error; err != nil {
		jsonErr(w, "Session not found", http.StatusNotFound)
		return
	}

	// Calculate results
	total := max(session.TotalExercises, 1)
	accuracy := session.CorrectAnswers * 100 / total

	var stars int
	switch {
	case accuracy >= 90 && session.HeartsUsed == 0:
		stars = 3
	case accuracy >= 70:
		stars = 2
	case accuracy > 0:
		stars = 1
	}

	// XP calculation
	baseXP := session.CorrectAnswers * 10
	comboBonus := req.ComboMax * 2
	perfectBonus := 0
	if accuracy == 100 {
		perfectBonus = 25
	}
	totalXP := baseXP + comboBonus + perfectBonus

	now := time.Now()
	session.Status = "completed"
	session.StarsEarned = stars
	session.XPEarned = totalXP
	session.ComboMax = req.ComboMax
	session.TimeTakenSecs = req.TimeTakenSecs
	session.CompletedAt = &now
	h.db.Save(&session)

	// Update lesson progress (best result)
	var lp models.EngSimLessonProgress
	if h.db.Where("user_id = ? AND lesson_id = ?", userID, lessonID).First(&lp).Error != nil {
		lp = models.EngSimLessonProgress{
			UserID:   userID,
			LessonID: lessonID,
		}
	}
	lp.Attempts++
	if stars > lp.BestStars {
		lp.BestStars = stars
	}
	if accuracy > lp.BestAccuracy {
		lp.BestAccuracy = accuracy
	}
	lp.LastPlayedAt = &now
	h.db.Save(&lp)

	// Update unit progress
	h.recalculateUnitProgress(userID, session.UnitID)

	// Update user progress
	progress := h.ensureUserProgress(userID, "")
	progress.TotalXP += totalXP
	progress.LessonsCompleted++

	// Streak
	today := time.Now().Format("2006-01-02")
	if progress.LastPracticeDate == nil || *progress.LastPracticeDate != today {
		if progress.LastPracticeDate != nil {
			last, _ := time.Parse("2006-01-02", *progress.LastPracticeDate)
			diff := int(math.Floor(time.Since(last).Hours() / 24))
			if diff == 1 {
				progress.CurrentStreak++
			} else if diff > 1 {
				progress.CurrentStreak = 1
			}
		} else {
			progress.CurrentStreak = 1
		}
		if progress.CurrentStreak > progress.LongestStreak {
			progress.LongestStreak = progress.CurrentStreak
		}
		progress.LastPracticeDate = &today
	}
	h.db.Save(progress)

	// Check if next unit should unlock
	h.tryUnlockNextUnit(userID, session.UnitID)

	// BUG-LEARN-005: Update daily quest progress and league XP
	h.gamSvc.UpdateQuestProgress(userID, "complete_3_lessons", 1)
	h.gamSvc.UpdateQuestProgress(userID, "complete_5_lessons", 1)
	if accuracy == 100 {
		h.gamSvc.UpdateQuestProgress(userID, "perfect_lesson_1", 1)
		// BUG-LEARN-011: Award gems for perfect lesson
		h.db.Model(&models.EngSimUserProgress{}).
			Where("user_id = ?", userID).
			Update("gems", gorm.Expr("gems + 5"))
	}
	h.gamSvc.UpdateQuestProgress(userID, "earn_xp_50", totalXP)
	h.gamSvc.UpdateQuestProgress(userID, "earn_xp_100", totalXP)
	h.gamSvc.AddWeeklyXP(userID, totalXP)
	// Record daily activity for streak (gamification system)
	_ = h.gamSvc.RecordDailyActivity(userID, totalXP, 1)

	jsonOK(w, map[string]any{
		"stars":      stars,
		"xpEarned":   totalXP,
		"accuracy":   accuracy,
		"comboMax":   req.ComboMax,
		"totalXP":    progress.TotalXP,
		"streak":     progress.CurrentStreak,
	})
}

// ── Speaking Practice ──────────────────────────────────────────────────

const engSimSpeakingPrompt = `You are an IELTS Speaking examiner and English conversation partner. The student is practicing IELTS Speaking.

Your role:
1. Evaluate the student's spoken English (transcribed text)
2. Give specific, actionable feedback on grammar, vocabulary, fluency, and pronunciation
3. Provide a corrected version of their response if needed
4. Ask a natural follow-up question to continue the conversation
5. Keep the conversation flowing like a real IELTS Speaking test

Respond in JSON format:
{
  "feedback": "Your feedback here — be specific about errors and strengths",
  "corrected": "Corrected version of their speech (or empty if no errors)",
  "score": 6.5,
  "strengths": ["good vocabulary range", "natural flow"],
  "improvements": ["watch article usage", "practice past tense"],
  "followUp": "Your next question to the student",
  "followUpContext": "brief context for the AI to remember"
}

Be encouraging but honest. Score on the IELTS 1-9 band scale.
If this is the start of conversation (empty transcript), introduce yourself and ask the first Part 1 question.`

// SpeakingPractice handles POST /api/v1/engsim/speaking — processes user's speech and returns AI feedback + response.
func (h *EngSimHandler) SpeakingPractice(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		jsonErr(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		Transcript string `json:"transcript"` // user's speech-to-text
		Topic      string `json:"topic"`       // current topic/part
		Context    string `json:"context"`     // previous conversation context
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonErr(w, "invalid request", http.StatusBadRequest)
		return
	}

	// Get user level
	progress := h.ensureUserProgress(userID, "B1")

	userMsg := req.Transcript
	if userMsg == "" {
		userMsg = "START_CONVERSATION"
	}

	prompt := fmt.Sprintf("Student level: %s\nTopic: %s\nPrevious context: %s\n\nStudent said: \"%s\"\n\nRespond with JSON.",
		progress.CurrentLevel, req.Topic, req.Context, userMsg)

	result, err := h.callAI(engSimSpeakingPrompt, prompt)
	if err != nil {
		jsonErr(w, "AI service error: "+err.Error(), http.StatusBadGateway)
		return
	}

	// Return raw AI response (frontend parses JSON)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(result))
}

// GetHearts returns current hearts and refill time.
func (h *EngSimHandler) GetHearts(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	progress := h.ensureUserProgress(userID, "")
	h.refreshHearts(progress)
	jsonOK(w, map[string]any{
		"hearts":       progress.Hearts,
		"refillAt":     progress.HeartsRefillAt,
		"maxHearts":    5,
	})
}

// ── Helpers ────────────────────────────────────────────────────────────

func (h *EngSimHandler) ensureUserProgress(userID, defaultLevel string) *models.EngSimUserProgress {
	var p models.EngSimUserProgress
	if h.db.Where("user_id = ?", userID).First(&p).Error != nil {
		if defaultLevel == "" {
			defaultLevel = "A1"
		}
		p = models.EngSimUserProgress{
			UserID:       userID,
			CurrentLevel: defaultLevel,
			Hearts:       5,
		}
		h.db.Create(&p)
	}
	return &p
}

func (h *EngSimHandler) refreshHearts(p *models.EngSimUserProgress) {
	if p.Hearts >= 5 {
		return
	}
	if p.HeartsRefillAt == nil {
		now := time.Now().Add(30 * time.Minute)
		p.HeartsRefillAt = &now
		h.db.Save(p)
		return
	}
	// Regenerate hearts (1 per 30 min)
	elapsed := time.Since(*p.HeartsRefillAt)
	if elapsed > 0 {
		recovered := int(elapsed.Minutes()/30) + 1
		p.Hearts = min(p.Hearts+recovered, 5)
		if p.Hearts >= 5 {
			p.HeartsRefillAt = nil
		} else {
			next := time.Now().Add(30 * time.Minute)
			p.HeartsRefillAt = &next
		}
		h.db.Save(p)
	}
}

func (h *EngSimHandler) unlockInitialUnits(userID, level string) {
	// Unlock all units at or below user's level
	levelOrder := map[string]int{"A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1": 5, "C2": 6}
	userLvl := levelOrder[level]

	var units []models.EngSimUnit
	h.db.Order("sort_order ASC").Find(&units)

	for _, u := range units {
		if levelOrder[u.Level] <= userLvl {
			// Count lessons for max_stars
			var lessonCount int64
			h.db.Model(&models.EngSimLesson{}).Where("unit_id = ?", u.ID).Count(&lessonCount)

			var existing models.EngSimUnitProgress
			if h.db.Where("user_id = ? AND unit_id = ?", userID, u.ID).First(&existing).Error != nil {
				h.db.Create(&models.EngSimUnitProgress{
					UserID:     userID,
					UnitID:     u.ID,
					IsUnlocked: true,
					MaxStars:   int(lessonCount) * 3,
				})
			} else if !existing.IsUnlocked {
				h.db.Model(&existing).Update("is_unlocked", true)
			}
		}
	}
}

func (h *EngSimHandler) recalculateUnitProgress(userID, unitID string) {
	var lessons []models.EngSimLesson
	h.db.Where("unit_id = ?", unitID).Find(&lessons)

	totalStars := 0
	for _, l := range lessons {
		var lp models.EngSimLessonProgress
		if h.db.Where("user_id = ? AND lesson_id = ?", userID, l.ID).First(&lp).Error == nil {
			totalStars += lp.BestStars
		}
	}

	h.db.Model(&models.EngSimUnitProgress{}).
		Where("user_id = ? AND unit_id = ?", userID, unitID).
		Updates(map[string]any{
			"total_stars": totalStars,
			"max_stars":   len(lessons) * 3,
		})
}

func (h *EngSimHandler) tryUnlockNextUnit(userID, currentUnitID string) {
	// Get current unit's sort order
	var current models.EngSimUnit
	if h.db.First(&current, "id = ?", currentUnitID).Error != nil {
		return
	}

	// Check if boss lesson is completed
	var bossLesson models.EngSimLesson
	if h.db.Where("unit_id = ? AND lesson_type = 'boss'", currentUnitID).First(&bossLesson).Error != nil {
		return
	}

	var lp models.EngSimLessonProgress
	if h.db.Where("user_id = ? AND lesson_id = ? AND best_stars > 0", userID, bossLesson.ID).First(&lp).Error != nil {
		return // Boss not completed yet
	}

	// Find next unit
	var nextUnit models.EngSimUnit
	if h.db.Where("sort_order > ?", current.SortOrder).Order("sort_order ASC").First(&nextUnit).Error != nil {
		return // No next unit
	}

	// Unlock it
	var lessonCount int64
	h.db.Model(&models.EngSimLesson{}).Where("unit_id = ?", nextUnit.ID).Count(&lessonCount)

	var existing models.EngSimUnitProgress
	if h.db.Where("user_id = ? AND unit_id = ?", userID, nextUnit.ID).First(&existing).Error != nil {
		h.db.Create(&models.EngSimUnitProgress{
			UserID:     userID,
			UnitID:     nextUnit.ID,
			IsUnlocked: true,
			MaxStars:   int(lessonCount) * 3,
		})
	} else if !existing.IsUnlocked {
		h.db.Model(&existing).Update("is_unlocked", true)
	}
}

func (h *EngSimHandler) callAI(systemPrompt, userPrompt string) (string, error) {
	messages := []map[string]string{}
	if systemPrompt != "" {
		messages = append(messages, map[string]string{"role": "system", "content": systemPrompt})
	}
	messages = append(messages, map[string]string{"role": "user", "content": userPrompt})

	// Try Claude
	if h.claudeKey != "" {
		start := time.Now()
		result, usage, err := callClaudeChatCompletion(h.claudeKey, h.claudeModel, h.claudeURL, systemPrompt, userPrompt, h.timeout)
		aicost.Record(h.db, aicost.Event{
			Feature: "engsim", Model: h.claudeModel,
			PromptTokens: usage.Prompt, CompletionTokens: usage.Completion,
			Latency: time.Since(start), Err: err,
		})
		if err == nil {
			return result, nil
		}
		// Try fallback model
		if h.claudeFallback != "" {
			startFB := time.Now()
			result, usage, err = callClaudeChatCompletion(h.claudeKey, h.claudeFallback, h.claudeURL, systemPrompt, userPrompt, h.timeout)
			aicost.Record(h.db, aicost.Event{
				Feature: "engsim", Model: h.claudeFallback,
				PromptTokens: usage.Prompt, CompletionTokens: usage.Completion,
				Latency: time.Since(startFB), Err: err,
			})
			if err == nil {
				return result, nil
			}
		}
	}

	// Try OpenAI
	if h.openAIKey != "" {
		start := time.Now()
		result, usage, err := callOpenAIChatCompletion(h.openAIKey, h.openAIModel, systemPrompt, userPrompt, h.timeout)
		aicost.Record(h.db, aicost.Event{
			Feature: "engsim", Model: h.openAIModel,
			PromptTokens: usage.Prompt, CompletionTokens: usage.Completion,
			Latency: time.Since(start), Err: err,
		})
		return result, err
	}

	return "", fmt.Errorf("no AI provider configured")
}

// ── JSON helpers ───────────────────────────────────────────────────────

func jsonOK(w http.ResponseWriter, data any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func jsonErr(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

// max/min are declared in ai.go — reuse those
