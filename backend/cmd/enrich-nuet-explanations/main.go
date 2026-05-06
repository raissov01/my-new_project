// enrich-nuet-explanations fills the `explanation` field for every NUET
// question seed that currently has an empty value. It calls Azure OpenAI
// to produce a concise, step-by-step solution and rewrites questions.json
// in place. The seed file remains the source of truth — re-running the
// extracted-question seeder copies the new text into the database.
//
// Usage:
//
//	export AZURE_OPENAI_ENDPOINT=https://...
//	export AZURE_OPENAI_KEY=...
//	export AZURE_OPENAI_DEPLOYMENT=gpt-4.1-mini
//	go run ./cmd/enrich-nuet-explanations [flags]
//
// Flags:
//
//	-input  path to questions.json (default internal/database/nuet_seed_data/questions.json)
//	-limit  process at most N questions (0 = all). Useful for smoke tests.
//	-workers concurrent API calls (default 4)
//	-dry-run print prompts but do not call Azure or write the file
//	-overwrite re-generate explanations even if non-empty
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
	"sync"
	"sync/atomic"
	"time"

	"github.com/joho/godotenv"
)

type seedQuestion struct {
	TestName    string   `json:"testName"`
	Position    int      `json:"position"`
	Section     string   `json:"section"`
	Prompt      string   `json:"prompt"`
	Options     []string `json:"options"`
	Answer      string   `json:"answer"`
	Explanation string   `json:"explanation"`
}

type azureConfig struct {
	Endpoint   string
	APIKey     string
	APIVersion string
	Deployment string
}

const systemPrompt = `You are a NUET (Nazarbayev University Entrance Test) exam coach. Given a multiple-choice question and the correct answer letter, write a rigorous step-by-step solution that proves why that answer is correct.

Hard rules:
- Show every algebra/arithmetic step explicitly. Never write "we end up at" or "after some manipulation" — write the actual manipulation.
- Before stating the final letter, verify by substitution or by matching against the answer choice exactly. If your computation does not match the given correct letter, work the problem again until it does — never guess.
- If you cannot reach the stated correct answer with sound reasoning, say so plainly: "The given answer X cannot be derived from the prompt as stated." Do not fabricate steps to reach it.

Format:
- Plain text or LaTeX. Use $...$ for inline math and $$...$$ for block math. No markdown headings, no bullet markers, no asterisks for emphasis.
- Reference the actual numbers and variables from the question.
- End with one short line: "Therefore the answer is X." (where X is the given letter).
- Aim for 80–180 words. Do not restate the full question. Do not list the answer choices.
- For critical-thinking word problems, explain in plain English without LaTeX.`

func main() {
	inputPath := flag.String("input", "internal/database/nuet_seed_data/questions.json", "path to questions.json")
	limit := flag.Int("limit", 0, "max questions to process (0 = all)")
	workers := flag.Int("workers", 4, "concurrent API workers")
	dryRun := flag.Bool("dry-run", false, "print prompts only; no API calls or file writes")
	overwrite := flag.Bool("overwrite", false, "regenerate explanations even if non-empty")
	deploymentOverride := flag.String("deployment", "", "override AZURE_OPENAI_DEPLOYMENT (e.g. gpt-4o)")
	flag.Parse()

	_ = godotenv.Load()

	cfg, err := loadAzureConfig()
	if err != nil && !*dryRun {
		log.Fatalf("config: %v", err)
	}
	if *deploymentOverride != "" {
		cfg.Deployment = strings.TrimSpace(*deploymentOverride)
		log.Printf("using deployment override: %s", cfg.Deployment)
	}

	buf, err := os.ReadFile(*inputPath)
	if err != nil {
		log.Fatalf("read %s: %v", *inputPath, err)
	}
	var questions []seedQuestion
	if err := json.Unmarshal(buf, &questions); err != nil {
		log.Fatalf("parse %s: %v", *inputPath, err)
	}
	log.Printf("loaded %d questions from %s", len(questions), *inputPath)

	pending := make([]int, 0, len(questions))
	for i, q := range questions {
		if *overwrite || strings.TrimSpace(q.Explanation) == "" {
			pending = append(pending, i)
		}
	}
	log.Printf("need explanations: %d", len(pending))
	if *limit > 0 && len(pending) > *limit {
		pending = pending[:*limit]
		log.Printf("limited to first %d", *limit)
	}
	if len(pending) == 0 {
		log.Printf("nothing to do — every question already has an explanation")
		return
	}

	if *dryRun {
		log.Printf("[dry-run] would call Azure for %d questions", len(pending))
		log.Printf("[dry-run] sample prompt:\n%s", buildPrompt(questions[pending[0]]))
		return
	}

	ctx := context.Background()
	client := &http.Client{Timeout: 90 * time.Second}

	type job struct {
		idx int
	}
	type result struct {
		idx int
		out string
		err error
	}
	jobCh := make(chan job, len(pending))
	resCh := make(chan result, len(pending))

	var wg sync.WaitGroup
	var done atomic.Int64
	for w := 0; w < *workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := range jobCh {
				out, err := generateExplanation(ctx, client, cfg, questions[j.idx])
				resCh <- result{idx: j.idx, out: out, err: err}
				n := done.Add(1)
				if n%10 == 0 {
					log.Printf("progress: %d / %d", n, len(pending))
				}
			}
		}()
	}

	for _, idx := range pending {
		jobCh <- job{idx: idx}
	}
	close(jobCh)

	go func() {
		wg.Wait()
		close(resCh)
	}()

	failed := 0
	for r := range resCh {
		if r.err != nil {
			failed++
			log.Printf("question %s #%d: %v", questions[r.idx].TestName, questions[r.idx].Position, r.err)
			continue
		}
		questions[r.idx].Explanation = cleanExplanation(r.out)
	}

	out, err := json.MarshalIndent(questions, "", "  ")
	if err != nil {
		log.Fatalf("marshal: %v", err)
	}
	if err := writeAtomic(*inputPath, out); err != nil {
		log.Fatalf("write %s: %v", *inputPath, err)
	}
	log.Printf("done. processed=%d failed=%d wrote=%s", len(pending), failed, *inputPath)
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
		return azureConfig{}, fmt.Errorf("AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, AZURE_OPENAI_DEPLOYMENT are required")
	}
	return azureConfig{
		Endpoint:   strings.TrimRight(endpoint, "/"),
		APIKey:     apiKey,
		APIVersion: apiVersion,
		Deployment: deployment,
	}, nil
}

func buildPrompt(q seedQuestion) string {
	var b strings.Builder
	fmt.Fprintf(&b, "Section: %s\n", q.Section)
	fmt.Fprintf(&b, "Question: %s\n", q.Prompt)
	for i, opt := range q.Options {
		letter := string(rune('A' + i))
		fmt.Fprintf(&b, "%s) %s\n", letter, opt)
	}
	fmt.Fprintf(&b, "Correct answer: %s\n", q.Answer)
	fmt.Fprintf(&b, "\nWrite the step-by-step solution.")
	return b.String()
}

func generateExplanation(ctx context.Context, client *http.Client, cfg azureConfig, q seedQuestion) (string, error) {
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

	body := requestPayload{
		Messages: []message{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: buildPrompt(q)},
		},
		Temperature:         0.2,
		MaxCompletionTokens: 1500,
	}
	bodyBytes, _ := json.Marshal(body)
	url := fmt.Sprintf("%s/openai/deployments/%s/chat/completions?api-version=%s",
		cfg.Endpoint, cfg.Deployment, cfg.APIVersion)

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
		respBody, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode == http.StatusTooManyRequests && attempt < len(backoff) {
			time.Sleep(backoff[attempt] * time.Second)
			continue
		}
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			return "", fmt.Errorf("azure %d: %s", resp.StatusCode, truncate(string(respBody), 200))
		}
		var parsed responsePayload
		if err := json.Unmarshal(respBody, &parsed); err != nil {
			return "", err
		}
		if len(parsed.Choices) == 0 {
			return "", fmt.Errorf("empty response")
		}
		return parsed.Choices[0].Message.Content, nil
	}
}

// cleanExplanation strips markdown header prefixes and emphasis markers
// the model occasionally emits despite prompt instructions. MathText only
// renders LaTeX delimiters, so leftover "### Step" or "**bold**" would
// otherwise display literally.
func cleanExplanation(raw string) string {
	lines := strings.Split(strings.TrimSpace(raw), "\n")
	out := make([]string, 0, len(lines))
	for _, line := range lines {
		trimmed := strings.TrimLeft(line, " \t")
		// Strip leading markdown header marks: #, ##, ###, etc.
		for strings.HasPrefix(trimmed, "#") {
			trimmed = strings.TrimPrefix(trimmed, "#")
		}
		trimmed = strings.TrimLeft(trimmed, " ")
		// Drop ** ... ** emphasis but keep the inner text.
		trimmed = strings.ReplaceAll(trimmed, "**", "")
		out = append(out, trimmed)
	}
	return strings.TrimSpace(strings.Join(out, "\n"))
}

func writeAtomic(path string, data []byte) error {
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
