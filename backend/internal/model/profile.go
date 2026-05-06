package model

// Profile represents the authenticated user's public profile details.
type Profile struct {
	ID             string  `json:"id"`
	Email          string  `json:"email"`
	Phone          *string `json:"phone,omitempty"`
	FullName       string  `json:"fullName"`
	Username       string  `json:"username"`
	AvatarURL      *string `json:"avatarUrl"`
	Bio            *string `json:"bio"`
	CreatedAt      string  `json:"createdAt"`
	StreakDays     int     `json:"streakDays"`
	LastActiveDate *string `json:"lastActiveDate"`
	Points         int     `json:"points"`
	Role           string  `json:"role"`
}
