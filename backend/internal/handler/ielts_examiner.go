package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

type IELTSExaminerHandler struct {
	db          *gorm.DB
	openAIKey   string
	openAIModel string
	geminiKey   string
	geminiModel string
	timeout     time.Duration
}

func NewIELTSExaminer(db *gorm.DB, openAIKey, openAIModel, geminiKey, geminiModel string, timeout time.Duration) *IELTSExaminerHandler {
	if timeout < 30*time.Second {
		timeout = 60 * time.Second
	}
	return &IELTSExaminerHandler{
		db: db, openAIKey: openAIKey, openAIModel: openAIModel,
		geminiKey: geminiKey, geminiModel: geminiModel, timeout: timeout,
	}
}

// ── Writing evaluation ──────────────────────────────────────────────────────

type writingEvalRequest struct {
	TaskType      string `json:"taskType"`
	Prompt        string `json:"prompt"`
	Essay         string `json:"essay"`
	TimeTakenSecs *int   `json:"timeTakenSecs"`
}

type writingScores struct {
	OverallBand     float64         `json:"overallBand"`
	TaskAchievement float64         `json:"taskAchievement"`
	Coherence       float64         `json:"coherence"`
	LexicalResource float64         `json:"lexicalResource"`
	Grammar         float64         `json:"grammar"`
	Feedback        writingFeedback `json:"feedback"`
}

type feedbackIssue struct {
	Original    string `json:"original"`
	Issue       string `json:"issue"`
	Suggestion  string `json:"suggestion"`
	Explanation string `json:"explanation"`
}

type writingFeedback struct {
	Strengths            []string        `json:"strengths"`
	Weaknesses           []string        `json:"weaknesses"`
	Suggestions          []string        `json:"suggestions"`
	ImprovementPlan      []string        `json:"improvementPlan"`
	BandExplanation      string          `json:"bandExplanation"`
	DetailedFeedback     string          `json:"detailedFeedback"`
	ModelAnswer          string          `json:"modelAnswer"`
	RewrittenResponse    string          `json:"rewrittenResponse"`
	GrammarHighlights    []feedbackIssue `json:"grammarHighlights"`
	VocabularyHighlights []feedbackIssue `json:"vocabularyHighlights"`
}

func (h *IELTSExaminerHandler) EvaluateWriting(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	if h.openAIKey == "" && h.geminiKey == "" {
		writeError(w, http.StatusServiceUnavailable, "AI examiner is not configured", nil)
		return
	}

	var req writingEvalRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	if req.TaskType != "task1" && req.TaskType != "task2" {
		writeError(w, http.StatusBadRequest, "taskType must be task1 or task2", nil)
		return
	}
	if strings.TrimSpace(req.Prompt) == "" {
		writeError(w, http.StatusBadRequest, "prompt is required", nil)
		return
	}

	essay := strings.TrimSpace(req.Essay)
	wordCount := len(strings.Fields(essay))
	if wordCount < 20 {
		writeError(w, http.StatusBadRequest, "essay is too short (minimum 20 words)", nil)
		return
	}

	taskLabel := "Task 1 (report/letter)"
	if req.TaskType == "task2" {
		taskLabel = "Task 2 (essay)"
	}

	prompt := fmt.Sprintf(`You are a certified IELTS examiner with 15 years of experience. Evaluate the following IELTS Academic Writing %s response.

Task prompt: %s

Student's response (%d words):
%s

Score each criterion on the official IELTS band scale (0-9, half-band increments only: 0, 0.5, 1.0, 1.5, ... 8.5, 9.0):
1. Task Achievement (how well the student addressed the task requirements)
2. Coherence and Cohesion (logical organization, paragraphing, linking)
3. Lexical Resource (vocabulary range, accuracy, appropriacy)
4. Grammatical Range and Accuracy (sentence structures, error frequency)

Calculate the overall band as the average of the four criteria, rounded to the nearest 0.5.

Return ONLY valid JSON with no additional text:
{
  "overallBand": 6.5,
  "taskAchievement": 6.5,
  "coherence": 7.0,
  "lexicalResource": 6.0,
  "grammar": 6.5,
  "feedback": {
    "strengths": ["strength 1", "strength 2", "strength 3"],
    "weaknesses": ["weakness 1", "weakness 2"],
    "suggestions": ["specific actionable suggestion 1", "suggestion 2", "suggestion 3"],
    "improvementPlan": ["step 1", "step 2", "step 3"],
    "bandExplanation": "Explain exactly why this band was awarded in examiner language.",
    "detailedFeedback": "A paragraph of detailed examiner feedback explaining the scores.",
    "modelAnswer": "Write a band 7-9 sample answer.",
    "rewrittenResponse": "Rewrite the student's response into a stronger version while keeping the main ideas.",
    "grammarHighlights": [
      {"original": "student phrase", "issue": "grammar issue", "suggestion": "better version", "explanation": "why"}
    ],
    "vocabularyHighlights": [
      {"original": "student word", "issue": "lexical weakness", "suggestion": "better word", "explanation": "why"}
    ]
  }
}`, taskLabel, req.Prompt, wordCount, essay)

	raw, modelName, err := h.callLLM(prompt)
	if err != nil {
		writeError(w, http.StatusBadGateway, "AI evaluation failed: "+err.Error(), err)
		return
	}

	var scores writingScores
	if err := json.Unmarshal([]byte(raw), &scores); err != nil {
		writeError(w, http.StatusBadGateway, "Failed to parse AI response", err)
		return
	}

	// Clamp all scores to valid IELTS band range
	scores.OverallBand = clampBand(scores.OverallBand)
	scores.TaskAchievement = clampBand(scores.TaskAchievement)
	scores.Coherence = clampBand(scores.Coherence)
	scores.LexicalResource = clampBand(scores.LexicalResource)
	scores.Grammar = clampBand(scores.Grammar)

	feedbackJSON, _ := json.Marshal(scores.Feedback)

	submission := models.IELTSWritingSubmission{
		UserID:          userID,
		TaskType:        req.TaskType,
		Prompt:          strings.TrimSpace(req.Prompt),
		Essay:           essay,
		WordCount:       wordCount,
		TimeTakenSecs:   req.TimeTakenSecs,
		OverallBand:     scores.OverallBand,
		TaskAchievement: scores.TaskAchievement,
		Coherence:       scores.Coherence,
		LexicalResource: scores.LexicalResource,
		Grammar:         scores.Grammar,
		Feedback:        string(feedbackJSON),
		AIModel:         modelName,
	}

	if err := h.db.Create(&submission).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to save submission", err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"id":              submission.ID,
		"overallBand":     scores.OverallBand,
		"taskAchievement": scores.TaskAchievement,
		"coherence":       scores.Coherence,
		"lexicalResource": scores.LexicalResource,
		"grammar":         scores.Grammar,
		"feedback":        scores.Feedback,
		"wordCount":       wordCount,
		"aiModel":         modelName,
	})
}

func (h *IELTSExaminerHandler) GetWritingHistory(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var submissions []models.IELTSWritingSubmission
	if err := h.db.Where("user_id = ?", userID).Order("created_at DESC").Limit(50).Find(&submissions).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to load history", err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"items": submissions})
}

// ── Speaking evaluation ─────────────────────────────────────────────────────

type speakingEvalRequest struct {
	Part       string `json:"part"`
	Prompt     string `json:"prompt"`
	Transcript string `json:"transcript"`
}

type speakingScores struct {
	OverallBand      float64          `json:"overallBand"`
	FluencyCoherence float64          `json:"fluencyCoherence"`
	LexicalResource  float64          `json:"lexicalResource"`
	Grammar          float64          `json:"grammar"`
	Pronunciation    float64          `json:"pronunciation"`
	Feedback         speakingFeedback `json:"feedback"`
}

type speakingFeedback struct {
	Strengths            []string        `json:"strengths"`
	Weaknesses           []string        `json:"weaknesses"`
	Suggestions          []string        `json:"suggestions"`
	ImprovementPlan      []string        `json:"improvementPlan"`
	BandExplanation      string          `json:"bandExplanation"`
	DetailedFeedback     string          `json:"detailedFeedback"`
	ModelAnswer          string          `json:"modelAnswer"`
	RewrittenResponse    string          `json:"rewrittenResponse"`
	GrammarHighlights    []feedbackIssue `json:"grammarHighlights"`
	VocabularyHighlights []feedbackIssue `json:"vocabularyHighlights"`
	FollowUpQuestion     string          `json:"followUpQuestion"`
	FollowUpQuestions    []string        `json:"followUpQuestions"`
}

func (h *IELTSExaminerHandler) EvaluateSpeaking(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	if h.openAIKey == "" && h.geminiKey == "" {
		writeError(w, http.StatusServiceUnavailable, "AI examiner is not configured", nil)
		return
	}

	var req speakingEvalRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	if req.Part != "part1" && req.Part != "part2" && req.Part != "part3" {
		writeError(w, http.StatusBadRequest, "part must be part1, part2, or part3", nil)
		return
	}
	if strings.TrimSpace(req.Prompt) == "" || strings.TrimSpace(req.Transcript) == "" {
		writeError(w, http.StatusBadRequest, "prompt and transcript are required", nil)
		return
	}

	partLabel := map[string]string{
		"part1": "Part 1 (Introduction and Interview)",
		"part2": "Part 2 (Individual Long Turn / Cue Card)",
		"part3": "Part 3 (Two-way Discussion)",
	}[req.Part]

	prompt := fmt.Sprintf(`You are a certified IELTS Speaking examiner. Evaluate the following IELTS Speaking %s response.

Examiner's question/prompt: %s

Candidate's response (transcribed):
%s

Score each criterion on the IELTS band scale (0-9, half-band increments):
1. Fluency and Coherence
2. Lexical Resource
3. Grammatical Range and Accuracy
4. Pronunciation (estimate from written text based on word choice complexity and natural phrasing)

Calculate the overall band as the average, rounded to nearest 0.5.

Also generate one natural follow-up question an examiner would ask next.
The follow-up must react to the candidate's actual ideas, not be generic.

Return ONLY valid JSON:
{
  "overallBand": 6.5,
  "fluencyCoherence": 6.5,
  "lexicalResource": 7.0,
  "grammar": 6.0,
  "pronunciation": 6.5,
  "feedback": {
    "strengths": ["strength 1", "strength 2"],
    "weaknesses": ["weakness 1", "weakness 2"],
    "suggestions": ["suggestion 1", "suggestion 2"],
    "improvementPlan": ["step 1", "step 2", "step 3"],
    "bandExplanation": "Explain why this speaking band was awarded.",
    "detailedFeedback": "Detailed examiner feedback paragraph.",
    "modelAnswer": "Write a strong band 7-9 style spoken answer.",
    "rewrittenResponse": "Rewrite the candidate's answer to sound more natural and higher-band.",
    "grammarHighlights": [
      {"original": "student phrase", "issue": "grammar issue", "suggestion": "better version", "explanation": "why"}
    ],
    "vocabularyHighlights": [
      {"original": "student word", "issue": "lexical weakness", "suggestion": "better expression", "explanation": "why"}
    ],
    "followUpQuestion": "A natural follow-up question for the candidate.",
    "followUpQuestions": ["follow-up 1", "follow-up 2", "follow-up 3"]
  }
}`, partLabel, req.Prompt, strings.TrimSpace(req.Transcript))

	raw, modelName, err := h.callLLM(prompt)
	if err != nil {
		writeError(w, http.StatusBadGateway, "AI evaluation failed: "+err.Error(), err)
		return
	}

	var scores speakingScores
	if err := json.Unmarshal([]byte(raw), &scores); err != nil {
		writeError(w, http.StatusBadGateway, "Failed to parse AI response", err)
		return
	}

	scores.OverallBand = clampBand(scores.OverallBand)
	scores.FluencyCoherence = clampBand(scores.FluencyCoherence)
	scores.LexicalResource = clampBand(scores.LexicalResource)
	scores.Grammar = clampBand(scores.Grammar)
	scores.Pronunciation = clampBand(scores.Pronunciation)

	feedbackJSON, _ := json.Marshal(scores.Feedback)

	session := models.IELTSSpeakingSession{
		UserID:           userID,
		Part:             req.Part,
		Prompt:           strings.TrimSpace(req.Prompt),
		Transcript:       strings.TrimSpace(req.Transcript),
		OverallBand:      scores.OverallBand,
		FluencyCoherence: scores.FluencyCoherence,
		LexicalResource:  scores.LexicalResource,
		Grammar:          scores.Grammar,
		Pronunciation:    scores.Pronunciation,
		Feedback:         string(feedbackJSON),
		AIModel:          modelName,
	}

	if err := h.db.Create(&session).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to save session", err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"id":               session.ID,
		"overallBand":      scores.OverallBand,
		"fluencyCoherence": scores.FluencyCoherence,
		"lexicalResource":  scores.LexicalResource,
		"grammar":          scores.Grammar,
		"pronunciation":    scores.Pronunciation,
		"feedback":         scores.Feedback,
		"aiModel":          modelName,
	})
}

func (h *IELTSExaminerHandler) GetSpeakingHistory(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var sessions []models.IELTSSpeakingSession
	if err := h.db.Where("user_id = ?", userID).Order("created_at DESC").Limit(50).Find(&sessions).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to load history", err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"items": sessions})
}

// ── LLM call ────────────────────────────────────────────────────────────────

func (h *IELTSExaminerHandler) callLLM(prompt string) (string, string, error) {
	// Try OpenAI first, fallback to Gemini
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

func callGeminiRaw(apiKey, model, prompt string, timeout time.Duration) (string, error) {
	body := map[string]any{
		"contents": []map[string]any{
			{"parts": []map[string]string{{"text": prompt}}},
		},
		"generationConfig": map[string]any{
			"temperature":      0.3,
			"topP":             0.9,
			"maxOutputTokens":  4096,
			"responseMimeType": "application/json",
		},
	}

	bodyBytes, _ := json.Marshal(body)
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, apiKey)

	client := &http.Client{Timeout: timeout}
	resp, err := client.Post(url, "application/json", bytes.NewReader(bodyBytes))
	if err != nil {
		return "", fmt.Errorf("gemini request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		errBody, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("gemini returned %d: %s", resp.StatusCode, string(errBody[:min(len(errBody), 300)]))
	}

	var geminiResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		return "", fmt.Errorf("decode response: %w", err)
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("empty AI response")
	}

	raw := strings.TrimSpace(geminiResp.Candidates[0].Content.Parts[0].Text)
	raw = strings.TrimPrefix(raw, "```json")
	raw = strings.TrimPrefix(raw, "```")
	raw = strings.TrimSuffix(raw, "```")
	return strings.TrimSpace(raw), nil
}

func callOpenAIRaw(apiKey, model, prompt string, timeout time.Duration) (string, error) {
	body := map[string]any{
		"model":        model,
		"instructions": "Return only valid JSON. No markdown, no commentary.",
		"input":        prompt,
		"text": map[string]any{
			"format": map[string]any{"type": "text"},
		},
	}

	bodyBytes, _ := json.Marshal(body)
	req, err := http.NewRequest(http.MethodPost, "https://api.openai.com/v1/responses", bytes.NewReader(bodyBytes))
	if err != nil {
		return "", fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("openai request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		errBody, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("openai returned %d: %s", resp.StatusCode, string(errBody[:min(len(errBody), 300)]))
	}

	var openAIResp struct {
		Output []struct {
			Content []struct {
				Type string `json:"type"`
				Text string `json:"text"`
			} `json:"content"`
		} `json:"output"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&openAIResp); err != nil {
		return "", fmt.Errorf("decode response: %w", err)
	}

	for _, item := range openAIResp.Output {
		for _, part := range item.Content {
			if part.Type == "output_text" && strings.TrimSpace(part.Text) != "" {
				raw := strings.TrimSpace(part.Text)
				raw = strings.TrimPrefix(raw, "```json")
				raw = strings.TrimPrefix(raw, "```")
				raw = strings.TrimSuffix(raw, "```")
				return strings.TrimSpace(raw), nil
			}
		}
	}

	return "", fmt.Errorf("openai returned empty output")
}

// clampBand rounds to the nearest 0.5 and clamps to [0, 9].
func clampBand(score float64) float64 {
	score = math.Round(score*2) / 2
	if score < 0 {
		return 0
	}
	if score > 9 {
		return 9
	}
	return score
}
