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
	Version       int       `gorm:"not null;default:1" json:"version"`
	VersionReason string    `gorm:"not null;default:'initial'" json:"versionReason"`
	ParentPlanID  *string   `gorm:"type:uuid" json:"parentPlanId"`
	GeneratedByAI bool      `gorm:"not null;default:false" json:"generatedByAI"`
	AIModel       string    `json:"aiModel"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime" json:"updatedAt"`
}

func (IELTSStudyPlan) TableName() string {
	return "ielts_study_plans"
}

// IELTSWeeklyReflection stores a user's weekly check-in / review.
type IELTSWeeklyReflection struct {
	ID         string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID     string    `gorm:"type:uuid;not null;index" json:"userId"`
	PlanID     string    `gorm:"type:uuid;not null;index" json:"planId"`
	Week       int       `gorm:"not null" json:"week"`
	Completed  *string   `gorm:"type:text" json:"completed"`
	Difficult  *string   `gorm:"type:text" json:"difficult"`
	Improved   *string   `gorm:"type:text" json:"improved"`
	SlowedDown *string   `gorm:"type:text" json:"slowedDown"`
	NextWeek   string    `gorm:"not null;default:'same'" json:"nextWeek"` // lighter, same, intensive
	CoachNote  *string   `gorm:"type:text" json:"coachNote"`
	CreatedAt  time.Time `gorm:"autoCreateTime" json:"createdAt"`
}

func (IELTSWeeklyReflection) TableName() string {
	return "ielts_weekly_reflections"
}
