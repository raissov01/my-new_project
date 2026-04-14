package model

// QuizQuestionInput is a question to create or update inside a quiz.
// On update, pass ID to keep an existing question (preserves attempt history);
// omit ID to insert a new one.
type QuizQuestionInput struct {
	ID            *string `json:"id,omitempty"`
	QuestionText  string  `json:"questionText"`
	OptionA       string  `json:"optionA"`
	OptionB       string  `json:"optionB"`
	OptionC       string  `json:"optionC"`
	OptionD       string  `json:"optionD"`
	CorrectOption string  `json:"correctOption"`
}

// CreateQuizRequest is the input for creating a quiz.
type CreateQuizRequest struct {
	Title           string              `json:"title"`
	Description     string              `json:"description"`
	Subject         string              `json:"subject"`
	IsPublic        bool                `json:"isPublic"`
	TimePerQuestion int                 `json:"timePerQuestion"`
	ShuffleOptions  bool                `json:"shuffleOptions"`
	Questions       []QuizQuestionInput `json:"questions"`
}

// UpdateQuizRequest is the input for updating a quiz.
type UpdateQuizRequest struct {
	Title           string              `json:"title"`
	Description     string              `json:"description"`
	Subject         string              `json:"subject"`
	IsPublic        bool                `json:"isPublic"`
	TimePerQuestion int                 `json:"timePerQuestion"`
	ShuffleOptions  bool                `json:"shuffleOptions"`
	Questions       []QuizQuestionInput `json:"questions"`
}

// QuizOverview is a library-card summary of a quiz (used in list views).
type QuizOverview struct {
	ID                string  `json:"id"`
	UserID            string  `json:"userId"`
	AuthorName        *string `json:"authorName"`
	Title             string  `json:"title"`
	Description       *string `json:"description"`
	Subject           *string `json:"subject"`
	IsPublic          bool    `json:"isPublic"`
	TimePerQuestion   int     `json:"timePerQuestion"`
	ShuffleOptions    bool    `json:"shuffleOptions"`
	CreatedAt         string  `json:"createdAt"`
	UpdatedAt         string  `json:"updatedAt"`
	QuestionCount     int     `json:"questionCount"`
	AttemptsCount     int     `json:"attemptsCount"`
	AveragePercentage int     `json:"averagePercentage"`
	BestPercentage    *int    `json:"bestPercentage"`
}

// QuizQuestionDTO is a question as exposed in the detail response.
// CorrectOption is nil for non-authors to prevent cheating during play.
type QuizQuestionDTO struct {
	ID            string  `json:"id"`
	QuestionText  string  `json:"questionText"`
	OptionA       string  `json:"optionA"`
	OptionB       string  `json:"optionB"`
	OptionC       string  `json:"optionC"`
	OptionD       string  `json:"optionD"`
	CorrectOption *string `json:"correctOption,omitempty"`
	OrderIndex    int     `json:"orderIndex"`
}

// QuizDetail is the full quiz response with questions.
type QuizDetail struct {
	ID                string            `json:"id"`
	UserID            string            `json:"userId"`
	AuthorName        *string           `json:"authorName"`
	Title             string            `json:"title"`
	Description       *string           `json:"description"`
	Subject           *string           `json:"subject"`
	IsPublic          bool              `json:"isPublic"`
	TimePerQuestion   int               `json:"timePerQuestion"`
	ShuffleOptions    bool              `json:"shuffleOptions"`
	CreatedAt         string            `json:"createdAt"`
	UpdatedAt         string            `json:"updatedAt"`
	Questions         []QuizQuestionDTO `json:"questions"`
	QuestionCount     int               `json:"questionCount"`
	AttemptsCount     int               `json:"attemptsCount"`
	AveragePercentage int               `json:"averagePercentage"`
	IsAuthor          bool              `json:"isAuthor"`
}

// AttemptAnswerInput is a single answer submitted by the client.
// SelectedOption is nil for skipped/timed-out questions.
type AttemptAnswerInput struct {
	QuestionID     string  `json:"questionId"`
	SelectedOption *string `json:"selectedOption"`
	TimeSpent      int     `json:"timeSpent"`
}

// SubmitAttemptRequest is the payload for POST /quizzes/:id/attempts.
// The client sends only raw selections; scoring is computed server-side.
type SubmitAttemptRequest struct {
	StartedAt string               `json:"startedAt"`
	Answers   []AttemptAnswerInput `json:"answers"`
}

// AttemptAnswerResult is a graded answer returned after submission.
type AttemptAnswerResult struct {
	QuestionID     string  `json:"questionId"`
	QuestionText   string  `json:"questionText"`
	OptionA        string  `json:"optionA"`
	OptionB        string  `json:"optionB"`
	OptionC        string  `json:"optionC"`
	OptionD        string  `json:"optionD"`
	SelectedOption *string `json:"selectedOption"`
	CorrectOption  string  `json:"correctOption"`
	IsCorrect      bool    `json:"isCorrect"`
	TimeSpent      int     `json:"timeSpent"`
	OrderIndex     int     `json:"orderIndex"`
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
