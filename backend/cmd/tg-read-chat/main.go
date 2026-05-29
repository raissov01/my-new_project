// tg-read-chat: read recent messages from a chat with a given username.
// Downloads any photos to /tmp/tg-chat/<username>/.
//
//   PEER=bestyiierr LIMIT=100 go run ./cmd/tg-read-chat
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gotd/td/session"
	"github.com/gotd/td/telegram"
	"github.com/gotd/td/telegram/downloader"
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
	peerName := os.Getenv("PEER")
	if peerName == "" {
		peerName = "bestyiierr"
	}
	limit := 100
	if v := os.Getenv("LIMIT"); v != "" {
		fmt.Sscanf(v, "%d", &limit)
	}

	outDir := filepath.Join("/tmp/tg-chat", peerName)
	if err := os.MkdirAll(outDir, 0755); err != nil {
		log.Fatal(err)
	}

	client := telegram.NewClient(appID, appHash, telegram.Options{
		SessionStorage: &session.FileStorage{Path: sessionPath},
	})
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	err := client.Run(ctx, func(ctx context.Context) error {
		api := client.API()
		res, err := api.ContactsResolveUsername(ctx, &tg.ContactsResolveUsernameRequest{Username: peerName})
		if err != nil {
			return fmt.Errorf("resolve %s: %w", peerName, err)
		}
		var peer *tg.User
		for _, raw := range res.Users {
			if u, ok := raw.(*tg.User); ok {
				peer = u
				break
			}
		}
		if peer == nil {
			return fmt.Errorf("user @%s not found", peerName)
		}
		fmt.Printf("== chat with @%s (id=%d, %s %s) ==\n\n",
			peerName, peer.ID, peer.FirstName, peer.LastName)

		input := &tg.InputPeerUser{UserID: peer.ID, AccessHash: peer.AccessHash}
		hist, err := api.MessagesGetHistory(ctx, &tg.MessagesGetHistoryRequest{
			Peer: input, Limit: limit,
		})
		if err != nil {
			return fmt.Errorf("history: %w", err)
		}

		dl := downloader.NewDownloader()

		var msgs []tg.MessageClass
		switch x := hist.(type) {
		case *tg.MessagesMessages:
			msgs = x.Messages
		case *tg.MessagesMessagesSlice:
			msgs = x.Messages
		}

		photos := 0
		videos := 0
		docs := 0
		texts := 0

		// Show in chronological order (oldest first)
		for i := len(msgs) - 1; i >= 0; i-- {
			m, ok := msgs[i].(*tg.Message)
			if !ok {
				continue
			}
			when := time.Unix(int64(m.Date), 0).Format("01-02 15:04")
			from := "←Balausa"
			if m.Out {
				from = "→raissov"
			}

			text := strings.TrimSpace(m.Message)
			if len(text) > 200 {
				text = text[:200] + "..."
			}

			mediaInfo := ""
			switch media := m.Media.(type) {
			case *tg.MessageMediaPhoto:
				if photo, ok := media.Photo.(*tg.Photo); ok {
					// Pick the largest size
					var bestSize tg.PhotoSizeClass
					for _, s := range photo.Sizes {
						bestSize = s
					}
					if bestSize == nil {
						continue
					}
					loc := &tg.InputPhotoFileLocation{
						ID:            photo.ID,
						AccessHash:    photo.AccessHash,
						FileReference: photo.FileReference,
						ThumbSize:     sizeType(bestSize),
					}
					filename := filepath.Join(outDir, fmt.Sprintf("photo-%d-%d.jpg", m.ID, photo.ID))
					_, err := dl.Download(api, loc).ToPath(ctx, filename)
					if err != nil {
						mediaInfo = fmt.Sprintf("[PHOTO download failed: %v]", err)
					} else {
						mediaInfo = fmt.Sprintf("[📷 PHOTO → %s]", filename)
						photos++
					}
				}
			case *tg.MessageMediaDocument:
				if doc, ok := media.Document.(*tg.Document); ok {
					var name string
					var isVideo bool
					for _, attr := range doc.Attributes {
						switch a := attr.(type) {
						case *tg.DocumentAttributeFilename:
							name = a.FileName
						case *tg.DocumentAttributeVideo:
							isVideo = true
							_ = a
						}
					}
					if name == "" {
						name = fmt.Sprintf("doc-%d", doc.ID)
					}
					ext := filepath.Ext(name)
					if ext == "" && isVideo {
						ext = ".mp4"
					}
					filename := filepath.Join(outDir, fmt.Sprintf("%d-%s%s", m.ID,
						strings.TrimSuffix(name, ext), ext))
					if isVideo {
						mediaInfo = fmt.Sprintf("[🎥 VIDEO %s, %d bytes]", name, doc.Size)
						videos++
					} else {
						mediaInfo = fmt.Sprintf("[📄 DOC %s, %s, %d bytes]", name, doc.MimeType, doc.Size)
						docs++
					}
					// Download anything ≤10MB
					if doc.Size < 10*1024*1024 {
						loc := &tg.InputDocumentFileLocation{
							ID:            doc.ID,
							AccessHash:    doc.AccessHash,
							FileReference: doc.FileReference,
						}
						_, err := dl.Download(api, loc).ToPath(ctx, filename)
						if err == nil {
							mediaInfo += " → " + filename
						}
					}
				}
			default:
				if text != "" {
					texts++
				}
			}

			if _, ok := m.GetFwdFrom(); ok {
				mediaInfo += " [forwarded]"
			}

			fmt.Printf("[%s] %s msgid=%d", when, from, m.ID)
			if text != "" {
				fmt.Printf(": %s", text)
			}
			if mediaInfo != "" {
				fmt.Printf(" %s", mediaInfo)
			}
			fmt.Println()
		}

		fmt.Printf("\n== summary: %d photos, %d videos, %d docs, %d text-only ==\n", photos, videos, docs, texts)
		return nil
	})
	if err != nil {
		log.Fatalf("run: %v", err)
	}
}

func sizeType(s tg.PhotoSizeClass) string {
	switch x := s.(type) {
	case *tg.PhotoSize:
		return x.Type
	case *tg.PhotoSizeProgressive:
		return x.Type
	case *tg.PhotoCachedSize:
		return x.Type
	case *tg.PhotoPathSize:
		return x.Type
	}
	return "y"
}
