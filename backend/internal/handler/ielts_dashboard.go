package handler

import (
	"encoding/json"
	"math"
	"net/http"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// IELTSDashboardHandler serves the IELTS dashboard and weakness analysis.
type IELTSDashboardHandler struct {
	db *gorm.DB
}

func NewIELTSDashboard(db *gorm.DB) *IELTSDashboardHandler {
	return &IELTSDashboardHandler{db: db}
}

// ── Response types ─────────────────────────────────────────────────────────

type writingHistoryItem struct {
	ID          string    `json:"id"`
	TaskType    string    `json:"taskType"`
	OverallBand float64   `json:"overallBand"`
	CreatedAt   time.Time `json:"createdAt"`
}

type speakingHistoryItem struct {
	ID          string    `json:"id"`
	Part        string    `json:"part"`
	OverallBand float64   `json:"overallBand"`
	CreatedAt   time.Time `json:"createdAt"`
}

type dashboardResponse struct {
	RecentAttempts    []models.IELTSAttempt    `json:"recentAttempts"`
	TotalAttempts     int64                    `json:"totalAttempts"`
	CompletedAttempts int64                    `json:"completedAttempts"`
	AverageBands      map[string]float64       `json:"averageBands"`
	WritingCount      int64                    `json:"writingCount"`
	SpeakingCount     int64                    `json:"speakingCount"`
	WritingAvgBand    float64                  `json:"writingAvgBand"`
	SpeakingAvgBand   float64                  `json:"speakingAvgBand"`
	ActivePlan        *models.IELTSStudyPlan   `json:"activePlan"`
	RecentWriting     []writingHistoryItem     `json:"recentWriting"`
	RecentSpeaking    []speakingHistoryItem    `json:"recentSpeaking"`
}

type weaknessResponse struct {
	WritingWeakest      string             `json:"writingWeakest"`
	WritingWeakestBand  float64            `json:"writingWeakestBand"`
	WritingCriteria     map[string]float64 `json:"writingCriteria"`
	SpeakingWeakest     string             `json:"speakingWeakest"`
	SpeakingWeakestBand float64            `json:"speakingWeakestBand"`
	SpeakingCriteria    map[string]float64 `json:"speakingCriteria"`
	OverallWeakSkill    string             `json:"overallWeakSkill"`
	Recommendations     []string           `json:"recommendations"`
	AttemptCount        int                `json:"attemptCount"`
}

// ── GetDashboard ───────────────────────────────────────────────────────────

func (h *IELTSDashboardHandler) GetDashboard(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	// 1. Recent 5 attempts
	var attempts []models.IELTSAttempt
	if err := h.db.Where("user_id = ?", userID).Order("created_at DESC").Limit(5).Find(&attempts).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load attempts", err)
		return
	}

	// 2. Total and completed counts
	var totalAttempts, completedAttempts int64
	h.db.Model(&models.IELTSAttempt{}).Where("user_id = ?", userID).Count(&totalAttempts)
	h.db.Model(&models.IELTSAttempt{}).Where("user_id = ? AND status = 'completed'", userID).Count(&completedAttempts)

	// 3. Average writing band
	var writingAvgBand float64
	h.db.Model(&models.IELTSWritingSubmission{}).
		Where("user_id = ?", userID).
		Select("COALESCE(AVG(overall_band), 0)").
		Row().Scan(&writingAvgBand)

	// 4. Average speaking band
	var speakingAvgBand float64
	h.db.Model(&models.IELTSSpeakingSession{}).
		Where("user_id = ?", userID).
		Select("COALESCE(AVG(overall_band), 0)").
		Row().Scan(&speakingAvgBand)

	// 5. Writing and speaking counts
	var writingCount, speakingCount int64
	h.db.Model(&models.IELTSWritingSubmission{}).Where("user_id = ?", userID).Count(&writingCount)
	h.db.Model(&models.IELTSSpeakingSession{}).Where("user_id = ?", userID).Count(&speakingCount)

	// 6. Active study plan
	var activePlan models.IELTSStudyPlan
	var activePlanPtr *models.IELTSStudyPlan
	if err := h.db.Where("user_id = ? AND status = 'active'", userID).
		Order("created_at DESC").Limit(1).First(&activePlan).Error; err == nil {
		activePlanPtr = &activePlan
	}

	// 7. Last 3 writing submissions
	var writingSubs []models.IELTSWritingSubmission
	h.db.Where("user_id = ?", userID).Order("created_at DESC").Limit(3).Find(&writingSubs)

	recentWriting := make([]writingHistoryItem, 0, len(writingSubs))
	for _, ws := range writingSubs {
		recentWriting = append(recentWriting, writingHistoryItem{
			ID:          ws.ID,
			TaskType:    ws.TaskType,
			OverallBand: ws.OverallBand,
			CreatedAt:   ws.CreatedAt,
		})
	}

	// 8. Last 3 speaking sessions
	var speakingSessions []models.IELTSSpeakingSession
	h.db.Where("user_id = ?", userID).Order("created_at DESC").Limit(3).Find(&speakingSessions)

	recentSpeaking := make([]speakingHistoryItem, 0, len(speakingSessions))
	for _, ss := range speakingSessions {
		recentSpeaking = append(recentSpeaking, speakingHistoryItem{
			ID:          ss.ID,
			Part:        ss.Part,
			OverallBand: ss.OverallBand,
			CreatedAt:   ss.CreatedAt,
		})
	}

	// 9. Build averageBands map (rounded to 1 decimal)
	writingAvgBand = math.Round(writingAvgBand*10) / 10
	speakingAvgBand = math.Round(speakingAvgBand*10) / 10

	averageBands := map[string]float64{
		"writing":  writingAvgBand,
		"speaking": speakingAvgBand,
	}

	resp := dashboardResponse{
		RecentAttempts:    attempts,
		TotalAttempts:     totalAttempts,
		CompletedAttempts: completedAttempts,
		AverageBands:      averageBands,
		WritingCount:      writingCount,
		SpeakingCount:     speakingCount,
		WritingAvgBand:    writingAvgBand,
		SpeakingAvgBand:   speakingAvgBand,
		ActivePlan:        activePlanPtr,
		RecentWriting:     recentWriting,
		RecentSpeaking:    recentSpeaking,
	}

	writeJSON(w, http.StatusOK, resp)
}

// ── GetWeaknessAnalysis ────────────────────────────────────────────────────

func (h *IELTSDashboardHandler) GetWeaknessAnalysis(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	// 1. Load last 20 writing submissions
	var writingSubs []models.IELTSWritingSubmission
	h.db.Where("user_id = ?", userID).Order("created_at DESC").Limit(20).Find(&writingSubs)

	// 2. Load last 20 speaking sessions
	var speakingSessions []models.IELTSSpeakingSession
	h.db.Where("user_id = ?", userID).Order("created_at DESC").Limit(20).Find(&speakingSessions)

	// 3. Load last 10 completed attempts
	var completedAttempts []models.IELTSAttempt
	h.db.Where("user_id = ? AND status = 'completed'", userID).
		Order("created_at DESC").Limit(10).Find(&completedAttempts)

	// 4. Writing criteria averages
	writingCriteria := map[string]float64{
		"taskAchievement": 0,
		"coherence":       0,
		"lexicalResource": 0,
		"grammar":         0,
	}
	if len(writingSubs) > 0 {
		var sumTA, sumCoh, sumLex, sumGram float64
		for _, ws := range writingSubs {
			sumTA += ws.TaskAchievement
			sumCoh += ws.Coherence
			sumLex += ws.LexicalResource
			sumGram += ws.Grammar
		}
		n := float64(len(writingSubs))
		writingCriteria["taskAchievement"] = math.Round(sumTA/n*10) / 10
		writingCriteria["coherence"] = math.Round(sumCoh/n*10) / 10
		writingCriteria["lexicalResource"] = math.Round(sumLex/n*10) / 10
		writingCriteria["grammar"] = math.Round(sumGram/n*10) / 10
	}

	// Find weakest writing criterion
	writingWeakest := ""
	writingWeakestBand := 9.0
	for criterion, avg := range writingCriteria {
		if len(writingSubs) > 0 && avg < writingWeakestBand {
			writingWeakestBand = avg
			writingWeakest = criterion
		}
	}
	if len(writingSubs) == 0 {
		writingWeakestBand = 0
	}

	// 5. Speaking criteria averages
	speakingCriteria := map[string]float64{
		"fluencyCoherence": 0,
		"lexicalResource":  0,
		"grammar":          0,
		"pronunciation":    0,
	}
	if len(speakingSessions) > 0 {
		var sumFC, sumLex, sumGram, sumPron float64
		for _, ss := range speakingSessions {
			sumFC += ss.FluencyCoherence
			sumLex += ss.LexicalResource
			sumGram += ss.Grammar
			sumPron += ss.Pronunciation
		}
		n := float64(len(speakingSessions))
		speakingCriteria["fluencyCoherence"] = math.Round(sumFC/n*10) / 10
		speakingCriteria["lexicalResource"] = math.Round(sumLex/n*10) / 10
		speakingCriteria["grammar"] = math.Round(sumGram/n*10) / 10
		speakingCriteria["pronunciation"] = math.Round(sumPron/n*10) / 10
	}

	// Find weakest speaking criterion
	speakingWeakest := ""
	speakingWeakestBand := 9.0
	for criterion, avg := range speakingCriteria {
		if len(speakingSessions) > 0 && avg < speakingWeakestBand {
			speakingWeakestBand = avg
			speakingWeakest = criterion
		}
	}
	if len(speakingSessions) == 0 {
		speakingWeakestBand = 0
	}

	// 6. Parse attempt Results JSON for reading/listening section scores
	var readingTotal, listeningTotal float64
	var readingCount, listeningCount int
	for _, attempt := range completedAttempts {
		if attempt.Results == nil {
			continue
		}
		var results map[string]interface{}
		if err := json.Unmarshal([]byte(*attempt.Results), &results); err != nil {
			continue
		}
		if rb, ok := results["readingBand"]; ok {
			if band, ok := rb.(float64); ok {
				readingTotal += band
				readingCount++
			}
		}
		if lb, ok := results["listeningBand"]; ok {
			if band, ok := lb.(float64); ok {
				listeningTotal += band
				listeningCount++
			}
		}
	}

	// Determine overall weakest skill
	type skillScore struct {
		name string
		avg  float64
	}
	var skills []skillScore

	if len(writingSubs) > 0 {
		var writingOverallSum float64
		for _, ws := range writingSubs {
			writingOverallSum += ws.OverallBand
		}
		skills = append(skills, skillScore{
			name: "writing",
			avg:  math.Round(writingOverallSum/float64(len(writingSubs))*10) / 10,
		})
	}
	if len(speakingSessions) > 0 {
		var speakingOverallSum float64
		for _, ss := range speakingSessions {
			speakingOverallSum += ss.OverallBand
		}
		skills = append(skills, skillScore{
			name: "speaking",
			avg:  math.Round(speakingOverallSum/float64(len(speakingSessions))*10) / 10,
		})
	}
	if readingCount > 0 {
		skills = append(skills, skillScore{
			name: "reading",
			avg:  math.Round(readingTotal/float64(readingCount)*10) / 10,
		})
	}
	if listeningCount > 0 {
		skills = append(skills, skillScore{
			name: "listening",
			avg:  math.Round(listeningTotal/float64(listeningCount)*10) / 10,
		})
	}

	overallWeakSkill := ""
	if len(skills) > 0 {
		weakest := skills[0]
		for _, s := range skills[1:] {
			if s.avg < weakest.avg {
				weakest = s
			}
		}
		overallWeakSkill = weakest.name
	}

	// Build recommendations
	recommendations := buildRecommendations(
		writingCriteria, speakingCriteria,
		writingWeakest, speakingWeakest,
		overallWeakSkill,
	)

	resp := weaknessResponse{
		WritingWeakest:      writingWeakest,
		WritingWeakestBand:  writingWeakestBand,
		WritingCriteria:     writingCriteria,
		SpeakingWeakest:     speakingWeakest,
		SpeakingWeakestBand: speakingWeakestBand,
		SpeakingCriteria:    speakingCriteria,
		OverallWeakSkill:    overallWeakSkill,
		Recommendations:     recommendations,
		AttemptCount:        len(completedAttempts),
	}

	writeJSON(w, http.StatusOK, resp)
}

// buildRecommendations generates concrete study suggestions based on weak areas.
func buildRecommendations(
	writingCriteria, speakingCriteria map[string]float64,
	writingWeakest, speakingWeakest, overallWeakSkill string,
) []string {
	var recs []string

	// Writing-specific recommendations
	if writingCriteria["taskAchievement"] > 0 && writingCriteria["taskAchievement"] < 6.0 {
		recs = append(recs, "Carefully analyze task prompts before writing and ensure all parts of the question are addressed")
	}
	if writingCriteria["coherence"] > 0 && writingCriteria["coherence"] < 6.0 {
		recs = append(recs, "Focus on paragraph organization and linking words in Writing tasks")
	}
	if writingCriteria["lexicalResource"] > 0 && writingCriteria["lexicalResource"] < 6.0 {
		recs = append(recs, "Expand your vocabulary by learning topic-specific word lists and collocations for Writing")
	}
	if writingCriteria["grammar"] > 0 && writingCriteria["grammar"] < 6.0 {
		recs = append(recs, "Practice complex sentence structures and review common grammar errors in your writing")
	}

	// Speaking-specific recommendations
	if speakingCriteria["fluencyCoherence"] > 0 && speakingCriteria["fluencyCoherence"] < 6.0 {
		recs = append(recs, "Practice speaking without long pauses by using filler phrases and discourse markers")
	}
	if speakingCriteria["pronunciation"] > 0 && speakingCriteria["pronunciation"] < 6.0 {
		recs = append(recs, "Practice pronunciation with shadowing exercises")
	}
	if speakingCriteria["lexicalResource"] > 0 && speakingCriteria["lexicalResource"] < 6.0 {
		recs = append(recs, "Learn idiomatic expressions and topic vocabulary to improve your speaking lexical range")
	}
	if speakingCriteria["grammar"] > 0 && speakingCriteria["grammar"] < 6.0 {
		recs = append(recs, "Focus on using a mix of simple and complex grammatical structures when speaking")
	}

	// Overall skill recommendations
	switch overallWeakSkill {
	case "writing":
		recs = append(recs, "Prioritize daily writing practice with timed Task 2 essays")
	case "speaking":
		recs = append(recs, "Schedule daily speaking practice sessions, recording yourself and reviewing for improvement")
	case "reading":
		recs = append(recs, "Read academic articles daily and practice skimming and scanning techniques for Reading")
	case "listening":
		recs = append(recs, "Listen to English podcasts and academic lectures daily to strengthen Listening skills")
	}

	// Ensure we always return at least 3 recommendations
	if len(recs) == 0 {
		recs = append(recs,
			"Continue practicing all four IELTS skills regularly to maintain consistency",
			"Take full mock tests under timed conditions to build exam stamina",
			"Review your past submissions to track improvement over time",
		)
	} else if len(recs) < 3 {
		defaults := []string{
			"Take full mock tests under timed conditions to build exam stamina",
			"Review your past submissions to track improvement over time",
			"Set specific band score targets for each skill and track weekly progress",
		}
		for _, d := range defaults {
			if len(recs) >= 3 {
				break
			}
			recs = append(recs, d)
		}
	}

	// Cap at 5 recommendations
	if len(recs) > 5 {
		recs = recs[:5]
	}

	return recs
}
