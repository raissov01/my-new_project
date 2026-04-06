package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/middleware"
)

type AIHandler struct {
	openAIKey      string
	openAIModel    string
	geminiKey      string
	geminiModel    string
	requestTimeout time.Duration
	maxBytes       int64
}

const (
	defaultAICardCount      = 15
	minAICardCount          = 5
	maxAICardCount          = 600
	maxCardsPerAIBatch      = 50
	defaultAITextLimitRunes = 30000
	maxAITextLimitRunes     = 360000
)

func NewAI(openAIKey, openAIModel, geminiKey, geminiModel string, requestTimeout time.Duration, maxBytes int64) *AIHandler {
	return &AIHandler{
		openAIKey:      openAIKey,
		openAIModel:    openAIModel,
		geminiKey:      geminiKey,
		geminiModel:    geminiModel,
		requestTimeout: requestTimeout,
		maxBytes:       maxBytes,
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

	if req.CardCount < minAICardCount {
		req.CardCount = defaultAICardCount
	}
	if req.CardCount > maxAICardCount {
		req.CardCount = maxAICardCount
	}
	if req.Mode == "" {
		req.Mode = "mixed"
	}
	if req.Language == "" {
		req.Language = "kk"
	}

	text := limitTextForGeneration(req.Text, req.CardCount)

	cards, modelName, err := h.generateCards(text, req.Mode, req.Language, req.CardCount)
	if err != nil {
		writeError(w, http.StatusBadGateway, "AI generation failed: "+err.Error(), err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"cards": cards,
		"meta":  map[string]any{"model": modelName, "textLength": len(req.Text)},
	})
}

func (h *AIHandler) generateCards(text, mode, language string, count int) ([]generatedCard, string, error) {
	batches := buildGenerationBatches(text, mode, language, count)
	allCards := make([]generatedCard, 0, count)
	modelName := ""

	for _, batch := range batches {
		cards, batchModel, err := h.generateBatch(batch)
		if err != nil {
			return nil, "", err
		}
		if modelName == "" {
			modelName = batchModel
		}
		allCards = append(allCards, cards...)
		if len(allCards) >= count {
			break
		}
	}

	allCards = dedupeCards(allCards, count)
	if len(allCards) == 0 {
		return nil, "", fmt.Errorf("no flashcards were generated")
	}

	return allCards, modelName, nil
}

func (h *AIHandler) generateBatch(prompt string) ([]generatedCard, string, error) {
	if strings.TrimSpace(h.openAIKey) != "" {
		cards, err := callOpenAI(h.openAIKey, h.openAIModel, prompt, h.requestTimeout)
		if err == nil {
			return cards, h.openAIModel, nil
		}
		if strings.TrimSpace(h.geminiKey) == "" {
			return nil, "", err
		}
	}

	cards, err := callGemini(h.geminiKey, h.geminiModel, prompt, h.requestTimeout)
	if err != nil {
		return nil, "", err
	}
	return cards, h.geminiModel, nil
}

func buildGenerationBatches(text, mode, language string, count int) []string {
	if count <= maxCardsPerAIBatch {
		return []string{buildPrompt(text, mode, language, count)}
	}

	batchCount := (count + maxCardsPerAIBatch - 1) / maxCardsPerAIBatch
	chunks := splitTextIntoChunks(text, batchCount)
	batches := make([]string, 0, len(chunks))
	remainingCards := count

	for idx, chunk := range chunks {
		remainingBatches := len(chunks) - idx
		batchCards := (remainingCards + remainingBatches - 1) / remainingBatches
		if batchCards > maxCardsPerAIBatch {
			batchCards = maxCardsPerAIBatch
		}
		if batchCards < minAICardCount && remainingCards > minAICardCount {
			batchCards = minAICardCount
		}

		batches = append(batches, buildPrompt(chunk, mode, language, batchCards))
		remainingCards -= batchCards
	}

	return batches
}

func splitTextIntoChunks(text string, chunkCount int) []string {
	if chunkCount <= 1 {
		return []string{text}
	}

	runes := []rune(text)
	if len(runes) == 0 {
		return []string{text}
	}

	chunks := make([]string, 0, chunkCount)
	start := 0
	for i := 0; i < chunkCount && start < len(runes); i++ {
		remainingRunes := len(runes) - start
		remainingChunks := chunkCount - i
		size := (remainingRunes + remainingChunks - 1) / remainingChunks
		end := start + size
		if end > len(runes) {
			end = len(runes)
		}
		chunk := strings.TrimSpace(string(runes[start:end]))
		if chunk != "" {
			chunks = append(chunks, chunk)
		}
		start = end
	}

	if len(chunks) == 0 {
		return []string{text}
	}

	return chunks
}

func limitTextForGeneration(text string, requestedCount int) string {
	clean := strings.TrimSpace(text)
	if clean == "" {
		return ""
	}

	maxRunes := defaultAITextLimitRunes
	if requestedCount > maxCardsPerAIBatch {
		maxRunes = requestedCount * 200
	}
	if maxRunes > maxAITextLimitRunes {
		maxRunes = maxAITextLimitRunes
	}
	if maxRunes < defaultAITextLimitRunes {
		maxRunes = defaultAITextLimitRunes
	}

	runes := []rune(clean)
	if len(runes) <= maxRunes {
		return clean
	}

	return strings.TrimSpace(string(runes[:maxRunes]))
}

func dedupeCards(cards []generatedCard, limit int) []generatedCard {
	seen := make(map[string]struct{}, len(cards))
	deduped := make([]generatedCard, 0, min(limit, len(cards)))

	for _, card := range cards {
		front := strings.TrimSpace(card.Front)
		back := strings.TrimSpace(card.Back)
		if front == "" || back == "" {
			continue
		}

		key := strings.ToLower(front) + "\x00" + strings.ToLower(back)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}

		if card.Difficulty != "easy" && card.Difficulty != "medium" && card.Difficulty != "hard" {
			card.Difficulty = "medium"
		}

		deduped = append(deduped, card)
		if len(deduped) >= limit {
			break
		}
	}

	return deduped
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
- Return ONLY valid JSON with this structure: {"cards": [...]}

Each element in "cards": {"front":"...","back":"...","category":"...","difficulty":"easy|medium|hard","source":"..."}

Text:
%s`, count, langName, mi, text)
}

func callGemini(apiKey, model, prompt string, timeout time.Duration) ([]generatedCard, error) {
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

	client := &http.Client{Timeout: timeout}
	resp, err := client.Post(url, "application/json", bytes.NewReader(bodyBytes))
	if err != nil {
		if isTimeoutError(err) {
			return nil, fmt.Errorf("gemini request timed out after %s: %w", timeout, err)
		}
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

func callOpenAI(apiKey, model, prompt string, timeout time.Duration) ([]generatedCard, error) {
	body := map[string]any{
		"model": model,
		"messages": []map[string]string{
			{"role": "system", "content": "Return ONLY a valid JSON array of flashcards. No markdown, no backticks, no commentary."},
			{"role": "user", "content": prompt},
		},
		"temperature":     0.4,
		"max_tokens":      16384,
		"response_format": map[string]string{"type": "json_object"},
	}

	bodyBytes, _ := json.Marshal(body)
	req, err := http.NewRequest(http.MethodPost, "https://api.openai.com/v1/chat/completions", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("build openai request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(req)
	if err != nil {
		if isTimeoutError(err) {
			return nil, fmt.Errorf("openai request timed out after %s: %w", timeout, err)
		}
		return nil, fmt.Errorf("openai request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		errBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("openai returned %d: %s", resp.StatusCode, string(errBody[:min(len(errBody), 300)]))
	}

	var chatResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
		return nil, fmt.Errorf("decode openai response: %w", err)
	}

	if len(chatResp.Choices) == 0 || strings.TrimSpace(chatResp.Choices[0].Message.Content) == "" {
		return nil, fmt.Errorf("openai returned empty output")
	}

	raw := strings.TrimSpace(chatResp.Choices[0].Message.Content)
	raw = strings.TrimPrefix(raw, "```json")
	raw = strings.TrimPrefix(raw, "```")
	raw = strings.TrimSuffix(raw, "```")
	raw = strings.TrimSpace(raw)

	// Try parsing as array directly, or as {"cards": [...]} wrapper
	var cards []generatedCard
	if err := json.Unmarshal([]byte(raw), &cards); err != nil {
		// Try wrapped format: {"cards": [...]}
		var wrapped struct {
			Cards []generatedCard `json:"cards"`
		}
		if err2 := json.Unmarshal([]byte(raw), &wrapped); err2 != nil {
			return nil, fmt.Errorf("parse cards: %w", err)
		}
		cards = wrapped.Cards
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

func isTimeoutError(err error) bool {
	if errors.Is(err, context.DeadlineExceeded) {
		return true
	}

	var netErr net.Error
	return errors.As(err, &netErr) && netErr.Timeout()
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
