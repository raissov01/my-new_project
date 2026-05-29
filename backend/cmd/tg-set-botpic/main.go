// tg-set-botpic: set @balufit_bot avatar by talking to @BotFather from the user's session.
//
// Flow:
//   1. Open chat with @BotFather
//   2. Send "/setuserpic @balufit_bot"
//   3. Wait for BotFather to ask for the photo
//   4. Upload the PNG and send as photo
//   5. Print BotFather's confirmation
package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"os"
	"strings"
	"time"

	"github.com/gotd/td/session"
	"github.com/gotd/td/telegram"
	"github.com/gotd/td/telegram/uploader"
	"github.com/gotd/td/tg"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	photoPath := os.Getenv("PHOTO_PATH")
	botUsername := os.Getenv("TARGET_BOT")
	if photoPath == "" || botUsername == "" {
		log.Fatal("Set PHOTO_PATH=<file> TARGET_BOT=<bot_username_without_@>")
	}
	if _, err := os.Stat(photoPath); err != nil {
		log.Fatalf("photo not found: %v", err)
	}

	appID := 0
	fmt.Sscanf(os.Getenv("TELEGRAM_APP_ID"), "%d", &appID)
	appHash := os.Getenv("TELEGRAM_APP_HASH")
	sessionPath := os.Getenv("TELEGRAM_SESSION_PATH")
	if sessionPath == "" {
		sessionPath = ".telegram-session"
	}
	if appID == 0 || appHash == "" {
		log.Fatal("Set TELEGRAM_APP_ID, TELEGRAM_APP_HASH")
	}

	client := telegram.NewClient(appID, appHash, telegram.Options{
		SessionStorage: &session.FileStorage{Path: sessionPath},
	})

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	err := client.Run(ctx, func(ctx context.Context) error {
		api := client.API()

		// Resolve @BotFather
		res, err := api.ContactsResolveUsername(ctx, &tg.ContactsResolveUsernameRequest{Username: "BotFather"})
		if err != nil {
			return fmt.Errorf("resolve BotFather: %w", err)
		}
		var bf *tg.User
		for _, raw := range res.Users {
			if u, ok := raw.(*tg.User); ok {
				bf = u
				break
			}
		}
		if bf == nil {
			return fmt.Errorf("BotFather not found")
		}
		peer := &tg.InputPeerUser{UserID: bf.ID, AccessHash: bf.AccessHash}

		// Pre-snapshot
		preID := latestMsgID(ctx, api, peer)

		// Step 1: cancel any in-flight BotFather flow, then send /setuserpic
		_, _ = api.MessagesSendMessage(ctx, &tg.MessagesSendMessageRequest{
			Peer: peer, Message: "/cancel", RandomID: rand.Int63(),
		})
		time.Sleep(1 * time.Second)
		cmd := "/setuserpic @" + botUsername
		_, err = api.MessagesSendMessage(ctx, &tg.MessagesSendMessageRequest{
			Peer: peer, Message: cmd, RandomID: rand.Int63(),
		})
		if err != nil {
			return fmt.Errorf("send /setuserpic: %w", err)
		}
		fmt.Printf("✓ Sent: %s\n", cmd)
		time.Sleep(3 * time.Second)

		// Read response
		reply := readLatestText(ctx, api, peer, preID)
		fmt.Printf("BotFather: %s\n", truncate(reply, 200))

		if strings.Contains(strings.ToLower(reply), "choose a bot") || strings.Contains(reply, "Choose") {
			// Multi-bot account — explicitly send the bot username
			_, _ = api.MessagesSendMessage(ctx, &tg.MessagesSendMessageRequest{
				Peer: peer, Message: "@" + botUsername, RandomID: rand.Int63(),
			})
			time.Sleep(2 * time.Second)
			reply = readLatestText(ctx, api, peer, preID)
			fmt.Printf("BotFather: %s\n", truncate(reply, 200))
		}

		// Step 2: upload photo
		fmt.Println("Uploading photo...")
		up := uploader.NewUploader(api)
		upFile, err := up.FromPath(ctx, photoPath)
		if err != nil {
			return fmt.Errorf("upload photo: %w", err)
		}

		preID2 := latestMsgID(ctx, api, peer)
		_, err = api.MessagesSendMedia(ctx, &tg.MessagesSendMediaRequest{
			Peer:     peer,
			Media:    &tg.InputMediaUploadedPhoto{File: upFile},
			RandomID: rand.Int63(),
		})
		if err != nil {
			return fmt.Errorf("send photo: %w", err)
		}
		fmt.Println("✓ Photo sent")
		time.Sleep(4 * time.Second)

		final := readLatestText(ctx, api, peer, preID2)
		fmt.Printf("BotFather final: %s\n", truncate(final, 300))
		return nil
	})
	if err != nil {
		log.Fatalf("run: %v", err)
	}
}

func latestMsgID(ctx context.Context, api *tg.Client, peer tg.InputPeerClass) int {
	h, err := api.MessagesGetHistory(ctx, &tg.MessagesGetHistoryRequest{Peer: peer, Limit: 1})
	if err != nil {
		return 0
	}
	for _, raw := range extractMsgs(h) {
		if m, ok := raw.(*tg.Message); ok {
			return m.ID
		}
	}
	return 0
}

func readLatestText(ctx context.Context, api *tg.Client, peer tg.InputPeerClass, sinceID int) string {
	h, err := api.MessagesGetHistory(ctx, &tg.MessagesGetHistoryRequest{Peer: peer, Limit: 5})
	if err != nil {
		return ""
	}
	for _, raw := range extractMsgs(h) {
		m, ok := raw.(*tg.Message)
		if !ok || m.Out || m.ID <= sinceID {
			continue
		}
		return m.Message
	}
	return ""
}

func extractMsgs(r tg.MessagesMessagesClass) []tg.MessageClass {
	switch x := r.(type) {
	case *tg.MessagesMessages:
		return x.Messages
	case *tg.MessagesMessagesSlice:
		return x.Messages
	}
	return nil
}

func truncate(s string, n int) string {
	s = strings.TrimSpace(s)
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
