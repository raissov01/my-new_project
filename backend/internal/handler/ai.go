package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/middleware"
)

type AIHandler struct {
	openAIKey   string
	openAIModel string
	geminiKey   string
	geminiModel string
	maxBytes    int64
}

func NewAI(openAIKey, openAIModel, geminiKey, geminiModel string, maxBytes int64) *AIHandler {
	return &AIHandler{
		openAIKey:   openAIKey,
		openAIModel: openAIModel,
		geminiKey:   geminiKey,
		geminiModel: geminiModel,
		maxBytes:    maxBytes,
	}
}

type generatedCard struct {
	Front      string `json:"front"`
	Back       string `json:"back"`
	Category   string `json:"category"`
	Difficulty string `json:"difficulty"`
	Source     string `json:"source"`
}

// Generate handles POST /api/v1/ai/generate
// Accepts extracted text (not files — file parsing stays in Next.js for now,
// or the frontend sends pre-extracted text).
func (h *AIHandler) Generate(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	if strings.TrimSpace(h.openAIKey) == "" && strings.TrimSpace(h.geminiKey) == "" {
		writeError(w, http.StatusServiceUnavailable, "AI is not configured", nil)
		return
	}

	var req struct {
		Text      string `json:"text"`
		Mode      string `json:"mode"`
		Language  string `json:"language"`
		CardCount int    `json:"cardCount"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	if strings.TrimSpace(req.Text) == "" || len(req.Text) < 50 {
		writeError(w, http.StatusBadRequest, "text too short", nil)
		return
	}

	if req.CardCount < 5 {
		req.CardCount = 15
	}
	if req.CardCount > 50 {
		req.CardCount = 50
	}
	if req.Mode == "" {
		req.Mode = "mixed"
	}
	if req.Language == "" {
		req.Language = "kk"
	}

	// Truncate text
	text := req.Text
	if len(text) > 30000 {
		text = text[:30000]
	}

	prompt := buildPrompt(text, req.Mode, req.Language, req.CardCount)

	cards, modelName, err := h.generateCards(prompt)
	if err != nil {
		writeError(w, http.StatusBadGateway, "AI generation failed: "+err.Error(), err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"cards": cards,
		"meta":  map[string]any{"model": modelName, "textLength": len(req.Text)},
	})
}

func (h *AIHandler) generateCards(prompt string) ([]generatedCard, string, error) {
	if strings.TrimSpace(h.openAIKey) != "" {
		cards, err := callOpenAI(h.openAIKey, h.openAIModel, prompt)
		if err == nil {
			return cards, h.openAIModel, nil
		}
		if strings.TrimSpace(h.geminiKey) == "" {
			return nil, "", err
		}
	}

	cards, err := callGemini(h.geminiKey, h.geminiModel, prompt)
	if err != nil {
		return nil, "", err
	}
	return cards, h.geminiModel, nil
}

func buildPrompt(text, mode, language string, count int) string {
	langNames := map[string]string{"kk": "Kazakh", "ru": "Russian", "en": "English"}
	langName := langNames[language]
	if langName == "" {
		langName = "English"
	}

	modeInstr := map[string]string{
		"mixed":       "Use a mix of definitions, Q&A, vocabulary, and concept explanations.",
		"generation":  "Automatically detect content type and generate the most appropriate flashcards: vocabulary, definitions, Q&A, or concept explanations.",
		"definition":  "Focus on term → definition cards. Extract key terms and their definitions.",
		"qa":          "Focus on question → answer cards.",
		"vocabulary":  "Focus on word/term → meaning or translation cards.",
		"translation": "Focus on word → translation pairs. Provide the translation in the target language.",
	}
	mi := modeInstr[mode]
	if mi == "" {
		mi = modeInstr["mixed"]
	}

	return fmt.Sprintf(`Generate exactly %d flashcards from the following text.
Output language: %s. %s

Rules:
- "front" = question/term, "back" = answer/definition (max 2-3 sentences)
- No duplicates. Prioritize study value. Assign difficulty: easy/medium/hard.
- Return ONLY a JSON array, no explanation.

Each element: {"front":"...","back":"...","category":"...","difficulty":"easy|medium|hard","source":"..."}

Text:
%s`, count, langName, mi, text)
}

func callGemini(apiKey, model, prompt string) ([]generatedCard, error) {
	body := map[string]any{
		"contents": []map[string]any{
			{"parts": []map[string]string{{"text": prompt}}},
		},
		"generationConfig": map[string]any{
			"temperature":      0.4,
			"topP":             0.9,
			"maxOutputTokens":  8192,
			"responseMimeType": "application/json",
		},
	}

	bodyBytes, _ := json.Marshal(body)
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, apiKey)

	client := &http.Client{Timeout: 45 * time.Second}
	resp, err := client.Post(url, "application/json", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		errBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("gemini returned %d: %s", resp.StatusCode, string(errBody[:min(len(errBody), 200)]))
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
		return nil, fmt.Errorf("decode response: %w", err)
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("empty response")
	}

	raw := strings.TrimSpace(geminiResp.Candidates[0].Content.Parts[0].Text)
	// Strip markdown code fences
	raw = strings.TrimPrefix(raw, "```json")
	raw = strings.TrimPrefix(raw, "```")
	raw = strings.TrimSuffix(raw, "```")
	raw = strings.TrimSpace(raw)

	var cards []generatedCard
	if err := json.Unmarshal([]byte(raw), &cards); err != nil {
		return nil, fmt.Errorf("parse cards: %w", err)
	}

	// Filter valid cards
	var valid []generatedCard
	for _, c := range cards {
		if strings.TrimSpace(c.Front) != "" && strings.TrimSpace(c.Back) != "" {
			if c.Difficulty != "easy" && c.Difficulty != "medium" && c.Difficulty != "hard" {
				c.Difficulty = "medium"
			}
			valid = append(valid, c)
		}
	}

	return valid, nil
}

func callOpenAI(apiKey, model, prompt string) ([]generatedCard, error) {
	body := map[string]any{
		"model":        model,
		"instructions": "Return only a JSON array of flashcards. Do not include markdown or commentary.",
		"input":        prompt,
		"text": map[string]any{
			"format": map[string]any{
				"type": "text",
			},
		},
	}

	bodyBytes, _ := json.Marshal(body)
	req, err := http.NewRequest(http.MethodPost, "https://api.openai.com/v1/responses", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("build openai request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 45 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("openai request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		errBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("openai returned %d: %s", resp.StatusCode, string(errBody[:min(len(errBody), 200)]))
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
		return nil, fmt.Errorf("decode openai response: %w", err)
	}

	raw := ""
	for _, item := range openAIResp.Output {
		for _, part := range item.Content {
			if part.Type == "output_text" && strings.TrimSpace(part.Text) != "" {
				raw = part.Text
				break
			}
		}
		if raw != "" {
			break
		}
	}

	if raw == "" {
		return nil, fmt.Errorf("openai returned empty output")
	}

	raw = strings.TrimSpace(raw)
	raw = strings.TrimPrefix(raw, "```json")
	raw = strings.TrimPrefix(raw, "```")
	raw = strings.TrimSuffix(raw, "```")
	raw = strings.TrimSpace(raw)

	var cards []generatedCard
	if err := json.Unmarshal([]byte(raw), &cards); err != nil {
		return nil, fmt.Errorf("parse cards: %w", err)
	}

	var valid []generatedCard
	for _, c := range cards {
		if strings.TrimSpace(c.Front) != "" && strings.TrimSpace(c.Back) != "" {
			if c.Difficulty != "easy" && c.Difficulty != "medium" && c.Difficulty != "hard" {
				c.Difficulty = "medium"
			}
			valid = append(valid, c)
		}
	}

	return valid, nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// intFromQuery parses a query parameter as int with fallback.
func intFromQuery(r *http.Request, key string, fallback int) int {
	v := r.URL.Query().Get(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}
