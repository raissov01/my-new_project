package models

import "time"

// IELTSMaterial stores admin-managed IELTS study content.
type IELTSMaterial struct {
	ID        string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Title     string    `gorm:"not null" json:"title"`
	Content   string    `gorm:"type:text;not null" json:"content"`
	Category  string    `gorm:"not null;check:category IN ('reading','writing','speaking','listening')" json:"category"`
	Type      string    `gorm:"not null;check:type IN ('lesson','practice','tip')" json:"type"`
	SortOrder int       `gorm:"not null;default:0" json:"sortOrder"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updatedAt"`
}

func (IELTSMaterial) TableName() string {
	return "ielts_materials"
}
