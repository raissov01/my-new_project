package models

import "time"

// IELTSTaskCompletion tracks individual task completions within a study plan.
type IELTSTaskCompletion struct {
	ID            string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID        string    `gorm:"type:uuid;not null;index" json:"userId"`
	PlanID        string    `gorm:"type:uuid;not null;index" json:"planId"`
	Week          int       `gorm:"not null" json:"week"`
	Day           string    `gorm:"not null" json:"day"`
	Skill         string    `gorm:"not null" json:"skill"`
	Activity      string    `gorm:"type:text;not null" json:"activity"`
	Status        string    `gorm:"not null;default:'pending'" json:"status"`
	Note          *string   `gorm:"type:text" json:"note"`
	SkipReason    *string   `gorm:"type:text" json:"skipReason"`
	MinutesSpent  *int      `json:"minutesSpent"`
	CompletedAt   *time.Time `json:"completedAt"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime" json:"updatedAt"`
}

func (IELTSTaskCompletion) TableName() string {
	return "ielts_task_completions"
}
