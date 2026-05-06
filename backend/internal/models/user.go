package models

import "time"

// User is the single source of truth for authentication and profile data.
type User struct {
	ID                        string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Email                     string     `gorm:"uniqueIndex;not null" json:"email"`
	Phone                     *string    `gorm:"type:varchar(32);uniqueIndex" json:"phone,omitempty"`
	PasswordHash              string     `gorm:"not null" json:"-"`
	FullName                  string     `gorm:"not null;default:''" json:"fullName"`
	Username                  string     `gorm:"uniqueIndex;not null" json:"username"`
	AvatarURL                 *string    `json:"avatarUrl"`
	Bio                       *string    `json:"bio"`
	Role                      string     `gorm:"not null;default:'student';check:role IN ('student','teacher','admin')" json:"role"`
	IsSuperadmin              bool       `gorm:"not null;default:false" json:"isSuperadmin"`
	IsActive                  bool       `gorm:"not null;default:true" json:"isActive"`
	EmailVerified             bool       `gorm:"not null;default:false" json:"emailVerified"`
	VerificationToken         *string    `gorm:"index" json:"-"`
	VerificationTokenExpiry   *time.Time `json:"-"`
	PasswordResetToken        *string    `gorm:"index" json:"-"`
	PasswordResetTokenExpiry  *time.Time `json:"-"`
	StreakDays                int        `gorm:"not null;default:0" json:"streakDays"`
	Points                    int        `gorm:"not null;default:0" json:"points"`
	LastActiveDate            *string    `json:"lastActiveDate"`
	StreakFreezesAvailable    int        `gorm:"not null;default:2" json:"streakFreezesAvailable"`
	StreakFreezesUsedThisWeek int        `gorm:"not null;default:0" json:"streakFreezesUsedThisWeek"`
	TotalStars                int        `gorm:"not null;default:0" json:"totalStars"`
	Timezone                  string     `gorm:"not null;default:'UTC'" json:"timezone"`
	Plan                      string     `gorm:"not null;default:'free'" json:"plan"` // free | pro
	LSCustomerID              *int64     `gorm:"index" json:"-"`
	CreatedAt                 time.Time  `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt                 time.Time  `gorm:"autoUpdateTime" json:"updatedAt"`
}

func (User) TableName() string {
	return "users"
}
