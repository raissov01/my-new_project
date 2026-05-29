// Dumps the full history of the DM with USERNAME, printing each message as
// JSON to stdout and downloading every photo / document attachment to OUT_DIR.
//
// Env:
//   TELEGRAM_APP_ID, TELEGRAM_APP_HASH  - API credentials.
//   TELEGRAM_SESSION_PATH               - Path to gotd session file.
//   USERNAME                            - Target username without '@'.
//   OUT_DIR                             - Where to save media + messages.json.
//   LIMIT                               - Max total messages (default 1000).

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"time"

	"github.com/gotd/td/session"
	"github.com/gotd/td/telegram"
	"github.com/gotd/td/telegram/downloader"
	"github.com/gotd/td/tg"
	"github.com/gotd/td/tgerr"
	"github.com/joho/godotenv"
)

type mediaInfo struct {
	Kind     string `json:"kind"`
	File     string `json:"file,omitempty"`
	MimeType string `json:"mime,omitempty"`
	Size     int64  `json:"size,omitempty"`
}

type msgOut struct {
	ID    int        `json:"id"`
	Date  string     `json:"date"`
	Out   bool       `json:"out"`
	Text  string     `json:"text,omitempty"`
	Media *mediaInfo `json:"media,omitempty"`
}

func main() {
	_ = godotenv.Load()

	appID := 0
	if v := os.Getenv("TELEGRAM_APP_ID"); v != "" {
		fmt.Sscanf(v, "%d", &appID)
	}
	appHash := os.Getenv("TELEGRAM_APP_HASH")
	username := os.Getenv("USERNAME")
	sessionPath := os.Getenv("TELEGRAM_SESSION_PATH")
	outDir := os.Getenv("OUT_DIR")
	if outDir == "" {
		outDir = "./tg-out"
	}
	limit := 1000
	fmt.Sscanf(os.Getenv("LIMIT"), "%d", &limit)
	if limit <= 0 {
		limit = 1000
	}
	if username == "" {
		log.Fatal("USERNAME is required")
	}
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		log.Fatal(err)
	}

	storage := &session.FileStorage{Path: sessionPath}
	client := telegram.NewClient(appID, appHash, telegram.Options{SessionStorage: storage})

	ctx := context.Background()
	err := client.Run(ctx, func(ctx context.Context) error {
		api := client.API()
		dl := downloader.NewDownloader()

		res, err := api.ContactsResolveUsername(ctx, &tg.ContactsResolveUsernameRequest{Username: username})
		if err != nil {
			return fmt.Errorf("resolve @%s: %w", username, err)
		}
		var u *tg.User
		for _, raw := range res.Users {
			if x, ok := raw.(*tg.User); ok {
				u = x
				break
			}
		}
		if u == nil {
			return fmt.Errorf("@%s did not resolve to a user", username)
		}
		log.Printf("resolved @%s -> user_id=%d name=%q %q", username, u.ID, u.FirstName, u.LastName)
		peer := &tg.InputPeerUser{UserID: u.ID, AccessHash: u.AccessHash}

		skipDocs := os.Getenv("SKIP_DOCS") == "1"
		jsonPath := filepath.Join(outDir, "messages.json")

		var all []msgOut
		var offsetID int
		for len(all) < limit {
			hist, err := getHistoryWithRetry(ctx, api, peer, offsetID, 100)
			if err != nil {
				return fmt.Errorf("history offset=%d: %w", offsetID, err)
			}
			msgs := extractMsgs(hist)
			if len(msgs) == 0 {
				break
			}
			batchOldest := 0
			for _, raw := range msgs {
				m, ok := raw.(*tg.Message)
				if !ok {
					continue
				}
				if batchOldest == 0 || m.ID < batchOldest {
					batchOldest = m.ID
				}
				out := msgOut{
					ID:   m.ID,
					Date: time.Unix(int64(m.Date), 0).Format(time.RFC3339),
					Out:  m.Out,
					Text: m.Message,
				}
				if m.Media != nil {
					if _, isDoc := m.Media.(*tg.MessageMediaDocument); isDoc && skipDocs {
						out.Media = &mediaInfo{Kind: "doc_skipped"}
					} else {
						mi := handleMedia(ctx, api, dl, m, outDir)
						if mi != nil {
							out.Media = mi
						}
					}
				}
				all = append(all, out)
			}
			// Persist progress every batch so a kill mid-run still leaves data.
			sort.Slice(all, func(i, j int) bool { return all[i].ID < all[j].ID })
			if err := writeJSON(jsonPath, all); err != nil {
				log.Printf("write json: %v", err)
			}
			log.Printf("progress: %d messages, oldest_id=%d", len(all), batchOldest)
			if batchOldest == 0 {
				break
			}
			offsetID = batchOldest
			time.Sleep(300 * time.Millisecond)
		}

		sort.Slice(all, func(i, j int) bool { return all[i].ID < all[j].ID })
		if err := writeJSON(jsonPath, all); err != nil {
			return err
		}
		log.Printf("wrote %d messages -> %s", len(all), jsonPath)
		return nil
	})
	if err != nil {
		log.Fatal(err)
	}
}

func writeJSON(path string, v any) error {
	tmp := path + ".tmp"
	f, err := os.Create(tmp)
	if err != nil {
		return err
	}
	enc := json.NewEncoder(f)
	enc.SetIndent("", "  ")
	if err := enc.Encode(v); err != nil {
		f.Close()
		return err
	}
	if err := f.Close(); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func handleMedia(ctx context.Context, api *tg.Client, dl *downloader.Downloader, m *tg.Message, outDir string) *mediaInfo {
	switch md := m.Media.(type) {
	case *tg.MessageMediaPhoto:
		photo, ok := md.Photo.(*tg.Photo)
		if !ok {
			return &mediaInfo{Kind: "photo_empty"}
		}
		largest := ""
		for _, s := range photo.Sizes {
			if ps, ok := s.(*tg.PhotoSize); ok {
				largest = ps.Type
			}
			if pps, ok := s.(*tg.PhotoSizeProgressive); ok {
				largest = pps.Type
			}
		}
		if largest == "" {
			return &mediaInfo{Kind: "photo_no_size"}
		}
		fname := fmt.Sprintf("msg_%d.jpg", m.ID)
		path := filepath.Join(outDir, fname)
		if st, err := os.Stat(path); err == nil && st.Size() > 0 {
			return &mediaInfo{Kind: "photo", File: fname, Size: st.Size()}
		}
		loc := &tg.InputPhotoFileLocation{
			ID:            photo.ID,
			AccessHash:    photo.AccessHash,
			FileReference: photo.FileReference,
			ThumbSize:     largest,
		}
		if _, err := dl.Download(api, loc).ToPath(ctx, path); err != nil {
			log.Printf("photo download msg=%d failed: %v", m.ID, err)
			return &mediaInfo{Kind: "photo_fail"}
		}
		return &mediaInfo{Kind: "photo", File: fname}
	case *tg.MessageMediaDocument:
		doc, ok := md.Document.(*tg.Document)
		if !ok {
			return &mediaInfo{Kind: "doc_empty"}
		}
		name := ""
		for _, a := range doc.Attributes {
			if fa, ok := a.(*tg.DocumentAttributeFilename); ok {
				name = fa.FileName
				break
			}
		}
		if name == "" {
			name = fmt.Sprintf("doc_%d", m.ID)
		}
		fname := fmt.Sprintf("msg_%d_%s", m.ID, name)
		path := filepath.Join(outDir, fname)
		loc := &tg.InputDocumentFileLocation{
			ID:            doc.ID,
			AccessHash:    doc.AccessHash,
			FileReference: doc.FileReference,
		}
		if _, err := dl.Download(api, loc).ToPath(ctx, path); err != nil {
			log.Printf("doc download msg=%d failed: %v", m.ID, err)
			return &mediaInfo{Kind: "doc_fail", MimeType: doc.MimeType}
		}
		return &mediaInfo{Kind: "doc", File: fname, MimeType: doc.MimeType, Size: doc.Size}
	}
	return &mediaInfo{Kind: fmt.Sprintf("%T", m.Media)}
}

func getHistoryWithRetry(ctx context.Context, api *tg.Client, peer *tg.InputPeerUser, offsetID, batch int) (tg.MessagesMessagesClass, error) {
	for {
		result, err := api.MessagesGetHistory(ctx, &tg.MessagesGetHistoryRequest{
			Peer: peer, OffsetID: offsetID, Limit: batch,
		})
		if err == nil {
			return result, nil
		}
		d, ok := tgerr.AsFloodWait(err)
		if !ok {
			return nil, err
		}
		log.Printf("FLOOD_WAIT %s", d)
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(d + 2*time.Second):
		}
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
