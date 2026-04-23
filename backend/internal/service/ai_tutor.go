package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

type AITutorService struct {
	db           *gorm.DB
	openAIKey    string
	openAIModel  string
	claudeKey    string
	claudeModel  string
	claudeURL    string
	timeout      time.Duration
}

func NewAITutor(db *gorm.DB, openAIKey, openAIModel, claudeKey, claudeModel, claudeURL string, timeout time.Duration) *AITutorService {
	return &AITutorService{
		db:          db,
		openAIKey:   openAIKey,
		openAIModel: openAIModel,
		claudeKey:   claudeKey,
		claudeModel: claudeModel,
		claudeURL:   claudeURL,
		timeout:     timeout,
	}
}

// ListScenarios returns all scenarios, optionally filtered by level/category.
func (s *AITutorService) ListScenarios(level, category string) ([]models.AIScenario, error) {
	q := s.db.Model(&models.AIScenario{})
	if level != "" {
		q = q.Where("level = ?", level)
	}
	if category != "" {
		q = q.Where("category = ?", category)
	}
	var scenarios []models.AIScenario
	err := q.Order("level, category, title").Find(&scenarios).Error
	return scenarios, err
}

// GetScenario returns a scenario by slug.
func (s *AITutorService) GetScenario(slug string) (*models.AIScenario, error) {
	var sc models.AIScenario
	err := s.db.First(&sc, "slug = ?", slug).Error
	if err != nil {
		return nil, err
	}
	return &sc, nil
}

// StartConversation creates a new AIConversation for a user + scenario.
func (s *AITutorService) StartConversation(userID, scenarioID string) (*models.AIConversation, error) {
	// Abandon previous active conversations for same scenario
	s.db.Model(&models.AIConversation{}).
		Where("user_id = ? AND scenario_id = ? AND status = 'active'", userID, scenarioID).
		Update("status", "abandoned")

	empty := "[]"
	conv := models.AIConversation{
		UserID:     userID,
		ScenarioID: scenarioID,
		Messages:   &empty,
		Status:     "active",
	}
	if err := s.db.Create(&conv).Error; err != nil {
		return nil, err
	}
	return &conv, nil
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// SendMessage appends user message, calls AI, appends AI reply, returns AI reply.
func (s *AITutorService) SendMessage(ctx context.Context, convID, userID, userText string) (string, error) {
	var conv models.AIConversation
	if err := s.db.Where("id = ? AND user_id = ? AND status = 'active'", convID, userID).First(&conv).Error; err != nil {
		return "", fmt.Errorf("conversation not found")
	}

	var sc models.AIScenario
	if err := s.db.First(&sc, "id = ?", conv.ScenarioID).Error; err != nil {
		return "", fmt.Errorf("scenario not found")
	}

	// Parse existing messages
	var msgs []ChatMessage
	if conv.Messages != nil {
		_ = json.Unmarshal([]byte(*conv.Messages), &msgs)
	}

	msgs = append(msgs, ChatMessage{Role: "user", Content: userText})

	// Build system prompt
	systemPrompt := sc.PersonaPrompt

	reply, err := s.callLLM(ctx, systemPrompt, msgs)
	if err != nil {
		return "", err
	}

	msgs = append(msgs, ChatMessage{Role: "assistant", Content: reply})

	encoded, _ := json.Marshal(msgs)
	encodedStr := string(encoded)
	conv.Messages = &encodedStr

	// Auto-complete after 15 exchanges
	userMsgs := 0
	for _, m := range msgs {
		if m.Role == "user" {
			userMsgs++
		}
	}
	if userMsgs >= 15 {
		conv.Status = "completed"
		now := time.Now()
		conv.CompletedAt = &now
	}

	s.db.Save(&conv)
	return reply, nil
}

// GradeConversation scores the student's messages and returns feedback JSON.
func (s *AITutorService) GradeConversation(ctx context.Context, convID, userID string) (map[string]any, error) {
	var conv models.AIConversation
	if err := s.db.Where("id = ? AND user_id = ?", convID, userID).First(&conv).Error; err != nil {
		return nil, fmt.Errorf("conversation not found")
	}

	var sc models.AIScenario
	s.db.First(&sc, "id = ?", conv.ScenarioID)

	var msgs []ChatMessage
	if conv.Messages != nil {
		_ = json.Unmarshal([]byte(*conv.Messages), &msgs)
	}

	// Collect only user messages
	var userLines string
	for _, m := range msgs {
		if m.Role == "user" {
			userLines += m.Content + "\n"
		}
	}

	graderPrompt := fmt.Sprintf(`Analyze these student messages from a roleplay at CEFR level %s.
Score each dimension 1-10:
1. Fluency: natural flow, appropriate pacing
2. Grammar: correctness for their level
3. Vocabulary: range and appropriateness
4. Task completion: did they achieve the goal "%s"?

Give exactly 3 specific improvement tips.
Return ONLY valid JSON: {"fluency":N,"grammar":N,"vocabulary":N,"task":N,"tips":["...","...","..."]}

Student messages:
%s`, sc.Level, sc.StudentGoal, userLines)

	reply, err := s.callLLM(ctx, graderPrompt, []ChatMessage{{Role: "user", Content: "Grade this conversation."}})
	if err != nil {
		return nil, err
	}

	var scores map[string]any
	start := 0
	for i, c := range reply {
		if c == '{' {
			start = i
			break
		}
	}
	end := len(reply)
	for i := len(reply) - 1; i >= 0; i-- {
		if reply[i] == '}' {
			end = i + 1
			break
		}
	}
	if err2 := json.Unmarshal([]byte(reply[start:end]), &scores); err2 != nil {
		return map[string]any{"raw": reply}, nil
	}

	// Persist final scores
	encoded, _ := json.Marshal(scores)
	encodedStr := string(encoded)
	conv.FinalScores = &encodedStr
	conv.Status = "completed"
	now := time.Now()
	conv.CompletedAt = &now
	s.db.Save(&conv)

	return scores, nil
}

// ListHistory returns a user's past conversations with scenario info.
func (s *AITutorService) ListHistory(userID string) ([]map[string]any, error) {
	rows, err := s.db.Raw(`
		SELECT c.id, c.status, c.started_at, c.completed_at, c.final_scores,
		       sc.slug, sc.title, sc.level, sc.category, sc.icon
		FROM ai_conversations c
		JOIN ai_scenarios sc ON sc.id = c.scenario_id
		WHERE c.user_id = ?
		ORDER BY c.started_at DESC
		LIMIT 50
	`, userID).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []map[string]any
	for rows.Next() {
		var (
			id, status, slug, title, level, cat, icon string
			startedAt                                   time.Time
			completedAt                                 *time.Time
			finalScores                                 *string
		)
		if err2 := rows.Scan(&id, &status, &startedAt, &completedAt, &finalScores,
			&slug, &title, &level, &cat, &icon); err2 != nil {
			continue
		}
		var scoresObj map[string]any
		if finalScores != nil {
			_ = json.Unmarshal([]byte(*finalScores), &scoresObj)
		}
		results = append(results, map[string]any{
			"id": id, "status": status, "startedAt": startedAt, "completedAt": completedAt,
			"finalScores": scoresObj,
			"scenario": map[string]any{
				"slug": slug, "title": title, "level": level, "category": cat, "icon": icon,
			},
		})
	}
	return results, nil
}

// callLLM uses OpenAI API (falls back to Claude).
func (s *AITutorService) callLLM(ctx context.Context, system string, msgs []ChatMessage) (string, error) {
	if s.openAIKey != "" {
		reply, err := s.callOpenAI(ctx, system, msgs)
		if err == nil {
			return reply, nil
		}
	}
	if s.claudeKey != "" {
		return s.callClaude(ctx, system, msgs)
	}
	return "", fmt.Errorf("no AI API key configured")
}

func (s *AITutorService) callOpenAI(ctx context.Context, system string, msgs []ChatMessage) (string, error) {
	type oaMsg struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	}
	oaMsgs := []oaMsg{{Role: "system", Content: system}}
	for _, m := range msgs {
		oaMsgs = append(oaMsgs, oaMsg{Role: m.Role, Content: m.Content})
	}
	body, _ := json.Marshal(map[string]any{
		"model":       s.openAIModel,
		"messages":    oaMsgs,
		"max_tokens":  400,
		"temperature": 0.8,
	})

	timeoutCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	req, _ := http.NewRequestWithContext(timeoutCtx, "POST", "https://api.openai.com/v1/chat/completions", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+s.openAIKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	var result struct {
		Choices []struct {
			Message struct{ Content string } `json:"message"`
		} `json:"choices"`
	}
	if err2 := json.Unmarshal(raw, &result); err2 != nil || len(result.Choices) == 0 {
		return "", fmt.Errorf("openai: unexpected response")
	}
	return result.Choices[0].Message.Content, nil
}

func (s *AITutorService) callClaude(ctx context.Context, system string, msgs []ChatMessage) (string, error) {
	type msg struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	}
	var claudeMsgs []msg
	for _, m := range msgs {
		claudeMsgs = append(claudeMsgs, msg{Role: m.Role, Content: m.Content})
	}
	body, _ := json.Marshal(map[string]any{
		"model":      s.claudeModel,
		"system":     system,
		"messages":   claudeMsgs,
		"max_tokens": 400,
	})
	timeoutCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()
	req, _ := http.NewRequestWithContext(timeoutCtx, "POST", s.claudeURL, bytes.NewReader(body))
	req.Header.Set("x-api-key", s.claudeKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	var result struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	}
	if err2 := json.Unmarshal(raw, &result); err2 != nil || len(result.Content) == 0 {
		return "", fmt.Errorf("claude: unexpected response: %s", string(raw))
	}
	return result.Content[0].Text, nil
}
