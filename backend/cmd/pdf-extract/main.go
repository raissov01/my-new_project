package main

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

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
