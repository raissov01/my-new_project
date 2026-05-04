package main

import (
	"bytes"
	"context"
	"encoding/json"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/ledongthuc/pdf"
	"github.com/midoriya/flashlearn-backend/internal/config"
	"github.com/midoriya/flashlearn-backend/internal/database"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm/clause"
)

var answerRE = regexp.MustCompile(`Ans:\s*([A-E])`)

func main() {
	filesDir := "./nuet-materials/files"
	if len(os.Args) >= 2 {
		filesDir = os.Args[1]
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	db, err := database.ConnectGorm(cfg.DatabaseURL, cfg.Environment)
	if err != nil {
		log.Fatalf("db: %v", err)
	}

	tests, err := collectPDFTests(filesDir)
	if err != nil {
		log.Fatalf("collect: %v", err)
	}
	if len(tests) == 0 {
		log.Fatalf("no NUET PDF tests found in %s", filesDir)
	}

	ctx := context.Background()
	for _, test := range tests {
		if err := db.WithContext(ctx).
			Clauses(clause.OnConflict{
				Columns: []clause.Column{{Name: "name"}},
				DoUpdates: clause.AssignmentColumns([]string{
					"test_type", "pdf_path", "math_count", "ct_count", "answer_keys", "updated_at",
				}),
			}).
			Create(&test).Error; err != nil {
			log.Printf("[seed] failed %s: %v", test.Name, err)
			continue
		}
		keys := parseStoredAnswerKeys(test.AnswerKeys)
		log.Printf("[seed] ok %-20s type=%-10s keys=%d", test.Name, test.TestType, len(keys))
	}
}

func collectPDFTests(filesDir string) ([]models.NUETPDFTest, error) {
	entries, err := os.ReadDir(filesDir)
	if err != nil {
		return nil, err
	}

	var tests []models.NUETPDFTest
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		lower := strings.ToLower(name)
		if !strings.HasSuffix(lower, ".pdf") {
			continue
		}

		testType := ""
		switch {
		case strings.HasPrefix(name, "Trial Test "):
			testType = "trial_test"
		case strings.HasPrefix(name, "NUET_MOCK_"):
			testType = "mock_test"
		default:
			continue
		}

		filePath := filepath.ToSlash(filepath.Join(filesDir, name))
		answers := extractAnswerKeys(filePath)
		encoded, _ := json.Marshal(answers)
		payload := string(encoded)

		tests = append(tests, models.NUETPDFTest{
			Name:       strings.TrimSuffix(name, ".pdf"),
			TestType:   testType,
			PDFPath:    filePath,
			MathCount:  30,
			CTCount:    30,
			AnswerKeys: &payload,
		})
	}

	sort.Slice(tests, func(i, j int) bool {
		if tests[i].TestType == tests[j].TestType {
			return tests[i].Name < tests[j].Name
		}
		return tests[i].TestType < tests[j].TestType
	})

	return tests, nil
}

func extractAnswerKeys(filePath string) []string {
	f, reader, err := pdf.Open(filePath)
	if err != nil {
		log.Printf("[seed] open %s: %v", filePath, err)
		return nil
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

	matches := answerRE.FindAllStringSubmatch(buf.String(), -1)
	out := make([]string, 0, len(matches))
	for _, match := range matches {
		if len(match) >= 2 {
			out = append(out, match[1])
		}
	}
	return out
}

func parseStoredAnswerKeys(raw *string) []string {
	if raw == nil || strings.TrimSpace(*raw) == "" {
		return nil
	}
	var out []string
	if err := json.Unmarshal([]byte(*raw), &out); err != nil {
		return nil
	}
	return out
}
