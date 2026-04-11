package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
	"unicode"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"github.com/midoriya/flashlearn-backend/internal/repository"
)

// ChatHandler handles the AI tutor chat endpoints.
type ChatHandler struct {
	repo             *repository.ChatRepository
	openaiKey        string
	openaiModel      string
	claudeKey        string
	claudeModel      string
	claudeFallback   string
	claudeURL        string
	timeout          time.Duration
}

func NewChat(
	repo *repository.ChatRepository,
	openaiKey, openaiModel string,
	claudeKey, claudeModel, claudeFallback, claudeURL string,
	timeout time.Duration,
) *ChatHandler {
	return &ChatHandler{
		repo:           repo,
		openaiKey:      openaiKey,
		openaiModel:    openaiModel,
		claudeKey:      claudeKey,
		claudeModel:    claudeModel,
		claudeFallback: claudeFallback,
		claudeURL:      claudeURL,
		timeout:        timeout,
	}
}

// --- System prompt for the AI tutor ---

const chatSystemPrompt = `You are an expert IELTS tutor and English language coach inside the StudyWithRaissov learning platform. Your role is to help students improve their English and prepare for the IELTS exam effectively.

Core responsibilities:
- Explain IELTS exam structure, scoring criteria, and strategies for all 4 sections (Reading, Writing, Speaking, Listening)
- Correct grammar and vocabulary mistakes with clear explanations
- Help students practice writing tasks (Task 1 & Task 2) with feedback
- Give speaking tips and model answers for common IELTS topics
- Recommend study materials when relevant (you will receive context about available materials)
- Motivate students and help them create effective study plans
- Answer questions about English grammar, vocabulary, collocations, and idioms

Guidelines:
- Keep responses concise but thorough (2-5 paragraphs usually)
- When correcting mistakes, show the wrong version → correct version
- Use examples whenever possible
- If a student shares their writing, give band-score-style feedback (Task Achievement, Coherence, Lexical Resource, Grammar)
- Respond in the language the student uses (English, Russian, or Kazakh), but always provide English examples
- Be encouraging but honest about areas that need improvement
- When you reference materials from the platform, mention their titles so students can find them

You may receive context about relevant study materials from the platform's library. Use this context to make specific recommendations when appropriate.`

// --- Request / Response types ---

type sendMessageRequest struct {
	Message string `json:"message"`
}

type chatMessageResponse struct {
	ID        string `json:"id"`
	Role      string `json:"role"`
	Content   string `json:"content"`
	CreatedAt string `json:"createdAt"`
}

// --- Handlers ---

// SendMessage handles POST /api/v1/chat/message
func (h *ChatHandler) SendMessage(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var req sendMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	msg := strings.TrimSpace(req.Message)
	if msg == "" || len(msg) > 5000 {
		http.Error(w, `{"error":"message must be 1-5000 characters"}`, http.StatusBadRequest)
		return
	}

	// 1. Save user message
	userMsg := &models.ChatMessage{
		UserID:  userID,
		Role:    "user",
		Content: msg,
	}
	if err := h.repo.SaveMessage(userMsg); err != nil {
		http.Error(w, `{"error":"failed to save message"}`, http.StatusInternalServerError)
		return
	}

	// 2. Load recent history for context (last 20 messages)
	history, err := h.repo.GetHistory(userID, 20)
	if err != nil {
		history = []models.ChatMessage{*userMsg}
	}

	// 3. Search for relevant materials (RAG)
	keywords := extractKeywords(msg)
	materialsContext := h.buildMaterialsContext(keywords)

	// 4. Build AI messages
	systemPrompt := chatSystemPrompt
	if materialsContext != "" {
		systemPrompt += "\n\n--- RELEVANT MATERIALS FROM PLATFORM ---\n" + materialsContext
	}

	aiMessages := []map[string]string{
		{"role": "system", "content": systemPrompt},
	}
	for _, m := range history {
		aiMessages = append(aiMessages, map[string]string{
			"role":    m.Role,
			"content": m.Content,
		})
	}

	// 5. Call AI (Claude → OpenAI fallback)
	reply, err := h.callAI(aiMessages)
	if err != nil {
		// Save error indicator and return error
		http.Error(w, fmt.Sprintf(`{"error":"AI service error: %s"}`, err.Error()), http.StatusBadGateway)
		return
	}

	// 6. Save assistant reply
	assistantMsg := &models.ChatMessage{
		UserID:  userID,
		Role:    "assistant",
		Content: reply,
	}
	if err := h.repo.SaveMessage(assistantMsg); err != nil {
		http.Error(w, `{"error":"failed to save reply"}`, http.StatusInternalServerError)
		return
	}

	// 7. Return both messages
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"userMessage": chatMessageResponse{
			ID:        userMsg.ID,
			Role:      userMsg.Role,
			Content:   userMsg.Content,
			CreatedAt: userMsg.CreatedAt.Format(time.RFC3339),
		},
		"assistantMessage": chatMessageResponse{
			ID:        assistantMsg.ID,
			Role:      assistantMsg.Role,
			Content:   assistantMsg.Content,
			CreatedAt: assistantMsg.CreatedAt.Format(time.RFC3339),
		},
	})
}

// GetHistory handles GET /api/v1/chat/history
func (h *ChatHandler) GetHistory(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	messages, err := h.repo.GetHistory(userID, 50)
	if err != nil {
		http.Error(w, `{"error":"failed to load history"}`, http.StatusInternalServerError)
		return
	}

	result := make([]chatMessageResponse, 0, len(messages))
	for _, m := range messages {
		result = append(result, chatMessageResponse{
			ID:        m.ID,
			Role:      m.Role,
			Content:   m.Content,
			CreatedAt: m.CreatedAt.Format(time.RFC3339),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"messages": result})
}

// ClearHistory handles DELETE /api/v1/chat/history
func (h *ChatHandler) ClearHistory(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	if err := h.repo.ClearHistory(userID); err != nil {
		http.Error(w, `{"error":"failed to clear history"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"ok":true}`))
}

// --- AI call with fallback ---

func (h *ChatHandler) callAI(messages []map[string]string) (string, error) {
	// Try Claude first
	if h.claudeKey != "" {
		reply, err := h.callClaude(messages)
		if err == nil {
			return reply, nil
		}
	}

	// Fallback to OpenAI
	if h.openaiKey != "" {
		return h.callOpenAI(messages)
	}

	return "", fmt.Errorf("no AI provider configured")
}

func (h *ChatHandler) callClaude(messages []map[string]string) (string, error) {
	body := map[string]any{
		"model":       h.claudeModel,
		"messages":    messages,
		"temperature": 0.4,
		"max_tokens":  4000,
	}

	bodyBytes, _ := json.Marshal(body)
	req, err := http.NewRequest(http.MethodPost, h.claudeURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+h.claudeKey)

	client := &http.Client{Timeout: h.timeout}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		errBody, _ := io.ReadAll(resp.Body)
		// Try fallback model on 4xx/5xx
		if h.claudeFallback != "" && h.claudeFallback != h.claudeModel {
			body["model"] = h.claudeFallback
			bodyBytes, _ = json.Marshal(body)
			req2, _ := http.NewRequest(http.MethodPost, h.claudeURL, bytes.NewReader(bodyBytes))
			req2.Header.Set("Content-Type", "application/json")
			req2.Header.Set("Authorization", "Bearer "+h.claudeKey)
			resp2, err2 := client.Do(req2)
			if err2 == nil {
				defer resp2.Body.Close()
				if resp2.StatusCode == http.StatusOK {
					return decodeChatResponse(resp2.Body)
				}
			}
		}
		return "", fmt.Errorf("claude %d: %s", resp.StatusCode, string(errBody[:min(len(errBody), 200)]))
	}

	return decodeChatResponse(resp.Body)
}

func (h *ChatHandler) callOpenAI(messages []map[string]string) (string, error) {
	body := map[string]any{
		"model":       h.openaiModel,
		"messages":    messages,
		"temperature": 0.4,
		"max_tokens":  4000,
	}

	bodyBytes, _ := json.Marshal(body)
	req, err := http.NewRequest(http.MethodPost, "https://api.openai.com/v1/chat/completions", bytes.NewReader(bodyBytes))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+h.openaiKey)

	client := &http.Client{Timeout: h.timeout}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		errBody, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("openai %d: %s", resp.StatusCode, string(errBody[:min(len(errBody), 200)]))
	}

	return decodeChatResponse(resp.Body)
}

func decodeChatResponse(body io.Reader) (string, error) {
	var resp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(body).Decode(&resp); err != nil {
		return "", fmt.Errorf("decode: %w", err)
	}
	if len(resp.Choices) == 0 || strings.TrimSpace(resp.Choices[0].Message.Content) == "" {
		return "", fmt.Errorf("empty AI response")
	}
	return resp.Choices[0].Message.Content, nil
}

// --- RAG: build materials context ---

func (h *ChatHandler) buildMaterialsContext(keywords []string) string {
	if len(keywords) == 0 {
		return ""
	}

	var parts []string

	// Search IELTS materials
	materials, err := h.repo.SearchMaterials(keywords, 5)
	if err == nil && len(materials) > 0 {
		for _, m := range materials {
			entry := fmt.Sprintf("- [%s] %s (%s, %s)", m.Category, m.Title, m.Type, m.Difficulty)
			if m.Description != "" {
				desc := m.Description
				if len(desc) > 200 {
					desc = desc[:200] + "..."
				}
				entry += "\n  " + desc
			}
			parts = append(parts, entry)
		}
	}

	// Search Telegram posts
	posts, err := h.repo.SearchTelegramPosts(keywords, 5)
	if err == nil && len(posts) > 0 {
		for _, p := range posts {
			text := p.Text
			if text == "" {
				text = p.Caption
			}
			if len(text) > 300 {
				text = text[:300] + "..."
			}
			entry := fmt.Sprintf("- [Telegram material] %s", p.FileName)
			if text != "" {
				entry += "\n  " + text
			}
			parts = append(parts, entry)
		}
	}

	if len(parts) == 0 {
		return ""
	}
	return strings.Join(parts, "\n")
}

// extractKeywords pulls meaningful words from the user's message for material search.
func extractKeywords(msg string) []string {
	stopWords := map[string]bool{
		"a": true, "an": true, "the": true, "is": true, "are": true, "was": true,
		"were": true, "be": true, "been": true, "being": true, "have": true,
		"has": true, "had": true, "do": true, "does": true, "did": true,
		"will": true, "would": true, "could": true, "should": true, "may": true,
		"might": true, "can": true, "shall": true, "to": true, "of": true,
		"in": true, "for": true, "on": true, "with": true, "at": true, "by": true,
		"from": true, "as": true, "into": true, "about": true, "like": true,
		"through": true, "after": true, "over": true, "between": true, "out": true,
		"and": true, "or": true, "but": true, "not": true, "no": true,
		"if": true, "then": true, "than": true, "too": true, "very": true,
		"just": true, "so": true, "up": true, "it": true, "its": true,
		"my": true, "me": true, "i": true, "we": true, "you": true, "your": true,
		"he": true, "she": true, "they": true, "them": true, "this": true,
		"that": true, "what": true, "which": true, "who": true, "how": true,
		"when": true, "where": true, "why": true, "all": true, "some": true,
		"any": true, "each": true, "every": true, "hi": true, "hello": true,
		"hey": true, "please": true, "thanks": true, "thank": true, "help": true,
		// Russian stop words
		"и": true, "в": true, "на": true, "с": true, "не": true, "что": true,
		"это": true, "я": true, "он": true, "она": true, "мы": true, "вы": true,
		"они": true, "как": true, "мне": true, "мой": true, "для": true,
		"по": true, "но": true, "из": true, "за": true, "от": true, "до": true,
		"привет": true, "здравствуйте": true,
	}

	words := strings.FieldsFunc(strings.ToLower(msg), func(r rune) bool {
		return !unicode.IsLetter(r) && !unicode.IsDigit(r)
	})

	var keywords []string
	seen := map[string]bool{}
	for _, w := range words {
		if len(w) < 3 || stopWords[w] || seen[w] {
			continue
		}
		seen[w] = true
		keywords = append(keywords, w)
		if len(keywords) >= 6 {
			break
		}
	}
	return keywords
}
