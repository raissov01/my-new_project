package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/aicost"
	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"github.com/midoriya/flashlearn-backend/internal/plan"
	"gorm.io/gorm"
)

type IELTSExaminerHandler struct {
	db                *gorm.DB
	openAIKey         string
	openAIModel       string
	claudeKey         string
	claudeModel       string
	claudeFallback    string
	claudeURL         string
	timeout           time.Duration
}

func NewIELTSExaminer(db *gorm.DB, openAIKey, openAIModel, claudeKey, claudeModel, claudeFallback, claudeURL string, timeout time.Duration) *IELTSExaminerHandler {
	if timeout < 30*time.Second {
		timeout = 60 * time.Second
	}
	// GPT-5 is too slow for interactive evaluation (timeout issues).
	examModel := openAIModel
	if examModel == "gpt-5" || examModel == "o3" || examModel == "o4-mini" {
		examModel = "gpt-4.1-mini"
	}
	return &IELTSExaminerHandler{
		db: db, openAIKey: openAIKey, openAIModel: examModel,
		claudeKey: claudeKey, claudeModel: claudeModel, claudeFallback: claudeFallback, claudeURL: claudeURL,
		timeout: timeout,
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

	if err := plan.CheckAndConsume(h.db, userID, plan.FeatureIELTSWriting); err != nil {
		plan.WritePaywall(w, plan.FeatureIELTSWriting)
		return
	}

	if h.claudeKey == "" && h.openAIKey == "" {
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

	// Enforce realistic minimum word counts
	minWords := 50
	if req.TaskType == "task1" {
		minWords = 120
	} else if req.TaskType == "task2" {
		minWords = 200
	}
	if wordCount < minWords {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("essay is too short (minimum %d words for %s, you wrote %d)", minWords, req.TaskType, wordCount), nil)
		return
	}

	maxWords := 3000
	if wordCount > maxWords {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("essay is too long (maximum %d words, you wrote %d)", maxWords, wordCount), nil)
		return
	}

	taskContext := ""
	if req.TaskType == "task1" {
		taskContext = `This is IELTS Writing Task 1. The student should:
- Summarize information from a visual (graph, chart, table, diagram, map, or process)
- Write at least 150 words
- Include an overview of main trends/features
- Select and report key data points
- Compare where relevant
- NOT give personal opinions

Score "Task Achievement" specifically on: overview presence, key features selection, data accuracy, minimum word count.`
	} else {
		taskContext = `This is IELTS Writing Task 2. The student should:
- Write a discursive essay responding to a point of view, argument, or problem
- Write at least 250 words
- Present a clear position throughout
- Develop ideas with explanations, examples, and evidence
- Organize ideas logically in paragraphs
- Use a range of vocabulary and grammar

Score "Task Response" specifically on: position clarity, idea development, relevance, completeness.`
	}

	prompt := fmt.Sprintf(`You are a senior IELTS examiner with 20+ years of experience. Evaluate this IELTS Academic Writing response with detailed, mentor-level feedback.

%s

Task prompt: %s

Student's response (%d words):
%s

SCORING INSTRUCTIONS:
Use the official IELTS band scale (half-band increments: 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0).
Be strict and realistic — most IELTS candidates score between 5.5 and 7.0.

For each criterion, consider:
- Band 5.0-5.5: Limited, basic, frequent errors, partially addresses task
- Band 6.0-6.5: Competent, adequate, some errors, generally addresses task
- Band 7.0-7.5: Good, effective, occasional errors, well-developed ideas
- Band 8.0+: Expert, rare errors, sophisticated language, fully developed

FEEDBACK INSTRUCTIONS:
- Be specific — quote exact phrases from the essay
- Be constructive — explain HOW to improve, not just what is wrong
- Be detailed — write paragraph-length explanations, not bullet fragments
- Provide a model answer of appropriate length (%d+ words)
- Identify 3-5 grammar issues and 3-5 vocabulary weaknesses from the actual essay

Return ONLY valid JSON:
{
  "overallBand": 6.5,
  "taskAchievement": 6.5,
  "coherence": 7.0,
  "lexicalResource": 6.0,
  "grammar": 6.5,
  "feedback": {
    "strengths": ["Specific strength citing exact phrases from the essay", "Another strength with examples"],
    "weaknesses": ["Specific weakness quoting the essay", "Another weakness with examples"],
    "suggestions": ["Detailed actionable suggestion explaining exactly what to change and how", "Another specific suggestion"],
    "improvementPlan": ["This week: focus on X because...", "Next: practice Y to improve...", "Then: work on Z for band 7+"],
    "bandExplanation": "A detailed 3-4 sentence explanation of why this band was awarded, referencing specific aspects of the essay that demonstrate each band level. Explain what would be needed for a higher band.",
    "detailedFeedback": "A long detailed paragraph (150+ words) of examiner-level feedback analyzing the essay's task response, organization, vocabulary, and grammar in depth. Reference specific examples from the student's writing.",
    "modelAnswer": "A complete model answer at band 7.5-8.0 level for this exact task prompt. Must be at least %d words.",
    "rewrittenResponse": "The student's exact essay rewritten to band 7.0+ level, preserving their ideas but improving language, structure, and accuracy.",
    "grammarHighlights": [
      {"original": "exact phrase from essay", "issue": "specific grammar error type", "suggestion": "corrected version", "explanation": "grammar rule explanation"},
      {"original": "another phrase", "issue": "another error", "suggestion": "correction", "explanation": "why this is wrong"}
    ],
    "vocabularyHighlights": [
      {"original": "basic word used", "issue": "too simple/repetitive/inappropriate", "suggestion": "more sophisticated alternative", "explanation": "why the upgrade matters for band score"},
      {"original": "another word", "issue": "lexical issue", "suggestion": "better alternative", "explanation": "context"}
    ]
  }
}`, taskContext, req.Prompt, wordCount, essay, minWords, minWords)

	raw, modelName, err := h.callLLM(prompt)
	if err != nil {
		writeError(w, http.StatusBadGateway, "AI evaluation is temporarily unavailable. Please try again.", err)
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

	// Validate: overall band must be arithmetic mean of criteria, rounded to nearest 0.5
	computedOverall := (scores.TaskAchievement + scores.Coherence + scores.LexicalResource + scores.Grammar) / 4.0
	computedOverall = math.Round(computedOverall*2) / 2
	if computedOverall < 0 {
		computedOverall = 0
	}
	if computedOverall > 9 {
		computedOverall = 9
	}
	scores.OverallBand = computedOverall

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
	if err := h.db.Select("id, user_id, task_type, prompt, word_count, time_taken_secs, overall_band, task_achievement, coherence, lexical_resource, grammar, ai_model, created_at").Where("user_id = ?", userID).Order("created_at DESC").Limit(50).Find(&submissions).Error; err != nil {
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

	if err := plan.CheckAndConsume(h.db, userID, plan.FeatureIELTSSpeaking); err != nil {
		plan.WritePaywall(w, plan.FeatureIELTSSpeaking)
		return
	}

	if h.claudeKey == "" && h.openAIKey == "" {
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

	transcriptWords := len(strings.Fields(strings.TrimSpace(req.Transcript)))
	if transcriptWords > 2000 {
		writeError(w, http.StatusBadRequest, "transcript is too long (maximum 2000 words)", nil)
		return
	}

	partContext := ""
	switch req.Part {
	case "part1":
		partContext = `This is Part 1 (Introduction & Interview, 4-5 minutes). The candidate answers short personal questions.
Expected: natural, brief but developed answers (3-5 sentences each). Evaluate fluency of spontaneous speech.`
	case "part2":
		partContext = `This is Part 2 (Long Turn / Cue Card, 1-2 minutes speaking after 1 minute preparation).
Expected: extended monologue covering all cue card points. Evaluate ability to speak at length with coherent structure.`
	case "part3":
		partContext = `This is Part 3 (Two-way Discussion, 4-5 minutes). Abstract discussion related to Part 2 topic.
Expected: developed opinions with reasoning, examples, and abstract thinking. Evaluate depth of ideas and language sophistication.`
	}

	// Phase 1: scores + brief bullets only — fast response (~3-5 s).
	// Detailed feedback (modelAnswer, rewrittenResponse, highlights) is fetched
	// separately via /ielts/speaking/details after the score card is shown.
	prompt := fmt.Sprintf(`You are a senior IELTS Speaking examiner. Score this response quickly and accurately.

%s

Question: %s

Transcript:
%s

Use official IELTS half-band scale. Be realistic — most candidates score 5.5-7.0.

Return ONLY valid JSON (keep every string short — max 15 words each):
{
  "overallBand": 6.5,
  "fluencyCoherence": 6.5,
  "lexicalResource": 7.0,
  "grammar": 6.0,
  "pronunciation": 6.5,
  "feedback": {
    "strengths": ["one short strength quoting transcript", "second strength"],
    "weaknesses": ["one short weakness quoting transcript", "second weakness"],
    "suggestions": ["one actionable tip", "second tip"],
    "bandExplanation": "One sentence: why this band.",
    "followUpQuestion": "A natural follow-up question.",
    "followUpQuestions": ["follow-up 1", "follow-up 2"]
  }
}`, partContext, req.Prompt, strings.TrimSpace(req.Transcript))

	raw, modelName, err := h.callLLM(prompt)
	if err != nil {
		writeError(w, http.StatusBadGateway, "AI evaluation is temporarily unavailable. Please try again.", err)
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

	// Validate: overall band must be arithmetic mean of criteria, rounded to nearest 0.5
	computedOverall := (scores.FluencyCoherence + scores.LexicalResource + scores.Grammar + scores.Pronunciation) / 4.0
	computedOverall = math.Round(computedOverall*2) / 2
	if computedOverall < 0 {
		computedOverall = 0
	}
	if computedOverall > 9 {
		computedOverall = 9
	}
	scores.OverallBand = computedOverall

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

// SpeakingDetails generates the heavy part of speaking feedback (modelAnswer,
// rewrittenResponse, detailedFeedback, grammarHighlights, vocabularyHighlights)
// for a session that was already scored by EvaluateSpeaking.
// Called from the frontend after the score card is shown.
func (h *IELTSExaminerHandler) SpeakingDetails(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var req struct {
		SessionID string `json:"sessionId"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}
	if strings.TrimSpace(req.SessionID) == "" {
		writeError(w, http.StatusBadRequest, "sessionId is required", nil)
		return
	}

	var session models.IELTSSpeakingSession
	if err := h.db.Where("id = ? AND user_id = ?", req.SessionID, userID).First(&session).Error; err != nil {
		writeError(w, http.StatusNotFound, "session not found", err)
		return
	}

	partLabel := "Part 1"
	switch session.Part {
	case "part2":
		partLabel = "Part 2 (Long Turn)"
	case "part3":
		partLabel = "Part 3 (Discussion)"
	}

	prompt := fmt.Sprintf(`You are a senior IELTS Speaking examiner. Provide deep feedback for this %s response.

Question: %s

Transcript:
%s

Band scores already assigned: Overall %.1f | Fluency %.1f | Lexical %.1f | Grammar %.1f | Pronunciation %.1f

Return ONLY valid JSON:
{
  "detailedFeedback": "150+ word paragraph analyzing fluency, vocabulary, grammar with specific quotes from the transcript.",
  "bandExplanation": "3-4 sentences explaining why this band, referencing specific transcript moments.",
  "modelAnswer": "Complete band 7.5+ model answer in natural spoken style.",
  "rewrittenResponse": "Candidate's response rewritten to band 7.0+, keeping their ideas.",
  "improvementPlan": ["This week: ...", "Next: ...", "Then: ..."],
  "grammarHighlights": [
    {"original": "exact phrase", "issue": "error type", "suggestion": "correction", "explanation": "why"}
  ],
  "vocabularyHighlights": [
    {"original": "basic word", "issue": "too simple", "suggestion": "better alternative", "explanation": "why it scores higher"}
  ]
}`,
		partLabel, session.Prompt, session.Transcript,
		session.OverallBand, session.FluencyCoherence, session.LexicalResource,
		session.Grammar, session.Pronunciation)

	raw, _, err := h.callLLM(prompt)
	if err != nil {
		writeError(w, http.StatusBadGateway, "Details generation failed. Please try again.", err)
		return
	}

	var details struct {
		DetailedFeedback     string          `json:"detailedFeedback"`
		BandExplanation      string          `json:"bandExplanation"`
		ModelAnswer          string          `json:"modelAnswer"`
		RewrittenResponse    string          `json:"rewrittenResponse"`
		ImprovementPlan      []string        `json:"improvementPlan"`
		GrammarHighlights    []feedbackIssue `json:"grammarHighlights"`
		VocabularyHighlights []feedbackIssue `json:"vocabularyHighlights"`
	}
	if err := json.Unmarshal([]byte(raw), &details); err != nil {
		writeError(w, http.StatusBadGateway, "Failed to parse details response", err)
		return
	}

	writeJSON(w, http.StatusOK, details)
}

func (h *IELTSExaminerHandler) GetSpeakingHistory(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var sessions []models.IELTSSpeakingSession
	if err := h.db.Select("id, user_id, part, prompt, overall_band, fluency_coherence, lexical_resource, grammar, pronunciation, ai_model, created_at").Where("user_id = ?", userID).Order("created_at DESC").Limit(50).Find(&sessions).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to load history", err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"items": sessions})
}

// ── LLM call with retry ─────────────────────────────────────────────────────

func (h *IELTSExaminerHandler) callLLM(prompt string) (string, string, error) {
	start := time.Now()
	raw, model, err := h.callLLMOnce(prompt)
	if err != nil {
		// Retry once after 2 seconds
		log.Printf("[llm] first attempt failed (%v), retrying in 2s...", err)
		time.Sleep(2 * time.Second)
		raw, model, err = h.callLLMOnce(prompt)
		if err != nil {
			log.Printf("[llm] retry also failed: %v (total: %v)", err, time.Since(start))
			return "", "", err
		}
	}
	log.Printf("[llm] success: model=%s time=%v len=%d", model, time.Since(start), len(raw))
	return raw, model, nil
}

func (h *IELTSExaminerHandler) callLLMOnce(prompt string) (string, string, error) {
	// Primary: OpenAI (GPT-5.4)
	if strings.TrimSpace(h.openAIKey) != "" {
		start := time.Now()
		raw, usage, err := callOpenAIChatCompletion(h.openAIKey, h.openAIModel, masterIELTSSystemPrompt, prompt, h.timeout)
		aicost.Record(h.db, aicost.Event{
			Feature: "ielts_examiner", Model: h.openAIModel,
			PromptTokens: usage.Prompt, CompletionTokens: usage.Completion,
			Latency: time.Since(start), Err: err,
		})
		if err == nil {
			return raw, h.openAIModel, nil
		}
		log.Printf("[llm] OpenAI failed: %v", err)
	}

	return "", "", fmt.Errorf("all AI providers failed")
}

// callClaudeChatCompletion calls the Claude API via do-ai.run (OpenAI-compatible Chat Completions format).
// If systemPrompt is empty, only the user message is sent. Returns the cleaned
// content plus token usage from the upstream response so callers can record
// cost telemetry; usage is zero when the upstream omits a `usage` block.
func callClaudeChatCompletion(apiKey, model, apiURL, systemPrompt, prompt string, timeout time.Duration) (string, openaiUsage, error) {
	messages := []map[string]string{}
	if strings.TrimSpace(systemPrompt) != "" {
		messages = append(messages, map[string]string{"role": "system", "content": systemPrompt})
	}
	messages = append(messages, map[string]string{"role": "user", "content": prompt})

	body := map[string]any{
		"model":       model,
		"messages":    messages,
		"temperature": 0.3,
		"max_tokens":  8192,
	}

	bodyBytes, _ := json.Marshal(body)
	req, err := http.NewRequest(http.MethodPost, apiURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return "", openaiUsage{}, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(req)
	if err != nil {
		return "", openaiUsage{}, fmt.Errorf("claude request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		errBody, _ := io.ReadAll(resp.Body)
		return "", openaiUsage{}, fmt.Errorf("claude returned %d: %s", resp.StatusCode, string(errBody[:min(len(errBody), 300)]))
	}

	var chatResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Usage struct {
			PromptTokens     int `json:"prompt_tokens"`
			CompletionTokens int `json:"completion_tokens"`
		} `json:"usage"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
		return "", openaiUsage{}, fmt.Errorf("decode response: %w", err)
	}

	usage := openaiUsage{Prompt: chatResp.Usage.PromptTokens, Completion: chatResp.Usage.CompletionTokens}

	if len(chatResp.Choices) == 0 || strings.TrimSpace(chatResp.Choices[0].Message.Content) == "" {
		return "", usage, fmt.Errorf("claude returned empty output")
	}

	return cleanJSON(chatResp.Choices[0].Message.Content), usage, nil
}

// callOpenAIChatCompletion uses the standard Chat Completions API — faster and
// more reliable than the Responses API for structured JSON output.
// If systemPrompt is empty, only the user message is sent. Returns the
// cleaned content plus token usage so callers can record cost telemetry.
func callOpenAIChatCompletion(apiKey, model, systemPrompt, prompt string, timeout time.Duration) (string, openaiUsage, error) {
	messages := []map[string]string{}
	if strings.TrimSpace(systemPrompt) != "" {
		messages = append(messages, map[string]string{"role": "system", "content": systemPrompt})
	}
	messages = append(messages, map[string]string{"role": "user", "content": prompt})

	body := map[string]any{
		"model":                 model,
		"messages":              messages,
		"max_completion_tokens": 8000,
	}

	bodyBytes, _ := json.Marshal(body)
	req, err := http.NewRequest(http.MethodPost, "https://api.openai.com/v1/chat/completions", bytes.NewReader(bodyBytes))
	if err != nil {
		return "", openaiUsage{}, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(req)
	if err != nil {
		return "", openaiUsage{}, fmt.Errorf("openai request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		errBody, _ := io.ReadAll(resp.Body)
		return "", openaiUsage{}, fmt.Errorf("openai returned %d: %s", resp.StatusCode, string(errBody[:min(len(errBody), 300)]))
	}

	var chatResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Usage struct {
			PromptTokens     int `json:"prompt_tokens"`
			CompletionTokens int `json:"completion_tokens"`
		} `json:"usage"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
		return "", openaiUsage{}, fmt.Errorf("decode response: %w", err)
	}

	usage := openaiUsage{Prompt: chatResp.Usage.PromptTokens, Completion: chatResp.Usage.CompletionTokens}

	if len(chatResp.Choices) == 0 || strings.TrimSpace(chatResp.Choices[0].Message.Content) == "" {
		return "", usage, fmt.Errorf("openai returned empty output")
	}

	return cleanJSON(chatResp.Choices[0].Message.Content), usage, nil
}

// ── Conversation (interactive speaking practice) ────────────────────────────

type convMessage struct {
	Role string `json:"role"` // "examiner" | "candidate"
	Text string `json:"text"`
}

type convRequest struct {
	Mode    string        `json:"mode"`    // "general" | "ielts"
	Part    string        `json:"part"`    // "part1" | "part2" | "part3"
	History []convMessage `json:"history"` // all prior turns
	Message string        `json:"message"` // latest candidate message
}

func (h *IELTSExaminerHandler) ConversationTurn(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	if err := plan.CheckAndConsume(h.db, userID, plan.FeatureSpeakingConversation); err != nil {
		plan.WritePaywall(w, plan.FeatureSpeakingConversation)
		return
	}

	var req convRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	if req.Mode != "general" && req.Mode != "ielts" {
		writeError(w, http.StatusBadRequest, "mode must be general or ielts", nil)
		return
	}
	if strings.TrimSpace(req.Message) == "" {
		writeError(w, http.StatusBadRequest, "message is required", nil)
		return
	}

	// Cap history to last 20 turns to control token usage
	history := req.History
	if len(history) > 20 {
		history = history[len(history)-20:]
	}

	sysPrompt := buildConvSystemPrompt(req.Mode, req.Part)

	messages := []map[string]string{
		{"role": "system", "content": sysPrompt},
	}
	for _, m := range history {
		role := "user"
		if m.Role == "examiner" {
			role = "assistant"
		}
		messages = append(messages, map[string]string{"role": role, "content": m.Text})
	}
	messages = append(messages, map[string]string{"role": "user", "content": req.Message})

	reply, err := h.callOpenAIMessages(messages)
	if err != nil {
		writeError(w, http.StatusBadGateway, "AI service unavailable. Please try again.", err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"reply": reply})
}

func buildConvSystemPrompt(mode, part string) string {
	langRule := "IMPORTANT: Detect the language the user writes/speaks in and always reply in that same language. If they speak Kazakh — reply in Kazakh. Russian — reply in Russian. English — reply in English. Never switch languages unless the user switches first."

	if mode == "ielts" {
		var partCtx string
		switch part {
		case "part2":
			partCtx = "You are conducting Part 2 (Long Turn). The candidate has had one minute to prepare and is now speaking from a cue card. Listen and react naturally. After they finish, ask one brief follow-up question."
		case "part3":
			partCtx = "You are conducting Part 3 (Two-way Discussion). Discuss abstract ideas related to the topic. Ask thought-provoking questions to encourage the candidate to develop their ideas further."
		default:
			partCtx = "You are conducting Part 1 (Introduction & Interview). Ask short personal questions about familiar topics such as home, family, work, studies, or hobbies."
		}
		return `You are a professional IELTS Speaking examiner conducting an official test. ` + partCtx + `
Rules:
- Keep each response to 1-2 sentences maximum.
- Stay in character as a calm, professional examiner at all times.
- Do NOT give feedback, corrections, or band-score comments during the session.
- React briefly to what the candidate just said, then ask the next question.
- ` + langRule
	}

	return `You are a fun, lively conversation partner. You chat like a real person — sometimes serious, sometimes joking, sometimes arguing playfully. You match the vibe of the conversation: if someone is laughing, you join in; if they're ranting, you play along or push back a bit.
Rules:
- Keep each response to 1-2 sentences maximum.
- Be natural, expressive, and human — not robotic or overly polite.
- React genuinely to what they said before asking your question.
- Ask one follow-up question to keep the conversation going.
- ` + langRule
}

// callOpenAIMessages sends a full messages array to the OpenAI chat endpoint and
// returns the assistant's reply. Uses gpt-4.1-mini with a 200-token cap for low
// latency conversational responses.
func (h *IELTSExaminerHandler) callOpenAIMessages(messages []map[string]string) (string, error) {
	body := map[string]any{
		"model":                 h.openAIModel,
		"messages":              messages,
		"max_completion_tokens": 200,
	}
	bodyBytes, _ := json.Marshal(body)

	timeoutCtx, cancel := context.WithTimeout(context.Background(), h.timeout)
	defer cancel()

	req, err := http.NewRequestWithContext(timeoutCtx, http.MethodPost, "https://api.openai.com/v1/chat/completions", bytes.NewReader(bodyBytes))
	if err != nil {
		return "", fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+h.openAIKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("openai request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(io.LimitReader(resp.Body, 300))
		return "", fmt.Errorf("openai returned %d: %s", resp.StatusCode, string(raw))
	}

	var chatResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
		return "", fmt.Errorf("decode response: %w", err)
	}
	if len(chatResp.Choices) == 0 {
		return "", fmt.Errorf("empty response from openai")
	}
	return strings.TrimSpace(chatResp.Choices[0].Message.Content), nil
}

// cleanJSON strips markdown backticks that LLMs sometimes add around JSON.
func cleanJSON(raw string) string {
	raw = strings.TrimSpace(raw)
	raw = strings.TrimPrefix(raw, "```json")
	raw = strings.TrimPrefix(raw, "```")
	raw = strings.TrimSuffix(raw, "```")
	return strings.TrimSpace(raw)
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
