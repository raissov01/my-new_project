package main

// PDF → Flashcards importer
//
// Usage:
//   go run ./cmd/pdf-flashcards --list
//   go run ./cmd/pdf-flashcards --file "collins vocabulary" --mode ielts-vocab --count 80
//   go run ./cmd/pdf-flashcards --file "essay ideas"       --mode ielts-tips  --count 40
//   go run ./cmd/pdf-flashcards --file "speaking"          --mode ielts-speaking --count 60
//   go run ./cmd/pdf-flashcards --user-id <uuid>           --file "collins"
//
// Modes:
//   ielts-vocab    — IELTS vocabulary (word + definition + collocations + synonyms)
//   ielts-tips     — IELTS strategies and tips
//   ielts-speaking — Speaking practice questions with model answers
//   vocabulary     — General vocabulary
//   mixed          — Auto-detect

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
	"unicode"

	"github.com/joho/godotenv"
	"github.com/ledongthuc/pdf"
	"github.com/midoriya/flashlearn-backend/internal/config"
	"github.com/midoriya/flashlearn-backend/internal/database"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

const (
	mediaDir     = "telegram-media"
	defaultCount = 60
	maxCount     = 400
	batchSize    = 50
	maxTextRunes = 40000
	minTextLen   = 100
)

func main() {
	_ = godotenv.Load()

	listFlag   := flag.Bool("list", false, "List all available PDF files")
	fileFlag   := flag.String("file", "", "Filename pattern to match (partial, case-insensitive)")
	modeFlag   := flag.String("mode", "ielts-vocab", "ielts-vocab | ielts-tips | ielts-speaking | vocabulary | mixed")
	countFlag  := flag.Int("count", defaultCount, "Number of flashcards to generate")
	langFlag   := flag.String("lang", "en", "Output language: en | ru | kk")
	userIDFlag := flag.String("user-id", "", "User UUID to own the set (default: first teacher in DB)")
	pagesFlag  := flag.Int("pages", 0, "Max PDF pages to read (0 = all)")
	flag.Parse()

	if *listFlag {
		listFiles()
		return
	}

	if *fileFlag == "" {
		fmt.Println("Usage:")
		fmt.Println("  --list                         List all PDF files")
		fmt.Println("  --file <name>                  Fuzzy filename match")
		fmt.Println("  --mode ielts-vocab|ielts-tips|ielts-speaking|vocabulary|mixed")
		fmt.Println("  --count N                      Cards to generate (default 60)")
		fmt.Println("  --lang en|ru|kk                Output language (default en)")
		fmt.Println("  --user-id <uuid>               Owner user ID")
		fmt.Println("  --pages N                      Max pages to read (default all)")
		os.Exit(1)
	}

	if *countFlag < 5 {
		*countFlag = 5
	}
	if *countFlag > maxCount {
		*countFlag = maxCount
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	if cfg.OpenAIAPIKey == "" && cfg.GeminiAPIKey == "" {
		log.Fatalf("OPENAI_API_KEY or GEMINI_API_KEY must be set in .env")
	}

	db, err := database.ConnectGorm(cfg.DatabaseURL, cfg.Environment)
	if err != nil {
		log.Fatalf("database: %v", err)
	}

	// Resolve owner user
	userID := *userIDFlag
	if userID == "" {
		userID, err = findDefaultUser(db)
		if err != nil {
			log.Fatalf("no user found — use --user-id <uuid>: %v", err)
		}
		log.Printf("[pdf-flashcards] using user: %s", userID)
	}

	// Find matching file
	matches := findFiles(*fileFlag)
	if len(matches) == 0 {
		fmt.Printf("No files matching %q in %s/\n", *fileFlag, mediaDir)
		fmt.Println("Run --list to see available files.")
		os.Exit(1)
	}
	if len(matches) > 1 {
		fmt.Printf("Multiple matches for %q — be more specific:\n", *fileFlag)
		for _, m := range matches {
			fmt.Printf("  %s\n", filepath.Base(m))
		}
		os.Exit(1)
	}

	filePath := matches[0]
	fileName := filepath.Base(filePath)
	log.Printf("[pdf-flashcards] file: %s", fileName)
	log.Printf("[pdf-flashcards] mode=%s count=%d lang=%s", *modeFlag, *countFlag, *langFlag)

	// Extract PDF text
	text, err := extractPDFText(filePath, *pagesFlag)
	if err != nil {
		log.Fatalf("extract PDF: %v", err)
	}
	text = strings.TrimSpace(text)
	if len(text) < minTextLen {
		log.Fatalf("extracted text too short (%d chars) — PDF may be image-based/scanned", len(text))
	}
	log.Printf("[pdf-flashcards] extracted %d chars", len(text))

	// Trim to limit
	text = limitText(text, *countFlag)

	// Generate flashcards
	cards, err := generateAll(text, *modeFlag, *langFlag, *countFlag, fileName, cfg)
	if err != nil {
		log.Fatalf("generate: %v", err)
	}
	log.Printf("[pdf-flashcards] generated %d cards", len(cards))

	// Save to database
	title := buildTitle(fileName, *modeFlag)
	desc := fmt.Sprintf("Auto-generated from %s • mode: %s", fileName, *modeFlag)
	setID, err := saveFlashcards(db, userID, title, desc, cards)
	if err != nil {
		log.Fatalf("save: %v", err)
	}

	fmt.Printf("\n✓ FlashcardSet created\n  Title: %s\n  Cards: %d\n  ID:    %s\n", title, len(cards), setID)
}

// ── File helpers ─────────────────────────────────────────────────────────────

func listFiles() {
	entries, _ := os.ReadDir(mediaDir)
	fmt.Printf("Files in %s/:\n\n", mediaDir)
	for _, e := range entries {
		if !e.IsDir() {
			fmt.Printf("  %s\n", e.Name())
		}
	}
}

func findFiles(pattern string) []string {
	// Normalize both pattern and filename: lowercase + replace underscores with spaces
	normalize := func(s string) string {
		return strings.ToLower(strings.ReplaceAll(s, "_", " "))
	}
	lower := normalize(pattern)
	entries, _ := os.ReadDir(mediaDir)
	var out []string
	for _, e := range entries {
		if !e.IsDir() && strings.Contains(normalize(e.Name()), lower) {
			out = append(out, filepath.Join(mediaDir, e.Name()))
		}
	}
	return out
}

// ── PDF extraction ────────────────────────────────────────────────────────────

func extractPDFText(path string, maxPages int) (string, error) {
	f, r, err := pdf.Open(path)
	if err != nil {
		return "", fmt.Errorf("open: %w", err)
	}
	defer f.Close()

	total := r.NumPage()
	if maxPages > 0 && maxPages < total {
		total = maxPages
	}

	var sb strings.Builder
	for i := 1; i <= total; i++ {
		p := r.Page(i)
		if p.V.IsNull() {
			continue
		}
		t, err := p.GetPlainText(nil)
		if err != nil {
			continue
		}
		sb.WriteString(t)
		sb.WriteByte('\n')
	}
	return cleanText(sb.String()), nil
}

func cleanText(s string) string {
	var b strings.Builder
	prev := ' '
	for _, r := range s {
		if unicode.IsControl(r) && r != '\n' {
			r = ' '
		}
		if r == ' ' && prev == ' ' {
			continue
		}
		b.WriteRune(r)
		prev = r
	}
	lines := strings.Split(b.String(), "\n")
	var out []string
	blanks := 0
	for _, l := range lines {
		if strings.TrimSpace(l) == "" {
			blanks++
			if blanks <= 1 {
				out = append(out, "")
			}
		} else {
			blanks = 0
			out = append(out, l)
		}
	}
	return strings.Join(out, "\n")
}

func limitText(text string, count int) string {
	limit := maxTextRunes
	if count > batchSize {
		limit = count * 300
	}
	if limit > 120000 {
		limit = 120000
	}
	runes := []rune(text)
	if len(runes) > limit {
		return strings.TrimSpace(string(runes[:limit]))
	}
	return text
}

// ── Card generation ────────────────────────────────────────────────────────

type card struct {
	Front      string `json:"front"`
	Back       string `json:"back"`
	Category   string `json:"category"`
	Difficulty string `json:"difficulty"`
	Source     string `json:"source"`
}

func generateAll(text, mode, lang string, count int, source string, cfg *config.Config) ([]card, error) {
	if count <= batchSize {
		return callAI(buildPrompt(text, mode, lang, count, source), cfg)
	}

	numBatches := (count + batchSize - 1) / batchSize
	runes := []rune(text)
	chunkSize := len(runes) / numBatches

	var all []card
	remaining := count

	for i := 0; i < numBatches && remaining > 0; i++ {
		start := i * chunkSize
		end := start + chunkSize
		if end > len(runes) || i == numBatches-1 {
			end = len(runes)
		}
		chunk := strings.TrimSpace(string(runes[start:end]))
		if len(chunk) < minTextLen {
			continue
		}
		n := batchSize
		if remaining < batchSize {
			n = remaining
		}
		batch, err := callAI(buildPrompt(chunk, mode, lang, n, source), cfg)
		if err != nil {
			log.Printf("[batch %d/%d] failed: %v", i+1, numBatches, err)
			continue
		}
		all = append(all, batch...)
		remaining -= len(batch)
		log.Printf("[batch %d/%d] +%d cards", i+1, numBatches, len(batch))
		if i < numBatches-1 {
			time.Sleep(300 * time.Millisecond)
		}
	}

	return dedupe(all, count), nil
}

func callAI(prompt string, cfg *config.Config) ([]card, error) {
	if cfg.OpenAIAPIKey != "" {
		cards, err := openAI(cfg.OpenAIAPIKey, "gpt-4o-mini", prompt, cfg.AIRequestTimeout)
		if err == nil {
			return cards, nil
		}
		log.Printf("[ai] openai failed: %v", err)
	}
	if cfg.GeminiAPIKey != "" {
		cards, err := gemini(cfg.GeminiAPIKey, cfg.GeminiModel, prompt, cfg.AIRequestTimeout)
		if err == nil {
			return cards, nil
		}
		log.Printf("[ai] gemini failed: %v", err)
	}
	return nil, fmt.Errorf("all AI providers failed")
}

// ── Prompts ───────────────────────────────────────────────────────────────────

func buildPrompt(text, mode, lang string, count int, source string) string {
	langName := map[string]string{"en": "English", "ru": "Russian", "kk": "Kazakh"}[lang]
	if langName == "" {
		langName = "English"
	}

	var instr string
	switch mode {
	case "ielts-vocab":
		instr = fmt.Sprintf(`You are an expert IELTS vocabulary teacher. Generate exactly %d vocabulary flashcards for IELTS band 6.5–8.0 preparation.

DEFINITIONS AND EXPLANATIONS MUST BE IN: %s

FRONT: "WORD (part of speech)" — example: "deteriorate (verb)" or "substantial (adj)"
BACK must contain ALL of the following:
  1. Clear definition in %s
  2. IELTS academic example sentence demonstrating the word in context
  3. Key collocations: "Collocates with: ..."
  4. Band 7+ synonyms: "IELTS synonyms: ..."
  5. Word family (if useful): "Word family: deterioration (n), deteriorating (adj)"
CATEGORY: one of — Environment | Health | Education | Technology | Society | Economy | Science | Culture | Urban | Transport
DIFFICULTY: "easy"=B1-B2 | "medium"=C1 | "hard"=C2
SOURCE: "%s"

PRIORITIES: Academic vocabulary, topic-specific IELTS words, words for Writing Task 2, Band 7+ range.
SKIP: basic A1-A2 words, proper nouns, page numbers, chapter titles.`, count, langName, langName, source)

	case "ielts-tips":
		instr = fmt.Sprintf(`You are an IELTS expert coach with 15+ years experience. Generate exactly %d strategy flashcards.

LANGUAGE: %s

FRONT: Short, memorable tip name (max 8 words)
BACK must contain ALL of:
  1. Detailed explanation in %s (3–5 sentences)
  2. Concrete example showing the tip in practice
  3. How this specifically improves band score
  4. Common mistake this tip prevents
CATEGORY: Speaking | Writing Task 1 | Writing Task 2 | Reading | Listening | Grammar | Vocabulary | Exam Strategy
DIFFICULTY: "easy" | "medium" | "hard"
SOURCE: "%s"

PRIORITIES: High-impact tips that directly improve band score. Avoid generic advice.`, count, langName, langName, source)

	case "ielts-speaking":
		instr = fmt.Sprintf(`You are an IELTS Speaking examiner. Generate exactly %d speaking practice flashcards.

LANGUAGE FOR NOTES: %s

FRONT: IELTS Speaking question (Part 1/2/3 style, natural examiner phrasing)
BACK must contain:
  1. Band 7+ model answer (3–5 sentences, spoken style, with discourse markers)
  2. Key vocabulary to use: "Use: ..."
  3. Grammar structure to demonstrate: "Grammar: ..."
  4. Natural connectors: "Connectors: However, / In terms of / What I find interesting is..."
CATEGORY: Part 1 | Part 2 | Part 3
DIFFICULTY: "easy" | "medium" | "hard"
SOURCE: "%s"`, count, langName, source)

	default:
		instr = fmt.Sprintf(`Generate exactly %d vocabulary flashcards. Language: %s.
FRONT: word or phrase. BACK: definition + example sentence + synonyms.
CATEGORY: topic area. DIFFICULTY: easy|medium|hard. SOURCE: "%s".`, count, langName, source)
	}

	return fmt.Sprintf(`%s

RULES:
- Generate EXACTLY %d cards, no more, no less
- No duplicate fronts
- Back must be detailed and useful (minimum 2 sentences)
- Return ONLY valid JSON: {"cards": [{"front":"...","back":"...","category":"...","difficulty":"...","source":"..."}]}

SOURCE TEXT:
%s`, instr, count, text)
}

// ── HTTP calls ────────────────────────────────────────────────────────────────

func openAI(key, model, prompt string, timeout time.Duration) ([]card, error) {
	body, _ := json.Marshal(map[string]any{
		"model": model,
		"messages": []map[string]string{
			{"role": "system", "content": "Return ONLY valid JSON. No markdown, no backticks."},
			{"role": "user", "content": prompt},
		},
		"max_completion_tokens": 16000,
	})
	req, _ := http.NewRequest(http.MethodPost, "https://api.openai.com/v1/chat/completions", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+key)

	resp, err := (&http.Client{Timeout: timeout}).Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("openai %d: %s", resp.StatusCode, truncate(string(b), 200))
	}
	var r struct {
		Choices []struct {
			Message struct{ Content string `json:"content"` } `json:"message"`
		} `json:"choices"`
	}
	json.NewDecoder(resp.Body).Decode(&r)
	if len(r.Choices) == 0 {
		return nil, fmt.Errorf("empty response")
	}
	return parseCards(r.Choices[0].Message.Content)
}

func gemini(key, model, prompt string, timeout time.Duration) ([]card, error) {
	body, _ := json.Marshal(map[string]any{
		"contents": []map[string]any{
			{"parts": []map[string]string{{"text": prompt}}},
		},
		"generationConfig": map[string]any{
			"temperature": 0.4, "maxOutputTokens": 16000, "responseMimeType": "application/json",
		},
	})
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, key)
	resp, err := (&http.Client{Timeout: timeout}).Post(url, "application/json", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("gemini %d: %s", resp.StatusCode, truncate(string(b), 200))
	}
	var r struct {
		Candidates []struct {
			Content struct {
				Parts []struct{ Text string `json:"text"` } `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	json.NewDecoder(resp.Body).Decode(&r)
	if len(r.Candidates) == 0 || len(r.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("empty response")
	}
	return parseCards(r.Candidates[0].Content.Parts[0].Text)
}

func parseCards(raw string) ([]card, error) {
	raw = strings.TrimSpace(raw)
	raw = strings.TrimPrefix(raw, "```json")
	raw = strings.TrimPrefix(raw, "```")
	raw = strings.TrimSuffix(raw, "```")
	raw = strings.TrimSpace(raw)

	var wrapped struct {
		Cards []card `json:"cards"`
	}
	if err := json.Unmarshal([]byte(raw), &wrapped); err == nil && len(wrapped.Cards) > 0 {
		return valid(wrapped.Cards), nil
	}
	var cards []card
	if err := json.Unmarshal([]byte(raw), &cards); err != nil {
		return nil, fmt.Errorf("parse: %w (raw: %s)", err, truncate(raw, 100))
	}
	return valid(cards), nil
}

func valid(cards []card) []card {
	var out []card
	for _, c := range cards {
		if strings.TrimSpace(c.Front) != "" && strings.TrimSpace(c.Back) != "" {
			if c.Difficulty != "easy" && c.Difficulty != "medium" && c.Difficulty != "hard" {
				c.Difficulty = "medium"
			}
			out = append(out, c)
		}
	}
	return out
}

func dedupe(cards []card, limit int) []card {
	seen := make(map[string]struct{})
	var out []card
	for _, c := range cards {
		k := strings.ToLower(strings.TrimSpace(c.Front))
		if _, ok := seen[k]; ok {
			continue
		}
		seen[k] = struct{}{}
		out = append(out, c)
		if len(out) >= limit {
			break
		}
	}
	return out
}

// ── Database ──────────────────────────────────────────────────────────────────

func findDefaultUser(db *gorm.DB) (string, error) {
	var user models.User
	if err := db.Where("role = ?", "teacher").First(&user).Error; err != nil {
		// Try any user
		if err2 := db.First(&user).Error; err2 != nil {
			return "", fmt.Errorf("no users found in database")
		}
	}
	return user.ID, nil
}

func saveFlashcards(db *gorm.DB, userID, title, desc string, cards []card) (string, error) {
	descPtr := &desc
	set := models.FlashcardSet{
		UserID:      userID,
		Title:       title,
		Description: descPtr,
		IsPublic:    true,
	}
	if err := db.Create(&set).Error; err != nil {
		return "", fmt.Errorf("create set: %w", err)
	}

	flashcards := make([]models.Flashcard, len(cards))
	for i, c := range cards {
		flashcards[i] = models.Flashcard{
			SetID:      set.ID,
			Term:       c.Front,
			Definition: c.Back,
			Position:   i,
		}
	}

	if err := db.CreateInBatches(flashcards, 100).Error; err != nil {
		return "", fmt.Errorf("create flashcards: %w", err)
	}

	return set.ID, nil
}

// ── Helpers ────────────────────────────────────────────────────────────────

func buildTitle(fileName, mode string) string {
	name := fileName
	if idx := strings.Index(name, "_"); idx > 0 && idx < 6 {
		name = name[idx+1:]
	}
	name = strings.TrimSuffix(name, filepath.Ext(name))
	name = strings.ReplaceAll(name, "_", " ")
	// Trim long names
	runes := []rune(name)
	if len(runes) > 50 {
		name = string(runes[:50])
	}

	label := map[string]string{
		"ielts-vocab":    "Vocabulary",
		"ielts-tips":     "Tips & Strategies",
		"ielts-speaking": "Speaking Practice",
		"vocabulary":     "Vocabulary",
		"mixed":          "Flashcards",
	}[mode]
	if label == "" {
		label = "Flashcards"
	}
	return fmt.Sprintf("%s — %s", strings.TrimSpace(name), label)
}

func truncate(s string, n int) string {
	if len(s) > n {
		return s[:n] + "..."
	}
	return s
}
