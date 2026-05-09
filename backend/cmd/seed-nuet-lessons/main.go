package main

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/config"
	"github.com/midoriya/flashlearn-backend/internal/database"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Seeds nuet_lessons from the embedded JSON file. Each entry is upserted
// by slug — re-running picks up edits to the JSON without duplicating
// rows. Lessons are linked to their topic by topicSlug → topic.id; if the
// topic is missing, the lesson is still seeded with topicId = NULL so
// /nuet/lessons keeps working before topics are seeded.
//
// Usage: go run ./cmd/seed-nuet-lessons

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	db, err := database.ConnectGorm(cfg.DatabaseURL, cfg.Environment)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("migrate: %v", err)
	}
	ctx := context.Background()

	seeds, err := database.LoadNUETLessonSeeds()
	if err != nil {
		log.Fatalf("load seeds: %v", err)
	}
	log.Printf("[lessons] loaded %d seeds from embedded JSON", len(seeds))

	for i, s := range seeds {
		// Look up topic ID by slug; nil if not seeded yet.
		var topicID *string
		var topic models.NUETTopic
		if err := db.Select("id").Where("slug = ?", s.TopicSlug).First(&topic).Error; err == nil {
			id := topic.ID
			topicID = &id
		}

		// Re-marshal chapters as the lesson's JSON content. We store the
		// canonical "{title, summary, chapters}" envelope so the frontend
		// has everything it needs in one fetch.
		envelope := map[string]any{
			"title":    s.Title,
			"summary":  s.Summary,
			"minutes":  s.Minutes,
			"chapters": s.Chapters,
		}
		raw, err := json.Marshal(envelope)
		if err != nil {
			log.Printf("[lessons] marshal %s: %v", s.Slug, err)
			continue
		}
		content := string(raw)

		lesson := models.NUETLesson{
			TopicID:    topicID,
			Slug:       s.Slug,
			Section:    s.Section,
			Title:      s.Title,
			Summary:    s.Summary,
			Minutes:    s.Minutes,
			OrderIndex: i + 1,
			Status:     "published",
			Content:    &content,
			UpdatedAt:  time.Now(),
		}
		if err := upsertLesson(ctx, db, lesson); err != nil {
			log.Printf("[lessons]   ✗ %s: %v", s.Slug, err)
			continue
		}
		log.Printf("[lessons]   ✓ %s — %s", s.Section, s.Title)
	}
	log.Printf("[lessons] done — %d seeded", len(seeds))
}

func upsertLesson(ctx context.Context, db *gorm.DB, l models.NUETLesson) error {
	return db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "slug"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"topic_id", "section", "title", "summary", "minutes",
				"order_index", "status", "content", "updated_at",
			}),
		}).
		Create(&l).Error
}
