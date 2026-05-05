package database

import (
	"embed"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

//go:embed nuet_seed_data/*.json
var nuetSeedData embed.FS

type nuetPDFTestSeed struct {
	Name       string   `json:"name"`
	TestType   string   `json:"testType"`
	PDFPath    string   `json:"pdfPath"`
	MathCount  int      `json:"mathCount"`
	CTCount    int      `json:"ctCount"`
	AnswerKeys []string `json:"answerKeys"`
}

type nuetExtractedQuestionSeed struct {
	TestName    string   `json:"testName"`
	Position    int      `json:"position"`
	Section     string   `json:"section"`
	Prompt      string   `json:"prompt"`
	Options     []string `json:"options"`
	Answer      string   `json:"answer"`
	Explanation string   `json:"explanation"`
}

// SeedNUETExtractedQuestions publishes the locally extracted NUET PDF mock bank
// into every environment. It is intentionally idempotent so production deploys
// can safely re-run it after AutoMigrate.
func SeedNUETExtractedQuestions(db *gorm.DB) error {
	tests, err := loadNUETSeedJSON[[]nuetPDFTestSeed]("nuet_seed_data/pdf_tests.json")
	if err != nil {
		return err
	}

	for _, seed := range tests {
		keys, err := json.Marshal(seed.AnswerKeys)
		if err != nil {
			return fmt.Errorf("encode NUET answer keys for %s: %w", seed.Name, err)
		}
		keysPayload := string(keys)
		test := models.NUETPDFTest{
			Name:       seed.Name,
			TestType:   seed.TestType,
			PDFPath:    seed.PDFPath,
			MathCount:  seed.MathCount,
			CTCount:    seed.CTCount,
			AnswerKeys: &keysPayload,
		}
		if err := db.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "name"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"test_type", "pdf_path", "math_count", "ct_count", "answer_keys", "updated_at",
			}),
		}).Create(&test).Error; err != nil {
			return fmt.Errorf("upsert NUET PDF test %s: %w", seed.Name, err)
		}
	}

	questions, err := loadNUETSeedJSON[[]nuetExtractedQuestionSeed]("nuet_seed_data/questions.json")
	if err != nil {
		return err
	}

	testIDs := map[string]string{}
	var seededTests []models.NUETPDFTest
	if err := db.Select("id", "name").Find(&seededTests).Error; err != nil {
		return fmt.Errorf("load NUET PDF tests: %w", err)
	}
	for _, test := range seededTests {
		testIDs[test.Name] = test.ID
	}

	upserted := 0
	skipped := 0
	for _, seed := range questions {
		testID, ok := testIDs[seed.TestName]
		if !ok {
			skipped++
			continue
		}
		if seed.Position < 1 || seed.Position > 60 || strings.TrimSpace(seed.Prompt) == "" {
			skipped++
			continue
		}

		options, err := json.Marshal(seed.Options)
		if err != nil {
			return fmt.Errorf("encode NUET options for %s #%d: %w", seed.TestName, seed.Position, err)
		}
		source := fmt.Sprintf("%s #%d", seed.TestName, seed.Position)

		if err := db.Exec(`
			INSERT INTO nuet_questions (
				pdf_test_id, position, topic_id, section, question_type, difficulty,
				prompt, options, answer, explanation, source, created_at, updated_at
			) VALUES (?, ?, NULL, ?, 'multiple_choice', 'medium', ?, ?::jsonb, ?, ?, ?, NOW(), NOW())
			ON CONFLICT (pdf_test_id, position) WHERE pdf_test_id IS NOT NULL
			DO UPDATE SET
				section = EXCLUDED.section,
				question_type = EXCLUDED.question_type,
				difficulty = EXCLUDED.difficulty,
				prompt = EXCLUDED.prompt,
				options = EXCLUDED.options,
				answer = EXCLUDED.answer,
				explanation = EXCLUDED.explanation,
				source = EXCLUDED.source,
				updated_at = NOW()
		`, testID, seed.Position, seed.Section, seed.Prompt, string(options), seed.Answer, seed.Explanation, source).Error; err != nil {
			return fmt.Errorf("upsert NUET question %s #%d: %w", seed.TestName, seed.Position, err)
		}
		upserted++
	}

	log.Printf("seeded NUET extracted questions: pdf_tests=%d questions=%d skipped=%d", len(tests), upserted, skipped)
	return nil
}

func loadNUETSeedJSON[T any](path string) (T, error) {
	var out T
	raw, err := nuetSeedData.ReadFile(path)
	if err != nil {
		return out, fmt.Errorf("read %s: %w", path, err)
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		return out, fmt.Errorf("decode %s: %w", path, err)
	}
	return out, nil
}
