package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/ledongthuc/pdf"
	"github.com/midoriya/flashlearn-backend/internal/config"
	"github.com/midoriya/flashlearn-backend/internal/database"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

const extractionPrompt = `You extract MCQ questions from a NUET (Nazarbayev University Entrance
Test) exam PDF. The PDF contains exactly 60 questions: numbers 1-30
are Math, 31-60 are Critical Thinking.

Return STRICT JSON array of 60 objects (no prose, no markdown):
[{
  "questionNumber": int 1..60,
  "section": "math" if 1-30 else "critical_thinking",
  "prompt": "full question text. Use LaTeX $...$ for inline math, $$...$$ block. Preserve units, signs, exponents.",
  "diagramDescription": "if a figure exists describe it (else null)",
  "options": ["option A text", "option B text", "option C text", "option D text", "option E text"],
  "answer": "A"|"B"|"C"|"D"|"E",
  "explanation": "text if shown, else null"
}, ...]

Rules:
- Skip cover, instructions, blank pages.
- If answer key is on a separate page (e.g., "Ans: 1.A 2.B..."), match
  each answer to its question by number.
- If you can't find some questions or answers, still return the ones you
  could read. Don't fabricate.
- Output JSON only.`

type modelConfig struct {
	Deployment string
	InputPerM  float64
	OutputPerM float64
	Label      string
}

type azureConfig struct {
	Endpoint   string
	APIKey     string
	APIVersion string
	Model      modelConfig
}

type usageTotals struct {
	PromptTokens     int64
	CandidateTokens  int64
	EstimatedCostUSD float64
}

type extractedQuestion struct {
	QuestionNumber     int      `json:"questionNumber"`
	Section            string   `json:"section"`
	Prompt             string   `json:"prompt"`
	DiagramDescription *string  `json:"diagramDescription"`
	Options            []string `json:"options"`
	Answer             string   `json:"answer"`
	Explanation        *string  `json:"explanation"`
}

type dryRunPayload struct {
	Name      string              `json:"name"`
	Questions []extractedQuestion `json:"questions"`
}

func main() {
	var (
		testFlag  string
		dryRun    bool
		budgetUSD float64
		modelFlag string
	)

	flag.StringVar(&testFlag, "test", "all", "single test name (e.g. \"NUET Mock 1\") or all")
	flag.BoolVar(&dryRun, "dryrun", false, "extract only, print JSON to stdout, skip DB writes")
	flag.Float64Var(&budgetUSD, "budget", 5, "max allowed estimated spend in USD")
	flag.StringVar(&modelFlag, "model", "pro", "model tier alias: pro or flash")
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	azure, err := loadAzureConfig(modelFlag)
	if err != nil {
		log.Fatalf("azure config: %v", err)
	}

	db, err := database.ConnectGorm(cfg.DatabaseURL, cfg.Environment)
	if err != nil {
		log.Fatalf("db: %v", err)
	}

	tests, err := loadTargetTests(db, testFlag)
	if err != nil {
		log.Fatalf("load tests: %v", err)
	}
	if len(tests) == 0 {
		log.Fatalf("no nuet_pdf_tests matched -test=%q", testFlag)
	}

	client := &http.Client{Timeout: 10 * time.Minute}
	var totals usageTotals
	dryResults := make([]dryRunPayload, 0, len(tests))

	for _, test := range tests {
		if !dryRun && hasCompleteQuestionSet(db, test) {
			log.Printf("[extract] skip %s: already has complete extracted question set", test.Name)
			continue
		}
		pdfPath, err := resolvePDFPath(test.PDFPath)
		if err != nil {
			log.Printf("[extract] skip %s: %v", test.Name, err)
			continue
		}

		if _, err := os.ReadFile(pdfPath); err != nil {
			log.Printf("[extract] skip %s: read file: %v", test.Name, err)
			continue
		}

		pdfText, err := extractPDFText(pdfPath)
		if err != nil {
			log.Printf("[extract] skip %s: extract text: %v", test.Name, err)
			continue
		}
		if strings.TrimSpace(pdfText) == "" {
			log.Printf("[extract] skip %s: empty extracted text", test.Name)
			continue
		}

		questions, usage, err := extractAndValidate(context.Background(), client, azure, test, pdfPath, pdfText)
		totals.PromptTokens += usage.PromptTokens
		totals.CandidateTokens += usage.CandidateTokens
		totals.EstimatedCostUSD = estimateCostUSD(totals, azure.Model)
		log.Printf(
			"[extract] %s tokens: in=%d out=%d cumulative=$%.4f",
			test.Name, usage.PromptTokens, usage.CandidateTokens, totals.EstimatedCostUSD,
		)

		if budgetUSD > 0 && totals.EstimatedCostUSD > budgetUSD {
			log.Printf("[extract] budget exceeded: $%.4f > $%.4f", totals.EstimatedCostUSD, budgetUSD)
			os.Exit(1)
		}
		if err != nil {
			log.Printf("[extract] failed %s: %v", test.Name, err)
			continue
		}

		if dryRun {
			dryResults = append(dryResults, dryRunPayload{Name: test.Name, Questions: questions})
			continue
		}

		if err := upsertQuestions(context.Background(), db, test, questions); err != nil {
			log.Printf("[extract] upsert failed %s: %v", test.Name, err)
			continue
		}
		log.Printf("[extract] saved %s: %d questions", test.Name, len(questions))
	}

	if dryRun {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		if len(dryResults) == 1 {
			_ = enc.Encode(dryResults[0].Questions)
		} else {
			_ = enc.Encode(dryResults)
		}
	}

	log.Printf(
		"[extract] done deployment=%s total_tokens_in=%d total_tokens_out=%d estimated_cost=$%.4f",
		azure.Model.Deployment,
		totals.PromptTokens,
		totals.CandidateTokens,
		totals.EstimatedCostUSD,
	)
}

func loadAzureConfig(modelFlag string) (azureConfig, error) {
	endpoint := strings.TrimSpace(os.Getenv("AZURE_OPENAI_ENDPOINT"))
	apiKey := strings.TrimSpace(os.Getenv("AZURE_OPENAI_KEY"))
	apiVersion := strings.TrimSpace(os.Getenv("AZURE_OPENAI_API_VERSION"))
	if apiVersion == "" {
		apiVersion = "2025-01-01-preview"
	}
	if endpoint == "" || apiKey == "" {
		return azureConfig{}, fmt.Errorf("AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_KEY are required")
	}

	defaultDeployment := strings.TrimSpace(os.Getenv("AZURE_OPENAI_DEPLOYMENT"))
	if defaultDeployment == "" {
		return azureConfig{}, fmt.Errorf("AZURE_OPENAI_DEPLOYMENT is required")
	}
	proDeployment := strings.TrimSpace(os.Getenv("AZURE_OPENAI_DEPLOYMENT_PRO"))
	if proDeployment == "" {
		proDeployment = defaultDeployment
	}
	flashDeployment := strings.TrimSpace(os.Getenv("AZURE_OPENAI_DEPLOYMENT_FLASH"))
	if flashDeployment == "" {
		flashDeployment = defaultDeployment
	}

	modelFlag = strings.ToLower(strings.TrimSpace(modelFlag))
	model := modelConfig{}
	switch modelFlag {
	case "", "pro":
		model = modelConfig{
			Deployment: proDeployment,
			InputPerM:  getEnvFloat("AZURE_OPENAI_PRO_INPUT_PER_M", getEnvFloat("AZURE_OPENAI_INPUT_PER_M", 0.15)),
			OutputPerM: getEnvFloat("AZURE_OPENAI_PRO_OUTPUT_PER_M", getEnvFloat("AZURE_OPENAI_OUTPUT_PER_M", 0.60)),
			Label:      "pro",
		}
	case "flash":
		model = modelConfig{
			Deployment: flashDeployment,
			InputPerM:  getEnvFloat("AZURE_OPENAI_FLASH_INPUT_PER_M", getEnvFloat("AZURE_OPENAI_INPUT_PER_M", 0.15)),
			OutputPerM: getEnvFloat("AZURE_OPENAI_FLASH_OUTPUT_PER_M", getEnvFloat("AZURE_OPENAI_OUTPUT_PER_M", 0.60)),
			Label:      "flash",
		}
	default:
		return azureConfig{}, fmt.Errorf("invalid -model=%q (expected pro|flash)", modelFlag)
	}

	return azureConfig{
		Endpoint:   strings.TrimRight(endpoint, "/"),
		APIKey:     apiKey,
		APIVersion: apiVersion,
		Model:      model,
	}, nil
}

func getEnvFloat(key string, fallback float64) float64 {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	var value float64
	if _, err := fmt.Sscanf(raw, "%f", &value); err != nil {
		return fallback
	}
	return value
}

func loadTargetTests(db *gorm.DB, testFlag string) ([]models.NUETPDFTest, error) {
	testFlag = strings.TrimSpace(testFlag)
	var tests []models.NUETPDFTest

	if strings.EqualFold(testFlag, "all") || testFlag == "" {
		if err := db.Order("test_type ASC, name ASC").Find(&tests).Error; err != nil {
			return nil, err
		}
		return tests, nil
	}
	if err := db.Where("LOWER(name) = LOWER(?)", testFlag).Find(&tests).Error; err != nil {
		return nil, err
	}
	return tests, nil
}

func resolvePDFPath(pdfPath string) (string, error) {
	normalized := filepath.FromSlash(strings.TrimSpace(pdfPath))
	if normalized == "" {
		return "", fmt.Errorf("empty pdf_path")
	}
	candidates := []string{
		filepath.Join("telegram-media", normalized),
		filepath.Join("backend", "telegram-media", normalized),
	}
	for _, candidate := range candidates {
		if _, err := os.Stat(candidate); err == nil {
			return candidate, nil
		}
	}
	return "", fmt.Errorf("pdf file not found for path %q", pdfPath)
}

func hasCompleteQuestionSet(db *gorm.DB, test models.NUETPDFTest) bool {
	expectedCount := expectedQuestionCount(test)
	var count int64
	if err := db.Model(&models.NUETQuestion{}).Where("pdf_test_id = ?", test.ID).Count(&count).Error; err != nil {
		return false
	}
	return int(count) >= expectedCount
}

func expectedQuestionCount(test models.NUETPDFTest) int {
	expectedCount := test.MathCount + test.CTCount
	if expectedCount == 0 {
		return 60
	}
	return expectedCount
}

func extractPDFText(filePath string) (string, error) {
	f, reader, err := pdf.Open(filePath)
	if err != nil {
		return "", err
	}
	defer f.Close()

	var buf bytes.Buffer
	for i := 1; i <= reader.NumPage(); i++ {
		page := reader.Page(i)
		if page.V.IsNull() {
			continue
		}
		text, err := page.GetPlainText(nil)
		if err != nil {
			continue
		}
		buf.WriteString(text)
		buf.WriteByte('\n')
	}
	return strings.TrimSpace(buf.String()), nil
}

func extractAndValidate(
	ctx context.Context,
	client *http.Client,
	cfg azureConfig,
	test models.NUETPDFTest,
	pdfPath string,
	pdfText string,
) ([]extractedQuestion, usageTotals, error) {
	const maxAttempts = 2
	var totalUsage usageTotals
	var lastErr error
	answerKeys := parseAnswerKeys(test.AnswerKeys)

	for attempt := 1; attempt <= maxAttempts; attempt++ {
		raw, usage, err := callAzureExtraction(ctx, client, cfg, pdfText)
		totalUsage.PromptTokens += usage.PromptTokens
		totalUsage.CandidateTokens += usage.CandidateTokens
		if err != nil {
			lastErr = err
			if strings.Contains(err.Error(), "context_length_exceeded") || strings.Contains(err.Error(), "maximum context length") {
				break
			}
			continue
		}

		items, err := parseQuestionsJSON(raw)
		if err != nil {
			lastErr = fmt.Errorf("parse JSON: %w", err)
			continue
		}
		fillMissingAnswers(items, answerKeys)
		validated, warnings, err := validateQuestions(items)
		for _, warning := range warnings {
			log.Printf("[extract] warning: %s", warning)
		}
		if err != nil {
			lastErr = err
			continue
		}
		expectedCount := expectedQuestionCount(test)
		if len(validated) < expectedCount {
			log.Printf("[extract] text extraction returned %d/%d questions for %s, merging image fallback", len(validated), expectedCount, test.Name)
			imageItems, usage, err := extractWithPageImages(ctx, client, cfg, pdfPath, answerKeys)
			totalUsage.PromptTokens += usage.PromptTokens
			totalUsage.CandidateTokens += usage.CandidateTokens
			if err != nil {
				log.Printf("[extract] image fallback failed for %s: %v", test.Name, err)
				return validated, totalUsage, nil
			}
			mergedItems := mergeExtractedQuestions(validated, imageItems)
			fillMissingAnswers(mergedItems, answerKeys)
			mergedValidated, mergeWarnings, err := validateQuestions(mergedItems)
			for _, warning := range mergeWarnings {
				log.Printf("[extract] warning: %s", warning)
			}
			if err == nil {
				return mergedValidated, totalUsage, nil
			}
			log.Printf("[extract] merged validation failed for %s: %v", test.Name, err)
		}
		return validated, totalUsage, nil
	}

	if lastErr != nil && (strings.Contains(lastErr.Error(), "context_length_exceeded") || strings.Contains(lastErr.Error(), "maximum context length")) {
		log.Printf("[extract] text payload too large for Azure, retrying %s as page images", test.Name)
		items, usage, err := extractWithPageImages(ctx, client, cfg, pdfPath, answerKeys)
		totalUsage.PromptTokens += usage.PromptTokens
		totalUsage.CandidateTokens += usage.CandidateTokens
		if err != nil {
			return nil, totalUsage, err
		}
		fillMissingAnswers(items, answerKeys)
		validated, warnings, err := validateQuestions(items)
		for _, warning := range warnings {
			log.Printf("[extract] warning: %s", warning)
		}
		if err != nil {
			return nil, totalUsage, err
		}
		return validated, totalUsage, nil
	}

	if lastErr == nil {
		lastErr = fmt.Errorf("unknown extraction failure")
	}
	return nil, totalUsage, lastErr
}

func callAzureExtraction(
	ctx context.Context,
	client *http.Client,
	cfg azureConfig,
	pdfText string,
) (string, usageTotals, error) {
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
		Usage struct {
			PromptTokens     int64 `json:"prompt_tokens"`
			CompletionTokens int64 `json:"completion_tokens"`
		} `json:"usage"`
	}

	userPrompt := extractionPrompt + "\n\nPDF text:\n" + pdfText
	payload := requestPayload{
		Messages: []message{
			{Role: "system", Content: "Return JSON only. No markdown. No prose."},
			{Role: "user", Content: userPrompt},
		},
		Temperature:         0.1,
		MaxCompletionTokens: 16000,
	}
	bodyBytes, _ := json.Marshal(payload)
	url := fmt.Sprintf(
		"%s/openai/deployments/%s/chat/completions?api-version=%s",
		cfg.Endpoint,
		cfg.Model.Deployment,
		cfg.APIVersion,
	)

	backoffSteps := []time.Duration{
		1 * time.Second,
		2 * time.Second,
		4 * time.Second,
		8 * time.Second,
		16 * time.Second,
	}

	for attempt := 0; ; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(bodyBytes))
		if err != nil {
			return "", usageTotals{}, err
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("api-key", cfg.APIKey)

		resp, err := client.Do(req)
		if err != nil {
			return "", usageTotals{}, err
		}
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode == http.StatusTooManyRequests && attempt < len(backoffSteps) {
			delay := backoffSteps[attempt]
			log.Printf("[extract] rate-limited (429), retrying in %s", delay)
			time.Sleep(delay)
			continue
		}
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			return "", usageTotals{}, fmt.Errorf("azure returned %d: %s", resp.StatusCode, truncate(string(body), 500))
		}

		var parsed responsePayload
		if err := json.Unmarshal(body, &parsed); err != nil {
			return "", usageTotals{}, err
		}
		if len(parsed.Choices) == 0 || strings.TrimSpace(parsed.Choices[0].Message.Content) == "" {
			return "", usageTotals{}, fmt.Errorf("azure returned empty output")
		}
		return cleanJSON(parsed.Choices[0].Message.Content), usageTotals{
			PromptTokens:    parsed.Usage.PromptTokens,
			CandidateTokens: parsed.Usage.CompletionTokens,
		}, nil
	}
}

func extractWithPageImages(
	ctx context.Context,
	client *http.Client,
	cfg azureConfig,
	pdfPath string,
	answerKeys []string,
) ([]extractedQuestion, usageTotals, error) {
	images, cleanup, err := renderPDFPages(pdfPath)
	if err != nil {
		return nil, usageTotals{}, err
	}
	defer cleanup()
	if len(images) == 0 {
		return nil, usageTotals{}, fmt.Errorf("no page images rendered")
	}

	merged := make(map[int]extractedQuestion)
	var totals usageTotals

	for _, chunkSize := range []int{4, 8} {
		for start := 0; start < len(images); start += chunkSize {
			end := start + chunkSize
			if end > len(images) {
				end = len(images)
			}
			raw, usage, err := callAzureImageExtraction(ctx, client, cfg, images[start:end], start+1, end, answerKeys, "")
			totals.PromptTokens += usage.PromptTokens
			totals.CandidateTokens += usage.CandidateTokens
			if err != nil {
				return nil, totals, fmt.Errorf("pages %d-%d: %w", start+1, end, err)
			}
			items, err := parseQuestionsJSON(raw)
			if err != nil {
				log.Printf("[extract] pages %d-%d returned invalid JSON, retrying chunk once: %v", start+1, end, err)
				raw, usage, err = callAzureImageExtraction(ctx, client, cfg, images[start:end], start+1, end, answerKeys, "The previous response was invalid JSON. Escape every LaTeX backslash as double backslash in JSON strings, or use plain text instead of LaTeX. Return only a valid JSON array.")
				totals.PromptTokens += usage.PromptTokens
				totals.CandidateTokens += usage.CandidateTokens
				if err != nil {
					return nil, totals, fmt.Errorf("pages %d-%d retry: %w", start+1, end, err)
				}
				items, err = parseQuestionsJSON(raw)
				if err != nil {
					return nil, totals, fmt.Errorf("pages %d-%d parse JSON: %w", start+1, end, err)
				}
			}
			for _, item := range items {
				item = normalizeGlobalQuestionNumber(item, start+1, len(images))
				if item.QuestionNumber < 1 || item.QuestionNumber > 60 {
					continue
				}
				existing, ok := merged[item.QuestionNumber]
				if !ok || questionQuality(item) > questionQuality(existing) {
					merged[item.QuestionNumber] = item
				}
			}
			log.Printf("[extract] image pages %d-%d yielded %d question objects", start+1, end, len(items))
		}
		if len(merged) >= 60 {
			break
		}
	}

	out := make([]extractedQuestion, 0, len(merged))
	for _, item := range merged {
		out = append(out, item)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].QuestionNumber < out[j].QuestionNumber
	})
	return out, totals, nil
}

func callAzureImageExtraction(
	ctx context.Context,
	client *http.Client,
	cfg azureConfig,
	imagePaths []string,
	pageStart int,
	pageEnd int,
	answerKeys []string,
	extraInstruction string,
) (string, usageTotals, error) {
	type imageURL struct {
		URL    string `json:"url"`
		Detail string `json:"detail,omitempty"`
	}
	type contentPart struct {
		Type     string    `json:"type"`
		Text     string    `json:"text,omitempty"`
		ImageURL *imageURL `json:"image_url,omitempty"`
	}
	type message struct {
		Role    string        `json:"role"`
		Content []contentPart `json:"content"`
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
		Usage struct {
			PromptTokens     int64 `json:"prompt_tokens"`
			CompletionTokens int64 `json:"completion_tokens"`
		} `json:"usage"`
	}

	prompt := extractionPrompt + fmt.Sprintf(`

You are seeing PDF page images %d-%d only. Return the MCQ question objects that are visible on these pages.
Use global NUET numbering: Math is 1-30, Critical Thinking is 31-60.
If the Critical Thinking section visually restarts at 1-30, convert it to 31-60 by adding 30.
If an answer is not printed on these pages, use the answer key below for that question number when available.
If a question continues from a previous/next page, include all visible text and do not invent missing text.

Answer key by question number:
%s`, pageStart, pageEnd, formatAnswerKeys(answerKeys))
	if strings.TrimSpace(extraInstruction) != "" {
		prompt += "\n\n" + strings.TrimSpace(extraInstruction)
	}

	parts := []contentPart{{Type: "text", Text: prompt}}
	for _, imagePath := range imagePaths {
		data, err := os.ReadFile(imagePath)
		if err != nil {
			return "", usageTotals{}, err
		}
		parts = append(parts, contentPart{
			Type: "image_url",
			ImageURL: &imageURL{
				URL:    "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(data),
				Detail: "high",
			},
		})
	}

	payload := requestPayload{
		Messages: []message{
			{Role: "user", Content: parts},
		},
		Temperature:         0.1,
		MaxCompletionTokens: 12000,
	}
	bodyBytes, _ := json.Marshal(payload)
	url := fmt.Sprintf(
		"%s/openai/deployments/%s/chat/completions?api-version=%s",
		cfg.Endpoint,
		cfg.Model.Deployment,
		cfg.APIVersion,
	)

	return doAzureRequest(ctx, client, url, cfg.APIKey, bodyBytes, func(body []byte) (string, usageTotals, error) {
		var parsed responsePayload
		if err := json.Unmarshal(body, &parsed); err != nil {
			return "", usageTotals{}, err
		}
		if len(parsed.Choices) == 0 || strings.TrimSpace(parsed.Choices[0].Message.Content) == "" {
			return "", usageTotals{}, fmt.Errorf("azure returned empty output")
		}
		return cleanJSON(parsed.Choices[0].Message.Content), usageTotals{
			PromptTokens:    parsed.Usage.PromptTokens,
			CandidateTokens: parsed.Usage.CompletionTokens,
		}, nil
	})
}

func renderPDFPages(pdfPath string) ([]string, func(), error) {
	tmpDir, err := os.MkdirTemp("", "nuet-pages-*")
	if err != nil {
		return nil, func() {}, err
	}
	cleanup := func() { _ = os.RemoveAll(tmpDir) }
	prefix := filepath.Join(tmpDir, "page")
	cmd := exec.Command("pdftoppm", "-jpeg", "-r", "110", pdfPath, prefix)
	if output, err := cmd.CombinedOutput(); err != nil {
		cleanup()
		return nil, func() {}, fmt.Errorf("pdftoppm: %w: %s", err, truncate(string(output), 500))
	}
	matches, err := filepath.Glob(prefix + "-*.jpg")
	if err != nil {
		cleanup()
		return nil, func() {}, err
	}
	sort.Strings(matches)
	return matches, cleanup, nil
}

func doAzureRequest(
	ctx context.Context,
	client *http.Client,
	url string,
	apiKey string,
	bodyBytes []byte,
	parse func([]byte) (string, usageTotals, error),
) (string, usageTotals, error) {
	backoffSteps := []time.Duration{
		1 * time.Second,
		2 * time.Second,
		4 * time.Second,
		8 * time.Second,
		16 * time.Second,
	}

	for attempt := 0; ; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(bodyBytes))
		if err != nil {
			return "", usageTotals{}, err
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("api-key", apiKey)

		resp, err := client.Do(req)
		if err != nil {
			return "", usageTotals{}, err
		}
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode == http.StatusTooManyRequests && attempt < len(backoffSteps) {
			delay := backoffSteps[attempt]
			log.Printf("[extract] rate-limited (429), retrying in %s", delay)
			time.Sleep(delay)
			continue
		}
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			return "", usageTotals{}, fmt.Errorf("azure returned %d: %s", resp.StatusCode, truncate(string(body), 500))
		}
		return parse(body)
	}
}

func parseQuestionsJSON(raw string) ([]extractedQuestion, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, fmt.Errorf("empty JSON payload")
	}

	var items []extractedQuestion
	if err := json.Unmarshal([]byte(raw), &items); err == nil {
		return items, nil
	}
	repaired := repairJSONEscapes(raw)
	if repaired != raw {
		if err := json.Unmarshal([]byte(repaired), &items); err == nil {
			return items, nil
		}
		raw = repaired
	}

	var wrapped struct {
		Questions []extractedQuestion `json:"questions"`
		Items     []extractedQuestion `json:"items"`
	}
	if err := json.Unmarshal([]byte(raw), &wrapped); err != nil {
		return nil, err
	}
	if len(wrapped.Questions) > 0 {
		return wrapped.Questions, nil
	}
	if len(wrapped.Items) > 0 {
		return wrapped.Items, nil
	}
	return nil, fmt.Errorf("JSON is not a question array")
}

func repairJSONEscapes(raw string) string {
	var b strings.Builder
	b.Grow(len(raw) + 16)
	for i := 0; i < len(raw); i++ {
		ch := raw[i]
		if ch != '\\' || i+1 >= len(raw) {
			b.WriteByte(ch)
			continue
		}
		next := raw[i+1]
		switch next {
		case '"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u':
			b.WriteByte(ch)
		default:
			b.WriteString(`\\`)
		}
	}
	return b.String()
}

func validateQuestions(items []extractedQuestion) ([]extractedQuestion, []string, error) {
	if len(items) == 0 {
		return nil, nil, fmt.Errorf("no questions extracted")
	}
	if len(items) > 60 {
		return nil, nil, fmt.Errorf("invalid question count: %d > 60", len(items))
	}

	seen := make(map[int]bool, len(items))
	validated := make([]extractedQuestion, 0, len(items))
	warnings := make([]string, 0, 8)

	for _, item := range items {
		if item.QuestionNumber < 1 || item.QuestionNumber > 60 {
			return nil, warnings, fmt.Errorf("questionNumber out of range: %d", item.QuestionNumber)
		}
		if seen[item.QuestionNumber] {
			return nil, warnings, fmt.Errorf("duplicate questionNumber: %d", item.QuestionNumber)
		}
		seen[item.QuestionNumber] = true

		item.Prompt = strings.TrimSpace(item.Prompt)
		if item.Prompt == "" {
			return nil, warnings, fmt.Errorf("question %d: prompt is empty", item.QuestionNumber)
		}

		item.Section = expectedSection(item.QuestionNumber)
		item.Answer = normalizeAnswer(item.Answer)
		if item.Answer == "" {
			warnings = append(warnings, fmt.Sprintf("question %d: answer missing or not A..E", item.QuestionNumber))
		}

		options := make([]string, 0, len(item.Options))
		for _, option := range item.Options {
			options = append(options, strings.TrimSpace(option))
		}
		switch len(options) {
		case 5:
		case 0, 1, 2, 3, 4:
			warnings = append(warnings, fmt.Sprintf("question %d: only %d options found; padded to 5", item.QuestionNumber, len(options)))
			for len(options) < 5 {
				options = append(options, "")
			}
		default:
			if len(options) > 5 {
				warnings = append(warnings, fmt.Sprintf("question %d: %d options found; trimmed to 5", item.QuestionNumber, len(options)))
				options = options[:5]
			} else {
				return nil, warnings, fmt.Errorf("question %d: options.length=%d (expected 5)", item.QuestionNumber, len(options))
			}
		}
		item.Options = options

		if item.DiagramDescription != nil {
			diagram := strings.TrimSpace(*item.DiagramDescription)
			if diagram != "" {
				item.Prompt = item.Prompt + "\n\n[Figure: " + diagram + "]"
			}
		}
		if item.Explanation != nil {
			exp := strings.TrimSpace(*item.Explanation)
			item.Explanation = &exp
		}
		validated = append(validated, item)
	}

	sort.Slice(validated, func(i, j int) bool {
		return validated[i].QuestionNumber < validated[j].QuestionNumber
	})
	return validated, warnings, nil
}

func upsertQuestions(
	ctx context.Context,
	db *gorm.DB,
	test models.NUETPDFTest,
	questions []extractedQuestion,
) error {
	for _, question := range questions {
		optionsJSON, _ := json.Marshal(question.Options)
		explanation := ""
		if question.Explanation != nil {
			explanation = strings.TrimSpace(*question.Explanation)
		}
		source := fmt.Sprintf("%s #%d", test.Name, question.QuestionNumber)

		if err := db.WithContext(ctx).Exec(`
			INSERT INTO nuet_questions (
				pdf_test_id, position, topic_id, section, question_type,
				difficulty, prompt, options, answer, explanation, source, created_at, updated_at
			) VALUES (
				?, ?, NULL, ?, 'multiple_choice',
				'medium', ?, ?::jsonb, ?, ?, ?, NOW(), NOW()
			)
			ON CONFLICT (pdf_test_id, position) WHERE pdf_test_id IS NOT NULL
			DO UPDATE SET
				topic_id = NULL,
				section = EXCLUDED.section,
				question_type = 'multiple_choice',
				difficulty = 'medium',
				prompt = EXCLUDED.prompt,
				options = EXCLUDED.options,
				answer = EXCLUDED.answer,
				explanation = EXCLUDED.explanation,
				source = EXCLUDED.source,
				updated_at = NOW()
		`,
			test.ID,
			question.QuestionNumber,
			question.Section,
			question.Prompt,
			string(optionsJSON),
			question.Answer,
			explanation,
			source,
		).Error; err != nil {
			return fmt.Errorf("position %d: %w", question.QuestionNumber, err)
		}
	}
	return nil
}

func parseAnswerKeys(raw *string) []string {
	if raw == nil || strings.TrimSpace(*raw) == "" {
		return nil
	}
	var keys []string
	if err := json.Unmarshal([]byte(*raw), &keys); err != nil {
		return nil
	}
	for i := range keys {
		keys[i] = normalizeAnswer(keys[i])
	}
	return keys
}

func fillMissingAnswers(items []extractedQuestion, answerKeys []string) {
	if len(answerKeys) == 0 {
		return
	}
	for i := range items {
		if normalizeAnswer(items[i].Answer) != "" {
			continue
		}
		n := items[i].QuestionNumber
		if n >= 1 && n <= len(answerKeys) {
			items[i].Answer = answerKeys[n-1]
		}
	}
}

func mergeExtractedQuestions(primary []extractedQuestion, secondary []extractedQuestion) []extractedQuestion {
	merged := make(map[int]extractedQuestion, len(primary)+len(secondary))
	for _, item := range primary {
		if item.QuestionNumber >= 1 && item.QuestionNumber <= 60 {
			merged[item.QuestionNumber] = item
		}
	}
	for _, item := range secondary {
		if item.QuestionNumber < 1 || item.QuestionNumber > 60 {
			continue
		}
		existing, ok := merged[item.QuestionNumber]
		if !ok || questionQuality(item) > questionQuality(existing) {
			merged[item.QuestionNumber] = item
		}
	}
	out := make([]extractedQuestion, 0, len(merged))
	for _, item := range merged {
		out = append(out, item)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].QuestionNumber < out[j].QuestionNumber
	})
	return out
}

func formatAnswerKeys(keys []string) string {
	if len(keys) == 0 {
		return "none"
	}
	parts := make([]string, 0, len(keys))
	for i, key := range keys {
		if key == "" {
			continue
		}
		parts = append(parts, fmt.Sprintf("%d.%s", i+1, key))
	}
	if len(parts) == 0 {
		return "none"
	}
	return strings.Join(parts, " ")
}

func questionQuality(item extractedQuestion) int {
	score := len(strings.TrimSpace(item.Prompt))
	score += len(item.Options) * 20
	for _, option := range item.Options {
		score += len(strings.TrimSpace(option))
	}
	if normalizeAnswer(item.Answer) != "" {
		score += 50
	}
	return score
}

func normalizeGlobalQuestionNumber(item extractedQuestion, pageStart int, totalPages int) extractedQuestion {
	section := strings.ToLower(strings.TrimSpace(item.Section))
	looksLikeCritical := section == "critical_thinking" || strings.Contains(section, "critical")
	if totalPages > 0 && pageStart > totalPages/2 {
		looksLikeCritical = true
	}
	if looksLikeCritical && item.QuestionNumber >= 1 && item.QuestionNumber <= 30 {
		item.QuestionNumber += 30
		item.Section = "critical_thinking"
	}
	return item
}

func estimateCostUSD(usage usageTotals, model modelConfig) float64 {
	inputCost := (float64(usage.PromptTokens) / 1_000_000.0) * model.InputPerM
	outputCost := (float64(usage.CandidateTokens) / 1_000_000.0) * model.OutputPerM
	return inputCost + outputCost
}

func expectedSection(questionNumber int) string {
	if questionNumber >= 31 {
		return "critical_thinking"
	}
	return "math"
}

func normalizeAnswer(value string) string {
	value = strings.ToUpper(strings.TrimSpace(value))
	if value == "" {
		return ""
	}
	switch value[0] {
	case 'A', 'B', 'C', 'D', 'E':
		return value[:1]
	default:
		return ""
	}
}

func cleanJSON(raw string) string {
	raw = strings.TrimSpace(raw)
	raw = strings.TrimPrefix(raw, "```json")
	raw = strings.TrimPrefix(raw, "```")
	raw = strings.TrimSuffix(raw, "```")
	return strings.TrimSpace(raw)
}

func truncate(value string, max int) string {
	if len(value) <= max {
		return value
	}
	return value[:max] + "..."
}
