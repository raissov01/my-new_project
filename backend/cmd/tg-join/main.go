package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/gotd/td/session"
	"github.com/gotd/td/telegram"
	"github.com/gotd/td/tg"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	appID := 0
	if v := os.Getenv("TELEGRAM_APP_ID"); v != "" {
		fmt.Sscanf(v, "%d", &appID)
	}
	appHash := os.Getenv("TELEGRAM_APP_HASH")
	hash := os.Getenv("INVITE_HASH")
	sessionPath := os.Getenv("TELEGRAM_SESSION_PATH")
	if sessionPath == "" {
		sessionPath = ".telegram-session"
	}
	if appID == 0 || appHash == "" || hash == "" {
		log.Fatal("Set TELEGRAM_APP_ID, TELEGRAM_APP_HASH, INVITE_HASH")
	}

	storage := &session.FileStorage{Path: sessionPath}
	client := telegram.NewClient(appID, appHash, telegram.Options{SessionStorage: storage})

	ctx := context.Background()
	err := client.Run(ctx, func(ctx context.Context) error {
		api := client.API()

		info, err := api.MessagesCheckChatInvite(ctx, hash)
		if err != nil {
			return fmt.Errorf("check invite: %w", err)
		}
		switch v := info.(type) {
		case *tg.ChatInviteAlready:
			log.Printf("already a member of: %s", chatTitle(v.Chat))
			return nil
		case *tg.ChatInvite:
			log.Printf("invite preview: %q (participants=%d)", v.Title, v.ParticipantsCount)
		case *tg.ChatInvitePeek:
			log.Printf("peekable: %q", chatTitle(v.Chat))
		}

		updates, err := api.MessagesImportChatInvite(ctx, hash)
		if err != nil {
			return fmt.Errorf("import invite: %w", err)
		}
		log.Printf("joined ok; updates type=%T", updates)
		return nil
	})
	if err != nil {
		log.Fatalf("error: %v", err)
	}
}

func chatTitle(c tg.ChatClass) string {
	switch v := c.(type) {
	case *tg.Chat:
		return v.Title
	case *tg.Channel:
		return v.Title
	}
	return fmt.Sprintf("%T", c)
}
