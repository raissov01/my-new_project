package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

// Config holds all runtime configuration.
type Config struct {
	Port              string
	DatabaseURL       string
	SupabaseJWTSecret string // For future JWT verification
	CORSOrigins       []string
	Environment       string // "development" | "production"
}

// Load reads environment variables (with optional .env file) and returns Config.
func Load() (*Config, error) {
	// Best-effort .env load — ignore error (file may not exist in prod)
	_ = godotenv.Load()

	cfg := &Config{
		Port:              getEnv("PORT", "8080"),
		DatabaseURL:       os.Getenv("DATABASE_URL"),
		SupabaseJWTSecret: os.Getenv("SUPABASE_JWT_SECRET"),
		Environment:       getEnv("ENVIRONMENT", "development"),
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
