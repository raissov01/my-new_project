package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/midoriya/flashlearn-backend/internal/config"
	"github.com/midoriya/flashlearn-backend/internal/database"
	"github.com/midoriya/flashlearn-backend/internal/telegram"
)

// Imports full history of @studywithme_r into PostgreSQL.
//
// First run: prompts for verification code, saves session to TELEGRAM_SESSION_PATH.
// Subsequent runs: reuses saved session, imports only new (non-duplicate) posts.
//
// Usage:  go run ./cmd/telegram-import
//
// Required env:
//   DATABASE_URL, TELEGRAM_APP_ID, TELEGRAM_APP_HASH, TELEGRAM_PHONE
// Optional env:
//   TELEGRAM_TARGET_CHANNEL (default: studywithme_r)
//   TELEGRAM_SESSION_PATH   (default: .telegram-session)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	gormDB, err := database.ConnectGorm(cfg.DatabaseURL, cfg.Environment)
	if err != nil {
		log.Fatalf("database: %v", err)
	}

	if err := database.AutoMigrate(gormDB); err != nil {
		log.Fatalf("migration: %v", err)
	}

	imp := telegram.NewImporter(telegram.ImporterConfig{
		AppID:         cfg.TelegramAppID,
		AppHash:       cfg.TelegramAppHash,
		Phone:         cfg.TelegramPhone,
		SessionPath:   cfg.TelegramSessionPath,
		TargetChannel: cfg.TelegramTargetChannel,
	}, gormDB)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() {
		quit := make(chan os.Signal, 1)
		signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
		<-quit
		log.Println("shutting down...")
		cancel()
	}()

	if err := imp.Run(ctx); err != nil {
		log.Fatalf("import failed: %v", err)
	}
}
