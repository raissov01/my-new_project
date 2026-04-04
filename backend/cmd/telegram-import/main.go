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

// telegram-import is a standalone CLI tool that imports the full message history
// of a Telegram channel into PostgreSQL using the MTProto client API.
//
// Usage:
//   go run ./cmd/telegram-import
//
// Required environment variables:
//   DATABASE_URL          - PostgreSQL connection string
//   TELEGRAM_APP_ID       - Telegram API app ID (from https://my.telegram.org)
//   TELEGRAM_APP_HASH     - Telegram API app hash
//   TELEGRAM_PHONE        - Phone number of the Telegram account (e.g. +77001234567)
//   TELEGRAM_CHANNEL_ID   - Numeric channel ID (without -100 prefix)
//
// On first run, it will prompt for a verification code sent to your Telegram app.
// Subsequent runs reuse the session automatically.

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	// Connect to database via GORM
	gormDB, err := database.ConnectGorm(cfg.DatabaseURL, cfg.Environment)
	if err != nil {
		log.Fatalf("database: %v", err)
	}

	// Ensure the telegram_posts table exists
	if err := database.AutoMigrate(gormDB); err != nil {
		log.Fatalf("migration: %v", err)
	}

	importer := telegram.NewImporter(telegram.ImporterConfig{
		AppID:     cfg.TelegramAppID,
		AppHash:   cfg.TelegramAppHash,
		Phone:     cfg.TelegramPhone,
		ChannelID: cfg.TelegramChannelID,
	}, gormDB)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Graceful shutdown on SIGINT/SIGTERM
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
