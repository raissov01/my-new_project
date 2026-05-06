package model

// ComprehensionSubQuestion is one sub-question inside a comprehension question.
// Type is one of "mcq", "true_false", "fill_blank".
type ComprehensionSubQuestion struct {
	ID      string `json:"id"`   // e.g. "sq0", "sq1"
	Type    string `json:"type"` // "mcq" | "true_false" | "fill_blank"
	Prompt  string `json:"prompt"`
	OptionA string `json:"optionA,omitempty"`
	OptionB string `json:"optionB,omitempty"`
	OptionC string `json:"optionC,omitempty"`
	OptionD string `json:"optionD,omitempty"`
	Correct string `json:"correct"` // "a"-"d" | "t"/"f" | exact text
}

// ComprehensionData is the payload for a comprehension question.
type ComprehensionData struct {
	Passage      string                     `json:"passage"`
	SubQuestions []ComprehensionSubQuestion `json:"subQuestions"`
}

// MatchPair is one left→right pair inside a matching question.
type MatchPair struct {
	Left  string `json:"left"`
	Right string `json:"right"`
}

// HotspotZone is one clickable circle on a hotspot or labeling question image.
// X, Y are the centre coordinates as a percentage of the image (0–100).
// R is the radius as a percentage of the image width (0–100, default 8).
// For hotspot: the correct zone is identified by QuizQuestion.CorrectOption.
// For labeling: CorrectLabel holds the expected answer text for each zone.
type HotspotZone struct {
	ID           int     `json:"id"`
	X            float64 `json:"x"`
	Y            float64 `json:"y"`
	R            float64 `json:"r"`
	Label        string  `json:"label,omitempty"`
	CorrectLabel string  `json:"correctLabel,omitempty"`
}

// QuizQuestionInput is a question to create or update inside a quiz.
// On update, pass ID to keep an existing question (preserves attempt history);
// omit ID to insert a new one.
//
// Field requirements depend on QuestionType (default "mcq"):
//   - mcq        : OptionA..D + CorrectOption (a|b|c|d)
//   - true_false : CorrectOption (t|f)
//   - fill_blank : BlankAnswer
//   - reorder    : ReorderItems (array of strings, 2..10)
//   - matching   : MatchPairs (array of {left,right} pairs, 2..8)
type QuizQuestionInput struct {
	ID                *string            `json:"id,omitempty"`
	QuestionText      string             `json:"questionText"`
	QuestionType      string             `json:"questionType,omitempty"`
	OptionA           string             `json:"optionA,omitempty"`
	OptionB           string             `json:"optionB,omitempty"`
	OptionC           string             `json:"optionC,omitempty"`
	OptionD           string             `json:"optionD,omitempty"`
	OptionE           string             `json:"optionE,omitempty"`
	CorrectOption     string             `json:"correctOption,omitempty"`
	BlankAnswer       string             `json:"blankAnswer,omitempty"`
	ReorderItems      []string           `json:"reorderItems,omitempty"`
	MatchPairs        []MatchPair        `json:"matchPairs,omitempty"`
	HotspotZones      []HotspotZone      `json:"hotspotZones,omitempty"`
	ComprehensionData *ComprehensionData `json:"comprehensionData,omitempty"`
	ImageURL          string             `json:"imageUrl,omitempty"`
	AudioURL          string             `json:"audioUrl,omitempty"`
	VideoURL          string             `json:"videoUrl,omitempty"`
	Explanation       string             `json:"explanation,omitempty"`
	Hint              string             `json:"hint,omitempty"`
}

// CreateQuizRequest is the input for creating a quiz.
type CreateQuizRequest struct {
	Title                string              `json:"title"`
	Description          string              `json:"description"`
	Subject              string              `json:"subject"`
	IsPublic             bool                `json:"isPublic"`
	TimePerQuestion      int                 `json:"timePerQuestion"`
	ShuffleOptions       bool                `json:"shuffleOptions"`
	ShowAnswerAnimations bool                `json:"showAnswerAnimations"`
	PowerUpsEnabled      bool                `json:"powerUpsEnabled"`
	Tags                 []string            `json:"tags"`
	Questions            []QuizQuestionInput `json:"questions"`
}

// UpdateQuizRequest is the input for updating a quiz.
type UpdateQuizRequest struct {
	Title                string              `json:"title"`
	Description          string              `json:"description"`
	Subject              string              `json:"subject"`
	IsPublic             bool                `json:"isPublic"`
	TimePerQuestion      int                 `json:"timePerQuestion"`
	ShuffleOptions       bool                `json:"shuffleOptions"`
	ShowAnswerAnimations bool                `json:"showAnswerAnimations"`
	PowerUpsEnabled      bool                `json:"powerUpsEnabled"`
	Tags                 []string            `json:"tags"`
	Questions            []QuizQuestionInput `json:"questions"`
}

// QuizOverview is a library-card summary of a quiz (used in list views).
type QuizOverview struct {
	ID                   string   `json:"id"`
	UserID               string   `json:"userId"`
	AuthorName           *string  `json:"authorName"`
	Title                string   `json:"title"`
	Description          *string  `json:"description"`
	Subject              *string  `json:"subject"`
	IsPublic             bool     `json:"isPublic"`
	TimePerQuestion      int      `json:"timePerQuestion"`
	ShuffleOptions       bool     `json:"shuffleOptions"`
	ShowAnswerAnimations bool     `json:"showAnswerAnimations"`
	PowerUpsEnabled      bool     `json:"powerUpsEnabled"`
	Version              int      `json:"version"`
	CreatedAt            string   `json:"createdAt"`
	UpdatedAt            string   `json:"updatedAt"`
	QuestionCount        int      `json:"questionCount"`
	AttemptsCount        int      `json:"attemptsCount"`
	AveragePercentage    int      `json:"averagePercentage"`
	BestPercentage       *int     `json:"bestPercentage"`
	Tags                 []string `json:"tags"`
}

// QuizQuestionDTO is a question as exposed in the detail response.
// The canonical answer fields (CorrectOption, BlankAnswer, ReorderItems,
// MatchPairs) are included so the client can render inline reveal; scoring
// is still recomputed server-side in SubmitAttempt.
type QuizQuestionDTO struct {
	ID                string             `json:"id"`
	QuestionText      string             `json:"questionText"`
	QuestionType      string             `json:"questionType"`
	OptionA           string             `json:"optionA,omitempty"`
	OptionB           string             `json:"optionB,omitempty"`
	OptionC           string             `json:"optionC,omitempty"`
	OptionD           string             `json:"optionD,omitempty"`
	OptionE           string             `json:"optionE,omitempty"`
	CorrectOption     *string            `json:"correctOption,omitempty"`
	BlankAnswer       *string            `json:"blankAnswer,omitempty"`
	ReorderItems      []string           `json:"reorderItems,omitempty"`
	MatchPairs        []MatchPair        `json:"matchPairs,omitempty"`
	HotspotZones      []HotspotZone      `json:"hotspotZones,omitempty"`
	ComprehensionData *ComprehensionData `json:"comprehensionData,omitempty"`
	ImageURL          *string            `json:"imageUrl,omitempty"`
	AudioURL          *string            `json:"audioUrl,omitempty"`
	VideoURL          *string            `json:"videoUrl,omitempty"`
	Explanation       *string            `json:"explanation,omitempty"`
	Hint              *string            `json:"hint,omitempty"`
	OrderIndex        int                `json:"orderIndex"`
}

// QuizDetail is the full quiz response with questions.
type QuizDetail struct {
	ID                   string            `json:"id"`
	UserID               string            `json:"userId"`
	AuthorName           *string           `json:"authorName"`
	Title                string            `json:"title"`
	Description          *string           `json:"description"`
	Subject              *string           `json:"subject"`
	IsPublic             bool              `json:"isPublic"`
	TimePerQuestion      int               `json:"timePerQuestion"`
	ShuffleOptions       bool              `json:"shuffleOptions"`
	ShowAnswerAnimations bool              `json:"showAnswerAnimations"`
	PowerUpsEnabled      bool              `json:"powerUpsEnabled"`
	Version              int               `json:"version"`
	CreatedAt            string            `json:"createdAt"`
	UpdatedAt            string            `json:"updatedAt"`
	Questions            []QuizQuestionDTO `json:"questions"`
	QuestionCount        int               `json:"questionCount"`
	AttemptsCount        int               `json:"attemptsCount"`
	AveragePercentage    int               `json:"averagePercentage"`
	IsAuthor             bool              `json:"isAuthor"`
	Tags                 []string          `json:"tags"`
}

// AttemptAnswerInput is a single answer submitted by the client.
// Fields populated depend on question type:
//   - mcq / true_false : SelectedOption
//   - fill_blank       : TextAnswer
//   - reorder          : OrderAnswer (items in the order the user submitted)
//   - matching         : TextAnswer (JSON-encoded map[left]→right)
//
// All fields are nil/empty for skipped/timed-out questions.
type AttemptAnswerInput struct {
	QuestionID     string   `json:"questionId"`
	SelectedOption *string  `json:"selectedOption,omitempty"`
	TextAnswer     *string  `json:"textAnswer,omitempty"`
	OrderAnswer    []string `json:"orderAnswer,omitempty"`
	TimeSpent      int      `json:"timeSpent"`
}

// SubmitAttemptRequest is the payload for POST /quizzes/:id/attempts.
// The client sends only raw selections; scoring is computed server-side.
// PowerUpsUsed is the list of power-up keys the player activated during
// the attempt (e.g. ["fifty_fifty","skip"]); persisted as a JSONB column
// for analytics and never affects server-side grading.
type SubmitAttemptRequest struct {
	StartedAt    string               `json:"startedAt"`
	QuestionIDs  []string             `json:"questionIds,omitempty"`
	Answers      []AttemptAnswerInput `json:"answers"`
	PowerUpsUsed []string             `json:"powerUpsUsed,omitempty"`
}

// AttemptAnswerResult is a graded answer returned after submission.
type AttemptAnswerResult struct {
	QuestionID        string             `json:"questionId"`
	QuestionText      string             `json:"questionText"`
	QuestionType      string             `json:"questionType"`
	OptionA           string             `json:"optionA,omitempty"`
	OptionB           string             `json:"optionB,omitempty"`
	OptionC           string             `json:"optionC,omitempty"`
	OptionD           string             `json:"optionD,omitempty"`
	OptionE           string             `json:"optionE,omitempty"`
	SelectedOption    *string            `json:"selectedOption,omitempty"`
	CorrectOption     string             `json:"correctOption,omitempty"`
	TextAnswer        *string            `json:"textAnswer,omitempty"`
	BlankAnswer       *string            `json:"blankAnswer,omitempty"`
	OrderAnswer       []string           `json:"orderAnswer,omitempty"`
	ReorderItems      []string           `json:"reorderItems,omitempty"`
	MatchPairs        []MatchPair        `json:"matchPairs,omitempty"`
	HotspotZones      []HotspotZone      `json:"hotspotZones,omitempty"`
	ComprehensionData *ComprehensionData `json:"comprehensionData,omitempty"`
	ImageURL          *string            `json:"imageUrl,omitempty"`
	AudioURL          *string            `json:"audioUrl,omitempty"`
	VideoURL          *string            `json:"videoUrl,omitempty"`
	Explanation       *string            `json:"explanation,omitempty"`
	IsCorrect         bool               `json:"isCorrect"`
	TimeSpent         int                `json:"timeSpent"`
	OrderIndex        int                `json:"orderIndex"`
}

// AttemptResult is the full graded response returned to the client.
type AttemptResult struct {
	ID             string                `json:"id"`
	QuizID         string                `json:"quizId"`
	Score          int                   `json:"score"`
	TotalQuestions int                   `json:"totalQuestions"`
	Percentage     int                   `json:"percentage"`
	TimeSpent      int                   `json:"timeSpent"`
	StartedAt      string                `json:"startedAt"`
	CompletedAt    string                `json:"completedAt"`
	Answers        []AttemptAnswerResult `json:"answers"`
}

// AttemptSummary is a row in the user's attempt history for a quiz.
type AttemptSummary struct {
	ID             string `json:"id"`
	QuizID         string `json:"quizId"`
	Score          int    `json:"score"`
	TotalQuestions int    `json:"totalQuestions"`
	Percentage     int    `json:"percentage"`
	TimeSpent      int    `json:"timeSpent"`
	StartedAt      string `json:"startedAt"`
	CompletedAt    string `json:"completedAt"`
}

// RecentAttemptItem is used for the "recent quiz results" dashboard widget.
type RecentAttemptItem struct {
	AttemptID      string `json:"attemptId"`
	QuizID         string `json:"quizId"`
	QuizTitle      string `json:"quizTitle"`
	Score          int    `json:"score"`
	TotalQuestions int    `json:"totalQuestions"`
	Percentage     int    `json:"percentage"`
	CompletedAt    string `json:"completedAt"`
}

// QuestionStat holds per-question accuracy data for the quiz author dashboard.
type QuestionStat struct {
	QuestionID   string `json:"questionId"`
	QuestionText string `json:"questionText"`
	QuestionType string `json:"questionType"`
	OrderIndex   int    `json:"orderIndex"`
	TotalCount   int    `json:"totalCount"`
	CorrectCount int    `json:"correctCount"`
	Accuracy     int    `json:"accuracy"` // 0-100
}

// QuizStatsResponse is the payload returned by GET /quizzes/:id/stats.
type QuizStatsResponse struct {
	TotalAttempts int            `json:"totalAttempts"`
	Questions     []QuestionStat `json:"questions"`
}

// RecommendedQuizItem is used for the "recommended practice" dashboard widget.
// It contains quizzes the user has attempted with a best score below the threshold.
type RecommendedQuizItem struct {
	QuizID         string `json:"quizId"`
	QuizTitle      string `json:"quizTitle"`
	BestPercentage int    `json:"bestPercentage"`
	AttemptsCount  int    `json:"attemptsCount"`
	LastAttemptAt  string `json:"lastAttemptAt"`
}
