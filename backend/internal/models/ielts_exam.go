package models

import "time"

// IELTSWritingSubmission stores a user's writing attempt with AI feedback.
type IELTSWritingSubmission struct {
	ID              string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID          string    `gorm:"type:uuid;not null;index" json:"userId"`
	TaskType        string    `gorm:"not null;check:task_type IN ('task1','task2')" json:"taskType"`
	Prompt          string    `gorm:"type:text;not null" json:"prompt"`
	Essay           string    `gorm:"type:text;not null" json:"essay"`
	WordCount       int       `gorm:"not null;default:0" json:"wordCount"`
	TimeTakenSecs   *int      `json:"timeTakenSecs"`
	OverallBand     float64   `gorm:"not null;default:0" json:"overallBand"`
	TaskAchievement float64   `gorm:"not null;default:0" json:"taskAchievement"`
	Coherence       float64   `gorm:"not null;default:0" json:"coherence"`
	LexicalResource float64   `gorm:"not null;default:0" json:"lexicalResource"`
	Grammar         float64   `gorm:"not null;default:0" json:"grammar"`
	Feedback        string    `gorm:"type:text" json:"feedback"`
	AIModel         string    `json:"aiModel"`
	CreatedAt       time.Time `gorm:"autoCreateTime" json:"createdAt"`
}

func (IELTSWritingSubmission) TableName() string {
	return "ielts_writing_submissions"
}

// IELTSSpeakingSession stores a speaking practice attempt with AI feedback.
type IELTSSpeakingSession struct {
	ID               string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID           string    `gorm:"type:uuid;not null;index" json:"userId"`
	Part             string    `gorm:"not null;check:part IN ('part1','part2','part3')" json:"part"`
	Prompt           string    `gorm:"type:text;not null" json:"prompt"`
	Transcript       string    `gorm:"type:text;not null" json:"transcript"`
	OverallBand      float64   `gorm:"not null;default:0" json:"overallBand"`
	FluencyCoherence float64   `gorm:"not null;default:0" json:"fluencyCoherence"`
	LexicalResource  float64   `gorm:"not null;default:0" json:"lexicalResource"`
	Grammar          float64   `gorm:"not null;default:0" json:"grammar"`
	Pronunciation    float64   `gorm:"not null;default:0" json:"pronunciation"`
	Feedback         string    `gorm:"type:text" json:"feedback"`
	AIModel          string    `json:"aiModel"`
	CreatedAt        time.Time `gorm:"autoCreateTime" json:"createdAt"`
}

func (IELTSSpeakingSession) TableName() string {
	return "ielts_speaking_sessions"
}

// IELTSQuestion stores pre-loaded exam questions for mock tests and practice.
type IELTSQuestion struct {
	ID            string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Section       string    `gorm:"not null;index;check:section IN ('reading','writing','speaking','listening')" json:"section"`
	QuestionType  string    `gorm:"not null" json:"questionType"`
	Difficulty    string    `gorm:"not null;default:'medium';check:difficulty IN ('easy','medium','hard')" json:"difficulty"`
	MockType      string    `gorm:"not null;default:'original';check:mock_type IN ('original','predictions','cambridge_style')" json:"mockType"`
	Topic         string    `gorm:"not null;default:'';index" json:"topic"`
	ExamSet       string    `gorm:"not null;default:'';index" json:"examSet"`
	QuestionGroup string    `gorm:"not null;default:'';index" json:"questionGroup"`
	Title         string    `gorm:"not null" json:"title"`
	Prompt        string    `gorm:"type:text;not null" json:"prompt"`
	Content       *string   `gorm:"type:text" json:"content"`
	AudioScript   *string   `gorm:"type:text" json:"audioScript"`
	Options       *string   `gorm:"type:text" json:"options"`
	Answer        *string   `gorm:"type:text" json:"answer"`
	Explanation   *string   `gorm:"type:text" json:"explanation"`
	BandTarget    *string   `json:"bandTarget"`
	PassageNumber int       `gorm:"not null;default:0" json:"passageNumber"`
	SortOrder     int       `gorm:"not null;default:0" json:"sortOrder"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime" json:"updatedAt"`
}

func (IELTSQuestion) TableName() string {
	return "ielts_questions"
}

// IELTSMockExam stores a user's mock exam session and results.
type IELTSMockExam struct {
	ID          string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID      string     `gorm:"type:uuid;not null;index" json:"userId"`
	ExamType    string     `gorm:"not null;check:exam_type IN ('predictions','cambridge_style')" json:"examType"`
	Sections    string     `gorm:"type:text" json:"sections"`
	Status      string     `gorm:"not null;default:'in_progress';check:status IN ('in_progress','completed')" json:"status"`
	Results     *string    `gorm:"type:text" json:"results"`
	StartedAt   time.Time  `gorm:"autoCreateTime" json:"startedAt"`
	CompletedAt *time.Time `json:"completedAt"`
	CreatedAt   time.Time  `gorm:"autoCreateTime" json:"createdAt"`
}

func (IELTSMockExam) TableName() string {
	return "ielts_mock_exams"
}
