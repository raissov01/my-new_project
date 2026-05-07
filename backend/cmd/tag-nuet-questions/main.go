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

// Math topic syllabus the model must pick from. Mirrors the slugs in
// internal/database/nuet_official_syllabus.go (Math, 27 topics). CT is
// not LLM-tagged here — the keyword classifier already covers CT 100%
// via the problem-solving fallback.
var mathSyllabus = []struct {
	Slug, Title, Hint string
}{
	{"standard-and-compound-units", "Standard and Compound Units", "km/h, m/s, density, pressure, unit conversion"},
	{"algebraic-expressions", "Algebraic Expressions", "simplify, expand, factor, polynomial, like terms"},
	{"exponents", "Exponents", "a^n, index laws, negative/fractional exponents, scientific notation"},
	{"ratio-and-proportion", "Ratio and Proportion", "ratio, share in ratio, scale, equivalent ratios"},
	{"two-types-of-variations", "Two Types of Variations", "directly/inversely proportional, y = kx, y = k/x"},
	{"percents", "Percents", "percent, percentage increase/decrease, reverse percentage"},
	{"word-problems", "Word Problems", "verbal scenario translated into equations: mixture, age, distance"},
	{"linear-inequalities", "Linear Inequalities", "ax + b < c, sign flip, compound inequalities, absolute value"},
	{"slope-of-the-line", "Slope of the Line", "gradient, slope formula, parallel/perpendicular lines, equation of line"},
	{"transformations", "Transformations", "f(x-h)+k, translate, reflect, stretch a graph"},
	{"quadratic-functions", "Quadratic Functions", "ax^2+bx+c, vertex, completing the square, discriminant"},
	{"examples-of-quadratic-functions", "Examples of Quadratic Functions", "projectile, area optimisation, profit/cost"},
	{"graphs-of-quadratic-functions", "Graphs of Quadratic Functions", "sketch parabola, roots, vertex, axis of symmetry"},
	{"quadratic-inequalities", "Quadratic Inequalities", "ax^2+bx+c > 0 or < 0, sign analysis"},
	{"rational-expressions", "Rational Expressions", "p(x)/q(x), simplify, common denominator, complex fractions"},
	{"sequences", "Sequences", "nth term, arithmetic, geometric, recurrence, sum"},
	{"nonlinear-equations", "Nonlinear Equations", "radical, absolute value, fractional equations, extraneous solutions"},
	{"geometry", "Geometry", "general angles, parallel lines, congruence, similarity"},
	{"exponential-functions", "Exponential Functions", "y = a*b^x, growth/decay, half-life, doubling"},
	{"symbol-functions", "Symbol Functions", "custom operator a★b = ..., interpret and compute"},
	{"triangles", "Triangles", "Pythagoras, similar triangles, area = 1/2 ab sin C"},
	{"vectors", "Vectors", "vector, magnitude, dot/cross product, position vector"},
	{"bearings", "Bearings", "bearing, due north/south, compass directions"},
	{"polygons", "Polygons", "rhombus, kite, trapezium, regular polygon, interior angle"},
	{"circles", "Circles", "chord, tangent, circumference, sector, circle theorem"},
	{"3d-figures", "3D Figures", "cylinder, sphere, cone, surface area, volume of solid"},
	{"trigonometry", "Trigonometry", "sin/cos/tan, sine rule, cosine rule, identities"},
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
