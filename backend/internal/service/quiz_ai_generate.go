package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

const (
	openAIChatURL    = "https://api.openai.com/v1/chat/completions"
	quizGenMaxTokens = 4096

	maxQuizGenTextRunes = 40000
	maxQuestionsPerReq  = 20
	minQuestionsPerReq  = 1
	dailyGenLimit       = 10
)

// AIGeneratedQuestion is a single MCQ question returned by the AI.
type AIGeneratedQuestion struct {
	Text         string   `json:"text"`
	Options      []string `json:"options"`
	CorrectIndex int      `json:"correctIndex"`
	Explanation  string   `json:"explanation"`
}

// AIQuizGenResult is the service response for a generation request.
type AIQuizGenResult struct {
	Questions      []AIGeneratedQuestion `json:"questions"`
	Model          string                `json:"model"`
	RemainingToday int                   `json:"remainingToday"`
}

// QuizAIGenerateService handles AI-powered quiz question generation.
type QuizAIGenerateService struct {
	db             *gorm.DB
	openAIKey      string
	openAIModel    string
	requestTimeout time.Duration
}

func NewQuizAIGenerate(db *gorm.DB, openAIKey, openAIModel string, requestTimeout time.Duration) *QuizAIGenerateService {
	return &QuizAIGenerateService{
		db:             db,
		openAIKey:      openAIKey,
		openAIModel:    openAIModel,
		requestTimeout: requestTimeout,
	}
}

// DailyUsage returns how many generations the user has done in the last 24 hours.
func (s *QuizAIGenerateService) DailyUsage(userID string) (int, error) {
	var count int64
	since := time.Now().Add(-24 * time.Hour)
	err := s.db.Model(&models.AIQuizGenerationLog{}).
		Where("user_id = ? AND created_at > ?", userID, since).
		Count(&count).Error
	return int(count), err
}

// Generate calls the OpenAI API and returns generated MCQ questions.
// Returns an error if the daily limit is reached or the API call fails.
func (s *QuizAIGenerateService) Generate(userID, text, subject string, count int) (*AIQuizGenResult, error) {
	if strings.TrimSpace(s.openAIKey) == "" {
		return nil, fmt.Errorf("AI generation is not configured")
	}

	// Clamp question count.
	if count < minQuestionsPerReq {
		count = minQuestionsPerReq
	}
	if count > maxQuestionsPerReq {
		count = maxQuestionsPerReq
	}

	// Daily rate limit check.
	used, err := s.DailyUsage(userID)
	if err != nil {
		return nil, fmt.Errorf("rate limit check: %w", err)
	}
	if used >= dailyGenLimit {
		return nil, ErrDailyLimitReached
	}

	// Trim text to max allowed runes.
	text = limitRunes(text, maxQuizGenTextRunes)

	prompt := buildQuizPrompt(text, subject, count)
	questions, err := s.callOpenAI(prompt)
	if err != nil {
		return nil, err
	}

	// Record usage.
	logEntry := &models.AIQuizGenerationLog{UserID: userID, Count: count}
	if dbErr := s.db.Create(logEntry).Error; dbErr != nil {
		// Non-fatal — generation succeeded; just log.
		_ = dbErr
	}

	remaining := dailyGenLimit - (used + 1)
	if remaining < 0 {
		remaining = 0
	}

	return &AIQuizGenResult{
		Questions:      questions,
		Model:          s.openAIModel,
		RemainingToday: remaining,
	}, nil
}

// ErrDailyLimitReached is returned when a user exceeds their daily generation quota.
var ErrDailyLimitReached = fmt.Errorf("daily generation limit reached")

// ── Prompt builder ────────────────────────────────────────────────────────────

func buildQuizPrompt(text, subject string, count int) string {
	langRule := "- CRITICAL: Detect the language of the source text below and write ALL questions, answer options, and explanations in EXACTLY the SAME language as the source text. Match the source language precisely — if the text is in English, write in English. If Kazakh, write in Kazakh. If Russian, write in Russian. Do not translate."

	subjectLine := ""
	if strings.TrimSpace(subject) != "" {
		subjectLine = fmt.Sprintf("Subject area: %s\n", strings.TrimSpace(subject))
	}

	return fmt.Sprintf(`Generate exactly %d multiple-choice questions based ONLY on the provided text. Do not use outside knowledge.

%sRules:
- Each question must have exactly 4 answer options
- Exactly one option must be correct (correctIndex: 0, 1, 2, or 3)
- Questions must test genuine understanding, not trivial recall
%s
- Include a brief explanation (1-2 sentences) for why the correct answer is right
- Base questions ONLY on facts stated in the text below

Return ONLY valid JSON with NO extra text, NO markdown, NO code fences:
{"questions":[{"text":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"..."}]}

<text>
%s
</text>`, count, subjectLine, langRule, text)
}

// ── OpenAI API call ───────────────────────────────────────────────────────────

func (s *QuizAIGenerateService) callOpenAI(prompt string) ([]AIGeneratedQuestion, error) {
	body := map[string]any{
		"model": s.openAIModel,
		"messages": []map[string]string{
			{"role": "system", "content": "You are an expert quiz creator. Return ONLY valid JSON. No markdown, no backticks, no commentary."},
			{"role": "user", "content": prompt},
		},
		"max_completion_tokens": quizGenMaxTokens,
	}

	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), s.requestTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, openAIChatURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.openAIKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("openai request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		errBody, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return nil, fmt.Errorf("openai returned %d: %s", resp.StatusCode, string(errBody))
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
	// Strip any accidental markdown fences the model might add.
	raw = strings.TrimPrefix(raw, "```json")
	raw = strings.TrimPrefix(raw, "```")
	raw = strings.TrimSuffix(raw, "```")
	raw = strings.TrimSpace(raw)

	var parsed struct {
		Questions []AIGeneratedQuestion `json:"questions"`
	}
	if err := json.Unmarshal([]byte(raw), &parsed); err != nil {
		return nil, fmt.Errorf("parse AI response JSON: %w", err)
	}

	return validateQuestions(parsed.Questions), nil
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// validateQuestions filters out malformed questions and clamps correctIndex.
func validateQuestions(qs []AIGeneratedQuestion) []AIGeneratedQuestion {
	out := make([]AIGeneratedQuestion, 0, len(qs))
	for _, q := range qs {
		if strings.TrimSpace(q.Text) == "" {
			continue
		}
		if len(q.Options) != 4 {
			continue
		}
		allFilled := true
		for _, opt := range q.Options {
			if strings.TrimSpace(opt) == "" {
				allFilled = false
				break
			}
		}
		if !allFilled {
			continue
		}
		if q.CorrectIndex < 0 || q.CorrectIndex > 3 {
			q.CorrectIndex = 0
		}
		out = append(out, q)
	}
	return out
}

func limitRunes(s string, max int) string {
	r := []rune(strings.TrimSpace(s))
	if len(r) <= max {
		return string(r)
	}
	return string(r[:max])
}
