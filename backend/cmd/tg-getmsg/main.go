// tg-getmsg: download attachments from specific messages in a channel.
//
//   tg-getmsg -channel weglobalnuet -ids 868,869 -out ./out
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gotd/td/session"
	"github.com/gotd/td/telegram"
	"github.com/gotd/td/telegram/downloader"
	"github.com/gotd/td/tg"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	chName := flag.String("channel", "", "channel username (without @)")
	idsRaw := flag.String("ids", "", "comma-separated message IDs to fetch")
	outDir := flag.String("out", "./tg-out", "output dir")
	flag.Parse()

	if *chName == "" || *idsRaw == "" {
		log.Fatal("usage: -channel <name> -ids 1,2,3 [-out ./tg-out]")
	}
	ids := []int{}
	for _, s := range strings.Split(*idsRaw, ",") {
		s = strings.TrimSpace(s)
		if s == "" {
			continue
		}
		n, err := strconv.Atoi(s)
		if err != nil {
			log.Fatalf("bad id %q: %v", s, err)
		}
		ids = append(ids, n)
	}

	appID := 0
	if v := os.Getenv("TELEGRAM_APP_ID"); v != "" {
		fmt.Sscanf(v, "%d", &appID)
	}
	appHash := os.Getenv("TELEGRAM_APP_HASH")
	sessionPath := os.Getenv("TELEGRAM_SESSION_PATH")
	if sessionPath == "" {
		sessionPath = ".telegram-session"
	}
	if appID == 0 || appHash == "" {
		log.Fatal("Set TELEGRAM_APP_ID and TELEGRAM_APP_HASH")
	}
	if err := os.MkdirAll(*outDir, 0755); err != nil {
		log.Fatal(err)
	}

	storage := &session.FileStorage{Path: sessionPath}
	client := telegram.NewClient(appID, appHash, telegram.Options{SessionStorage: storage})

	ctx := context.Background()
	err := client.Run(ctx, func(ctx context.Context) error {
		api := client.API()
		dl := downloader.NewDownloader()

		res, err := api.ContactsResolveUsername(ctx, &tg.ContactsResolveUsernameRequest{Username: *chName})
		if err != nil {
			return fmt.Errorf("resolve %s: %w", *chName, err)
		}
		var ch *tg.Channel
		for _, c := range res.Chats {
			if cc, ok := c.(*tg.Channel); ok {
				ch = cc
				break
			}
		}
		if ch == nil {
			return fmt.Errorf("not a channel: %s", *chName)
		}

		var inputIDs []tg.InputMessageClass
		for _, id := range ids {
			inputIDs = append(inputIDs, &tg.InputMessageID{ID: id})
		}
		mr, err := api.ChannelsGetMessages(ctx, &tg.ChannelsGetMessagesRequest{
			Channel: &tg.InputChannel{ChannelID: ch.ID, AccessHash: ch.AccessHash},
			ID:      inputIDs,
		})
		if err != nil {
			return fmt.Errorf("get messages: %w", err)
		}
		var msgs []tg.MessageClass
		switch x := mr.(type) {
		case *tg.MessagesMessages:
			msgs = x.Messages
		case *tg.MessagesMessagesSlice:
			msgs = x.Messages
		case *tg.MessagesChannelMessages:
			msgs = x.Messages
		}

		for _, raw := range msgs {
			m, ok := raw.(*tg.Message)
			if !ok {
				continue
			}
			if m.Media == nil {
				log.Printf("msg=%d has no media", m.ID)
				continue
			}
			md, ok := m.Media.(*tg.MessageMediaDocument)
			if !ok {
				log.Printf("msg=%d media kind=%T", m.ID, m.Media)
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
				}
			}
			if name == "" {
				name = fmt.Sprintf("msg_%d", m.ID)
			}
			name = strings.ReplaceAll(name, "/", "_")
			out := filepath.Join(*outDir, fmt.Sprintf("%d_%s", m.ID, name))
			loc := &tg.InputDocumentFileLocation{
				ID:            doc.ID,
				AccessHash:    doc.AccessHash,
				FileReference: doc.FileReference,
			}
			if _, err := dl.Download(api, loc).ToPath(ctx, out); err != nil {
				log.Printf("download msg=%d failed: %v", m.ID, err)
				continue
			}
			log.Printf("ok msg=%d mime=%s size=%d → %s", m.ID, doc.MimeType, doc.Size, out)
		}
		return nil
	})
	if err != nil {
		log.Fatal(err)
	}
}
