package database

import (
	_ "embed"
	"encoding/json"
	"fmt"
)

//go:embed nuet_lessons/nuet_lessons.json
var nuetLessonsJSON []byte

// NUETLessonSeed is the authored shape of a topic lesson — a chaptered
// "book" rendered by the frontend reader. Content is kept loose (raw JSON
// blocks) so the schema can evolve without a migration; the renderer
// dispatches per-block on `type`.
type NUETLessonSeed struct {
	Slug      string          `json:"slug"`
	TopicSlug string          `json:"topicSlug"`
	Section   string          `json:"section"`
	Title     string          `json:"title"`
	Summary   string          `json:"summary"`
	Minutes   int             `json:"minutes"`
	Chapters  json.RawMessage `json:"chapters"`
}

// LoadNUETLessonSeeds parses the embedded JSON. Errors here are
// configuration bugs — the seed file ships in the binary, so panicing on
// parse failure surfaces them at boot rather than first request.
func LoadNUETLessonSeeds() ([]NUETLessonSeed, error) {
	var seeds []NUETLessonSeed
	if err := json.Unmarshal(nuetLessonsJSON, &seeds); err != nil {
		return nil, fmt.Errorf("parse embedded nuet_lessons.json: %w", err)
	}
	return seeds, nil
}
