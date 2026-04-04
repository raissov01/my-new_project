package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/gotd/td/session"
	"github.com/gotd/td/telegram"
	"github.com/gotd/td/telegram/auth"
	"github.com/gotd/td/tg"
	"github.com/joho/godotenv"
)

// Authenticates with Telegram and saves the session file locally.
// No database needed. Run this once, then copy the session file to the VPS.
//
// Usage:  go run ./cmd/telegram-auth
//
// Reads from .env: TELEGRAM_APP_ID, TELEGRAM_APP_HASH, TELEGRAM_PHONE

func main() {
	_ = godotenv.Load()

	appID := 0
	if v := os.Getenv("TELEGRAM_APP_ID"); v != "" {
		fmt.Sscanf(v, "%d", &appID)
	}
	appHash := os.Getenv("TELEGRAM_APP_HASH")
	phone := os.Getenv("TELEGRAM_PHONE")
	sessionPath := os.Getenv("TELEGRAM_SESSION_PATH")
	if sessionPath == "" {
		sessionPath = ".telegram-session"
	}

	if appID == 0 || appHash == "" || phone == "" {
		log.Fatal("Set TELEGRAM_APP_ID, TELEGRAM_APP_HASH, TELEGRAM_PHONE in .env")
	}

	storage := &session.FileStorage{Path: sessionPath}
	client := telegram.NewClient(appID, appHash, telegram.Options{
		SessionStorage: storage,
	})

	ctx := context.Background()

	err := client.Run(ctx, func(ctx context.Context) error {
		flow := auth.NewFlow(termAuth{phone: phone}, auth.SendCodeOptions{})
		if err := client.Auth().IfNecessary(ctx, flow); err != nil {
			return err
		}

		user, err := client.Self(ctx)
		if err != nil {
			return err
		}

		log.Printf("Authenticated as: %s %s (@%s, id=%d)",
			user.FirstName, user.LastName, user.Username, user.ID)
		log.Printf("Session saved to: %s", sessionPath)
		log.Println("You can now copy this session file to the VPS and run the importer.")
		return nil
	})

	if err != nil {
		log.Fatalf("auth failed: %v", err)
	}
}

type termAuth struct{ phone string }

func (a termAuth) Phone(_ context.Context) (string, error) { return a.phone, nil }
func (a termAuth) Password(_ context.Context) (string, error) {
	fmt.Print("Enter 2FA password: ")
	var s string
	fmt.Scanln(&s)
	return s, nil
}
func (a termAuth) Code(_ context.Context, _ *tg.AuthSentCode) (string, error) {
	fmt.Print("Enter verification code: ")
	var s string
	fmt.Scanln(&s)
	return s, nil
}
func (a termAuth) AcceptTermsOfService(_ context.Context, _ tg.HelpTermsOfService) error {
	return nil
}
func (a termAuth) SignUp(_ context.Context) (auth.UserInfo, error) {
	return auth.UserInfo{}, fmt.Errorf("sign-up not supported")
}
