// tag-nuet-questions assigns a topic slug to every NUET question whose
// keyword classifier currently returns no match. It calls Azure OpenAI with
// the syllabus topic list and writes the chosen slug back into questions.json
// as the optional `topicSlug` field. The seed loader prefers that field
// over the keyword classifier on the next reseed.
//
// Usage:
//
//	go run ./cmd/tag-nuet-questions [-limit N] [-dry-run] [-deployment NAME]
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
	"github.com/midoriya/flashlearn-backend/internal/database"
)

type seedQuestion struct {
	TestName    string   `json:"testName"`
	Position    int      `json:"position"`
	Section     string   `json:"section"`
	Prompt      string   `json:"prompt"`
	Options     []string `json:"options"`
	Answer      string   `json:"answer"`
	Explanation string   `json:"explanation"`
	TopicSlug   string   `json:"topicSlug,omitempty"`
}

type azureConfig struct {
	Endpoint   string
	APIKey     string
	APIVersion string
	Deployment string
}

// Math topic syllabus the model must pick from. Keep in sync with the slugs
// produced by cmd/seed-nuet (Telegram-derived) and CT slugs in seed-nuet.
// Critical Thinking is not LLM-tagged here — the keyword classifier already
// covers CT 100% via the problem-solving fallback.
var mathSyllabus = []struct {
	Slug, Title, Hint string
}{
	{"direct-and-inverse-proportion", "Direct and Inverse Proportion", "y ∝ x or y ∝ 1/x, varies as, ratio"},
	{"recurring-decimals", "Recurring Decimals", "0.\\overline{ab}, repeating decimal to fraction"},
	{"algebraic-simplification-with-x-variable", "Algebraic Simplification (with x variable)", "simplify, factor, expand, polynomial, solve for x, inequalities, equations of curves"},
	{"circle-theorems-especially-with-chords", "Circle Theorems (especially with chords)", "chord, inscribed angle, tangent to circle, cyclic quadrilateral"},
	{"percentages-word-problem-decrease-increase", "Percentages Word Problem (decrease/increase)", "percent, percentage change, profit, loss, discount"},
	{"rounding-to-significant-figures-standard-form", "Rounding / Significant Figures / Standard Form", "round to N sig figs, scientific notation, a × 10^n"},
	{"graph-transformation-usually-parabola", "Graph Transformation (usually Parabola)", "f(x+a), translate, reflect, stretch, transformation of curve"},
	{"vertex-turning-point-of-parabola", "Vertex / Turning Point of Parabola", "vertex, turning point, max/min value, axis of symmetry"},
	{"vectors", "Vectors", "vector, magnitude, dot/cross product, position vector"},
	{"bearings", "Bearings", "bearing, due north/south, compass directions"},
	{"parallel-and-perpendicular-lines", "Parallel and Perpendicular Lines", "parallel lines, perpendicular slope, line through points"},
	{"coordinate-geometry", "Coordinate Geometry", "midpoint, distance formula, line through points, gradient"},
	{"rhombus-kite-trapezium", "Rhombus / Kite / Trapezium", "rhombus, kite, trapezium, parallelogram (quadrilateral types)"},
	{"trigonometry-in-right-angled-triangle", "Trigonometry in Right-Angled Triangle", "sin/cos/tan, hypotenuse, opposite, adjacent"},
	{"exponents-with-bases-2-3-and-5", "Exponents (bases 2, 3, 5, 10)", "a^n, index laws, log base 2/3/5/10"},
	{"real-life-graphs-velocity-time", "Real-life Graphs (Velocity-Time)", "velocity-time, distance-time, speed-time graph"},
	{"compound-3d-figure-cylinder-sphere-cone", "Compound 3D Figures (Cylinder/Sphere/Cone)", "cylinder, sphere, cone, surface area, volume of solid"},
}

const systemPrompt = `You are a NUET Math syllabus tagger. The user gives a single math question; you reply with exactly one topic slug from the provided list, or the literal word "skip" if none fit. No prose, no explanation, just the slug.`

func main() {
	input := flag.String("input", "internal/database/nuet_seed_data/questions.json", "path to questions.json")
	limit := flag.Int("limit", 0, "max questions to tag (0 = all unmatched)")
	workers := flag.Int("workers", 4, "concurrent API workers")
	dryRun := flag.Bool("dry-run", false, "print prompts only; no API calls or file writes")
	deploymentOverride := flag.String("deployment", "", "override AZURE_OPENAI_DEPLOYMENT")
	overwrite := flag.Bool("overwrite", false, "re-tag even questions that already have topicSlug")
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

	buf, err := os.ReadFile(*input)
	if err != nil {
		log.Fatalf("read %s: %v", *input, err)
	}
	var qs []seedQuestion
	if err := json.Unmarshal(buf, &qs); err != nil {
		log.Fatalf("parse: %v", err)
	}
	log.Printf("loaded %d questions", len(qs))

	pending := make([]int, 0)
	for i, q := range qs {
		if q.Section != "math" {
			continue
		}
		if !*overwrite && strings.TrimSpace(q.TopicSlug) != "" {
			continue
		}
		if database.ClassifyNUETTopic(q.Prompt, q.Options, q.Section) != "" {
			continue
		}
		pending = append(pending, i)
	}
	log.Printf("unmatched math questions: %d", len(pending))
	if *limit > 0 && len(pending) > *limit {
		pending = pending[:*limit]
		log.Printf("limited to first %d", *limit)
	}
	if len(pending) == 0 {
		log.Printf("nothing to do")
		return
	}

	allowed := map[string]struct{}{}
	for _, t := range mathSyllabus {
		allowed[t.Slug] = struct{}{}
	}

	if *dryRun {
		log.Printf("[dry-run] sample prompt:\n%s", buildPrompt(qs[pending[0]]))
		return
	}

	ctx := context.Background()
	client := &http.Client{Timeout: 60 * time.Second}

	type result struct {
		idx  int
		slug string
		err  error
	}
	jobCh := make(chan int, len(pending))
	resCh := make(chan result, len(pending))

	var wg sync.WaitGroup
	var done atomic.Int64
	for w := 0; w < *workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for idx := range jobCh {
				slug, err := classify(ctx, client, cfg, qs[idx])
				resCh <- result{idx: idx, slug: slug, err: err}
				n := done.Add(1)
				if n%10 == 0 {
					log.Printf("progress: %d / %d", n, len(pending))
				}
			}
		}()
	}
	for _, idx := range pending {
		jobCh <- idx
	}
	close(jobCh)
	go func() { wg.Wait(); close(resCh) }()

	tagged, skipped, failed := 0, 0, 0
	for r := range resCh {
		if r.err != nil {
			failed++
			log.Printf("question %s #%d: %v", qs[r.idx].TestName, qs[r.idx].Position, r.err)
			continue
		}
		slug := strings.TrimSpace(strings.ToLower(r.slug))
		if slug == "" || slug == "skip" {
			skipped++
			continue
		}
		if _, ok := allowed[slug]; !ok {
			log.Printf("question %s #%d: unknown slug %q (skipping)", qs[r.idx].TestName, qs[r.idx].Position, slug)
			skipped++
			continue
		}
		qs[r.idx].TopicSlug = slug
		tagged++
	}

	out, err := json.MarshalIndent(qs, "", "  ")
	if err != nil {
		log.Fatalf("marshal: %v", err)
	}
	tmp := *input + ".tmp"
	if err := os.WriteFile(tmp, out, 0o644); err != nil {
		log.Fatalf("write: %v", err)
	}
	if err := os.Rename(tmp, *input); err != nil {
		log.Fatalf("rename: %v", err)
	}
	log.Printf("done. tagged=%d skipped=%d failed=%d wrote=%s", tagged, skipped, failed, *input)
}

func buildPrompt(q seedQuestion) string {
	var b strings.Builder
	fmt.Fprintln(&b, "Available topics (slug — title — hint):")
	for _, t := range mathSyllabus {
		fmt.Fprintf(&b, "- %s — %s — %s\n", t.Slug, t.Title, t.Hint)
	}
	fmt.Fprintln(&b)
	fmt.Fprintln(&b, "Question:")
	fmt.Fprintln(&b, q.Prompt)
	for i, opt := range q.Options {
		fmt.Fprintf(&b, "%s) %s\n", string(rune('A'+i)), opt)
	}
	fmt.Fprintln(&b)
	fmt.Fprintln(&b, `Reply with exactly one slug from the list above, or the word "skip" if none fits. No quotes, no explanation.`)
	return b.String()
}

func classify(ctx context.Context, client *http.Client, cfg azureConfig, q seedQuestion) (string, error) {
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
		Temperature:         0.0,
		MaxCompletionTokens: 30,
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
