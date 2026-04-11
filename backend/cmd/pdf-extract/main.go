package main

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/joho/godotenv"
	"github.com/ledongthuc/pdf"
	"github.com/midoriya/flashlearn-backend/internal/database"
	"github.com/midoriya/flashlearn-backend/internal/models"
)

// Maximum text length to store per material (to avoid bloating the DB).
const maxContentLength = 15000

func main() {
	_ = godotenv.Load()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	env := os.Getenv("ENVIRONMENT")
	if env == "" {
		env = "development"
	}

	gormDB, err := database.ConnectGorm(dbURL, env)
	if err != nil {
		log.Fatalf("database: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()
	_ = ctx

	// Fetch all materials that have a filePath
	var materials []models.IELTSMaterial
	if err := gormDB.Where("file_path != '' AND file_path IS NOT NULL").Find(&materials).Error; err != nil {
		log.Fatalf("fetch materials: %v", err)
	}

	log.Printf("Found %d materials with file paths", len(materials))

	var updated, skipped, failed int

	for _, m := range materials {
		// Skip if content already has substantial text (>200 chars = already extracted)
		if len(strings.TrimSpace(m.Content)) > 200 {
			skipped++
			continue
		}

		// Only process PDF files
		if !strings.HasSuffix(strings.ToLower(m.FilePath), ".pdf") {
			skipped++
			continue
		}

		// Check file exists
		if _, err := os.Stat(m.FilePath); err != nil {
			log.Printf("[SKIP] %s — file not found: %s", m.Title, m.FilePath)
			failed++
			continue
		}

		text, err := extractPDFText(m.FilePath)
		if err != nil {
			log.Printf("[FAIL] %s — %v", m.Title, err)
			failed++
			continue
		}

		text = cleanExtractedText(text)

		if len(text) < 50 {
			log.Printf("[SKIP] %s — extracted text too short (%d chars)", m.Title, len(text))
			skipped++
			continue
		}

		// Truncate if too long
		if len(text) > maxContentLength {
			text = text[:maxContentLength] + "\n\n[... content truncated]"
		}

		// Update content in DB
		if err := gormDB.Model(&models.IELTSMaterial{}).Where("id = ?", m.ID).Update("content", text).Error; err != nil {
			log.Printf("[FAIL] %s — db update: %v", m.Title, err)
			failed++
			continue
		}

		updated++
		log.Printf("[OK] %s — %d chars extracted", m.Title, len(text))
	}

	log.Printf("Done! updated=%d skipped=%d failed=%d total=%d", updated, skipped, failed, len(materials))
}

func extractPDFText(filePath string) (string, error) {
	f, r, err := pdf.Open(filePath)
	if err != nil {
		return "", fmt.Errorf("open: %w", err)
	}
	defer f.Close()

	var buf bytes.Buffer
	numPages := r.NumPage()

	for i := 1; i <= numPages; i++ {
		page := r.Page(i)
		if page.V.IsNull() {
			continue
		}
		text, err := page.GetPlainText(nil)
		if err != nil {
			continue // skip unreadable pages
		}
		buf.WriteString(text)
		buf.WriteString("\n")

		// Stop if we have enough text
		if buf.Len() > maxContentLength+5000 {
			break
		}
	}

	return buf.String(), nil
}

func cleanExtractedText(text string) string {
	// Strip invalid UTF-8 bytes (prevents PostgreSQL SQLSTATE 22021 errors)
	text = sanitizeUTF8(text)

	// Remove excessive whitespace
	lines := strings.Split(text, "\n")
	var cleaned []string
	emptyCount := 0

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			emptyCount++
			if emptyCount <= 2 {
				cleaned = append(cleaned, "")
			}
			continue
		}
		emptyCount = 0
		cleaned = append(cleaned, trimmed)
	}

	return strings.TrimSpace(strings.Join(cleaned, "\n"))
}

// sanitizeUTF8 removes invalid UTF-8 bytes, null bytes, and non-printable
// control characters from text. Only keeps printable runes, newlines, and tabs.
func sanitizeUTF8(s string) string {
	var b strings.Builder
	b.Grow(len(s))
	for i := 0; i < len(s); {
		r, size := utf8.DecodeRuneInString(s[i:])
		if r == utf8.RuneError {
			i++
			continue
		}
		if r == 0 {
			i += size
			continue
		}
		// Keep printable runes, newlines, tabs, spaces
		if r == '\n' || r == '\t' || r == '\r' || r >= 32 {
			b.WriteRune(r)
		}
		i += size
	}
	// Final safety: ensure the entire string is valid UTF-8
	result := b.String()
	if !utf8.ValidString(result) {
		// Nuclear option: drop everything non-ASCII
		var safe strings.Builder
		safe.Grow(len(result))
		for _, r := range result {
			if r < 128 && r >= 32 || r == '\n' || r == '\t' {
				safe.WriteRune(r)
			}
		}
		return safe.String()
	}
	return result
}
