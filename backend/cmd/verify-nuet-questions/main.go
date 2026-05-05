package main

import (
	"encoding/json"
	"fmt"
	"log"
	"sort"
	"strings"

	"github.com/midoriya/flashlearn-backend/internal/config"
	"github.com/midoriya/flashlearn-backend/internal/database"
	"github.com/midoriya/flashlearn-backend/internal/models"
)

type questionIssue struct {
	Position int
	Note     string
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

	var tests []models.NUETPDFTest
	if err := db.Order("test_type ASC, name ASC").Find(&tests).Error; err != nil {
		log.Fatalf("load tests: %v", err)
	}
	if len(tests) == 0 {
		fmt.Println("No nuet_pdf_tests rows found.")
		return
	}

	underfilled := 0
	invalidOptionCount := 0
	invalidAnswerCount := 0
	duplicatePositionCount := 0

	for _, test := range tests {
		expectedCount := test.MathCount + test.CTCount
		if expectedCount == 0 {
			expectedCount = 60
		}

		var questions []models.NUETQuestion
		if err := db.
			Where("pdf_test_id = ?", test.ID).
			Order("position ASC, created_at ASC").
			Find(&questions).Error; err != nil {
			log.Printf("[verify] %s: query error: %v", test.Name, err)
			continue
		}

		missing := missingPositions(questions, expectedCount)
		optionIssues := findOptionIssues(questions)
		answerIssues := findAnswerIssues(questions)
		duplicates := findDuplicatePositions(questions)

		if len(questions) < expectedCount {
			underfilled++
		}
		invalidOptionCount += len(optionIssues)
		invalidAnswerCount += len(answerIssues)
		duplicatePositionCount += len(duplicates)

		status := "OK"
		if len(questions) != expectedCount || len(missing) > 0 || len(optionIssues) > 0 || len(answerIssues) > 0 || len(duplicates) > 0 {
			status = "CHECK"
		}

		fmt.Printf("[%s] %s\n", status, test.Name)
		fmt.Printf("  count: %d/%d\n", len(questions), expectedCount)
		if len(missing) > 0 {
			fmt.Printf("  missing positions: %s\n", formatIntList(missing))
		}
		if len(duplicates) > 0 {
			fmt.Printf("  duplicate positions: %s\n", formatIntList(duplicates))
		}
		if len(optionIssues) > 0 {
			fmt.Printf("  options issues:\n")
			for _, issue := range optionIssues {
				fmt.Printf("    - #%d %s\n", issue.Position, issue.Note)
			}
		}
		if len(answerIssues) > 0 {
			fmt.Printf("  answer issues:\n")
			for _, issue := range answerIssues {
				fmt.Printf("    - #%d %s\n", issue.Position, issue.Note)
			}
		}
	}

	fmt.Printf(
		"\nSummary: tests=%d underfilled=%d invalid_options=%d invalid_answers=%d duplicate_positions=%d\n",
		len(tests),
		underfilled,
		invalidOptionCount,
		invalidAnswerCount,
		duplicatePositionCount,
	)
}

func missingPositions(questions []models.NUETQuestion, expectedCount int) []int {
	present := make(map[int]bool, len(questions))
	for _, question := range questions {
		if question.Position > 0 {
			present[question.Position] = true
		}
	}

	missing := make([]int, 0, expectedCount)
	for position := 1; position <= expectedCount; position++ {
		if !present[position] {
			missing = append(missing, position)
		}
	}
	return missing
}

func findOptionIssues(questions []models.NUETQuestion) []questionIssue {
	issues := make([]questionIssue, 0)
	for _, question := range questions {
		options := parseStringArray(question.Options)
		if len(options) != 5 {
			issues = append(issues, questionIssue{
				Position: question.Position,
				Note:     fmt.Sprintf("options.length=%d", len(options)),
			})
		}
	}
	return issues
}

func findAnswerIssues(questions []models.NUETQuestion) []questionIssue {
	issues := make([]questionIssue, 0)
	for _, question := range questions {
		answer := normalizeAnswer(question.Answer)
		if answer == "" {
			issues = append(issues, questionIssue{
				Position: question.Position,
				Note:     fmt.Sprintf("invalid answer=%q", question.Answer),
			})
		}
	}
	return issues
}

func findDuplicatePositions(questions []models.NUETQuestion) []int {
	seen := map[int]int{}
	duplicates := []int{}
	for _, question := range questions {
		if question.Position <= 0 {
			continue
		}
		seen[question.Position]++
		if seen[question.Position] == 2 {
			duplicates = append(duplicates, question.Position)
		}
	}
	sort.Ints(duplicates)
	return duplicates
}

func parseStringArray(raw *string) []string {
	if raw == nil || strings.TrimSpace(*raw) == "" {
		return nil
	}
	var out []string
	if err := json.Unmarshal([]byte(*raw), &out); err != nil {
		return nil
	}
	return out
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

func formatIntList(values []int) string {
	if len(values) == 0 {
		return "none"
	}
	parts := make([]string, 0, len(values))
	for _, value := range values {
		parts = append(parts, fmt.Sprintf("%d", value))
	}
	return strings.Join(parts, ", ")
}
