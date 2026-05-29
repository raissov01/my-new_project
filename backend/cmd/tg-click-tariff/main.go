// tg-click-tariff: send /marathon, click the "Оптимал" tariff button, dump reply.
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
	wantLabelPrefix := os.Getenv("TARIFF")
	if wantLabelPrefix == "" {
		wantLabelPrefix = "Оптимал"
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

		// Send /marathon
		_, _ = api.MessagesSendMessage(ctx, &tg.MessagesSendMessageRequest{
			Peer: peer, Message: "/marathon", RandomID: rand.Int63(),
		})
		time.Sleep(4 * time.Second)

		// Find the menu message and target button
		hist, _ := api.MessagesGetHistory(ctx, &tg.MessagesGetHistoryRequest{Peer: peer, Limit: 5})
		var menuMsg *tg.Message
		var data []byte
		var foundLabel string
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
						if strings.HasPrefix(cb.Text, wantLabelPrefix) {
							data = cb.Data
							foundLabel = cb.Text
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
			return fmt.Errorf("button starting with %q not found", wantLabelPrefix)
		}
		fmt.Printf("✓ clicking %q (data=%s) on msg %d\n", foundLabel, string(data), menuMsg.ID)

		preID := menuMsg.ID
		ans, err := api.MessagesGetBotCallbackAnswer(ctx, &tg.MessagesGetBotCallbackAnswerRequest{
			Peer:  peer,
			MsgID: menuMsg.ID,
			Data:  data,
		})
		if err != nil {
			return fmt.Errorf("callback: %w", err)
		}
		if ans.Message != "" {
			fmt.Printf("  callback alert: %q\n", ans.Message)
		}
		time.Sleep(4 * time.Second)

		// Read new messages
		post, _ := api.MessagesGetHistory(ctx, &tg.MessagesGetHistoryRequest{Peer: peer, Limit: 5})
		fmt.Println("\n----- bot follow-up -----")
		msgs := extractMsgs(post)
		for i := len(msgs) - 1; i >= 0; i-- {
			m, ok := msgs[i].(*tg.Message)
			if !ok || m.ID <= preID || m.Out {
				continue
			}
			fmt.Println(m.Message)
			if rm, ok := m.ReplyMarkup.(*tg.ReplyInlineMarkup); ok {
				for _, row := range rm.Rows {
					for _, b := range row.Buttons {
						switch x := b.(type) {
						case *tg.KeyboardButtonURL:
							fmt.Printf("  [URL] %q → %s\n", x.Text, x.URL)
						case *tg.KeyboardButtonCallback:
							fmt.Printf("  [Callback] %q\n", x.Text)
						}
					}
				}
			}
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
