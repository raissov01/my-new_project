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

// telegram-import imports the full message history of a single Telegram channel
// into PostgreSQL via the MTProto client API.
//
// Target channel: @studywithme_r (configurable via TELEGRAM_TARGET_CHANNEL)
//
// Usage:
//   go run ./cmd/telegram-import
//
// Required environment variables:
//   DATABASE_URL             - PostgreSQL connection string
//   TELEGRAM_APP_ID          - from https://my.telegram.org
//   TELEGRAM_APP_HASH        - from https://my.telegram.org
//   TELEGRAM_PHONE           - your phone number (e.g. +77001234567)
//   TELEGRAM_TARGET_CHANNEL  - channel username (default: studywithme_r)

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

	importer := telegram.NewImporter(telegram.ImporterConfig{
		AppID:         cfg.TelegramAppID,
		AppHash:       cfg.TelegramAppHash,
		Phone:         cfg.TelegramPhone,
		TargetChannel: cfg.TelegramTargetChannel,
	}, gormDB)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() {
		quit := make(chan os.Signal, 1)
		signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
		<-quit
		log.Println("shutting down importer...")
		cancel()
	}()

	if err := importer.Run(ctx); err != nil {
		log.Fatalf("import failed: %v", err)
	}

	log.Println("import complete")
}
