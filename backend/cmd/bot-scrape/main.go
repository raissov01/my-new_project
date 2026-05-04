package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/config"
	"github.com/midoriya/flashlearn-backend/internal/telegram"
)

// Walks an interactive Telegram bot's inline-keyboard menu tree, downloading
// every document the bot sends and dumping the menu structure as JSON.
//
// Reuses the same auth as `telegram-import`:
//   TELEGRAM_APP_ID, TELEGRAM_APP_HASH, TELEGRAM_PHONE, TELEGRAM_SESSION_PATH
// If a session file already exists no SMS code is required.
//
// Per-run env:
//   BOT_USERNAME=nuet_chalka_bot   (required, no leading @)
//   OUTPUT_DIR=./bot-dump          (optional, default ./bot-dump-<username>)
//   CLICK_DELAY_MS=2000            (optional, default 2000)
//
// Usage:
//   BOT_USERNAME=nuet_chalka_bot go run ./cmd/bot-scrape

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	botUsername := os.Getenv("BOT_USERNAME")
	if botUsername == "" {
		log.Fatal("BOT_USERNAME is required (e.g. BOT_USERNAME=nuet_chalka_bot)")
	}

	clickDelay := 2 * time.Second
	if v := os.Getenv("CLICK_DELAY_MS"); v != "" {
		var ms int
		if _, err := fmtInt(v, &ms); err == nil && ms > 0 {
			clickDelay = time.Duration(ms) * time.Millisecond
		}
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() {
		quit := make(chan os.Signal, 1)
		signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
		<-quit
		log.Println("shutting down...")
		cancel()
	}()

	err = telegram.RunBotScrape(ctx, telegram.BotScrapeConfig{
		AppID:       cfg.TelegramAppID,
		AppHash:     cfg.TelegramAppHash,
		Phone:       cfg.TelegramPhone,
		SessionPath: cfg.TelegramSessionPath,
		BotUsername: botUsername,
		OutputDir:   os.Getenv("OUTPUT_DIR"),
		ClickDelay:  clickDelay,
	})
	if err != nil {
		log.Fatalf("scrape: %v", err)
	}
}

// fmtInt parses a positive integer string. Tiny inline replacement to avoid
// pulling in strconv just for one optional knob.
func fmtInt(s string, out *int) (int, error) {
	n := 0
	for _, ch := range s {
		if ch < '0' || ch > '9' {
			return 0, errBadInt
		}
		n = n*10 + int(ch-'0')
	}
	*out = n
	return n, nil
}

var errBadInt = &intParseError{}

type intParseError struct{}

func (intParseError) Error() string { return "not an integer" }
