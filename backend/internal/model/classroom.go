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

// TeacherClassroomDetail is the teacher classroom detail payload.
type TeacherClassroomDetail struct {
	Group       TeacherClassroomGroup        `json:"group"`
	Members     []TeacherClassroomMember     `json:"members"`
	Assignments []TeacherClassroomAssignment `json:"assignments"`
	Challenges  []TeacherClassroomChallenge  `json:"challenges"`
	Progress    []TeacherClassroomProgress   `json:"progress"`
}
