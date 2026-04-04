package telegram

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/gotd/td/telegram"
	"github.com/gotd/td/telegram/auth"
	"github.com/gotd/td/tg"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// ImporterConfig holds the configuration for the Telegram channel history importer.
type ImporterConfig struct {
	AppID     int
	AppHash   string
	Phone     string
	ChannelID int64 // numeric channel ID (without -100 prefix)
	SessionDir string
}

// Importer reads full channel history via Telegram MTProto and stores posts in PostgreSQL.
type Importer struct {
	cfg ImporterConfig
	db  *gorm.DB
}

func NewImporter(cfg ImporterConfig, db *gorm.DB) *Importer {
	return &Importer{cfg: cfg, db: db}
}

// Run connects to Telegram, authenticates, and imports all channel history.
// It pages through the entire history from newest to oldest, deduplicating by message ID.
func (imp *Importer) Run(ctx context.Context) error {
	if imp.cfg.AppID == 0 || imp.cfg.AppHash == "" {
		return fmt.Errorf("TELEGRAM_APP_ID and TELEGRAM_APP_HASH are required")
	}
	if imp.cfg.Phone == "" {
		return fmt.Errorf("TELEGRAM_PHONE is required")
	}
	if imp.cfg.ChannelID == 0 {
		return fmt.Errorf("TELEGRAM_CHANNEL_ID is required")
	}

	log.Printf("[telegram-import] starting import for channel %d", imp.cfg.ChannelID)

	client := telegram.NewClient(imp.cfg.AppID, imp.cfg.AppHash, telegram.Options{})

	return client.Run(ctx, func(ctx context.Context) error {
		// Authenticate with phone number (interactive code input)
		flow := auth.NewFlow(terminalAuth{phone: imp.cfg.Phone}, auth.SendCodeOptions{})
		if err := client.Auth().IfNecessary(ctx, flow); err != nil {
			return fmt.Errorf("auth: %w", err)
		}

		api := client.API()

		// Resolve the channel
		inputChannel, err := imp.resolveChannel(ctx, api)
		if err != nil {
			return fmt.Errorf("resolve channel: %w", err)
		}

		log.Printf("[telegram-import] resolved channel, starting history pagination")

		// Paginate through entire history
		totalImported := 0
		totalSkipped := 0
		offsetID := 0

		for {
			messages, err := api.MessagesGetHistory(ctx, &tg.MessagesGetHistoryRequest{
				Peer:     inputChannel,
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
				log.Printf("[telegram-import] no more messages, done")
				break
			}

			imported, skipped := imp.processMessages(msgs)
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
				// MessageEmpty or unknown — use previous offset - 1
				offsetID--
			}

			log.Printf("[telegram-import] page done: imported=%d skipped=%d total_imported=%d offset_id=%d",
				imported, skipped, totalImported, offsetID)

			// Small delay to respect rate limits
			time.Sleep(500 * time.Millisecond)
		}

		log.Printf("[telegram-import] COMPLETE: total_imported=%d total_skipped=%d", totalImported, totalSkipped)
		return nil
	})
}

// resolveChannel resolves the channel ID to an InputPeerChannel.
func (imp *Importer) resolveChannel(ctx context.Context, api *tg.Client) (*tg.InputPeerChannel, error) {
	channelID := imp.cfg.ChannelID

	// Try to get channel info using the numeric ID
	channels, err := api.ChannelsGetChannels(ctx, []tg.InputChannelClass{
		&tg.InputChannel{ChannelID: channelID},
	})
	if err != nil {
		return nil, fmt.Errorf("get channel %d: %w", channelID, err)
	}

	chats := channels.GetChats()
	if len(chats) == 0 {
		return nil, fmt.Errorf("channel %d not found", channelID)
	}

	chat := chats[0]
	channel, ok := chat.(*tg.Channel)
	if !ok {
		return nil, fmt.Errorf("chat %d is not a channel (type: %T)", channelID, chat)
	}

	log.Printf("[telegram-import] resolved channel: id=%d title=%q access_hash=%d",
		channel.ID, channel.Title, channel.AccessHash)

	return &tg.InputPeerChannel{
		ChannelID:  channel.ID,
		AccessHash: channel.AccessHash,
	}, nil
}

// processMessages saves a batch of Telegram messages to the database.
func (imp *Importer) processMessages(msgs []tg.MessageClass) (imported, skipped int) {
	for _, msgClass := range msgs {
		msg, ok := msgClass.(*tg.Message)
		if !ok {
			// Skip service messages (joins, pins, etc.)
			continue
		}

		// Check if already imported
		var count int64
		imp.db.Model(&models.TelegramPost{}).Where("telegram_post_id = ?", int64(msg.ID)).Count(&count)
		if count > 0 {
			skipped++
			continue
		}

		// Extract channel ID from peer
		var channelID int64
		if peer, ok := msg.PeerID.(*tg.PeerChannel); ok {
			channelID = peer.ChannelID
		}

		// Determine text content
		text := msg.Message

		// Determine media presence
		hasMedia := msg.Media != nil

		// Determine caption (for media messages, the text IS the caption)
		caption := ""
		if hasMedia && text != "" {
			caption = text
			text = ""
		}

		// Marshal the raw message to JSON
		rawBytes, err := json.Marshal(msg)
		if err != nil {
			log.Printf("[telegram-import] failed to marshal message %d: %v", msg.ID, err)
			rawBytes = []byte("{}")
		}

		postDate := time.Unix(int64(msg.Date), 0)

		post := models.TelegramPost{
			TelegramPostID: int64(msg.ID),
			ChannelID:      channelID,
			Text:           text,
			Caption:        caption,
			RawJSON:        string(rawBytes),
			HasMedia:       hasMedia,
			PostDate:       postDate,
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

// terminalAuth implements the auth flow by reading the verification code from stdin.
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
