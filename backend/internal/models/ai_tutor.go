package models

import "time"

// AIScenario is a roleplay scenario definition (seeded once, edited by admin).
type AIScenario struct {
	ID               string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Slug             string    `gorm:"type:varchar(50);uniqueIndex;not null" json:"slug"`
	Title            string    `gorm:"type:varchar(200);not null" json:"title"`
	Description      string    `gorm:"type:text;not null" json:"description"`
	Level            string    `gorm:"type:varchar(5);not null" json:"level"` // A1-C2
	Category         string    `gorm:"type:varchar(50);not null" json:"category"`
	Icon             string    `gorm:"type:varchar(10)" json:"icon"`
	EstimatedMinutes int       `gorm:"not null;default:10" json:"estimatedMinutes"`
	PersonaName      string    `gorm:"type:varchar(50)" json:"personaName"`
	PersonaPrompt    string    `gorm:"type:text;not null" json:"personaPrompt"`
	StudentGoal      string    `gorm:"type:text;not null" json:"studentGoal"`
	SuccessCriteria  *string   `gorm:"type:jsonb" json:"successCriteria"` // []string
	VocabFocus       *string   `gorm:"type:jsonb" json:"vocabFocus"`      // []string
	CreatedAt        time.Time `gorm:"autoCreateTime" json:"createdAt"`
}

func (AIScenario) TableName() string { return "ai_scenarios" }

// AIConversation stores a user's roleplay session with a scenario.
type AIConversation struct {
	ID          string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID      string     `gorm:"type:uuid;not null;index" json:"userId"`
	ScenarioID  string     `gorm:"type:uuid;not null;index" json:"scenarioId"`
	Messages    *string    `gorm:"type:jsonb;not null;default:'[]'" json:"messages"`
	Status      string     `gorm:"type:varchar(20);not null;default:'active'" json:"status"` // active, completed, abandoned
	FinalScores *string    `gorm:"type:jsonb" json:"finalScores"` // {fluency,grammar,vocabulary,task}
	StartedAt   time.Time  `gorm:"autoCreateTime" json:"startedAt"`
	CompletedAt *time.Time `gorm:"" json:"completedAt"`
}

func (AIConversation) TableName() string { return "ai_conversations" }

// DailyNews stores one AI-generated news article per day in 3 CEFR levels.
type DailyNews struct {
	ID              string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	NewsDate        time.Time  `gorm:"type:date;not null;uniqueIndex" json:"newsDate"`
	Topic           string     `gorm:"type:varchar(100);not null" json:"topic"`
	SourceURL       string     `gorm:"type:text" json:"sourceUrl"`
	OriginalHeadline string    `gorm:"type:text" json:"originalHeadline"`
	VersionA2       string     `gorm:"type:text;not null" json:"versionA2"`
	VersionB1       string     `gorm:"type:text;not null" json:"versionB1"`
	VersionC1       string     `gorm:"type:text;not null" json:"versionC1"`
	VocabA2         *string    `gorm:"type:jsonb" json:"vocabA2"`
	VocabB1         *string    `gorm:"type:jsonb" json:"vocabB1"`
	VocabC1         *string    `gorm:"type:jsonb" json:"vocabC1"`
	Questions       *string    `gorm:"type:jsonb" json:"questions"` // 3 levels × 3 questions
	AudioA2URL      string     `gorm:"type:text" json:"audioA2Url"`
	AudioB1URL      string     `gorm:"type:text" json:"audioB1Url"`
	AudioC1URL      string     `gorm:"type:text" json:"audioC1Url"`
	CreatedAt       time.Time  `gorm:"autoCreateTime" json:"createdAt"`
}

func (DailyNews) TableName() string { return "daily_news" }
