package model

// CreateGroupRequest is input for creating a class group.
type CreateGroupRequest struct {
	Name    string `json:"name"`
	Members string `json:"members"` // comma/newline-separated usernames
}

// CreateGroupResponse is the output after group creation.
type CreateGroupResponse struct {
	GroupID  string `json:"groupId"`
	JoinCode string `json:"joinCode"`
}

// JoinByCodeRequest is input for students joining by code.
type JoinByCodeRequest struct {
	JoinCode string `json:"joinCode"`
}

// AssignSetRequest is input for assigning a set to a class.
type AssignSetRequest struct {
	GroupID  string  `json:"groupId"`
	SetID    string  `json:"setId"`
	Deadline *string `json:"deadline,omitempty"`
}

// CreateClassChallengeRequest is input for creating a class challenge.
type CreateClassChallengeRequest struct {
	GroupID  string  `json:"groupId"`
	SetID    string  `json:"setId"`
	Title    string  `json:"title"`
	Deadline *string `json:"deadline,omitempty"`
}

// RemoveStudentRequest is input for removing a student from a class.
type RemoveStudentRequest struct {
	GroupID string `json:"groupId"`
	UserID  string `json:"userId"`
}

// UpdateRoleRequest is input for changing a user's role.
type UpdateRoleRequest struct {
	Role string `json:"role"`
}
