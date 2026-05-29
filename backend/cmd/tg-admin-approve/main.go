// tg-admin-approve: as admin, click the "✓ Растау" button on the pending review.
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
	action := os.Getenv("ACTION")
	if action == "" {
		action = "✓ Растау"
	}

	client := telegram.NewClient(appID, appHash, telegram.Options{
		SessionStorage: &session.FileStorage{Path: sessionPath},
	})
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
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
		peer := &tg.InputPeerUser{UserID: bot.ID, AccessHash: bot.AccessHash}

		// Send /admin
		_, _ = api.MessagesSendMessage(ctx, &tg.MessagesSendMessageRequest{
			Peer: peer, Message: "/admin", RandomID: rand.Int63(),
		})
		time.Sleep(4 * time.Second)

		// Find the "✓ Растау" / "✗ Қабылдамау" button
		hist, _ := api.MessagesGetHistory(ctx, &tg.MessagesGetHistoryRequest{Peer: peer, Limit: 10})
		var menuMsg *tg.Message
		var data []byte
		for _, raw := range extractMsgs(hist) {
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
						if strings.HasPrefix(cb.Text, action) {
							data = cb.Data
							menuMsg = m
							break
						}
					}
				}
				if data != nil {
					break
				}
			}
			if data != nil {
				break
			}
		}
		if menuMsg == nil {
			return fmt.Errorf("button %q not found — no pending reviews?", action)
		}
		fmt.Printf("✓ clicking %q (data=%s) on msg %d\n", action, string(data), menuMsg.ID)

		preID := menuMsg.ID
		ans, err := api.MessagesGetBotCallbackAnswer(ctx, &tg.MessagesGetBotCallbackAnswerRequest{
			Peer: peer, MsgID: menuMsg.ID, Data: data,
		})
		if err != nil {
			return fmt.Errorf("callback: %w", err)
		}
		if ans.Message != "" {
			fmt.Printf("  toast: %q\n", ans.Message)
		}
		time.Sleep(3 * time.Second)

		fmt.Println("\n----- follow-up messages -----")
		post, _ := api.MessagesGetHistory(ctx, &tg.MessagesGetHistoryRequest{Peer: peer, Limit: 5})
		msgs := extractMsgs(post)
		for i := len(msgs) - 1; i >= 0; i-- {
			m, ok := msgs[i].(*tg.Message)
			if !ok || m.ID <= preID || m.Out {
				continue
			}
			fmt.Println(m.Message)
			fmt.Println("---")
		}
		return nil
	})
	if err != nil {
		log.Fatalf("run: %v", err)
	}
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
