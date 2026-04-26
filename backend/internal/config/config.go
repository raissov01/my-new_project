package config

import (
	"fmt"
	"os"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// Config holds all runtime configuration.
type Config struct {
	Port               string
	DatabaseURL        string
	JWTSecret          string
	CORSOrigins        []string
	InternalAPIToken   string
	Environment        string // "development" | "production"
	OpenAIAPIKey       string
	OpenAIModel             string // primary model (GPT-5) for chat, simulator, IELTS
	OpenAIModelMini         string // primary model for flashcard generation (defaults to gpt-4.1)
	OpenAIModelMiniFallback string // fallback model for flashcard generation (defaults to gpt-4o-mini)
	ClaudeAPIKey          string
	ClaudeModel           string
	ClaudeFallbackModel   string
	ClaudeAPIURL          string
	AIRequestTimeout   time.Duration
	MaxUploadBytes     int64
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
	FrontendURL        string

	// Resend HTTP API for transactional email (replaces SMTP).
	ResendAPIKey string
	ResendFrom   string

	// Lemon Squeezy billing
	LemonSqueezyWebhookSecret string
	LemonSqueezyCheckoutURL   string // base variant checkout URL from LS dashboard

	// Telegram channel history importer (MTProto user session)
	TelegramAppID         int
	TelegramAppHash       string
	TelegramPhone         string
	TelegramSessionPath   string // path to stored session file
	TelegramTargetChannel string // default: studywithme_r
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
		OpenAIModel:             getEnv("OPENAI_MODEL", "gpt-5"),
		OpenAIModelMini:         getEnv("OPENAI_MODEL_MINI", "gpt-4.1"),
		OpenAIModelMiniFallback: getEnv("OPENAI_MODEL_MINI_FALLBACK", "gpt-4o-mini"),
		ClaudeAPIKey:       os.Getenv("CLAUDE_API_KEY"),
		ClaudeModel:           getEnv("CLAUDE_MODEL", "anthropic-claude-opus-4.6"),
		ClaudeFallbackModel:  getEnv("CLAUDE_FALLBACK_MODEL", "anthropic-claude-sonnet-4.6"),
		ClaudeAPIURL:         getEnv("CLAUDE_API_URL", "https://inference.do-ai.run/v1/chat/completions"),
		AIRequestTimeout:   time.Duration(maxInt(getEnvInt("AI_REQUEST_TIMEOUT_SECONDS", 90), 30)) * time.Second,
		MaxUploadBytes:     20 * 1024 * 1024,
		GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		GoogleRedirectURL:  getEnv("GOOGLE_REDIRECT_URL", "http://localhost:5000/api/v1/auth/google/callback"),
		FrontendURL:        getEnv("FRONTEND_URL", "http://localhost:3000"),

		ResendAPIKey: os.Getenv("RESEND_API_KEY"),
		ResendFrom:   getEnv("RESEND_FROM", ""),

		LemonSqueezyWebhookSecret: os.Getenv("LEMONSQUEEZY_WEBHOOK_SECRET"),
		LemonSqueezyCheckoutURL:   os.Getenv("LEMONSQUEEZY_CHECKOUT_URL"),

		TelegramAppID:         getEnvInt("TELEGRAM_APP_ID", 0),
		TelegramAppHash:       os.Getenv("TELEGRAM_APP_HASH"),
		TelegramPhone:         os.Getenv("TELEGRAM_PHONE"),
		TelegramSessionPath:   getEnv("TELEGRAM_SESSION_PATH", ".telegram-session"),
		TelegramTargetChannel: getEnv("TELEGRAM_TARGET_CHANNEL", "studywithme_r"),
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

func getEnvInt(key string, fallback int) int {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback
	}

	value, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}

	return value
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

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
