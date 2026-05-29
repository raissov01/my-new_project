package main

import (
	"context"
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

// Sends /start to BOT_USERNAME and dumps every message and button with
// full type info as JSON. Used to figure out what button types a bot uses
// (callback vs WebApp vs URL vs reply-keyboard).

func main() {
	_ = godotenv.Load()

	appID := 0
	if v := os.Getenv("TELEGRAM_APP_ID"); v != "" {
		fmt.Sscanf(v, "%d", &appID)
	}
	appHash := os.Getenv("TELEGRAM_APP_HASH")
	bot := os.Getenv("BOT_USERNAME")
	sessionPath := os.Getenv("TELEGRAM_SESSION_PATH")
	sendText := os.Getenv("SEND")
	if sendText == "" {
		sendText = "/start"
	}

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
		if u == nil {
			return fmt.Errorf("bot not found")
		}
		peer := &tg.InputPeerUser{UserID: u.ID, AccessHash: u.AccessHash}

		// snapshot
		hist0, _ := api.MessagesGetHistory(ctx, &tg.MessagesGetHistoryRequest{Peer: peer, Limit: 1})
		var sinceID int
		for _, raw := range extractMsgs(hist0) {
			if m, ok := raw.(*tg.Message); ok {
				sinceID = m.ID
				break
			}
		}

		_, err = api.MessagesSendMessage(ctx, &tg.MessagesSendMessageRequest{
			Peer: peer, Message: sendText, RandomID: rand.Int63(),
		})
		if err != nil {
			return err
		}

		time.Sleep(3 * time.Second)

		hist, err := api.MessagesGetHistory(ctx, &tg.MessagesGetHistoryRequest{Peer: peer, Limit: 20})
		if err != nil {
			return err
		}

		fmt.Println("=== messages newer than", sinceID, "===")
		for _, raw := range extractMsgs(hist) {
			m, ok := raw.(*tg.Message)
			if !ok {
				continue
			}
			if m.ID <= sinceID {
				continue
			}
			if m.Out {
				continue
			}
			dump := map[string]any{
				"id":        m.ID,
				"text":      m.Message,
				"hasMedia":  m.Media != nil,
				"replyMkup": describeMarkup(m.ReplyMarkup),
				"entities":  describeEntities(m.Entities),
			}
			b, _ := json.MarshalIndent(dump, "", "  ")
			fmt.Println(string(b))
		}
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
	case *tg.ReplyKeyboardHide:
		return "hide"
	case *tg.ReplyKeyboardForceReply:
		return "force_reply"
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
	case *tg.KeyboardButtonURLAuth:
		return map[string]any{"type": "url_auth", "label": x.Text, "url": x.URL}
	case *tg.KeyboardButtonWebView:
		return map[string]any{"type": "webview", "label": x.Text, "url": x.URL}
	case *tg.KeyboardButtonSimpleWebView:
		return map[string]any{"type": "simple_webview", "label": x.Text, "url": x.URL}
	case *tg.KeyboardButtonRequestPhone:
		return map[string]any{"type": "request_phone", "label": x.Text}
	case *tg.KeyboardButtonSwitchInline:
		return map[string]any{"type": "switch_inline", "label": x.Text, "query": x.Query, "same_peer": x.SamePeer}
	case *tg.KeyboardButtonBuy:
		return map[string]any{"type": "buy", "label": x.Text}
	case *tg.KeyboardButtonGame:
		return map[string]any{"type": "game", "label": x.Text}
	case *tg.KeyboardButtonRequestGeoLocation:
		return map[string]any{"type": "request_geo", "label": x.Text}
	case *tg.KeyboardButtonRequestPoll:
		return map[string]any{"type": "request_poll", "label": x.Text}
	}
	return map[string]any{"type": fmt.Sprintf("%T", b)}
}

func describeEntities(es []tg.MessageEntityClass) []any {
	var out []any
	for _, e := range es {
		out = append(out, fmt.Sprintf("%T", e))
	}
	return out
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
