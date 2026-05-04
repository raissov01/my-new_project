package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"regexp"
	"sort"
	"strings"

	"github.com/midoriya/flashlearn-backend/internal/config"
	"github.com/midoriya/flashlearn-backend/internal/database"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// Tags 3069 already-imported telegram_posts rows so the front-end can
// filter the materials library cheaply. Idempotent — running it again
// recomputes from scratch (preserves no manual edits).
//
// Usage:
//   go run ./cmd/tag-telegram-posts                  # dry-run (default)
//   go run ./cmd/tag-telegram-posts -apply           # write to DB
//   go run ./cmd/tag-telegram-posts -apply -limit=50 # apply to first 50

func main() {
	apply := flag.Bool("apply", false, "Write tags to DB. Without this, runs in dry-run mode and prints stats only.")
	limit := flag.Int("limit", 0, "Limit number of posts processed. 0 = all.")
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	db, err := database.ConnectGorm(cfg.DatabaseURL, cfg.Environment)
	if err != nil {
		log.Fatalf("db: %v", err)
	}

	ctx := context.Background()
	if err := tagAll(ctx, db, *apply, *limit); err != nil {
		log.Fatalf("tag: %v", err)
	}
}

func tagAll(ctx context.Context, db *gorm.DB, apply bool, limit int) error {
	q := db.WithContext(ctx).Model(&models.TelegramPost{}).Order("telegram_post_id ASC")
	if limit > 0 {
		q = q.Limit(limit)
	}

	var posts []models.TelegramPost
	if err := q.Find(&posts).Error; err != nil {
		return fmt.Errorf("fetch posts: %w", err)
	}
	log.Printf("[tag] processing %d posts (apply=%t)", len(posts), apply)

	tagCounts := map[string]int{}
	updated := 0
	for _, p := range posts {
		tags := classify(p)
		if apply {
			if err := db.WithContext(ctx).
				Model(&models.TelegramPost{}).
				Where("id = ?", p.ID).
				Update("tags", pgArray(tags)).Error; err != nil {
				log.Printf("[tag] post %d: %v", p.TelegramPostID, err)
				continue
			}
		}
		for _, t := range tags {
			tagCounts[t]++
		}
		updated++
	}

	log.Printf("[tag] processed %d posts; tag distribution:", updated)
	type kv struct {
		k string
		v int
	}
	pairs := make([]kv, 0, len(tagCounts))
	for k, v := range tagCounts {
		pairs = append(pairs, kv{k, v})
	}
	sort.Slice(pairs, func(i, j int) bool { return pairs[i].v > pairs[j].v })
	for _, p := range pairs {
		log.Printf("  %-24s %d", p.k, p.v)
	}
	if !apply {
		log.Printf("[tag] dry-run — pass -apply to write")
	}
	return nil
}

// pgArray formats a []string as a PostgreSQL TEXT[] literal. GORM's default
// handling of []string isn't reliable across drivers, so we hand-format.
func pgArray(xs []string) string {
	if len(xs) == 0 {
		return "{}"
	}
	parts := make([]string, len(xs))
	for i, x := range xs {
		// Escape backslashes and double quotes.
		x = strings.ReplaceAll(x, `\`, `\\`)
		x = strings.ReplaceAll(x, `"`, `\"`)
		parts[i] = `"` + x + `"`
	}
	return "{" + strings.Join(parts, ",") + "}"
}

// classify returns the set of tags applicable to a post. Tags are derived
// from (in order): hashtags in caption/text, filename patterns, and broad
// keyword matches. Always returns deterministic, deduplicated, sorted tags.
func classify(p models.TelegramPost) []string {
	set := map[string]struct{}{}
	add := func(t string) { set[t] = struct{}{} }

	content := strings.ToLower(p.Text + " " + p.Caption)
	fname := strings.ToLower(p.FileName)

	// ── Subject (NUET / IELTS / SAT / general study) ─────────────
	if matchesAny(content, "#nuet", "nuet_with", "nuet ", "нуэт", "нует", "naz uni", "nazarbayev univ") ||
		matchesAny(fname, "nuet", "nufypet") {
		add("nuet")
	}
	if matchesAny(content, "#ielts", "ielts ", "academic writing", "task 1", "task 2", "speaking part") ||
		matchesAny(fname, "ielts", "cambridge ielts") {
		add("ielts")
	}
	if matchesAny(content, "#sat", " sat ", "sat reasoning", "sat math") || matchesAny(fname, "sat ", " sat") {
		add("sat")
	}
	if matchesAny(content, "#bmat", "bmat ") || matchesAny(fname, "bmat") {
		add("bmat")
	}
	if matchesAny(content, "#tsa", "thinking skills", "tsa section") || matchesAny(fname, "tsa", "thinking_skills", "thinking skills") {
		add("tsa")
		add("nuet_critical_thinking")
	}

	// Promote to NUET section tags
	if has(set, "nuet") {
		// Default to math unless we detect critical thinking signals
		if matchesAny(content, "critical", "thinking skills", "тсе", "крит") || has(set, "tsa") || has(set, "bmat") {
			add("nuet_critical_thinking")
		} else {
			add("nuet_math")
		}
	}

	// ── Math sub-topics (only useful for nuet_math) ──────────────
	mathTopics := map[string][]string{
		"algebra":     {"#algebra", "algebra", "polynomial", "quadratic", "equations"},
		"geometry":    {"#geometry", "geometry", "circle", "triangle", "polygon"},
		"trigonometry": {"#trig", "trigonometry", "sin", "cosine", "tangent"},
		"vectors":     {"#vectors", "vector"},
		"probability": {"probability", "combinatorics"},
		"functions":   {"function", "graph"},
		"sequences":   {"arithmetic sequence", "geometric sequence", "progression"},
		"statistics":  {"statistics", "mean median"},
	}
	for tag, kws := range mathTopics {
		if matchesAny(content, kws...) || matchesAny(fname, kws...) {
			add("topic_" + tag)
		}
	}

	// ── Material type (mock / book / formulas / notes) ───────────
	if matchesAny(content, "mock test", "#mock", "пробник") || matchesAny(fname, "mock", "_test", "test_") {
		add("type_mock_test")
	}
	if matchesAny(content, "trial test") || matchesAny(fname, "trial test", "trial_test") {
		add("type_trial_test")
	}
	if matchesAny(content, "formula sheet", "формул", "#formulas") || matchesAny(fname, "formul") {
		add("type_formulas")
	}
	if matchesAny(content, "book", "учебник", "handbook") || matchesAny(fname, "book", "handbook", ".epub") {
		add("type_book")
	}
	if matchesAny(content, "notes", "конспект", "#notes") || matchesAny(fname, "_notes", " notes", "notes_") {
		add("type_notes")
	}
	if matchesAny(content, "solution", "answers", "решен") || matchesAny(fname, "solution", "answers") {
		add("type_solutions")
	}

	// ── Difficulty (heuristic) ───────────────────────────────────
	if matchesAny(content, "beginner", "easy", "лёгк", "легк", "0-ден", "basic") {
		add("level_beginner")
	}
	if matchesAny(content, "advanced", "hard", "challenging", "олимпиад") {
		add("level_advanced")
	}

	// ── File-only flag (lets UI hide/show text-only posts) ───────
	if p.HasMedia {
		add("has_file")
	}

	// ── Extract any explicit hashtags as raw tags too (lower-cased) ──
	for _, h := range hashtags(p.Text + " " + p.Caption) {
		add("hashtag_" + h)
	}

	out := make([]string, 0, len(set))
	for k := range set {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

var hashtagRE = regexp.MustCompile(`#([\p{L}\p{N}_]+)`)

func hashtags(s string) []string {
	matches := hashtagRE.FindAllStringSubmatch(s, -1)
	out := make([]string, 0, len(matches))
	seen := map[string]struct{}{}
	for _, m := range matches {
		t := strings.ToLower(m[1])
		if t == "" {
			continue
		}
		if _, ok := seen[t]; ok {
			continue
		}
		seen[t] = struct{}{}
		out = append(out, t)
	}
	return out
}

func matchesAny(haystack string, needles ...string) bool {
	for _, n := range needles {
		if n == "" {
			continue
		}
		if strings.Contains(haystack, n) {
			return true
		}
	}
	return false
}

func has(set map[string]struct{}, key string) bool {
	_, ok := set[key]
	return ok
}
