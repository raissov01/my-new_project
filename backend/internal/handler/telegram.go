package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// TelegramHandler receives and stores Telegram webhook updates.
type TelegramHandler struct {
	db            *gorm.DB
	botToken      string
	webhookSecret string
}

func NewTelegram(db *gorm.DB, botToken, webhookSecret string) *TelegramHandler {
	return &TelegramHandler{
		db:            db,
		botToken:      botToken,
		webhookSecret: webhookSecret,
	}
}

// ── Telegram API types (only what we need for channel_post) ─────────────────

type telegramUpdate struct {
	UpdateID    int64            `json:"update_id"`
	ChannelPost *telegramMessage `json:"channel_post"`
	Message     *telegramMessage `json:"message"`
}

type telegramMessage struct {
	MessageID int64         `json:"message_id"`
	Date      int64         `json:"date"`
	Chat      *telegramChat `json:"chat"`
	Text      string        `json:"text"`
	Caption   string        `json:"caption"`
	Photo     []any         `json:"photo"`
	Video     any           `json:"video"`
	Document  any           `json:"document"`
	Audio     any           `json:"audio"`
	Voice     any           `json:"voice"`
}

type telegramChat struct {
	ID       int64  `json:"id"`
	Type     string `json:"type"`
	Title    string `json:"title"`
	Username string `json:"username"`
}

// ── Webhook handler ─────────────────────────────────────────────────────────

// HandleWebhook is a Gin handler that receives Telegram webhook POST requests.
// It parses channel_post updates and saves them to the database.
func (h *TelegramHandler) HandleWebhook(c *gin.Context) {
	// Validate webhook secret if configured
	if h.webhookSecret != "" {
		secretHeader := c.GetHeader("X-Telegram-Bot-Api-Secret-Token")
		if secretHeader != h.webhookSecret {
			log.Printf("[telegram] rejected: invalid secret token")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid secret token"})
			return
		}
	}

	// Read and parse the raw body
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		log.Printf("[telegram] failed to read body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read body"})
		return
	}
	defer c.Request.Body.Close()

	var update telegramUpdate
	if err := json.Unmarshal(bodyBytes, &update); err != nil {
		log.Printf("[telegram] failed to parse update: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid JSON"})
		return
	}

	log.Printf("[telegram] received update_id=%d", update.UpdateID)

	// We only care about channel_post for now.
	// Also accept regular message as fallback for testing with private chats.
	msg := update.ChannelPost
	if msg == nil {
		msg = update.Message
	}
	if msg == nil {
		log.Printf("[telegram] update %d has no channel_post or message, skipping", update.UpdateID)
		c.JSON(http.StatusOK, gin.H{"ok": true, "skipped": true})
		return
	}

	if msg.Chat == nil {
		log.Printf("[telegram] update %d has no chat info, skipping", update.UpdateID)
		c.JSON(http.StatusOK, gin.H{"ok": true, "skipped": true})
		return
	}

	// Determine if post has any media
	hasMedia := len(msg.Photo) > 0 || msg.Video != nil || msg.Document != nil ||
		msg.Audio != nil || msg.Voice != nil

	postDate := time.Unix(msg.Date, 0)
	rawJSON := string(bodyBytes)

	post := models.TelegramPost{
		TelegramPostID: msg.MessageID,
		ChannelID:      msg.Chat.ID,
		Text:           msg.Text,
		Caption:        msg.Caption,
		RawJSON:        rawJSON,
		HasMedia:       hasMedia,
		PostDate:       postDate,
	}

	// Upsert: skip if this telegram post ID already exists
	result := h.db.Where("telegram_post_id = ?", msg.MessageID).FirstOrCreate(&post)
	if result.Error != nil {
		log.Printf("[telegram] failed to save post %d: %v", msg.MessageID, result.Error)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save post"})
		return
	}

	if result.RowsAffected > 0 {
		log.Printf("[telegram] saved new post: id=%s telegram_post_id=%d channel=%d text_len=%d has_media=%v",
			post.ID, post.TelegramPostID, post.ChannelID,
			len(post.Text)+len(post.Caption), post.HasMedia)
	} else {
		log.Printf("[telegram] post %d already exists, skipped", msg.MessageID)
	}

	// Telegram expects 200 OK to acknowledge the webhook
	c.JSON(http.StatusOK, gin.H{"ok": true, "postId": post.ID})
}

// ── Webhook registration ────────────────────────────────────────────────────

// RegisterWebhook calls the Telegram Bot API to set the webhook URL.
// Call once during deployment or from a setup script / startup.
func RegisterWebhook(botToken, webhookURL, secret string) error {
	if botToken == "" || webhookURL == "" {
		return fmt.Errorf("botToken and webhookURL are required")
	}

	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/setWebhook", botToken)

	payload := map[string]string{"url": webhookURL}
	if secret != "" {
		payload["secret_token"] = secret
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal payload: %w", err)
	}

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Post(apiURL, "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("set webhook request: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("telegram API returned %d: %s", resp.StatusCode, string(respBody))
	}

	log.Printf("[telegram] webhook registered successfully: %s → %s", webhookURL, string(respBody))
	return nil
}
