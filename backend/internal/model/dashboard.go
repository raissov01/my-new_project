package model

// TeacherDashboardGroup mirrors the teacher classroom summary card used by the frontend.
type TeacherDashboardGroup struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	JoinCode         string `json:"joinCode"`
	CreatedAt        string `json:"createdAt"`
	MembersCount     int    `json:"membersCount"`
	AssignmentsCount int    `json:"assignmentsCount"`
	ChallengesCount  int    `json:"challengesCount"`
}

// DashboardTopStudent represents a student's best challenge performance for teacher dashboards.
type DashboardTopStudent struct {
	UserID         string  `json:"userId"`
	Username       string  `json:"username"`
	AvatarURL      *string `json:"avatarUrl"`
	Accuracy       int     `json:"accuracy"`
	CompletionTime int     `json:"completionTime"`
	Mistakes       int     `json:"mistakes"`
	Attempts       int     `json:"attempts"`
}

// TeacherDashboardSummary contains the teacher dashboard and classes overview payload.
type TeacherDashboardSummary struct {
	Groups           []TeacherDashboardGroup `json:"groups"`
	TotalStudents    int                     `json:"totalStudents"`
	TotalAssignments int                     `json:"totalAssignments"`
	TotalChallenges  int                     `json:"totalChallenges"`
	TopStudents      []DashboardTopStudent   `json:"topStudents"`
}

// StudentDashboardClass mirrors the class cards shown to students.
type StudentDashboardClass struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	JoinedAt string `json:"joinedAt"`
}

// StudentDashboardAssignment mirrors the assigned set list on the student dashboard.
type StudentDashboardAssignment struct {
	ID        string  `json:"id"`
	GroupID   string  `json:"groupId"`
	GroupName string  `json:"groupName"`
	SetID     string  `json:"setId"`
	SetTitle  string  `json:"setTitle"`
	Deadline  *string `json:"deadline"`
}

// StudentDashboardChallenge mirrors the class challenge list shown to students.
type StudentDashboardChallenge struct {
	ID        string  `json:"id"`
	Title     string  `json:"title"`
	GroupID   string  `json:"groupId"`
	GroupName string  `json:"groupName"`
	Deadline  *string `json:"deadline"`
	Joined    bool    `json:"joined"`
}

// StudentDashboardSummary contains the classroom overview payload for student dashboard/classes pages.
type StudentDashboardSummary struct {
	Classes     []StudentDashboardClass      `json:"classes"`
	Assignments []StudentDashboardAssignment `json:"assignments"`
	Challenges  []StudentDashboardChallenge  `json:"challenges"`
}
