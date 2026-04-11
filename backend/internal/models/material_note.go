package models

import "time"

// MaterialNote stores a user's notes and exercise answers for a specific material.
type MaterialNote struct {
	ID         string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID     string    `gorm:"type:uuid;not null;uniqueIndex:idx_user_material_note" json:"userId"`
	MaterialID string    `gorm:"type:uuid;not null;uniqueIndex:idx_user_material_note" json:"materialId"`
	Notes      string    `gorm:"type:text;not null;default:''" json:"notes"`
	Highlights string    `gorm:"type:jsonb;not null;default:'[]'" json:"highlights"`
	Exercises  string    `gorm:"type:jsonb;not null;default:'{}'" json:"exercises"`
	LastPage   int       `gorm:"not null;default:1" json:"lastPage"`
	UpdatedAt  time.Time `gorm:"autoUpdateTime" json:"updatedAt"`
	CreatedAt  time.Time `gorm:"autoCreateTime" json:"createdAt"`
}

func (MaterialNote) TableName() string { return "material_notes" }
