package telegram

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/gotd/td/telegram"
	"github.com/gotd/td/telegram/auth"
	"github.com/gotd/td/tg"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// ImporterConfig holds the configuration for the Telegram channel history importer.
type ImporterConfig struct {
	AppID          int
	AppHash        string
	Phone          string
	TargetChannel  string // channel username, e.g. "studywithme_r" or "@studywithme_r"
}

// Importer reads full channel history of a single target channel via Telegram MTProto
// and stores posts in PostgreSQL. It refuses to import from any other channel.
type Importer struct {
	cfg ImporterConfig
	db  *gorm.DB
}

func NewImporter(cfg ImporterConfig, db *gorm.DB) *Importer {
	return &Importer{cfg: cfg, db: db}
}

// Run connects to Telegram, authenticates, resolves the target channel by username,
// validates it, and imports all its history. Only imports from the configured channel.
func (imp *Importer) Run(ctx context.Context) error {
	if imp.cfg.AppID == 0 || imp.cfg.AppHash == "" {
		return fmt.Errorf("TELEGRAM_APP_ID and TELEGRAM_APP_HASH are required")
	}
	if imp.cfg.Phone == "" {
		return fmt.Errorf("TELEGRAM_PHONE is required")
	}

	targetUsername := normalizeUsername(imp.cfg.TargetChannel)
	if targetUsername == "" {
		return fmt.Errorf("TELEGRAM_TARGET_CHANNEL is required (e.g. studywithme_r)")
	}

	log.Printf("[telegram-import] target channel: @%s", targetUsername)

	client := telegram.NewClient(imp.cfg.AppID, imp.cfg.AppHash, telegram.Options{})

	return client.Run(ctx, func(ctx context.Context) error {
		// Authenticate with phone number (interactive code input on first run)
		flow := auth.NewFlow(terminalAuth{phone: imp.cfg.Phone}, auth.SendCodeOptions{})
		if err := client.Auth().IfNecessary(ctx, flow); err != nil {
			return fmt.Errorf("auth: %w", err)
		}

		api := client.API()

		// Resolve the channel by @username — this is the ONLY way we find the channel.
		// We never scan dialogs or iterate over subscribed channels.
		channel, err := imp.resolveByUsername(ctx, api, targetUsername)
		if err != nil {
			return fmt.Errorf("resolve @%s: %w", targetUsername, err)
		}

		inputPeer := &tg.InputPeerChannel{
			ChannelID:  channel.ID,
			AccessHash: channel.AccessHash,
		}

		log.Printf("[telegram-import] resolved: @%s → id=%d title=%q",
			targetUsername, channel.ID, channel.Title)

		// Paginate through entire history (newest → oldest)
		totalImported := 0
		totalSkipped := 0
		offsetID := 0

		for {
			messages, err := api.MessagesGetHistory(ctx, &tg.MessagesGetHistoryRequest{
				Peer:     inputPeer,
				OffsetID: offsetID,
				Limit:    100,
			})
			if err != nil {
				return fmt.Errorf("get history (offset=%d): %w", offsetID, err)
			}

			var msgs []tg.MessageClass
			switch m := messages.(type) {
			case *tg.MessagesMessages:
				msgs = m.Messages
			case *tg.MessagesMessagesSlice:
				msgs = m.Messages
			case *tg.MessagesChannelMessages:
				msgs = m.Messages
			default:
				return fmt.Errorf("unexpected messages type: %T", messages)
			}

			if len(msgs) == 0 {
				break
			}

			imported, skipped := imp.processMessages(msgs, channel.ID, targetUsername)
			totalImported += imported
			totalSkipped += skipped

			// Get the ID of the last (oldest) message for next page
			lastMsg := msgs[len(msgs)-1]
			switch m := lastMsg.(type) {
			case *tg.Message:
				offsetID = m.ID
			case *tg.MessageService:
				offsetID = m.ID
			default:
				offsetID--
			}

			log.Printf("[telegram-import] page: +%d imported, %d skipped (total: %d) offset→%d",
				imported, skipped, totalImported, offsetID)

			// Rate limit: 500ms between API calls
			time.Sleep(500 * time.Millisecond)
		}

		log.Printf("[telegram-import] DONE: imported=%d skipped=%d from @%s",
			totalImported, totalSkipped, targetUsername)
		return nil
	})
}

// resolveByUsername resolves a channel by its public @username.
// It validates that the resolved entity is a channel and its username matches exactly.
func (imp *Importer) resolveByUsername(ctx context.Context, api *tg.Client, username string) (*tg.Channel, error) {
	resolved, err := api.ContactsResolveUsername(ctx, &tg.ContactsResolveUsernameRequest{
		Username: username,
	})
	if err != nil {
		return nil, fmt.Errorf("ContactsResolveUsername(%q): %w", username, err)
	}

	if len(resolved.Chats) == 0 {
		return nil, fmt.Errorf("@%s resolved but no chats returned", username)
	}

	chat := resolved.Chats[0]
	channel, ok := chat.(*tg.Channel)
	if !ok {
		return nil, fmt.Errorf("@%s is not a channel (type: %T) — refusing to import", username, chat)
	}

	// Strict validation: the resolved channel's username must match exactly
	resolvedUsername := normalizeUsername(channel.Username)
	if resolvedUsername != username {
		return nil, fmt.Errorf(
			"SAFETY CHECK FAILED: requested @%s but resolved to @%s (id=%d) — refusing to import",
			username, resolvedUsername, channel.ID,
		)
	}

	log.Printf("[telegram-import] VERIFIED: @%s → channel id=%d title=%q", username, channel.ID, channel.Title)
	return channel, nil
}

// processMessages saves a batch of messages, tagging each with the channel username and ID.
// It only saves messages that belong to the expected channel.
func (imp *Importer) processMessages(msgs []tg.MessageClass, expectedChannelID int64, channelUsername string) (imported, skipped int) {
	for _, msgClass := range msgs {
		msg, ok := msgClass.(*tg.Message)
		if !ok {
			// Skip service messages (joins, pins, etc.)
			continue
		}

		// Verify this message actually belongs to the target channel
		var msgChannelID int64
		if peer, ok := msg.PeerID.(*tg.PeerChannel); ok {
			msgChannelID = peer.ChannelID
		}
		if msgChannelID != expectedChannelID {
			log.Printf("[telegram-import] WARNING: skipping message %d — channel %d != expected %d",
				msg.ID, msgChannelID, expectedChannelID)
			skipped++
			continue
		}

		// Deduplicate by telegram_post_id
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

		rawBytes, err := json.Marshal(msg)
		if err != nil {
			log.Printf("[telegram-import] failed to marshal message %d: %v", msg.ID, err)
			rawBytes = []byte("{}")
		}

		post := models.TelegramPost{
			TelegramPostID:  int64(msg.ID),
			ChannelID:       msgChannelID,
			ChannelUsername: channelUsername,
			Text:            text,
			Caption:         caption,
			RawJSON:         string(rawBytes),
			HasMedia:        hasMedia,
			PostDate:        time.Unix(int64(msg.Date), 0),
		}

		if err := imp.db.Create(&post).Error; err != nil {
			log.Printf("[telegram-import] failed to save message %d: %v", msg.ID, err)
			skipped++
			continue
		}

		imported++
	}

	return imported, skipped
}

// normalizeUsername strips the leading "@" and lowercases the username.
func normalizeUsername(raw string) string {
	s := strings.TrimSpace(raw)
	s = strings.TrimPrefix(s, "@")
	return strings.ToLower(s)
}

// terminalAuth implements the interactive auth flow for first-time login.
type terminalAuth struct {
	phone string
}

func (a terminalAuth) Phone(_ context.Context) (string, error) {
	return a.phone, nil
}

func (a terminalAuth) Password(_ context.Context) (string, error) {
	fmt.Print("Enter 2FA password: ")
	var password string
	if _, err := fmt.Scanln(&password); err != nil {
		return "", err
	}
	return password, nil
}

func (a terminalAuth) Code(_ context.Context, _ *tg.AuthSentCode) (string, error) {
	fmt.Print("Enter Telegram verification code: ")
	var code string
	if _, err := fmt.Scanln(&code); err != nil {
		return "", err
	}
	return code, nil
}

func (a terminalAuth) AcceptTermsOfService(_ context.Context, tos tg.HelpTermsOfService) error {
	return nil
}

func (a terminalAuth) SignUp(_ context.Context) (auth.UserInfo, error) {
	return auth.UserInfo{}, fmt.Errorf("sign up not supported, use an existing account")
}
