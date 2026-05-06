// reseed-nuet-questions reruns SeedNUETExtractedQuestions against the
// configured database without starting the full server. Use after editing
// internal/database/nuet_seed_data/questions.json (e.g. enrich job) to
// push the new prompts/explanations/topic_id assignments into Postgres.
//
// Usage: go run ./cmd/reseed-nuet-questions
package main

import (
	"log"

	"github.com/midoriya/flashlearn-backend/internal/config"
	"github.com/midoriya/flashlearn-backend/internal/database"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	db, err := database.ConnectGorm(cfg.DatabaseURL, cfg.Environment)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	if err := database.SeedNUETExtractedQuestions(db); err != nil {
		log.Fatalf("seed: %v", err)
	}
}
