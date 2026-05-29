// tg-full-balufit: complete end-to-end test of @balufit_bot.
//
//   RECEIPT_PATH=/tmp/balufit-test/receipt-ok.png \
//     go run ./cmd/tg-full-balufit
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
	receiptPath := os.Getenv("RECEIPT_PATH")
	if receiptPath == "" {
		log.Fatal("Set RECEIPT_PATH=<path to receipt image>")
	}
	if _, err := os.Stat(receiptPath); err != nil {
		log.Fatalf("receipt not found: %v", err)
	}

	appID := 0
	fmt.Sscanf(os.Getenv("TELEGRAM_APP_ID"), "%d", &appID)
	appHash := os.Getenv("TELEGRAM_APP_HASH")
	sessionPath := os.Getenv("TELEGRAM_SESSION_PATH")
	if sessionPath == "" {
		sessionPath = ".telegram-session"
	}

	client := telegram.NewClient(appID, appHash, telegram.Options{
		SessionStorage: &session.FileStorage{Path: sessionPath},
	})
	ctx, cancel := context.WithTimeout(context.Background(), 180*time.Second)
	defer cancel()

	err := client.Run(ctx, func(ctx context.Context) error {
		api := client.API()
		res, _ := api.ContactsResolveUsername(ctx, &tg.ContactsResolveUsernameRequest{Username: "balufit_bot"})
		var bot *tg.User
		for _, raw := range res.Users {
			if u, ok := raw.(*tg.User); ok && u.Bot {
				bot = u
				break
			}
		}
		if bot == nil {
			return fmt.Errorf("bot not found")
		}
		peer := &tg.InputPeerUser{UserID: bot.ID, AccessHash: bot.AccessHash}

		step := 1

		// ---------- 1. /start
		fmt.Printf("\n========== [%d] /start ==========\n", step)
		step++
		preID := latestMsgID(ctx, api, peer)
		_, _ = api.MessagesSendMessage(ctx, &tg.MessagesSendMessageRequest{
			Peer: peer, Message: "/start", RandomID: rand.Int63(),
		})
		time.Sleep(3 * time.Second)
		dumpNew(ctx, api, peer, preID)

		// ---------- 2. /marathon
		fmt.Printf("\n========== [%d] /marathon ==========\n", step)
		step++
		preID = latestMsgID(ctx, api, peer)
		_, _ = api.MessagesSendMessage(ctx, &tg.MessagesSendMessageRequest{
			Peer: peer, Message: "/marathon", RandomID: rand.Int63(),
		})
		time.Sleep(4 * time.Second)
		menuMsg, startData := findCallbackButton(ctx, api, peer, "Старт")
		dumpNew(ctx, api, peer, preID)

		if menuMsg == nil || startData == nil {
			return fmt.Errorf("Старт button not found")
		}

		// ---------- 3. Click Старт (4 000 ₸)
		fmt.Printf("\n========== [%d] click Старт callback ==========\n", step)
		step++
		preID = latestMsgID(ctx, api, peer)
		_, err := api.MessagesGetBotCallbackAnswer(ctx, &tg.MessagesGetBotCallbackAnswerRequest{
			Peer: peer, MsgID: menuMsg.ID, Data: startData,
		})
		if err != nil {
			return fmt.Errorf("callback: %w", err)
		}
		time.Sleep(4 * time.Second)
		dumpNew(ctx, api, peer, preID)

		// ---------- 4. Upload receipt
		fmt.Printf("\n========== [%d] upload receipt %s ==========\n", step, receiptPath)
		step++
		preID = latestMsgID(ctx, api, peer)
		up := uploader.NewUploader(api)
		upFile, err := up.FromPath(ctx, receiptPath)
		if err != nil {
			return fmt.Errorf("upload: %w", err)
		}
		_, err = api.MessagesSendMedia(ctx, &tg.MessagesSendMediaRequest{
			Peer:     peer,
			Media:    &tg.InputMediaUploadedPhoto{File: upFile},
			RandomID: rand.Int63(),
		})
		if err != nil {
			return fmt.Errorf("send photo: %w", err)
		}
		fmt.Println("✓ receipt sent, waiting for AI verification (12s)...")
		time.Sleep(12 * time.Second)
		dumpNew(ctx, api, peer, preID)

		// ---------- 5. /status
		fmt.Printf("\n========== [%d] /status ==========\n", step)
		step++
		preID = latestMsgID(ctx, api, peer)
		_, _ = api.MessagesSendMessage(ctx, &tg.MessagesSendMessageRequest{
			Peer: peer, Message: "/status", RandomID: rand.Int63(),
		})
		time.Sleep(3 * time.Second)
		dumpNew(ctx, api, peer, preID)

		// ---------- 6. /admin (only works for admins)
		fmt.Printf("\n========== [%d] /admin ==========\n", step)
		step++
		preID = latestMsgID(ctx, api, peer)
		_, _ = api.MessagesSendMessage(ctx, &tg.MessagesSendMessageRequest{
			Peer: peer, Message: "/admin", RandomID: rand.Int63(),
		})
		time.Sleep(3 * time.Second)
		dumpNew(ctx, api, peer, preID)

		// ---------- 7. /report (admin daily report)
		fmt.Printf("\n========== [%d] /report ==========\n", step)
		preID = latestMsgID(ctx, api, peer)
		_, _ = api.MessagesSendMessage(ctx, &tg.MessagesSendMessageRequest{
			Peer: peer, Message: "/report", RandomID: rand.Int63(),
		})
		time.Sleep(3 * time.Second)
		dumpNew(ctx, api, peer, preID)

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

func dumpNew(ctx context.Context, api *tg.Client, peer tg.InputPeerClass, since int) {
	h, _ := api.MessagesGetHistory(ctx, &tg.MessagesGetHistoryRequest{Peer: peer, Limit: 15})
	msgs := extractMsgs(h)
	// chronological
	for i := len(msgs) - 1; i >= 0; i-- {
		m, ok := msgs[i].(*tg.Message)
		if !ok || m.ID <= since || m.Out {
			continue
		}
		body := strings.TrimSpace(m.Message)
		if body != "" {
			fmt.Println(body)
		}
		if rm, ok := m.ReplyMarkup.(*tg.ReplyInlineMarkup); ok {
			for _, row := range rm.Rows {
				for _, b := range row.Buttons {
					switch x := b.(type) {
					case *tg.KeyboardButtonURL:
						fmt.Printf("  [URL] %q → %s\n", x.Text, x.URL)
					case *tg.KeyboardButtonCallback:
						fmt.Printf("  [Callback] %q\n", x.Text)
					case *tg.KeyboardButtonWebView:
						fmt.Printf("  [WebApp] %q → %s\n", x.Text, x.URL)
					}
				}
			}
		}
		fmt.Println("---")
	}
}

func findCallbackButton(ctx context.Context, api *tg.Client, peer tg.InputPeerClass, labelPrefix string) (*tg.Message, []byte) {
	h, _ := api.MessagesGetHistory(ctx, &tg.MessagesGetHistoryRequest{Peer: peer, Limit: 10})
	for _, raw := range extractMsgs(h) {
		m, ok := raw.(*tg.Message)
		if !ok || m.Out {
			continue
		}
		rm, ok := m.ReplyMarkup.(*tg.ReplyInlineMarkup)
		if !ok {
			continue
		}
		for _, row := range rm.Rows {
			for _, btn := range row.Buttons {
				if cb, ok := btn.(*tg.KeyboardButtonCallback); ok {
					if strings.HasPrefix(cb.Text, labelPrefix) {
						return m, cb.Data
					}
				}
			}
		}
	}
	return nil, nil
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
