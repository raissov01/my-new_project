package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/gotd/td/session"
	"github.com/gotd/td/telegram"
	"github.com/gotd/td/telegram/downloader"
	"github.com/gotd/td/tg"
	"github.com/joho/godotenv"
)

// Downloads every document attached to the last LIMIT messages in the
// BOT_USERNAME chat, into OUT_DIR.

func main() {
	_ = godotenv.Load()

	appID := 0
	if v := os.Getenv("TELEGRAM_APP_ID"); v != "" {
		fmt.Sscanf(v, "%d", &appID)
	}
	appHash := os.Getenv("TELEGRAM_APP_HASH")
	bot := os.Getenv("BOT_USERNAME")
	sessionPath := os.Getenv("TELEGRAM_SESSION_PATH")
	outDir := os.Getenv("OUT_DIR")
	if outDir == "" {
		outDir = "./tg-downloads"
	}
	limit := 20
	fmt.Sscanf(os.Getenv("LIMIT"), "%d", &limit)
	if limit <= 0 {
		limit = 20
	}
	_ = os.MkdirAll(outDir, 0755)

	storage := &session.FileStorage{Path: sessionPath}
	client := telegram.NewClient(appID, appHash, telegram.Options{SessionStorage: storage})

	ctx := context.Background()
	err := client.Run(ctx, func(ctx context.Context) error {
		api := client.API()
		dl := downloader.NewDownloader()

		res, err := api.ContactsResolveUsername(ctx, &tg.ContactsResolveUsernameRequest{Username: bot})
		if err != nil {
			return err
		}
		var u *tg.User
		for _, raw := range res.Users {
			if x, ok := raw.(*tg.User); ok {
				u = x
				break
			}
		}
		peer := &tg.InputPeerUser{UserID: u.ID, AccessHash: u.AccessHash}

		hist, err := api.MessagesGetHistory(ctx, &tg.MessagesGetHistoryRequest{Peer: peer, Limit: limit})
		if err != nil {
			return err
		}
		for _, raw := range extractMsgs(hist) {
			m, ok := raw.(*tg.Message)
			if !ok {
				continue
			}
			if m.Media == nil {
				continue
			}
			md, ok := m.Media.(*tg.MessageMediaDocument)
			if !ok {
				continue
			}
			doc, ok := md.Document.(*tg.Document)
			if !ok {
				continue
			}
			name := ""
			for _, a := range doc.Attributes {
				if fa, ok := a.(*tg.DocumentAttributeFilename); ok {
					name = fa.FileName
					break
				}
			}
			if name == "" {
				name = fmt.Sprintf("doc_%d", doc.ID)
			}
			name = strings.ReplaceAll(name, "/", "_")
			out := filepath.Join(outDir, name)
			if _, err := os.Stat(out); err == nil {
				log.Printf("skip (exists): %s", out)
				continue
			}
			loc := &tg.InputDocumentFileLocation{
				ID:            doc.ID,
				AccessHash:    doc.AccessHash,
				FileReference: doc.FileReference,
			}
			if _, err := dl.Download(api, loc).ToPath(ctx, out); err != nil {
				log.Printf("download %s failed: %v", name, err)
				_ = os.Remove(out)
				continue
			}
			log.Printf("downloaded msg=%d mime=%s size=%d -> %s", m.ID, doc.MimeType, doc.Size, out)
		}
		return nil
	})
	if err != nil {
		log.Fatal(err)
	}
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
