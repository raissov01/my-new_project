package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
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
	maxCardsPerAIBatch      = 100
	maxParallelBatches      = 4
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

	type batchResult struct {
		cards []generatedCard
		model string
		err   error
	}

	results := make([]batchResult, len(batches))
	sem := make(chan struct{}, maxParallelBatches)
	var wg sync.WaitGroup

	for i, prompt := range batches {
		wg.Add(1)
		sem <- struct{}{}
		go func(idx int, p string) {
			defer wg.Done()
			defer func() { <-sem }()

			cards, model, err := h.generateBatch(p)
			results[idx] = batchResult{cards: cards, model: model, err: err}
		}(i, prompt)
	}

	wg.Wait()

	allCards := make([]generatedCard, 0, count)
	modelName := ""
	var lastErr error

	for i, r := range results {
		if r.err != nil {
			log.Printf("[ai] batch %d/%d failed: %v", i+1, len(results), r.err)
			lastErr = r.err
			continue
		}
		if modelName == "" {
			modelName = r.model
		}
		allCards = append(allCards, r.cards...)
	}

	allCards = dedupeCards(allCards, count)

	if len(allCards) == 0 {
		if lastErr != nil {
			return nil, "", fmt.Errorf("all batches failed, last error: %w", lastErr)
		}
		return nil, "", fmt.Errorf("no flashcards were generated")
	}

	if lastErr != nil {
		log.Printf("[ai] %d/%d batches succeeded, returning %d cards (some batches failed)", len(results), len(results), len(allCards))
	}

	return allCards, modelName, nil
}

func (h *AIHandler) generateBatch(prompt string) ([]generatedCard, string, error) {
	// Use the configured mini model for flashcards (faster and cheaper)
	flashcardModel := h.openAIModel
	if strings.TrimSpace(h.openAIKey) != "" {
		cards, err := callOpenAI(h.openAIKey, flashcardModel, prompt, h.requestTimeout)
		if err == nil {
			return cards, flashcardModel, nil
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

	// Split on paragraph boundaries first so individual questions/items are
	// not cut in half across chunks. Fall back to single-line splits, then to
	// a raw rune-based split only as a last resort.
	paragraphs := strings.Split(text, "\n\n")
	if len(paragraphs) < chunkCount {
		paragraphs = strings.Split(text, "\n")
	}
	// Drop empty paragraphs.
	cleaned := paragraphs[:0]
	for _, p := range paragraphs {
		if strings.TrimSpace(p) != "" {
			cleaned = append(cleaned, p)
		}
	}
	paragraphs = cleaned

	if len(paragraphs) < chunkCount {
		// Too few paragraphs to split cleanly — fall back to rune-based split.
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

	// Balance paragraphs across chunks by rune count so chunks are roughly equal.
	totalRunes := 0
	paragraphRunes := make([]int, len(paragraphs))
	for i, p := range paragraphs {
		paragraphRunes[i] = len([]rune(p))
		totalRunes += paragraphRunes[i]
	}
	targetPerChunk := totalRunes / chunkCount
	if targetPerChunk <= 0 {
		targetPerChunk = 1
	}

	chunks := make([]string, 0, chunkCount)
	var current strings.Builder
	currentRunes := 0
	for i, p := range paragraphs {
		if current.Len() > 0 {
			current.WriteString("\n\n")
		}
		current.WriteString(p)
		currentRunes += paragraphRunes[i]
		if currentRunes >= targetPerChunk && len(chunks) < chunkCount-1 {
			chunks = append(chunks, strings.TrimSpace(current.String()))
			current.Reset()
			currentRunes = 0
		}
	}
	if current.Len() > 0 {
		chunks = append(chunks, strings.TrimSpace(current.String()))
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
	deduped := make([]generatedCard, 0, len(cards))
	skippedEmpty := 0
	skippedDuplicate := 0

	for _, card := range cards {
		front := strings.TrimSpace(card.Front)
		back := strings.TrimSpace(card.Back)
		if front == "" || back == "" {
			skippedEmpty++
			continue
		}

		key := strings.ToLower(front) + "\x00" + strings.ToLower(back)
		if _, exists := seen[key]; exists {
			skippedDuplicate++
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

	if skippedEmpty > 0 || skippedDuplicate > 0 {
		log.Printf("[ai] dedupe: kept=%d skipped_empty=%d skipped_duplicate=%d input=%d",
			len(deduped), skippedEmpty, skippedDuplicate, len(cards))
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

	return fmt.Sprintf(`Generate flashcards from the following text.
Output language: %s. %s

Rules:
- Create ONE flashcard for EVERY distinct question, term, concept, or item present in the text. Do NOT skip, merge, or summarize items — preserve all of them, even if they look similar.
- If the text has a document title, topic name, heading, or section label (typically at the very top or as a standalone line like "Exam questions", "Глава 1", "Тақырып: ..."), DO NOT create a flashcard for that title itself. Only create cards for items within the body.
- If there is no title or heading at all, treat the entire text as content and create cards for every item you find.
- Target up to %d cards, but let the content decide the actual count — return as many cards as the text genuinely contains. Never pad with fabricated or duplicate entries to hit the target.
- "front" = question/term, "back" = answer/definition (max 2-3 sentences).
- Assign difficulty: easy/medium/hard.
- Return ONLY valid JSON with this structure: {"cards": [...]}

Each element in "cards": {"front":"...","back":"...","category":"...","difficulty":"easy|medium|hard","source":"..."}

Text:
%s`, langName, mi, count, text)
}

func callGemini(apiKey, model, prompt string, timeout time.Duration) ([]generatedCard, error) {
	body := map[string]any{
		"contents": []map[string]any{
			{"parts": []map[string]string{{"text": prompt}}},
		},
		"generationConfig": map[string]any{
			"temperature":      0.4,
			"topP":             0.9,
			"maxOutputTokens":  40000,
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
		"max_completion_tokens": 16000,
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
