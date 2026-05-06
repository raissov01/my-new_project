// enrich-nuet-topics appends a structured "Worked examples" and "Key formulas"
// section to every NUETTopic explanation. Existing explanations stay intact —
// the new content is added below a sentinel marker so subsequent runs replace
// it instead of duplicating.
//
// Usage:
//
//	go run ./cmd/enrich-nuet-topics [-deployment NAME] [-section math|critical_thinking|all] [-dry-run]
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/midoriya/flashlearn-backend/internal/config"
	"github.com/midoriya/flashlearn-backend/internal/database"
	"github.com/midoriya/flashlearn-backend/internal/models"
)

const sectionMarker = "\n\n<!-- enriched-section -->\n"

type azureConfig struct {
	Endpoint   string
	APIKey     string
	APIVersion string
	Deployment string
}

const systemPrompt = `You are a NUET (Nazarbayev University Entrance Test) content writer. Given a topic title, its current short explanation, and the section (Math or Critical Thinking), produce study material that students can rely on without an external textbook.

Output format (verbatim, no markdown headings — use plain CAPS labels separated by blank lines):

KEY POINTS
- 3 to 5 short bullets covering the core ideas a student must know.

KEY FORMULAS
- 2 to 4 formulas in LaTeX ($...$ inline, $$...$$ block). Skip this section for Critical Thinking topics — write "(no formulas)" instead.

WORKED EXAMPLE 1
Plain English problem statement (1–2 sentences). Then a numbered solution showing every step. Use $...$ for inline math.

WORKED EXAMPLE 2
A second problem at slightly higher difficulty with full solution.

COMMON MISTAKES
- 2 to 3 traps students fall into on this topic.

Constraints:
- 250–400 words total.
- Plain text or LaTeX only. No markdown headers (#, ##), no bullet symbols other than - or numbers.
- Refer to NUET conventions (single-correct MCQ, A–E choices, 30 questions per section, 60 minutes).
- Ground every example in the topic — do not drift to unrelated math.`

func main() {
	deploymentOverride := flag.String("deployment", "", "override AZURE_OPENAI_DEPLOYMENT")
	sectionFilter := flag.String("section", "all", "math | critical_thinking | all")
	dryRun := flag.Bool("dry-run", false, "print prompts only; no API calls or DB writes")
	overwrite := flag.Bool("overwrite", false, "regenerate even if topic already has enriched section")
	flag.Parse()

	_ = godotenv.Load()
	cfgEnv, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	db, err := database.ConnectGorm(cfgEnv.DatabaseURL, cfgEnv.Environment)
	if err != nil {
		log.Fatalf("db: %v", err)
	}

	azCfg, err := loadAzureConfig()
	if err != nil && !*dryRun {
		log.Fatalf("azure: %v", err)
	}
	if *deploymentOverride != "" {
		azCfg.Deployment = strings.TrimSpace(*deploymentOverride)
		log.Printf("using deployment override: %s", azCfg.Deployment)
	}

	q := db.Order("section ASC, order_index ASC")
	if *sectionFilter != "all" {
		q = q.Where("section = ?", *sectionFilter)
	}
	var topics []models.NUETTopic
	if err := q.Find(&topics).Error; err != nil {
		log.Fatalf("load topics: %v", err)
	}
	log.Printf("loaded %d topics (section=%s)", len(topics), *sectionFilter)

	ctx := context.Background()
	client := &http.Client{Timeout: 120 * time.Second}

	updated, skipped, failed := 0, 0, 0
	for _, topic := range topics {
		base := stripEnrichedSection(topic.Explanation)
		if !*overwrite && hasEnrichedSection(topic.Explanation) {
			skipped++
			continue
		}
		if *dryRun {
			log.Printf("[dry-run] %s — %s", topic.Section, topic.Title)
			continue
		}
		generated, err := callAzure(ctx, client, azCfg, topic, base)
		if err != nil {
			failed++
			log.Printf("topic %s: %v", topic.Slug, err)
			continue
		}
		newExplanation := strings.TrimSpace(base) + sectionMarker + strings.TrimSpace(generated)
		if err := db.Model(&models.NUETTopic{}).
			Where("id = ?", topic.ID).
			Updates(map[string]any{"explanation": newExplanation, "updated_at": time.Now()}).Error; err != nil {
			failed++
			log.Printf("update %s: %v", topic.Slug, err)
			continue
		}
		updated++
		log.Printf("enriched %s — %s (%d chars)", topic.Section, topic.Title, len(generated))
	}
	log.Printf("done. updated=%d skipped=%d failed=%d", updated, skipped, failed)
}

func hasEnrichedSection(text string) bool {
	return strings.Contains(text, strings.TrimSpace(sectionMarker))
}

func stripEnrichedSection(text string) string {
	idx := strings.Index(text, strings.TrimSpace(sectionMarker))
	if idx == -1 {
		return text
	}
	return strings.TrimSpace(text[:idx])
}

func callAzure(ctx context.Context, client *http.Client, cfg azureConfig, topic models.NUETTopic, base string) (string, error) {
	type message struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	}
	type requestPayload struct {
		Messages            []message `json:"messages"`
		Temperature         float64   `json:"temperature"`
		MaxCompletionTokens int       `json:"max_completion_tokens,omitempty"`
	}
	type responsePayload struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	user := fmt.Sprintf("Section: %s\nTopic: %s\nDescription: %s\n\nCurrent explanation:\n%s\n\nWrite the enriched study material now.",
		topic.Section, topic.Title, topic.Description, base)
	body := requestPayload{
		Messages: []message{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: user},
		},
		Temperature:         0.3,
		MaxCompletionTokens: 1800,
	}
	bodyBytes, _ := json.Marshal(body)
	url := fmt.Sprintf("%s/openai/deployments/%s/chat/completions?api-version=%s", cfg.Endpoint, cfg.Deployment, cfg.APIVersion)

	backoff := []time.Duration{1, 2, 4, 8, 16}
	for attempt := 0; ; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(bodyBytes))
		if err != nil {
			return "", err
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("api-key", cfg.APIKey)
		resp, err := client.Do(req)
		if err != nil {
			return "", err
		}
		raw, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		if resp.StatusCode == http.StatusTooManyRequests && attempt < len(backoff) {
			time.Sleep(backoff[attempt] * time.Second)
			continue
		}
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			return "", fmt.Errorf("azure %d: %s", resp.StatusCode, truncate(string(raw), 200))
		}
		var parsed responsePayload
		if err := json.Unmarshal(raw, &parsed); err != nil {
			return "", err
		}
		if len(parsed.Choices) == 0 {
			return "", fmt.Errorf("empty response")
		}
		return cleanMarkdown(parsed.Choices[0].Message.Content), nil
	}
}

func cleanMarkdown(text string) string {
	lines := strings.Split(text, "\n")
	out := make([]string, 0, len(lines))
	for _, line := range lines {
		t := strings.TrimLeft(line, " \t")
		for strings.HasPrefix(t, "#") {
			t = strings.TrimPrefix(t, "#")
		}
		t = strings.TrimLeft(t, " ")
		t = strings.ReplaceAll(t, "**", "")
		out = append(out, t)
	}
	return strings.TrimSpace(strings.Join(out, "\n"))
}

func loadAzureConfig() (azureConfig, error) {
	endpoint := strings.TrimSpace(os.Getenv("AZURE_OPENAI_ENDPOINT"))
	apiKey := strings.TrimSpace(os.Getenv("AZURE_OPENAI_KEY"))
	deployment := strings.TrimSpace(os.Getenv("AZURE_OPENAI_DEPLOYMENT"))
	apiVersion := strings.TrimSpace(os.Getenv("AZURE_OPENAI_API_VERSION"))
	if apiVersion == "" {
		apiVersion = "2025-01-01-preview"
	}
	if endpoint == "" || apiKey == "" || deployment == "" {
		return azureConfig{}, fmt.Errorf("AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, AZURE_OPENAI_DEPLOYMENT required")
	}
	return azureConfig{
		Endpoint:   strings.TrimRight(endpoint, "/"),
		APIKey:     apiKey,
		APIVersion: apiVersion,
		Deployment: deployment,
	}, nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
