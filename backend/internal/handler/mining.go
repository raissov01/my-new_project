package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/aicost"
	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/plan"
	"gorm.io/gorm"
)

type MiningHandler struct {
	db          *gorm.DB
	openAIKey   string
	openAIModel string
	timeout     time.Duration
}

func NewMining(db *gorm.DB, openAIKey, openAIModel string, timeout time.Duration) *MiningHandler {
	return &MiningHandler{db: db, openAIKey: openAIKey, openAIModel: openAIModel, timeout: timeout}
}

type ExtractedWord struct {
	Word       string `json:"word"`
	Definition string `json:"definition"`
	Example    string `json:"example"`
	Topic      string `json:"topic"`
}

// POST /mining/extract
// Body: { text: string, level: string }
func (h *MiningHandler) Extract(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())
	if err := plan.CheckAndConsume(h.db, userID, plan.FeatureMining); err != nil {
		plan.WritePaywall(w, plan.FeatureMining)
		return
	}

	var body struct {
		Text  string `json:"text"`
		Level string `json:"level"`
	}
	if err := decodeJSON(r, &body); err != nil {
		jsonErr(w, err.Error(), http.StatusBadRequest)
		return
	}
	if len(body.Text) < 20 {
		jsonErr(w, "text must be at least 20 characters", http.StatusBadRequest)
		return
	}
	if len(body.Text) > 5000 {
		jsonErr(w, "text must be 5000 characters or fewer", http.StatusBadRequest)
		return
	}
	if body.Level == "" {
		body.Level = "B1"
	}

	words, err := h.extractWords(r.Context(), body.Text, body.Level)
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, map[string]any{"words": words})
}

func (h *MiningHandler) extractWords(ctx context.Context, text, level string) ([]ExtractedWord, error) {
	if h.openAIKey == "" {
		return fallbackExtract(text), nil
	}

	prompt := fmt.Sprintf(`Extract 5-10 vocabulary words from the text below that would be challenging for a CEFR %s English learner.
For each word provide: word, definition (clear, simple English), example sentence, and topic tag (e.g. "business", "technology", "environment").
Exclude very common words (articles, prepositions, basic verbs like be/have/go).
Return ONLY a JSON array: [{"word":"...","definition":"...","example":"...","topic":"..."}]

Text:
%s`, level, text)

	body, _ := json.Marshal(map[string]any{
		"model": h.openAIModel,
		"messages": []map[string]any{
			{"role": "user", "content": prompt},
		},
		"temperature": 0.4,
		"max_tokens":  1000,
	})

	ctx2, cancel := context.WithTimeout(ctx, h.timeout)
	defer cancel()

	req, _ := http.NewRequestWithContext(ctx2, "POST", "https://api.openai.com/v1/chat/completions", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+h.openAIKey)
	req.Header.Set("Content-Type", "application/json")

	start := time.Now()
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		aicost.Record(h.db, aicost.Event{
			Feature: "vocabulary_mining", Model: h.openAIModel,
			Latency: time.Since(start), Err: err,
		})
		return fallbackExtract(text), nil
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)

	var result struct {
		Choices []struct {
			Message struct{ Content string } `json:"message"`
		} `json:"choices"`
		Usage struct {
			PromptTokens     int `json:"prompt_tokens"`
			CompletionTokens int `json:"completion_tokens"`
		} `json:"usage"`
	}
	if err2 := json.Unmarshal(raw, &result); err2 != nil || len(result.Choices) == 0 {
		aicost.Record(h.db, aicost.Event{
			Feature: "vocabulary_mining", Model: h.openAIModel,
			Latency: time.Since(start), Err: fmt.Errorf("decode failed or empty"),
		})
		return fallbackExtract(text), nil
	}
	aicost.Record(h.db, aicost.Event{
		Feature: "vocabulary_mining", Model: h.openAIModel,
		PromptTokens: result.Usage.PromptTokens, CompletionTokens: result.Usage.CompletionTokens,
		Latency: time.Since(start),
	})

	content := result.Choices[0].Message.Content
	jstart := 0
	for i, c := range content {
		if c == '[' { jstart = i; break }
	}
	jend := len(content)
	for i := len(content) - 1; i >= 0; i-- {
		if content[i] == ']' { jend = i + 1; break }
	}

	var words []ExtractedWord
	if err3 := json.Unmarshal([]byte(content[jstart:jend]), &words); err3 != nil {
		return fallbackExtract(text), nil
	}
	return words, nil
}

// fallbackExtract returns sample words when no API key is available.
func fallbackExtract(text string) []ExtractedWord {
	_ = text
	return []ExtractedWord{
		{Word: "elaborate", Definition: "to add more details or information", Example: "Could you elaborate on that point?", Topic: "communication"},
		{Word: "perspective", Definition: "a particular way of thinking about something", Example: "Try to see it from her perspective.", Topic: "general"},
		{Word: "significant", Definition: "important or large enough to be noticed", Example: "There was a significant improvement in his work.", Topic: "general"},
	}
}
