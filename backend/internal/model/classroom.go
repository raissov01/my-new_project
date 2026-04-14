package model

// OwnedGroup is used in teacher challenge creation flows.
type OwnedGroup struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	OwnerID   string `json:"ownerId"`
	JoinCode  string `json:"joinCode"`
	CreatedAt string `json:"createdAt"`
}

// AvailableClassSet is a teacher-owned set available for assignments/challenges.
type AvailableClassSet struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Description *string `json:"description"`
	IsPublic    bool    `json:"isPublic"`
	UserID      string  `json:"userId"`
	CreatedAt   string  `json:"createdAt"`
}

// MyClassChallenge is a challenge row rendered in teacher/student challenge lists.
type MyClassChallenge struct {
	ID               string  `json:"id"`
	Title            string  `json:"title"`
	Deadline         *string `json:"deadline"`
	CreatedAt        string  `json:"createdAt"`
	GroupName        string  `json:"groupName"`
	SetTitle         string  `json:"setTitle"`
	IsOwner          bool    `json:"isOwner"`
	Joined           bool    `json:"joined"`
	ParticipantCount int     `json:"participantCount"`
}

// TeacherClassroomGroup contains the primary classroom details shown on the teacher detail page.
type TeacherClassroomGroup struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	OwnerID   string `json:"ownerId"`
	JoinCode  string `json:"joinCode"`
	CreatedAt string `json:"createdAt"`
}

// TeacherClassroomMember represents a classroom member row.
type TeacherClassroomMember struct {
	UserID      string  `json:"userId"`
	Role        string  `json:"role"`
	JoinedAt    string  `json:"joinedAt"`
	Username    string  `json:"username"`
	AvatarURL   *string `json:"avatarUrl"`
	ProfileRole string  `json:"profileRole"`
}

// TeacherClassroomAssignment represents an assigned set within a classroom.
type TeacherClassroomAssignment struct {
	ID        string  `json:"id"`
	SetID     string  `json:"setId"`
	SetTitle  string  `json:"setTitle"`
	Deadline  *string `json:"deadline"`
	CreatedAt string  `json:"createdAt"`
}

// TeacherClassroomChallenge represents a class challenge row in the teacher detail page.
type TeacherClassroomChallenge struct {
	ID        string  `json:"id"`
	Title     string  `json:"title"`
	SetID     string  `json:"setId"`
	SetTitle  string  `json:"setTitle"`
	Deadline  *string `json:"deadline"`
	CreatedAt string  `json:"createdAt"`
}

// TeacherClassroomProgress contains classroom-level student progress metrics.
type TeacherClassroomProgress struct {
	UserID              string  `json:"userId"`
	Username            string  `json:"username"`
	AvatarURL           *string `json:"avatarUrl"`
	StudiedCards        int     `json:"studiedCards"`
	AssignedSetsStarted int     `json:"assignedSetsStarted"`
	Accuracy            int     `json:"accuracy"`
	Mistakes            int     `json:"mistakes"`
}

// TeacherClassroomQuizAssignment represents a quiz assigned inside a classroom.
type TeacherClassroomQuizAssignment struct {
	ID             string  `json:"id"`
	QuizID         string  `json:"quizId"`
	QuizTitle      string  `json:"quizTitle"`
	QuestionCount  int     `json:"questionCount"`
	Deadline       *string `json:"deadline"`
	CreatedAt      string  `json:"createdAt"`
	CompletedCount int     `json:"completedCount"`
	TotalStudents  int     `json:"totalStudents"`
	AveragePercent int     `json:"averagePercent"`
}

// TeacherClassroomDetail is the teacher classroom detail payload.
type TeacherClassroomDetail struct {
	Group           TeacherClassroomGroup            `json:"group"`
	Members         []TeacherClassroomMember         `json:"members"`
	Assignments     []TeacherClassroomAssignment     `json:"assignments"`
	QuizAssignments []TeacherClassroomQuizAssignment `json:"quizAssignments"`
	Challenges      []TeacherClassroomChallenge      `json:"challenges"`
	Progress        []TeacherClassroomProgress       `json:"progress"`
}

// AssignQuizRequest is the payload for POST /classroom/assign-quiz.
type AssignQuizRequest struct {
	GroupID  string  `json:"groupId"`
	QuizID   string  `json:"quizId"`
	Deadline *string `json:"deadline"`
}

// QuizLeaderboardRow is one student row in a class quiz leaderboard.
// Students who never attempted the quiz have BestPercentage = nil and appear
// sorted at the bottom.
type QuizLeaderboardRow struct {
	UserID         string  `json:"userId"`
	Username       string  `json:"username"`
	AvatarURL      *string `json:"avatarUrl"`
	BestPercentage *int    `json:"bestPercentage"`
	BestScore      *int    `json:"bestScore"`
	TotalQuestions *int    `json:"totalQuestions"`
	BestTimeSpent  *int    `json:"bestTimeSpent"`
	AttemptsCount  int     `json:"attemptsCount"`
	CompletedAt    *string `json:"completedAt"`
	Late           bool    `json:"late"`
}

// QuizLeaderboard is the response body for class quiz leaderboard.
type QuizLeaderboard struct {
	QuizID        string               `json:"quizId"`
	QuizTitle     string               `json:"quizTitle"`
	GroupID       string               `json:"groupId"`
	GroupName     string               `json:"groupName"`
	Deadline      *string              `json:"deadline"`
	TotalStudents int                  `json:"totalStudents"`
	Rows          []QuizLeaderboardRow `json:"rows"`
}

// QuizQuestionStats is one question's aggregate stats for the teacher view.
type QuizQuestionStats struct {
	QuestionID    string `json:"questionId"`
	QuestionText  string `json:"questionText"`
	OrderIndex    int    `json:"orderIndex"`
	Attempts      int    `json:"attempts"`
	Correct       int    `json:"correct"`
	Incorrect     int    `json:"incorrect"`
	Skipped       int    `json:"skipped"`
	ErrorRate     int    `json:"errorRate"`
	CorrectOption string `json:"correctOption"`
}

// QuizTeacherStats is the teacher-facing aggregate view for a class quiz.
type QuizTeacherStats struct {
	QuizID         string              `json:"quizId"`
	QuizTitle      string              `json:"quizTitle"`
	GroupID        string              `json:"groupId"`
	GroupName      string              `json:"groupName"`
	Deadline       *string             `json:"deadline"`
	TotalStudents  int                 `json:"totalStudents"`
	CompletedCount int                 `json:"completedCount"`
	AveragePercent int                 `json:"averagePercent"`
	Questions      []QuizQuestionStats `json:"questions"`
}

// RecentQuizActivity is a row in the teacher dashboard "recent activity" widget.
type RecentQuizActivity struct {
	AttemptID   string `json:"attemptId"`
	QuizID      string `json:"quizId"`
	QuizTitle   string `json:"quizTitle"`
	StudentID   string `json:"studentId"`
	StudentName string `json:"studentName"`
	Percentage  int    `json:"percentage"`
	CompletedAt string `json:"completedAt"`
}

// StudentQuizAssignment is a single quiz assignment shown to a student.
type StudentQuizAssignment struct {
	ID             string  `json:"id"`
	GroupID        string  `json:"groupId"`
	GroupName      string  `json:"groupName"`
	QuizID         string  `json:"quizId"`
	QuizTitle      string  `json:"quizTitle"`
	QuestionCount  int     `json:"questionCount"`
	Deadline       *string `json:"deadline"`
	CreatedAt      string  `json:"createdAt"`
	BestPercentage *int    `json:"bestPercentage"`
	AttemptsCount  int     `json:"attemptsCount"`
	LastAttemptAt  *string `json:"lastAttemptAt"`
	Status         string  `json:"status"` // not_started | completed | overdue | late
}
