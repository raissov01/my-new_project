package telegram

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gotd/td/session"
	"github.com/gotd/td/telegram"
	"github.com/gotd/td/telegram/auth"
	"github.com/gotd/td/tg"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// ImporterConfig holds configuration for the channel history importer.
type ImporterConfig struct {
	AppID         int
	AppHash       string
	Phone         string
	SessionPath   string // file path for persistent session storage
	TargetChannel string // channel username without @, e.g. "studywithme_r"
}

// Importer imports full message history from exactly one Telegram channel.
// It resolves the channel by username, validates it, and refuses to touch anything else.
type Importer struct {
	cfg ImporterConfig
	db  *gorm.DB
}

func NewImporter(cfg ImporterConfig, db *gorm.DB) *Importer {
	return &Importer{cfg: cfg, db: db}
}

// Run authenticates (reusing saved session), resolves @studywithme_r,
// and imports all historical posts into PostgreSQL.
func (imp *Importer) Run(ctx context.Context) error {
	if imp.cfg.AppID == 0 || imp.cfg.AppHash == "" {
		return fmt.Errorf("TELEGRAM_APP_ID and TELEGRAM_APP_HASH are required")
	}
	if imp.cfg.Phone == "" {
		return fmt.Errorf("TELEGRAM_PHONE is required")
	}

	target := normalizeUsername(imp.cfg.TargetChannel)
	if target == "" {
		return fmt.Errorf("TELEGRAM_TARGET_CHANNEL is required")
	}

	log.Printf("[telegram-import] target: @%s", target)

	// Ensure session directory exists
	sessionPath := imp.cfg.SessionPath
	if sessionPath == "" {
		sessionPath = ".telegram-session"
	}
	if err := os.MkdirAll(filepath.Dir(sessionPath), 0700); err != nil && !os.IsExist(err) {
		// session file is in current directory, no parent to create
	}

	// Use file-based session storage so auth survives restarts
	storage := &session.FileStorage{Path: sessionPath}

	client := telegram.NewClient(imp.cfg.AppID, imp.cfg.AppHash, telegram.Options{
		SessionStorage: storage,
	})

	return client.Run(ctx, func(ctx context.Context) error {
		flow := auth.NewFlow(terminalAuth{phone: imp.cfg.Phone}, auth.SendCodeOptions{})
		if err := client.Auth().IfNecessary(ctx, flow); err != nil {
			return fmt.Errorf("auth: %w", err)
		}

		log.Printf("[telegram-import] authenticated, resolving @%s", target)

		api := client.API()

		channel, err := resolveAndValidate(ctx, api, target)
		if err != nil {
			return err
		}

		peer := &tg.InputPeerChannel{
			ChannelID:  channel.ID,
			AccessHash: channel.AccessHash,
		}

		log.Printf("[telegram-import] importing from @%s (id=%d, title=%q)",
			target, channel.ID, channel.Title)

		return imp.importAll(ctx, api, peer, channel.ID, target)
	})
}

// importAll pages through the entire channel history and saves posts.
func (imp *Importer) importAll(ctx context.Context, api *tg.Client, peer *tg.InputPeerChannel, channelID int64, username string) error {
	totalImported := 0
	totalSkipped := 0
	offsetID := 0

	for {
		select {
		case <-ctx.Done():
			log.Printf("[telegram-import] interrupted: imported=%d skipped=%d", totalImported, totalSkipped)
			return ctx.Err()
		default:
		}

		messages, err := api.MessagesGetHistory(ctx, &tg.MessagesGetHistoryRequest{
			Peer:     peer,
			OffsetID: offsetID,
			Limit:    100,
		})
		if err != nil {
			return fmt.Errorf("get history (offset=%d): %w", offsetID, err)
		}

		msgs := extractMessages(messages)
		if len(msgs) == 0 {
			break
		}

		imported, skipped := imp.saveBatch(msgs, channelID, username)
		totalImported += imported
		totalSkipped += skipped

		// Oldest message in batch becomes the offset for next page
		lastMsg := msgs[len(msgs)-1]
		switch m := lastMsg.(type) {
		case *tg.Message:
			offsetID = m.ID
		case *tg.MessageService:
			offsetID = m.ID
		default:
			offsetID--
		}

		log.Printf("[telegram-import] +%d imported, %d skipped (total: %d, offset→%d)",
			imported, skipped, totalImported, offsetID)

		time.Sleep(500 * time.Millisecond)
	}

	log.Printf("[telegram-import] DONE: imported=%d skipped=%d from @%s",
		totalImported, totalSkipped, username)
	return nil
}

// saveBatch persists a page of messages, skipping duplicates and non-target messages.
func (imp *Importer) saveBatch(msgs []tg.MessageClass, expectedChannelID int64, username string) (imported, skipped int) {
	for _, mc := range msgs {
		msg, ok := mc.(*tg.Message)
		if !ok {
			continue
		}

		// Verify message belongs to the target channel
		var msgChannelID int64
		if p, ok := msg.PeerID.(*tg.PeerChannel); ok {
			msgChannelID = p.ChannelID
		}
		if msgChannelID != expectedChannelID {
			skipped++
			continue
		}

		// Deduplicate
		var count int64
		imp.db.Model(&models.TelegramPost{}).Where("telegram_post_id = ?", int64(msg.ID)).Count(&count)
		if count > 0 {
			skipped++
			continue
		}

		text := msg.Message
		hasMedia := msg.Media != nil
		caption := ""
		if hasMedia && text != "" {
			caption = text
			text = ""
		}

		raw, err := json.Marshal(msg)
		if err != nil {
			raw = []byte("{}")
		}

		post := models.TelegramPost{
			TelegramPostID:  int64(msg.ID),
			ChannelID:       msgChannelID,
			ChannelUsername:  username,
			Text:            text,
			Caption:         caption,
			RawJSON:         string(raw),
			HasMedia:        hasMedia,
			PostDate:        time.Unix(int64(msg.Date), 0),
		}

		if err := imp.db.Create(&post).Error; err != nil {
			log.Printf("[telegram-import] save error msg=%d: %v", msg.ID, err)
			skipped++
			continue
		}
		imported++
	}
	return
}

// resolveAndValidate resolves a channel by @username and refuses if it doesn't match exactly.
func resolveAndValidate(ctx context.Context, api *tg.Client, username string) (*tg.Channel, error) {
	resolved, err := api.ContactsResolveUsername(ctx, &tg.ContactsResolveUsernameRequest{
		Username: username,
	})
	if err != nil {
		return nil, fmt.Errorf("resolve @%s: %w", username, err)
	}

	if len(resolved.Chats) == 0 {
		return nil, fmt.Errorf("@%s resolved but returned no chats", username)
	}

	ch, ok := resolved.Chats[0].(*tg.Channel)
	if !ok {
		return nil, fmt.Errorf("@%s is not a channel (type %T), refusing", username, resolved.Chats[0])
	}

	actual := normalizeUsername(ch.Username)
	if actual != username {
		return nil, fmt.Errorf("SAFETY: requested @%s but resolved @%s (id=%d), refusing", username, actual, ch.ID)
	}

	return ch, nil
}

func extractMessages(m tg.MessagesMessagesClass) []tg.MessageClass {
	switch v := m.(type) {
	case *tg.MessagesMessages:
		return v.Messages
	case *tg.MessagesMessagesSlice:
		return v.Messages
	case *tg.MessagesChannelMessages:
		return v.Messages
	default:
		return nil
	}
}

func normalizeUsername(s string) string {
	return strings.ToLower(strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(s), "@")))
}

// terminalAuth handles interactive first-time authentication.
type terminalAuth struct{ phone string }

func (a terminalAuth) Phone(_ context.Context) (string, error) { return a.phone, nil }

func (a terminalAuth) Password(_ context.Context) (string, error) {
	fmt.Print("Enter 2FA password: ")
	var s string
	fmt.Scanln(&s)
	return s, nil
}

func (a terminalAuth) Code(_ context.Context, _ *tg.AuthSentCode) (string, error) {
	fmt.Print("Enter verification code: ")
	var s string
	fmt.Scanln(&s)
	return s, nil
}

func (a terminalAuth) AcceptTermsOfService(_ context.Context, _ tg.HelpTermsOfService) error {
	return nil
}

func (a terminalAuth) SignUp(_ context.Context) (auth.UserInfo, error) {
	return auth.UserInfo{}, fmt.Errorf("sign-up not supported")
}
