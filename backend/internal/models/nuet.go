package models

import "time"

// NUETTopic is one curriculum entry — either a Math topic or a Critical
// Thinking topic. Explanation is rendered as the topic page body.
type NUETTopic struct {
	ID          string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Slug        string    `gorm:"type:varchar(120);not null;uniqueIndex"         json:"slug"`
	Section     string    `gorm:"type:varchar(32);not null"                      json:"section"` // math | critical_thinking
	Title       string    `gorm:"not null"                                       json:"title"`
	Description string    `gorm:"type:text;not null;default:''"                  json:"description"`
	Explanation string    `gorm:"type:text;not null;default:''"                  json:"explanation"`
	Difficulty  string    `gorm:"type:varchar(16);not null;default:'medium'"     json:"difficulty"`
	OrderIndex  int       `gorm:"not null;default:0"                             json:"orderIndex"`
	CreatedAt   time.Time `gorm:"autoCreateTime"                                 json:"createdAt"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime"                                 json:"updatedAt"`
}

func (NUETTopic) TableName() string { return "nuet_topics" }

// NUETQuestion is a single multiple-choice question in the practice bank.
// Options is JSON-encoded ["London","Paris","Berlin","Madrid"]. Answer is
// the letter key ("A".."E"). Stored as *string for jsonb fields to match
// the existing IELTS model conventions and avoid adding gorm/datatypes.
type NUETQuestion struct {
	ID           string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TopicID      *string   `gorm:"type:uuid"                                      json:"topicId,omitempty"`
	PDFTestID    *string   `gorm:"type:uuid;column:pdf_test_id"                   json:"pdfTestId,omitempty"`
	Position     int       `gorm:"not null;default:0"                             json:"position"`
	Section      string    `gorm:"type:varchar(32);not null"                      json:"section"`
	QuestionType string    `gorm:"type:varchar(32);not null;default:'multiple_choice'" json:"questionType"`
	Difficulty   string    `gorm:"type:varchar(16);not null;default:'medium'"     json:"difficulty"`
	Prompt       string    `gorm:"type:text;not null"                             json:"prompt"`
	Options      *string   `gorm:"type:jsonb"                                     json:"options"`
	Answer       string    `gorm:"type:varchar(8);not null"                       json:"answer"`
	Explanation  string    `gorm:"type:text;not null;default:''"                  json:"explanation"`
	Source       string    `gorm:"type:text;not null;default:''"                  json:"source"`
	CreatedAt    time.Time `gorm:"autoCreateTime"                                 json:"createdAt"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime"                                 json:"updatedAt"`
}

func (NUETQuestion) TableName() string { return "nuet_questions" }

// NUETPDFTest is the answer key + metadata for a published Trial Test or
// NUET Mock PDF. Lets users view the PDF, fill in answers, and get scored
// without needing the questions extracted from the PDF itself.
type NUETPDFTest struct {
	ID         string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name       string    `gorm:"not null;uniqueIndex"                           json:"name"`
	TestType   string    `gorm:"type:varchar(32);not null"                      json:"testType"` // trial_test | mock_test
	PDFPath    string    `gorm:"column:pdf_path;not null"                       json:"pdfPath"`
	MathCount  int       `gorm:"not null;default:30"                            json:"mathCount"`
	CTCount    int       `gorm:"column:ct_count;not null;default:30"            json:"ctCount"`
	AnswerKeys *string   `gorm:"type:jsonb"                                     json:"answerKeys"`
	CreatedAt  time.Time `gorm:"autoCreateTime"                                 json:"createdAt"`
	UpdatedAt  time.Time `gorm:"autoUpdateTime"                                 json:"updatedAt"`
}

func (NUETPDFTest) TableName() string { return "nuet_pdf_tests" }

// NUETAttempt records a user's run through any practice mode: a full mock
// exam, a PDF mock, topic practice, or section practice.
type NUETAttempt struct {
	ID             string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID         string     `gorm:"type:uuid;not null;index"                       json:"-"`
	AttemptType    string     `gorm:"type:varchar(32);not null"                      json:"attemptType"`
	PDFTestID      *string    `gorm:"type:uuid;column:pdf_test_id"                   json:"pdfTestId,omitempty"`
	TopicID        *string    `gorm:"type:uuid"                                      json:"topicId,omitempty"`
	Section        string     `gorm:"type:varchar(32);not null;default:'full'"       json:"section"`
	Status         string     `gorm:"type:varchar(16);not null;default:'in_progress'" json:"status"`
	StrictMode     bool       `gorm:"not null;default:false"                         json:"strictMode"`
	Answers        *string    `gorm:"type:jsonb"                                     json:"answers"`
	QuestionSet    *string    `gorm:"type:jsonb"                                     json:"questionSet,omitempty"`
	Results        *string    `gorm:"type:jsonb"                                     json:"results,omitempty"`
	CorrectMath    int        `gorm:"not null;default:0"                             json:"correctMath"`
	CorrectCT      int        `gorm:"column:correct_ct;not null;default:0"           json:"correctCt"`
	ScoreMath      int        `gorm:"not null;default:0"                             json:"scoreMath"`
	ScoreCT        int        `gorm:"column:score_ct;not null;default:0"             json:"scoreCt"`
	ScoreTotal     int        `gorm:"not null;default:0"                             json:"scoreTotal"`
	TimeTakenSecs  int        `gorm:"not null;default:0"                             json:"timeTakenSecs"`
	ViolationCount int        `gorm:"not null;default:0"                             json:"violationCount"`
	StartedAt      time.Time  `gorm:"not null;default:now()"                         json:"startedAt"`
	CompletedAt    *time.Time `                                                      json:"completedAt,omitempty"`
	LastSavedAt    time.Time  `gorm:"autoUpdateTime"                                 json:"lastSavedAt"`
	CreatedAt      time.Time  `gorm:"autoCreateTime"                                 json:"createdAt"`
}

func (NUETAttempt) TableName() string { return "nuet_attempts" }

type NUETViolation struct {
	ID         string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	AttemptID  string    `gorm:"type:uuid;not null;index"                       json:"attemptId"`
	UserID     string    `gorm:"type:uuid;not null;index"                       json:"userId"`
	Type       string    `gorm:"not null;check:type IN ('tab_switch','fullscreen_exit','copy','paste','right_click','dev_tools','blur')" json:"type"`
	Details    *string   `gorm:"type:jsonb"                                      json:"details,omitempty"`
	OccurredAt time.Time `gorm:"autoCreateTime"                                  json:"occurredAt"`
}

func (NUETViolation) TableName() string { return "nuet_simulator_violations" }

// NUETQuestionDismissal records a user marking a question as "I know this"
// so it's excluded from future practice drills. Compound unique on
// (user_id, question_id) means re-dismissing the same question is a no-op
// rather than an error. Dropping the row (via DELETE endpoint) re-enables
// the question.
type NUETQuestionDismissal struct {
	ID           string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID       string    `gorm:"type:uuid;not null;uniqueIndex:uni_nuet_dismissal_user_question,priority:1" json:"userId"`
	QuestionID   string    `gorm:"type:uuid;not null;uniqueIndex:uni_nuet_dismissal_user_question,priority:2" json:"questionId"`
	DismissedAt  time.Time `gorm:"autoCreateTime" json:"dismissedAt"`
}

func (NUETQuestionDismissal) TableName() string { return "nuet_question_dismissals" }

// NUETRoadmapProgress tracks which study plan ("intensive" / "steady") the
// user has chosen and when they started it. Used by the roadmap tracker to
// compute the current week. One row per user; upserted on plan change.
type NUETRoadmapProgress struct {
	UserID    string    `gorm:"type:uuid;primaryKey" json:"userId"`
	PlanKey   string    `gorm:"type:varchar(16);not null" json:"planKey"`
	StartedAt time.Time `gorm:"not null;default:now()" json:"startedAt"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updatedAt"`
}

func (NUETRoadmapProgress) TableName() string { return "nuet_roadmap_progress" }
