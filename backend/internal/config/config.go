package config

import (
	"fmt"
	"os"
	"slices"
	"strings"

	"github.com/joho/godotenv"
)

// Config holds all runtime configuration.
type Config struct {
	Port             string
	DatabaseURL      string
	JWTSecret        string
	CORSOrigins      []string
	InternalAPIToken string
	Environment      string // "development" | "production"
	OpenAIAPIKey     string
	OpenAIModel      string
	GeminiAPIKey     string
	GeminiModel      string
	MaxUploadBytes     int64
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
	FrontendURL        string
}

// Load reads environment variables (with optional .env file) and returns Config.
func Load() (*Config, error) {
	_ = godotenv.Load()

	cfg := &Config{
		Port:               getEnv("PORT", "5000"),
		DatabaseURL:        os.Getenv("DATABASE_URL"),
		JWTSecret:          getEnv("JWT_SECRET", "change-me-in-production"),
		InternalAPIToken:   os.Getenv("BACKEND_INTERNAL_TOKEN"),
		Environment:        getEnv("ENVIRONMENT", "development"),
		OpenAIAPIKey:       os.Getenv("OPENAI_API_KEY"),
		OpenAIModel:        getEnv("OPENAI_MODEL", "gpt-4o-mini"),
		GeminiAPIKey:       os.Getenv("GEMINI_API_KEY"),
		GeminiModel:        getEnv("GEMINI_MODEL", "gemini-2.0-flash"),
		MaxUploadBytes:     20 * 1024 * 1024,
		GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		GoogleRedirectURL:  getEnv("GOOGLE_REDIRECT_URL", "http://localhost:5000/api/v1/auth/google/callback"),
		FrontendURL:        getEnv("FRONTEND_URL", "http://localhost:3000"),
	}

	// Parse CORS origins
	rawOrigins := getEnv("CORS_ORIGINS", "http://localhost:3000")
	cfg.CORSOrigins = parseOrigins(rawOrigins)
	if cfg.FrontendURL != "" && !slices.Contains(cfg.CORSOrigins, cfg.FrontendURL) {
		cfg.CORSOrigins = append(cfg.CORSOrigins, cfg.FrontendURL)
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func parseOrigins(raw string) []string {
	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		origin := strings.TrimSpace(part)
		if origin == "" || slices.Contains(origins, origin) {
			continue
		}
		origins = append(origins, origin)
	}
	return origins
}
