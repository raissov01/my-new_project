package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/midoriya/flashlearn-backend/internal/config"
	"github.com/midoriya/flashlearn-backend/internal/database"
	"github.com/midoriya/flashlearn-backend/internal/models"
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

	var tests []models.NUETPDFTest
	if err := db.Order("test_type ASC, name ASC").Find(&tests).Error; err != nil {
		log.Fatalf("list pdf tests: %v", err)
	}

	if len(tests) == 0 {
		fmt.Println("No NUET PDF tests found.")
		return
	}

	incomplete := 0
	missingFiles := 0
	for _, test := range tests {
		expected := test.MathCount + test.CTCount
		keys := parseAnswerKeys(test.AnswerKeys)
		valid, missing := summarize(keys, expected)

		fullPath := filepath.Join("telegram-media", filepath.FromSlash(test.PDFPath))
		_, err := os.Stat(fullPath)
		fileOK := err == nil
		if !fileOK {
			missingFiles++
		}
		if valid != expected {
			incomplete++
		}

		status := "OK"
		if !fileOK || valid != expected {
			status = "CHECK"
		}

		fmt.Printf("[%s] %s\n", status, test.Name)
		fmt.Printf("  path: %s\n", test.PDFPath)
		fmt.Printf("  file: %s\n", ternary(fileOK, "present", "missing"))
		fmt.Printf("  answers: %d/%d\n", valid, expected)
		if len(missing) > 0 {
			fmt.Printf("  missing: %s\n", joinMissing(missing))
		}
	}

	fmt.Printf("\nSummary: %d tests, %d incomplete, %d missing files\n", len(tests), incomplete, missingFiles)
}

func parseAnswerKeys(raw *string) []string {
	if raw == nil || strings.TrimSpace(*raw) == "" {
		return nil
	}
	var keys []string
	if err := json.Unmarshal([]byte(*raw), &keys); err != nil {
		return nil
	}
	for i, key := range keys {
		keys[i] = normalizeAnswer(key)
	}
	return keys
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

func summarize(keys []string, expected int) (int, []int) {
	valid := 0
	missing := make([]int, 0, expected)
	for i := 0; i < expected; i++ {
		if i < len(keys) && normalizeAnswer(keys[i]) != "" {
			valid++
			continue
		}
		missing = append(missing, i+1)
	}
	return valid, missing
}

func joinMissing(missing []int) string {
	if len(missing) == 0 {
		return "none"
	}
	sort.Ints(missing)
	parts := make([]string, 0, len(missing))
	for _, n := range missing {
		parts = append(parts, fmt.Sprintf("#%d", n))
	}
	return strings.Join(parts, ", ")
}

func ternary(ok bool, yes, no string) string {
	if ok {
		return yes
	}
	return no
}
