package config

import (
	"fmt"
	"os"
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
	GeminiAPIKey     string
	GeminiModel      string
	MaxUploadBytes   int64
}

// Load reads environment variables (with optional .env file) and returns Config.
func Load() (*Config, error) {
	// Best-effort .env load — ignore error (file may not exist in prod)
	_ = godotenv.Load()

	cfg := &Config{
		Port:              getEnv("PORT", "5000"),
		DatabaseURL:       os.Getenv("DATABASE_URL"),
		JWTSecret:         getEnv("JWT_SECRET", "change-me-in-production"),
		InternalAPIToken:  os.Getenv("BACKEND_INTERNAL_TOKEN"),
		Environment:       getEnv("ENVIRONMENT", "development"),
		GeminiAPIKey:      os.Getenv("GEMINI_API_KEY"),
		GeminiModel:       getEnv("GEMINI_MODEL", "gemini-2.0-flash"),
		MaxUploadBytes:    20 * 1024 * 1024, // 20 MB
	}

	// Parse CORS origins
	rawOrigins := getEnv("CORS_ORIGINS", "http://localhost:3000")
	cfg.CORSOrigins = strings.Split(rawOrigins, ",")
	for i, o := range cfg.CORSOrigins {
		cfg.CORSOrigins[i] = strings.TrimSpace(o)
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
