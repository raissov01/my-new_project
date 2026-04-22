package models

import "time"

// ListeningClip is a short audio clip (2-6 min) with transcript and vocab.
type ListeningClip struct {
	ID                       string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Title                    string     `gorm:"type:varchar(200);not null" json:"title"`
	Level                    string     `gorm:"type:varchar(5);not null" json:"level"` // A1-C2
	Topic                    string     `gorm:"type:varchar(50);not null" json:"topic"`
	AudioURL                 string     `gorm:"type:text;not null" json:"audioUrl"`
	DurationSeconds          int        `gorm:"not null" json:"durationSeconds"`
	Transcript               string     `gorm:"type:text;not null" json:"transcript"`
	TranscriptWithTimestamps *string    `gorm:"type:jsonb" json:"transcriptWithTimestamps"`
	Source                   string     `gorm:"type:varchar(100)" json:"source"`
	SourceURL                string     `gorm:"type:text" json:"sourceUrl"`
	License                  string     `gorm:"type:varchar(50)" json:"license"` // CC-BY, Fair use, Original
	SourcePodcast            string     `gorm:"type:varchar(50)" json:"sourcePodcast"`
	Vocabulary               *string    `gorm:"type:jsonb" json:"vocabulary"` // [{word,definition,example}]
	CreatedAt                time.Time  `gorm:"autoCreateTime" json:"createdAt"`
}

func (ListeningClip) TableName() string { return "listening_clips" }

// ListeningQuestion belongs to a clip; types: comprehension, fill_blank, true_false, dictation.
type ListeningQuestion struct {
	ID             string  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ClipID         string  `gorm:"type:uuid;not null;index" json:"clipId"`
	QuestionType   string  `gorm:"type:varchar(50);not null" json:"questionType"`
	Prompt         string  `gorm:"type:text;not null" json:"prompt"`
	Options        *string `gorm:"type:jsonb" json:"options"`        // []string for MC
	CorrectAnswer  *string `gorm:"type:jsonb;not null" json:"correctAnswer"`
	TimestampStart *int    `gorm:"" json:"timestampStart"` // seconds into clip
	TimestampEnd   *int    `gorm:"" json:"timestampEnd"`
}

func (ListeningQuestion) TableName() string { return "listening_questions" }

// UserListeningProgress tracks per-user per-clip completion.
type UserListeningProgress struct {
	UserID      string     `gorm:"type:uuid;not null;primaryKey" json:"userId"`
	ClipID      string     `gorm:"type:uuid;not null;primaryKey" json:"clipId"`
	PlaysCount  int        `gorm:"not null;default:0" json:"playsCount"`
	BestScore   int        `gorm:"not null;default:0" json:"bestScore"`
	CompletedAt *time.Time `gorm:"" json:"completedAt"`
}

func (UserListeningProgress) TableName() string { return "user_listening_progress" }
