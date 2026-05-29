package main

import (
	"context"
	"encoding/hex"
	"encoding/json"
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

// Sends /start, then clicks the callback button whose data matches CALLBACK_HEX
// (or whose label matches LABEL=). Dumps the bot's response — including
// answer_callback_query payload, edited message text, and any new messages.
//
// Env:
//   BOT_USERNAME, TELEGRAM_APP_ID, TELEGRAM_APP_HASH, TELEGRAM_SESSION_PATH
//   CALLBACK_HEX=<hex>  or  LABEL=<exact_label>

func main() {
	_ = godotenv.Load()

	appID := 0
	if v := os.Getenv("TELEGRAM_APP_ID"); v != "" {
		fmt.Sscanf(v, "%d", &appID)
	}
	appHash := os.Getenv("TELEGRAM_APP_HASH")
	bot := os.Getenv("BOT_USERNAME")
	sessionPath := os.Getenv("TELEGRAM_SESSION_PATH")
	wantHex := os.Getenv("CALLBACK_HEX")
	wantLabel := os.Getenv("LABEL")
	skipStart := os.Getenv("SKIP_START") == "1"

	storage := &session.FileStorage{Path: sessionPath}
	client := telegram.NewClient(appID, appHash, telegram.Options{SessionStorage: storage})

	ctx := context.Background()
	err := client.Run(ctx, func(ctx context.Context) error {
		api := client.API()
		res, err := api.ContactsResolveUsername(ctx, &tg.ContactsResolveUsernameRequest{Username: bot})
		if err != nil {
			return err
		}
		var u *tg.User
		for _, raw := range res.Users {
			if x, ok := raw.(*tg.User); ok && x.Bot {
				u = x
				break
			}
		}
		peer := &tg.InputPeerUser{UserID: u.ID, AccessHash: u.AccessHash}

		_, _ = api.MessagesGetHistory(ctx, &tg.MessagesGetHistoryRequest{Peer: peer, Limit: 1})

		if !skipStart {
			_, err = api.MessagesSendMessage(ctx, &tg.MessagesSendMessageRequest{
				Peer: peer, Message: "/start", RandomID: rand.Int63(),
			})
			if err != nil {
				return err
			}
			time.Sleep(3 * time.Second)
		}

		// Find the menu message after /start (or current latest if skipping)
		hist, err := api.MessagesGetHistory(ctx, &tg.MessagesGetHistoryRequest{Peer: peer, Limit: 10})
		if err != nil {
			return err
		}
		// Search every recent message for the requested button.
		var menuMsg *tg.Message
		var data []byte
		var foundLabel string
		for _, raw := range extractMsgs(hist) {
			m, ok := raw.(*tg.Message)
			if !ok {
				continue
			}
			if m.Out {
				continue
			}
			rm, ok := m.ReplyMarkup.(*tg.ReplyInlineMarkup)
			if !ok {
				continue
			}
			for _, row := range rm.Rows {
				for _, btn := range row.Buttons {
					if cb, ok := btn.(*tg.KeyboardButtonCallback); ok {
						hx := fmt.Sprintf("%x", cb.Data)
						if (wantHex != "" && hx == wantHex) || (wantLabel != "" && cb.Text == wantLabel) {
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
		if menuMsg == nil || data == nil {
			return fmt.Errorf("button not found (hex=%q label=%q)", wantHex, wantLabel)
		}
		fmt.Printf("clicking %q (data=%x) on msg %d\n", foundLabel, data, menuMsg.ID)

		// Snapshot before click
		preLast := menuMsg.ID

		// Click
		ans, err := api.MessagesGetBotCallbackAnswer(ctx, &tg.MessagesGetBotCallbackAnswerRequest{
			Peer: peer, MsgID: menuMsg.ID, Data: data,
		})
		if err != nil {
			return fmt.Errorf("callback: %w", err)
		}
		fmt.Println("=== callback answer ===")
		ajson, _ := json.MarshalIndent(map[string]any{
			"message":   ans.Message,
			"alert":     ans.Alert,
			"url":       ans.URL,
			"has_message": ans.Message != "",
		}, "", "  ")
		fmt.Println(string(ajson))

		time.Sleep(3 * time.Second)

		// Re-fetch the menu message to detect edit
		histAfter, _ := api.MessagesGetHistory(ctx, &tg.MessagesGetHistoryRequest{Peer: peer, Limit: 20})
		fmt.Println("=== messages after click ===")
		for _, raw := range extractMsgs(histAfter) {
			m, ok := raw.(*tg.Message)
			if !ok {
				continue
			}
			if m.Out {
				continue
			}
			isOldMenu := m.ID == menuMsg.ID
			isNew := m.ID > preLast
			if !isOldMenu && !isNew {
				continue
			}
			label := "NEW"
			if isOldMenu {
				label = "EDITED_MENU"
			}
			dump := map[string]any{
				"kind":      label,
				"id":        m.ID,
				"text":      m.Message,
				"replyMkup": describeMarkup(m.ReplyMarkup),
				"hasMedia":  m.Media != nil,
				"mediaType": fmt.Sprintf("%T", m.Media),
			}
			b, _ := json.MarshalIndent(dump, "", "  ")
			fmt.Println(string(b))
		}

		_ = hex.EncodeToString
		return nil
	})
	if err != nil {
		log.Fatal(err)
	}
}

func describeMarkup(rm tg.ReplyMarkupClass) any {
	switch v := rm.(type) {
	case *tg.ReplyInlineMarkup:
		rows := []any{}
		for _, row := range v.Rows {
			var r []any
			for _, btn := range row.Buttons {
				r = append(r, describeButton(btn))
			}
			rows = append(rows, r)
		}
		return map[string]any{"kind": "inline", "rows": rows}
	case *tg.ReplyKeyboardMarkup:
		rows := []any{}
		for _, row := range v.Rows {
			var r []any
			for _, btn := range row.Buttons {
				r = append(r, describeButton(btn))
			}
			rows = append(rows, r)
		}
		return map[string]any{"kind": "reply", "rows": rows}
	}
	if rm == nil {
		return nil
	}
	return fmt.Sprintf("%T", rm)
}

func describeButton(b tg.KeyboardButtonClass) any {
	switch x := b.(type) {
	case *tg.KeyboardButton:
		return map[string]any{"type": "text", "label": x.Text}
	case *tg.KeyboardButtonCallback:
		return map[string]any{"type": "callback", "label": x.Text, "data": fmt.Sprintf("%x", x.Data)}
	case *tg.KeyboardButtonURL:
		return map[string]any{"type": "url", "label": x.Text, "url": x.URL}
	case *tg.KeyboardButtonWebView:
		return map[string]any{"type": "webview", "label": x.Text, "url": x.URL}
	case *tg.KeyboardButtonSimpleWebView:
		return map[string]any{"type": "simple_webview", "label": x.Text, "url": x.URL}
	}
	return map[string]any{"type": fmt.Sprintf("%T", b)}
}

func extractMsgs(res tg.MessagesMessagesClass) []tg.MessageClass {
	switch x := res.(type) {
	case *tg.MessagesMessages:
		return x.Messages
	case *tg.MessagesMessagesSlice:
		return x.Messages
	case *tg.MessagesChannelMessages:
		return x.Messages
	}
	return nil
}
