package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/models"
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
	geminiKey         string
	geminiModel       string
	timeout           time.Duration
}

func NewIELTSExaminer(db *gorm.DB, openAIKey, openAIModel, claudeKey, claudeModel, claudeFallback, claudeURL, geminiKey, geminiModel string, timeout time.Duration) *IELTSExaminerHandler {
	if timeout < 30*time.Second {
		timeout = 60 * time.Second
	}
	return &IELTSExaminerHandler{
		db: db, openAIKey: openAIKey, openAIModel: openAIModel,
		claudeKey: claudeKey, claudeModel: claudeModel, claudeFallback: claudeFallback, claudeURL: claudeURL,
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

	if h.claudeKey == "" && h.openAIKey == "" && h.geminiKey == "" {
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
		minWords = 100
	} else if req.TaskType == "task2" {
		minWords = 150
	}
	if wordCount < minWords {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("essay is too short (minimum %d words for %s, you wrote %d)", minWords, req.TaskType, wordCount), nil)
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

	if h.claudeKey == "" && h.openAIKey == "" && h.geminiKey == "" {
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

	prompt := fmt.Sprintf(`You are a senior IELTS Speaking examiner with 20+ years of experience. Evaluate this response with detailed, mentor-level feedback.

%s

Examiner's question/prompt: %s

Candidate's response (transcribed):
%s

SCORING INSTRUCTIONS:
Use the official IELTS band scale (half-band increments). Be realistic — most candidates score 5.5-7.0.

For Fluency & Coherence: assess speech rate, hesitation, self-correction, topic development, coherence markers.
For Lexical Resource: assess vocabulary range, precision, idiomatic language, paraphrasing ability.
For Grammar: assess sentence variety, accuracy, complex structures, error frequency.
For Pronunciation: estimate from text — assess word choice naturalness, likely stress patterns, and phrasing sophistication. Note this is an estimate from written transcript.

FEEDBACK INSTRUCTIONS:
- Quote exact phrases from the transcript
- Explain HOW to improve with specific techniques
- Write paragraph-length detailed feedback (150+ words)
- Provide a model answer appropriate for this part type
- Generate 2-3 follow-up questions that react to the candidate's actual ideas

Return ONLY valid JSON:
{
  "overallBand": 6.5,
  "fluencyCoherence": 6.5,
  "lexicalResource": 7.0,
  "grammar": 6.0,
  "pronunciation": 6.5,
  "feedback": {
    "strengths": ["Specific strength quoting the transcript", "Another strength with examples"],
    "weaknesses": ["Specific weakness quoting the transcript", "Another weakness"],
    "suggestions": ["Detailed actionable suggestion with technique to practice", "Another specific suggestion"],
    "improvementPlan": ["This week: practice X because...", "Next: focus on Y to reach band 7", "Then: develop Z for fluency"],
    "bandExplanation": "A detailed 3-4 sentence explanation of why this band was awarded, referencing specific moments from the response that demonstrate each band level.",
    "detailedFeedback": "A long detailed paragraph (150+ words) analyzing the candidate's fluency patterns, vocabulary choices, grammatical accuracy, and overall communicative effectiveness. Reference specific examples from their response.",
    "modelAnswer": "A complete model answer at band 7.5+ level for this exact question. Natural spoken style, not written style.",
    "rewrittenResponse": "The candidate's response rewritten to band 7.0+ level, preserving their ideas but improving naturalness and sophistication.",
    "grammarHighlights": [
      {"original": "exact phrase from transcript", "issue": "specific grammar error", "suggestion": "corrected version", "explanation": "grammar rule"}
    ],
    "vocabularyHighlights": [
      {"original": "basic expression used", "issue": "too simple or repetitive", "suggestion": "more natural/sophisticated alternative", "explanation": "why this sounds more band 7+"}
    ],
    "followUpQuestion": "A natural follow-up question reacting to the candidate's actual ideas.",
    "followUpQuestions": ["follow-up reacting to their ideas 1", "follow-up 2", "follow-up 3"]
  }
}`, partContext, req.Prompt, strings.TrimSpace(req.Transcript))

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
	// Try Claude Opus first (primary for IELTS features)
	if strings.TrimSpace(h.claudeKey) != "" {
		raw, err := callClaudeChatCompletion(h.claudeKey, h.claudeModel, h.claudeURL, prompt, h.timeout)
		if err == nil {
			return raw, h.claudeModel, nil
		}
		log.Printf("[llm] Claude Opus failed: %v", err)

		// Fallback to Claude Sonnet
		if strings.TrimSpace(h.claudeFallback) != "" {
			raw, err = callClaudeChatCompletion(h.claudeKey, h.claudeFallback, h.claudeURL, prompt, h.timeout)
			if err == nil {
				return raw, h.claudeFallback, nil
			}
			log.Printf("[llm] Claude Sonnet failed: %v", err)
		}
	}

	// Fallback to OpenAI (GPT)
	if strings.TrimSpace(h.openAIKey) != "" {
		raw, err := callOpenAIChatCompletion(h.openAIKey, h.openAIModel, prompt, h.timeout)
		if err == nil {
			return raw, h.openAIModel, nil
		}
		log.Printf("[llm] OpenAI failed: %v", err)
	}

	// Last resort: Gemini
	if strings.TrimSpace(h.geminiKey) != "" {
		raw, err := callGeminiRaw(h.geminiKey, h.geminiModel, prompt, h.timeout)
		if err == nil {
			return raw, h.geminiModel, nil
		}
		log.Printf("[llm] Gemini failed: %v", err)
	}

	return "", "", fmt.Errorf("all AI providers failed")
}

func callGeminiRaw(apiKey, model, prompt string, timeout time.Duration) (string, error) {
	body := map[string]any{
		"contents": []map[string]any{
			{"parts": []map[string]string{{"text": prompt}}},
		},
		"generationConfig": map[string]any{
			"temperature":      0.3,
			"topP":             0.9,
			"maxOutputTokens":  16384,
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

	return cleanJSON(geminiResp.Candidates[0].Content.Parts[0].Text), nil
}

// callClaudeChatCompletion calls the Claude API via do-ai.run (OpenAI-compatible Chat Completions format).
func callClaudeChatCompletion(apiKey, model, apiURL, prompt string, timeout time.Duration) (string, error) {
	body := map[string]any{
		"model": model,
		"messages": []map[string]string{
			{"role": "system", "content": "You are an expert IELTS examiner. Return ONLY valid JSON with no markdown, no backticks, no commentary."},
			{"role": "user", "content": prompt},
		},
		"temperature": 0.3,
		"max_tokens":  16384,
	}

	bodyBytes, _ := json.Marshal(body)
	req, err := http.NewRequest(http.MethodPost, apiURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return "", fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("claude request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		errBody, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("claude returned %d: %s", resp.StatusCode, string(errBody[:min(len(errBody), 300)]))
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

	if len(chatResp.Choices) == 0 || strings.TrimSpace(chatResp.Choices[0].Message.Content) == "" {
		return "", fmt.Errorf("claude returned empty output")
	}

	return cleanJSON(chatResp.Choices[0].Message.Content), nil
}

// callOpenAIChatCompletion uses the standard Chat Completions API — faster and
// more reliable than the Responses API for structured JSON output.
func callOpenAIChatCompletion(apiKey, model, prompt string, timeout time.Duration) (string, error) {
	body := map[string]any{
		"model": model,
		"messages": []map[string]string{
			{"role": "system", "content": "You are an expert IELTS examiner. Return ONLY valid JSON with no markdown, no backticks, no commentary."},
			{"role": "user", "content": prompt},
		},
		"temperature":      0.3,
		"max_tokens":        16384,
		"response_format": map[string]string{"type": "json_object"},
	}

	bodyBytes, _ := json.Marshal(body)
	req, err := http.NewRequest(http.MethodPost, "https://api.openai.com/v1/chat/completions", bytes.NewReader(bodyBytes))
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

	if len(chatResp.Choices) == 0 || strings.TrimSpace(chatResp.Choices[0].Message.Content) == "" {
		return "", fmt.Errorf("openai returned empty output")
	}

	return cleanJSON(chatResp.Choices[0].Message.Content), nil
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
