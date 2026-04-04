package models

import "time"

// IELTSStudyPlan stores a user's personalized study plan.
type IELTSStudyPlan struct {
	ID            string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID        string    `gorm:"type:uuid;not null;index" json:"userId"`
	TargetBand    string    `gorm:"not null;default:'6.5'" json:"targetBand"`
	CurrentBand   string    `gorm:"not null;default:'5.0'" json:"currentBand"`
	ExamDate      *string   `json:"examDate"`
	ExamType      string    `gorm:"not null;default:'academic'" json:"examType"`
	WeeklyHours   int       `gorm:"not null;default:10" json:"weeklyHours"`
	WeakSections  *string   `gorm:"type:jsonb" json:"weakSections"`
	Strengths     *string   `gorm:"type:jsonb" json:"strengths"`
	Struggles     *string   `gorm:"type:jsonb" json:"struggles"`
	PlanData      *string   `gorm:"type:jsonb" json:"planData"`
	Questionnaire *string   `gorm:"type:jsonb" json:"questionnaire"`
	Status        string    `gorm:"not null;default:'active';check:status IN ('active','completed','archived')" json:"status"`
	GeneratedByAI bool      `gorm:"not null;default:false" json:"generatedByAI"`
	AIModel       string    `json:"aiModel"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime" json:"updatedAt"`
}

func (IELTSStudyPlan) TableName() string {
	return "ielts_study_plans"
}
