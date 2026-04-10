package models

import "time"

// IELTSMaterial stores admin-managed IELTS study content.
//
// Category constraint extended to include 'vocabulary' and 'grammar' for
// the materials library integration (900+ file mapping).
// FilePath links to the physical PDF in telegram-media/ for the document viewer.
// Difficulty enables frontend filtering by student level.
// Description is a one-paragraph human-readable summary shown in the library UI.
type IELTSMaterial struct {
	ID          string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Title       string    `gorm:"not null" json:"title"`
	Description string    `gorm:"type:text;not null;default:''" json:"description"`
	Content     string    `gorm:"type:text;not null;default:''" json:"content"`
	Category    string    `gorm:"not null;check:category IN ('reading','writing','speaking','listening','vocabulary','grammar','general')" json:"category"`
	Type        string    `gorm:"not null;check:type IN ('lesson','practice','tip','book','mock')" json:"type"`
	Difficulty  string    `gorm:"not null;default:'all';check:difficulty IN ('beginner','intermediate','advanced','all')" json:"difficulty"`
	FilePath    string    `gorm:"type:text;not null;default:''" json:"filePath"`
	IsPremium   bool      `gorm:"not null;default:false" json:"isPremium"`
	SortOrder   int       `gorm:"not null;default:0" json:"sortOrder"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime" json:"updatedAt"`
}

func (IELTSMaterial) TableName() string {
	return "ielts_materials"
}
