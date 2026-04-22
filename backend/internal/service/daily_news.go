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
	"gorm.io/gorm/clause"
)

type DailyNewsService struct {
	db          *gorm.DB
	openAIKey   string
	openAIModel string
	timeout     time.Duration
}

func NewDailyNews(db *gorm.DB, openAIKey, openAIModel string, timeout time.Duration) *DailyNewsService {
	return &DailyNewsService{db: db, openAIKey: openAIKey, openAIModel: openAIModel, timeout: timeout}
}

// GetToday returns today's DailyNews record (or latest if today not yet generated).
func (s *DailyNewsService) GetToday() (*models.DailyNews, error) {
	var news models.DailyNews
	today := time.Now().UTC().Truncate(24 * time.Hour)
	err := s.db.Where("news_date = ?", today).First(&news).Error
	if err != nil {
		// Fall back to latest available
		if err2 := s.db.Order("news_date DESC").First(&news).Error; err2 != nil {
			return nil, err2
		}
	}
	return &news, nil
}

// ListRecent returns the last N news entries.
func (s *DailyNewsService) ListRecent(n int) ([]models.DailyNews, error) {
	var list []models.DailyNews
	err := s.db.Order("news_date DESC").Limit(n).Find(&list).Error
	return list, err
}

// GenerateToday fetches a topic, generates 3-level content, and inserts.
// Safe to call multiple times in the same day (ON CONFLICT DO NOTHING).
func (s *DailyNewsService) GenerateToday() error {
	today := time.Now().UTC().Truncate(24 * time.Hour)

	// Skip if already generated
	var count int64
	s.db.Model(&models.DailyNews{}).Where("news_date = ?", today).Count(&count)
	if count > 0 {
		return nil
	}

	topic, headline, sourceURL := s.fetchTopic()
	content, err := s.generateContent(topic, headline)
	if err != nil {
		return fmt.Errorf("generate content: %w", err)
	}

	news := models.DailyNews{
		NewsDate:         today,
		Topic:            topic,
		SourceURL:        sourceURL,
		OriginalHeadline: headline,
		VersionA2:        content.A2,
		VersionB1:        content.B1,
		VersionC1:        content.C1,
	}

	// Marshal vocab
	if len(content.VocabA2) > 0 {
		b, _ := json.Marshal(content.VocabA2)
		s := string(b)
		news.VocabA2 = &s
	}
	if len(content.VocabB1) > 0 {
		b, _ := json.Marshal(content.VocabB1)
		s := string(b)
		news.VocabB1 = &s
	}
	if len(content.VocabC1) > 0 {
		b, _ := json.Marshal(content.VocabC1)
		s := string(b)
		news.VocabC1 = &s
	}
	if len(content.Questions) > 0 {
		b, _ := json.Marshal(content.Questions)
		s := string(b)
		news.Questions = &s
	}

	return s.db.Clauses(clause.OnConflict{DoNothing: true}).Create(&news).Error
}

// fetchTopic picks a topic from a curated list. In production this would
// integrate with a news RSS feed; for now it rotates through current topics.
func (s *DailyNewsService) fetchTopic() (topic, headline, sourceURL string) {
	topics := []struct{ topic, headline, url string }{
		{"technology", "AI systems are becoming more capable at reasoning tasks", "https://www.bbc.com/news/technology"},
		{"environment", "Scientists warn global temperatures continue to rise", "https://www.bbc.com/news/science-environment"},
		{"health", "New research links regular exercise to improved mental health", "https://www.bbc.com/news/health"},
		{"economy", "Inflation shows signs of slowing in major economies", "https://www.bbc.com/news/business"},
		{"education", "Universities adopt AI tools for personalised learning", "https://www.bbc.com/news/education"},
		{"society", "Urban populations forecast to reach 70% by 2050", "https://www.bbc.com/news/world"},
		{"science", "Astronomers discover potential signs of water on distant planet", "https://www.bbc.com/news/science"},
		{"culture", "Young people spend more time on digital media than TV", "https://www.bbc.com/news/entertainment-arts"},
	}
	idx := int(time.Now().YearDay()) % len(topics)
	return topics[idx].topic, topics[idx].headline, topics[idx].url
}

type newsContent struct {
	A2        string         `json:"a2"`
	B1        string         `json:"b1"`
	C1        string         `json:"c1"`
	VocabA2   []vocabEntry   `json:"vocabA2"`
	VocabB1   []vocabEntry   `json:"vocabB1"`
	VocabC1   []vocabEntry   `json:"vocabC1"`
	Questions []newsQuestion `json:"questions"`
}

type vocabEntry struct {
	Word       string `json:"word"`
	Definition string `json:"definition"`
}

type newsQuestion struct {
	Level    string `json:"level"`
	Prompt   string `json:"prompt"`
	Answer   string `json:"answer"`
}

func (s *DailyNewsService) generateContent(topic, headline string) (*newsContent, error) {
	if s.openAIKey == "" {
		return s.fallbackContent(topic, headline), nil
	}

	prompt := fmt.Sprintf(`Today's news topic: %s
Headline: %s

Generate educational English content for language learners. Return ONLY valid JSON with this structure:
{
  "a2": "80-word simplified version for A2 learners (simple sentences, common vocabulary)",
  "b1": "150-word intermediate version for B1 learners (moderate complexity)",
  "c1": "300-word advanced version for C1 learners (complex structures, sophisticated vocabulary)",
  "vocabA2": [{"word":"...","definition":"..."}],  (3 words, very basic)
  "vocabB1": [{"word":"...","definition":"..."}],  (4 words, intermediate)
  "vocabC1": [{"word":"...","definition":"..."}],  (5 words, advanced)
  "questions": [
    {"level":"A2","prompt":"What is the main topic?","answer":"..."},
    {"level":"A2","prompt":"True or false: ...","answer":"true/false"},
    {"level":"A2","prompt":"Fill in: The article is about ___.","answer":"..."},
    {"level":"B1","prompt":"What does the article suggest about ...?","answer":"..."},
    {"level":"B1","prompt":"According to the text, why ...?","answer":"..."},
    {"level":"B1","prompt":"What is the implication of ...?","answer":"..."},
    {"level":"C1","prompt":"Critically evaluate the claim that ...","answer":"..."},
    {"level":"C1","prompt":"What assumptions underlie the argument?","answer":"..."},
    {"level":"C1","prompt":"How does this issue relate to broader trends in ...?","answer":"..."}
  ]
}`, topic, headline)

	ctx, cancel := context.WithTimeout(context.Background(), s.timeout)
	defer cancel()

	body, _ := json.Marshal(map[string]any{
		"model": s.openAIModel,
		"messages": []map[string]any{
			{"role": "system", "content": "You are an expert EFL content writer."},
			{"role": "user", "content": prompt},
		},
		"temperature": 0.7,
		"max_tokens":  2000,
	})

	req, _ := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/chat/completions", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+s.openAIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return s.fallbackContent(topic, headline), nil
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	var result struct {
		Choices []struct {
			Message struct{ Content string } `json:"message"`
		} `json:"choices"`
	}
	if err2 := json.Unmarshal(raw, &result); err2 != nil || len(result.Choices) == 0 {
		return s.fallbackContent(topic, headline), nil
	}

	content := result.Choices[0].Message.Content
	start := 0
	for i, c := range content {
		if c == '{' { start = i; break }
	}
	end := len(content)
	for i := len(content) - 1; i >= 0; i-- {
		if content[i] == '}' { end = i + 1; break }
	}

	var nc newsContent
	if err3 := json.Unmarshal([]byte(content[start:end]), &nc); err3 != nil {
		return s.fallbackContent(topic, headline), nil
	}
	return &nc, nil
}

// fallbackContent returns placeholder content when no API key is configured.
func (s *DailyNewsService) fallbackContent(topic, headline string) *newsContent {
	return &newsContent{
		A2: fmt.Sprintf("Today we look at %s. %s. This is an important topic for everyone.", topic, headline),
		B1: fmt.Sprintf("Today's news focuses on %s. %s. Experts are discussing the implications of this development and what it means for ordinary people.", topic, headline),
		C1: fmt.Sprintf("Today's edition examines the evolving situation regarding %s. The headline reads: '%s'. This development raises significant questions about the long-term trajectory of global trends in this area, and warrants careful consideration from policymakers and citizens alike.", topic, headline),
	}
}
