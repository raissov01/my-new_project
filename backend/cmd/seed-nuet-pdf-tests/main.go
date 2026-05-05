package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/ledongthuc/pdf"
	"github.com/midoriya/flashlearn-backend/internal/config"
	"github.com/midoriya/flashlearn-backend/internal/database"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm/clause"
)

const expectedQuestionCount = 60

var (
	mockAnswerRE         = regexp.MustCompile(`Ans:\s*([A-Z])`)
	answerHeaderRE       = regexp.MustCompile(`(?i)answer\s*key|answers?\s*[:\-]`)
	numberedAnswerPairRE = regexp.MustCompile(`(^|[\s,;|])([1-9]|[1-5][0-9]|60)[\.\):\-]?\s*([A-E])([\s,;|]|$)`)
	trialNameRE          = regexp.MustCompile(`(?i)^trial test\s+(\d+)\.pdf$`)
	mockNameRE           = regexp.MustCompile(`(?i)^nuet_mock_(\d+)`)
)

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
		valid, missing := summarizeAnswerKeys(keys, expectedQuestionCount)
		log.Printf("[seed] ok %-14s type=%-10s valid=%d/%d missing=%v", test.Name, test.TestType, valid, expectedQuestionCount, compressMissing(missing))
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
		fileName := entry.Name()
		lower := strings.ToLower(fileName)
		if !strings.HasSuffix(lower, ".pdf") {
			continue
		}

		testName, testType := normalizePDFTestIdentity(fileName)
		if testType == "" {
			continue
		}

		filePath := filepath.ToSlash(filepath.Join(filesDir, fileName))
		answers := extractAnswerKeys(filePath, testType, expectedQuestionCount)
		encoded, _ := json.Marshal(answers)
		payload := string(encoded)

		tests = append(tests, models.NUETPDFTest{
			Name:       testName,
			TestType:   testType,
			PDFPath:    filepath.ToSlash(filepath.Join("nuet", fileName)),
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

func normalizePDFTestIdentity(fileName string) (string, string) {
	if match := trialNameRE.FindStringSubmatch(fileName); len(match) == 2 {
		return fmt.Sprintf("Trial Test %s", match[1]), "trial_test"
	}
	if match := mockNameRE.FindStringSubmatch(fileName); len(match) == 2 {
		return fmt.Sprintf("NUET Mock %s", match[1]), "mock_test"
	}
	return "", ""
}

func extractAnswerKeys(filePath, testType string, expected int) []string {
	text := extractPDFText(filePath)
	if testType == "mock_test" {
		keys := extractMockAnswerSequence(text)
		if countValidAnswers(keys) < expected {
			keys = mergeAnswerSequences(keys, extractMockAnswerSequence(extractOCRText(filePath, 1, 0)))
		}
		return padAnswerSequence(keys, expected)
	}

	keyMap := extractTrialAnswerMap(text)
	if len(keyMap) < 10 {
		keyMap = mergeAnswerMaps(keyMap, extractTrialAnswerMap(extractOCRText(filePath, 3, 11)))
	}
	if len(keyMap) < 10 {
		keyMap = mergeAnswerMaps(keyMap, extractTrialAnswerMap(extractOCRText(filePath, 0, 6)))
	}
	return answerMapToSequence(keyMap, expected)
}

func extractMockAnswerSequence(text string) []string {
	matches := mockAnswerRE.FindAllStringSubmatch(text, -1)
	out := make([]string, 0, len(matches))
	for _, match := range matches {
		if len(match) < 2 {
			continue
		}
		out = append(out, normalizeOCRAnswer(match[1]))
	}
	return out
}

func extractTrialAnswerMap(text string) map[int]string {
	out := map[int]string{}
	if strings.TrimSpace(text) == "" {
		return out
	}

	chunks := []string{text}
	if loc := answerHeaderRE.FindStringIndex(text); loc != nil {
		chunks = append(chunks, text[loc[0]:])
	}

	for _, chunk := range chunks {
		for _, line := range strings.Split(chunk, "\n") {
			line = compactWhitespace(line)
			if line == "" {
				continue
			}
			pairs := numberedAnswerPairRE.FindAllStringSubmatch(line, -1)
			if len(pairs) < 2 && !answerHeaderRE.MatchString(line) {
				continue
			}
			for _, pair := range pairs {
				n, _ := strconv.Atoi(pair[2])
				letter := normalizeOCRAnswer(pair[3])
				if n >= 1 && n <= expectedQuestionCount && letter != "" {
					out[n] = letter
				}
			}
		}
	}

	return out
}

func extractPDFText(filePath string) string {
	cmd := exec.Command("pdftotext", "-layout", filePath, "-")
	out, err := cmd.Output()
	if err == nil && len(out) > 0 {
		return string(out)
	}

	f, reader, openErr := pdf.Open(filePath)
	if openErr != nil {
		log.Printf("[seed] open %s: %v", filePath, openErr)
		return ""
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
	return buf.String()
}

func extractOCRText(filePath string, lastPages int, psm int) string {
	pageCount := pdfPageCount(filePath)
	if pageCount == 0 {
		return ""
	}

	firstPage := 1
	if lastPages > 0 && lastPages < pageCount {
		firstPage = pageCount - lastPages + 1
	}

	tmpDir, err := os.MkdirTemp("", "nuet-pdf-ocr-*")
	if err != nil {
		return ""
	}
	defer os.RemoveAll(tmpDir)

	prefix := filepath.Join(tmpDir, "page")
	if out, err := exec.Command("pdftoppm", "-f", strconv.Itoa(firstPage), "-l", strconv.Itoa(pageCount), "-png", filePath, prefix).CombinedOutput(); err != nil {
		log.Printf("[seed] pdftoppm %s: %v (%s)", filePath, err, strings.TrimSpace(string(out)))
		return ""
	}

	images, err := filepath.Glob(filepath.Join(tmpDir, "*.png"))
	if err != nil || len(images) == 0 {
		return ""
	}
	sort.Strings(images)

	var buf strings.Builder
	for _, image := range images {
		args := []string{image, "stdout"}
		if psm > 0 {
			args = append(args, "--psm", strconv.Itoa(psm))
		}
		out, err := exec.Command("/usr/bin/tesseract", args...).Output()
		if err != nil {
			continue
		}
		buf.Write(out)
		buf.WriteByte('\n')
	}

	return buf.String()
}

func pdfPageCount(filePath string) int {
	out, err := exec.Command("pdfinfo", filePath).Output()
	if err != nil {
		return 0
	}
	for _, line := range strings.Split(string(out), "\n") {
		line = strings.TrimSpace(line)
		if !strings.HasPrefix(line, "Pages:") {
			continue
		}
		n, _ := strconv.Atoi(strings.TrimSpace(strings.TrimPrefix(line, "Pages:")))
		return n
	}
	return 0
}

func normalizeOCRAnswer(value string) string {
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

func padAnswerSequence(keys []string, expected int) []string {
	if len(keys) >= expected {
		return keys[:expected]
	}
	out := make([]string, expected)
	copy(out, keys)
	return out
}

func answerMapToSequence(answerMap map[int]string, expected int) []string {
	out := make([]string, expected)
	for i := 1; i <= expected; i++ {
		out[i-1] = answerMap[i]
	}
	return out
}

func mergeAnswerMaps(base, extra map[int]string) map[int]string {
	if len(base) == 0 {
		return extra
	}
	for key, value := range extra {
		if base[key] == "" && value != "" {
			base[key] = value
		}
	}
	return base
}

func mergeAnswerSequences(base, extra []string) []string {
	if len(base) == 0 {
		return extra
	}
	maxLen := len(base)
	if len(extra) > maxLen {
		maxLen = len(extra)
	}
	out := make([]string, maxLen)
	for i := 0; i < maxLen; i++ {
		if i < len(base) && base[i] != "" {
			out[i] = base[i]
			continue
		}
		if i < len(extra) {
			out[i] = extra[i]
		}
	}
	return out
}

func compactWhitespace(value string) string {
	return strings.Join(strings.Fields(strings.TrimSpace(value)), " ")
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

func countValidAnswers(keys []string) int {
	count := 0
	for _, key := range keys {
		if normalizeOCRAnswer(key) != "" {
			count++
		}
	}
	return count
}

func summarizeAnswerKeys(keys []string, expected int) (int, []int) {
	missing := make([]int, 0, expected)
	valid := 0
	for i := 0; i < expected; i++ {
		if i >= len(keys) || normalizeOCRAnswer(keys[i]) == "" {
			missing = append(missing, i+1)
			continue
		}
		valid++
	}
	return valid, missing
}

func compressMissing(missing []int) string {
	if len(missing) == 0 {
		return "none"
	}
	if len(missing) > 12 {
		head := make([]string, 0, 12)
		for _, n := range missing[:12] {
			head = append(head, fmt.Sprintf("#%d", n))
		}
		return strings.Join(head, ", ") + ", ..."
	}
	parts := make([]string, 0, len(missing))
	for _, n := range missing {
		parts = append(parts, fmt.Sprintf("#%d", n))
	}
	return strings.Join(parts, ", ")
}
