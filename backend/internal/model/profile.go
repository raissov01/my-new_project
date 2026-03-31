package model

// Profile represents the authenticated user's public profile details.
type Profile struct {
	ID        string  `json:"id"`
	Email     string  `json:"email"`
	FullName  string  `json:"fullName"`
	Username  string  `json:"username"`
	AvatarURL *string `json:"avatarUrl"`
	Bio       *string `json:"bio"`
	Role      string  `json:"role"`
}
