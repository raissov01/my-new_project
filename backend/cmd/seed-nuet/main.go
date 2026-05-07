package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"regexp"
	"strings"

	"github.com/midoriya/flashlearn-backend/internal/config"
	"github.com/midoriya/flashlearn-backend/internal/database"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Seeds nuet_topics with the 18 Math syllabus topics scraped from
// @nuetchalka_bot plus a hand-written set of Critical Thinking topics.
// Idempotent (upsert by slug) — safe to re-run after edits to the seed.
//
// Usage: go run ./cmd/seed-nuet  [-tree=path/to/tree.json]

type rawNode struct {
	Path     []string  `json:"path"`
	Text     string    `json:"text,omitempty"`
	Children []rawNode `json:"children,omitempty"`
}

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	db, err := database.ConnectGorm(cfg.DatabaseURL, cfg.Environment)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	ctx := context.Background()

	all := database.OfficialNUETTopics()
	log.Printf("[seed] official syllabus: %d topics", len(all))

	for _, t := range all {
		if err := upsert(ctx, db, t); err != nil {
			log.Printf("[seed] upsert %s: %v", t.Slug, err)
			continue
		}
		log.Printf("[seed]   ✓ %s — %s", t.Section, t.Title)
	}

	// Drop any nuet_topics rows whose slug is no longer part of the
	// canonical syllabus. This keeps the /nuet/topics index clean and
	// prevents legacy URLs from showing stale content. Questions whose
	// topic_id pointed at the dropped row become NULL — re-seeding the
	// extracted questions reclassifies them via the keyword classifier.
	keep := database.OfficialNUETSlugs()
	keepSlice := make([]string, 0, len(keep))
	for slug := range keep {
		keepSlice = append(keepSlice, slug)
	}

	var orphans []models.NUETTopic
	if err := db.Where("slug NOT IN ?", keepSlice).Find(&orphans).Error; err != nil {
		log.Printf("[seed] scan orphans: %v", err)
	} else if len(orphans) > 0 {
		orphanIDs := make([]string, 0, len(orphans))
		for _, o := range orphans {
			orphanIDs = append(orphanIDs, o.ID)
			log.Printf("[seed]   – %s — %s (orphaned, dropping)", o.Section, o.Title)
		}
		if err := db.Model(&models.NUETQuestion{}).
			Where("topic_id IN ?", orphanIDs).
			Update("topic_id", nil).Error; err != nil {
			log.Printf("[seed] null orphan topic_ids: %v", err)
		}
		if err := db.Where("id IN ?", orphanIDs).Delete(&models.NUETTopic{}).Error; err != nil {
			log.Printf("[seed] delete orphans: %v", err)
		}
	}

	log.Printf("[seed] done — %d topics seeded, %d removed", len(all), len(orphans))
}

func upsert(ctx context.Context, db *gorm.DB, t models.NUETTopic) error {
	return db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "slug"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"section", "title", "description", "explanation",
				"difficulty", "order_index", "updated_at",
			}),
		}).
		Create(&t).Error
}

// loadMathTopics parses the bot's tree.json and extracts the 18 Math
// topics. Topic explanation text was concatenated from multiple bot
// messages — including stale Main Menu blurbs — so we trim to just the
// last "🌙 ..." section, which is always the actual topic content.
func loadMathTopics(path string) ([]models.NUETTopic, error) {
	buf, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var root rawNode
	if err := json.Unmarshal(buf, &root); err != nil {
		return nil, err
	}

	var out []models.NUETTopic
	for _, top := range root.Children {
		if len(top.Path) < 2 || top.Path[len(top.Path)-1] != "📘 Topics" {
			continue
		}
		for _, sub := range top.Children {
			label := sub.Path[len(sub.Path)-1]
			text := strings.TrimSpace(sub.Text)
			text = strings.ReplaceAll(text, "No extra files have been added for this topic yet.", "")
			text = strings.TrimSpace(text)
			if text == "" {
				continue
			}
			cleanedTitle, order := splitOrder(label)
			explanation := extractTopicSection(text, cleanedTitle)
			out = append(out, models.NUETTopic{
				Slug:        slugify(cleanedTitle),
				Section:     "math",
				Title:       cleanedTitle,
				Description: firstSentence(explanation),
				Explanation: explanation,
				Difficulty:  "medium",
				OrderIndex:  order,
			})
		}
	}
	return out, nil
}

// extractTopicSection finds the last "🌙 ..." block in concatenated bot
// text. Bot replies sometimes inline previous menu screens, so the actual
// topic content is always in the trailing 🌙 segment.
func extractTopicSection(text, title string) string {
	parts := strings.Split(text, "🌙")
	if len(parts) <= 1 {
		return text
	}
	last := strings.TrimSpace(parts[len(parts)-1])
	// Keep the moon prefix on the topic header line.
	return "🌙 " + last
}

var orderRE = regexp.MustCompile(`^(\d+)\)\s*(.+)$`)
var emojiPrefixRE = regexp.MustCompile(`^[^\p{L}\d]+\s*`)

func splitOrder(label string) (string, int) {
	clean := emojiPrefixRE.ReplaceAllString(label, "")
	clean = strings.TrimSpace(clean)
	if m := orderRE.FindStringSubmatch(clean); m != nil {
		var order int
		fmt.Sscanf(m[1], "%d", &order)
		return strings.TrimSpace(m[2]), order
	}
	return clean, 0
}

var slugifyRE = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(s string) string {
	s = strings.ToLower(s)
	s = slugifyRE.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if len(s) > 100 {
		s = s[:100]
	}
	return s
}

func firstSentence(s string) string {
	// Skip the moon-header line and grab the next non-empty paragraph.
	lines := strings.Split(s, "\n")
	skipping := true
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			skipping = false
			continue
		}
		if skipping && strings.HasPrefix(line, "🌙") {
			continue
		}
		// Found the first content line.
		if len(line) > 200 {
			line = line[:200] + "…"
		}
		return line
	}
	if len(s) > 200 {
		return s[:200] + "…"
	}
	return s
}

// criticalThinkingTopics is the hand-written CT syllabus. The actual NUET
// CT section tests problem solving, argument analysis, data interpretation,
// pattern recognition and logical reasoning — a TSA-style structure.
func criticalThinkingTopics() []models.NUETTopic {
	mk := func(order int, slug, title, desc, body string) models.NUETTopic {
		return models.NUETTopic{
			Slug:        slug,
			Section:     "critical_thinking",
			Title:       title,
			Description: desc,
			Explanation: body,
			Difficulty:  "medium",
			OrderIndex:  order,
		}
	}
	return []models.NUETTopic{
		mk(1, "logical-reasoning", "Logical Reasoning",
			"Drawing valid conclusions from given premises.",
			"🌙 Logical Reasoning\n\nThis topic is about following the logical structure of a statement and identifying what does or does not follow from it. The exam often gives you a short paragraph and asks which of the answer choices is logically supported.\n\nYou should revise:\n• identifying premises and conclusions\n• distinguishing necessary from sufficient conditions\n• spotting common formal-logic patterns (if-then, all-some, only-if)\n• rejecting answers that go beyond what the text actually supports\n\nA frequent trap is choosing an answer that 'sounds right' but adds outside knowledge — stick to what the passage actually says."),
		mk(2, "argument-analysis", "Argument Analysis",
			"Identifying assumptions, flaws and what would weaken an argument.",
			"🌙 Argument Analysis\n\nThese questions ask you to break a short argument apart: find the unstated assumption, name the weakness, or pick the option that would most weaken (or strengthen) it.\n\nYou should revise:\n• locating the main conclusion\n• naming the supporting reason(s)\n• identifying what assumption bridges the gap from reason to conclusion\n• recognising classic flaws — circular reasoning, false dilemma, ad hominem, generalising from a small sample\n• comparing answer choices: which one matters most for the argument?\n\nThe correct answer is usually the option that, if true, would change whether the conclusion holds — even if the option seems unrelated at first glance."),
		mk(3, "problem-solving", "Problem Solving",
			"Translating a worded scenario into a clear plan and computing the answer.",
			"🌙 Problem Solving\n\nThis topic tests whether you can read a situation, pick the right approach, and solve quickly. The numbers are usually simple — the difficulty is in setting up the problem.\n\nYou should revise:\n• reading the question fully before computing\n• translating words into equations or diagrams\n• working backwards from the answer when faster\n• estimating to rule out impossible options\n• checking units and sanity-checking with rough numbers\n\nUnder time pressure, eliminate two answer choices first using rough estimation — then solve precisely between the remaining two."),
		mk(4, "data-interpretation", "Data Interpretation",
			"Reading tables, charts and graphs to answer specific factual questions.",
			"🌙 Data Interpretation\n\nThese questions show you a table, chart or graph and ask a precise question — a percentage change, a ratio, the value of a specific cell, or the trend over time.\n\nYou should revise:\n• reading axes, units and footnotes carefully\n• calculating percentage change ((new − old) / old)\n• interpreting ratios and proportions\n• comparing values across rows or categories\n• avoiding the trap of picking the visually largest bar without checking the scale\n\nMost wrong answers come from misreading the axis or confusing percentage points with percent change — slow down on those."),
		mk(5, "pattern-recognition", "Pattern Recognition",
			"Spotting the rule behind a sequence of numbers, shapes or relationships.",
			"🌙 Pattern Recognition\n\nThis topic asks you to find the next term, the missing element, or the rule generating a sequence. The pattern can be numerical, geometric, or relational.\n\nYou should revise:\n• arithmetic and geometric progressions\n• alternating patterns (odd vs even position)\n• rotational and reflective symmetry in shape sequences\n• analogy questions (A is to B as C is to ?)\n• combining two simple rules into one complex sequence\n\nWhen stuck, write out the differences between consecutive terms — most number patterns become obvious once the differences are visible."),
	}
}
