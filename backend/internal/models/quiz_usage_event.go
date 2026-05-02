package models

import "time"

// QuizUsageEvent stores product analytics for Quizizz-style quiz usage.
//
// SessionID is the client-supplied stable ID stored in localStorage; it
// persists across login state so analytics can stitch a user's anonymous
// activity to their authenticated activity (see service/quizizz_analytics.go
// for the user_id-priority dedup CTE).
//
// IPAddress is captured server-side from X-Forwarded-For / RemoteAddr.
type QuizUsageEvent struct {
	ID         string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	EventType  string    `gorm:"type:varchar(40);not null;index:idx_quiz_usage_events_type_created,priority:1" json:"eventType"`
	QuizID     *string   `gorm:"type:uuid;index:idx_quiz_usage_events_quiz_created,priority:1" json:"quizId,omitempty"`
	UserID     *string   `gorm:"type:uuid;index:idx_quiz_usage_events_user_created,priority:1" json:"userId,omitempty"`
	SessionID  *string   `gorm:"column:session_id;type:varchar(128);index:idx_quiz_usage_events_session_created,priority:1" json:"sessionId,omitempty"`
	AttemptID  *string   `gorm:"type:uuid;index" json:"attemptId,omitempty"`
	QuestionID *string   `gorm:"type:uuid;index" json:"questionId,omitempty"`
	Metadata   *string   `gorm:"type:jsonb" json:"metadata,omitempty"`
	IPAddress  *string   `gorm:"column:ip_address;type:varchar(45)" json:"ipAddress,omitempty"`
	UserAgent  *string   `gorm:"type:text" json:"userAgent,omitempty"`
	CreatedAt  time.Time `gorm:"autoCreateTime;index:idx_quiz_usage_events_type_created,priority:2;index:idx_quiz_usage_events_quiz_created,priority:2;index:idx_quiz_usage_events_user_created,priority:2;index:idx_quiz_usage_events_session_created,priority:2" json:"createdAt"`
}

func (QuizUsageEvent) TableName() string {
	return "quiz_usage_events"
}
