// tg-test-balufit: drive @balufit_bot through key flows from the user's session.
//
//   go run ./cmd/tg-test-balufit            # default: /start /help /status /marathon
//   CMDS="/start,/marathon" go run ...      # custom command list
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

	cmds := []string{"/start", "/help", "/status", "/marathon"}
	if env := os.Getenv("CMDS"); env != "" {
		cmds = strings.Split(env, ",")
	}

	client := telegram.NewClient(appID, appHash, telegram.Options{
		SessionStorage: &session.FileStorage{Path: sessionPath},
	})
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	err := client.Run(ctx, func(ctx context.Context) error {
		api := client.API()
		res, err := api.ContactsResolveUsername(ctx, &tg.ContactsResolveUsernameRequest{Username: "balufit_bot"})
		if err != nil {
			return err
		}
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

		for _, cmd := range cmds {
			cmd = strings.TrimSpace(cmd)
			if cmd == "" {
				continue
			}
			pre, _ := api.MessagesGetHistory(ctx, &tg.MessagesGetHistoryRequest{Peer: peer, Limit: 1})
			preID := 0
			for _, raw := range extractMsgs(pre) {
				if m, ok := raw.(*tg.Message); ok {
					preID = m.ID
					break
				}
			}
			_, err := api.MessagesSendMessage(ctx, &tg.MessagesSendMessageRequest{
				Peer: peer, Message: cmd, RandomID: rand.Int63(),
			})
			if err != nil {
				return err
			}
			time.Sleep(4 * time.Second)
			post, _ := api.MessagesGetHistory(ctx, &tg.MessagesGetHistoryRequest{Peer: peer, Limit: 10})
			fmt.Printf("\n===== %s =====\n", cmd)
			// reverse to chronological
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
							case *tg.KeyboardButtonWebView:
								fmt.Printf("  [WebApp] %q → %s\n", x.Text, x.URL)
							case *tg.KeyboardButtonURL:
								fmt.Printf("  [URL] %q → %s\n", x.Text, x.URL)
							case *tg.KeyboardButtonCallback:
								fmt.Printf("  [Callback] %q (data=%s)\n", x.Text, string(x.Data))
							}
						}
					}
				}
				fmt.Println("---")
			}
		}
		_ = log.Default
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
