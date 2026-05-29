// tg-self-ping: send a notification to the user's "Saved Messages" so they
// know the assistant session is active. Uses the same MTProto session.
package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"os"
	"time"

	"github.com/gotd/td/session"
	"github.com/gotd/td/telegram"
	"github.com/gotd/td/tg"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()
	appID := 0
	fmt.Sscanf(os.Getenv("TELEGRAM_APP_ID"), "%d", &appID)
	appHash := os.Getenv("TELEGRAM_APP_HASH")
	sessionPath := os.Getenv("TELEGRAM_SESSION_PATH")
	if sessionPath == "" {
		sessionPath = ".telegram-session"
	}
	text := os.Getenv("MSG")
	if text == "" {
		text = "ping from assistant"
	}

	client := telegram.NewClient(appID, appHash, telegram.Options{
		SessionStorage: &session.FileStorage{Path: sessionPath},
	})
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	err := client.Run(ctx, func(ctx context.Context) error {
		me, err := client.Self(ctx)
		if err != nil {
			return fmt.Errorf("self: %w", err)
		}
		fmt.Printf("logged in as: %s %s (@%s, id=%d)\n",
			me.FirstName, me.LastName, me.Username, me.ID)

		// Saved Messages = chat with self. InputPeerSelf is the canonical way.
		_, err = client.API().MessagesSendMessage(ctx, &tg.MessagesSendMessageRequest{
			Peer:     &tg.InputPeerSelf{},
			Message:  text,
			RandomID: rand.Int63(),
		})
		if err != nil {
			return fmt.Errorf("send: %w", err)
		}
		fmt.Println("✓ message sent to Saved Messages")
		return nil
	})
	if err != nil {
		log.Fatalf("run: %v", err)
	}
}
