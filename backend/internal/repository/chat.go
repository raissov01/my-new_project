package repository

import (
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

type ChatRepository struct {
	db *gorm.DB
}

func NewChat(db *gorm.DB) *ChatRepository {
	return &ChatRepository{db: db}
}

// GetHistory returns the last `limit` messages for a user, ordered oldest-first.
func (r *ChatRepository) GetHistory(userID string, limit int) ([]models.ChatMessage, error) {
	var msgs []models.ChatMessage
	err := r.db.
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Find(&msgs).Error
	if err != nil {
		return nil, err
	}
	// Reverse so oldest is first (for AI context)
	for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
		msgs[i], msgs[j] = msgs[j], msgs[i]
	}
	return msgs, nil
}

// SaveMessage persists a single chat message.
func (r *ChatRepository) SaveMessage(msg *models.ChatMessage) error {
	return r.db.Create(msg).Error
}

// ClearHistory deletes all chat messages for a user.
func (r *ChatRepository) ClearHistory(userID string) error {
	return r.db.Where("user_id = ?", userID).Delete(&models.ChatMessage{}).Error
}

// SearchMaterials finds IELTS materials whose title or description match any of
// the given keywords (case-insensitive ILIKE). Returns up to `limit` results.
func (r *ChatRepository) SearchMaterials(keywords []string, limit int) ([]models.IELTSMaterial, error) {
	if len(keywords) == 0 {
		return nil, nil
	}

	query := r.db.Model(&models.IELTSMaterial{})
	for _, kw := range keywords {
		pattern := "%" + kw + "%"
		query = query.Or("title ILIKE ? OR description ILIKE ? OR content ILIKE ?", pattern, pattern, pattern)
	}

	var materials []models.IELTSMaterial
	err := query.Limit(limit).Find(&materials).Error
	return materials, err
}

// SearchTelegramPosts finds telegram posts whose text or caption match keywords.
func (r *ChatRepository) SearchTelegramPosts(keywords []string, limit int) ([]models.TelegramPost, error) {
	if len(keywords) == 0 {
		return nil, nil
	}

	query := r.db.Model(&models.TelegramPost{})
	for _, kw := range keywords {
		pattern := "%" + kw + "%"
		query = query.Or("text ILIKE ? OR caption ILIKE ? OR file_name ILIKE ?", pattern, pattern, pattern)
	}

	var posts []models.TelegramPost
	err := query.Limit(limit).Find(&posts).Error
	return posts, err
}
