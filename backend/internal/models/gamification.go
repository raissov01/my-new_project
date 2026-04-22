package models

import "time"

// ── Streak ─────────────────────────────────────────────────────────────────

// DailyActivity records XP and lessons for a single calendar day.
type DailyActivity struct {
	UserID           string    `gorm:"type:uuid;not null;primaryKey" json:"userId"`
	ActivityDate     time.Time `gorm:"type:date;not null;primaryKey" json:"activityDate"`
	XPEarned         int       `gorm:"not null;default:0" json:"xpEarned"`
	LessonsCompleted int       `gorm:"not null;default:0" json:"lessonsCompleted"`
}

func (DailyActivity) TableName() string { return "daily_activity" }

// ── Leagues ────────────────────────────────────────────────────────────────

// LeagueGroup is a cohort of ≤30 users competing during one ISO week.
type LeagueGroup struct {
	ID           string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Tier         string    `gorm:"type:varchar(20);not null" json:"tier"`
	WeekStartsOn time.Time `gorm:"type:date;not null" json:"weekStartsOn"`
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"createdAt"`
}

func (LeagueGroup) TableName() string { return "league_groups" }

// LeagueMembership links a user to a LeagueGroup and tracks their weekly XP.
type LeagueMembership struct {
	UserID        string    `gorm:"type:uuid;not null;primaryKey" json:"userId"`
	LeagueGroupID string    `gorm:"type:uuid;not null;primaryKey" json:"leagueGroupId"`
	WeeklyXP      int       `gorm:"not null;default:0" json:"weeklyXp"`
	JoinedAt      time.Time `gorm:"autoCreateTime" json:"joinedAt"`
}

func (LeagueMembership) TableName() string { return "league_memberships" }

// Tier ordering (index = rank, higher = better)
var LeagueTierOrder = []string{
	"bronze", "silver", "gold", "sapphire", "ruby",
	"emerald", "amethyst", "pearl", "obsidian", "diamond",
}

// ── Friends ────────────────────────────────────────────────────────────────

// Friendship represents a directional friend link (user → friend).
// A mutual friendship has two rows: (A→B, accepted) and (B→A, accepted).
type Friendship struct {
	UserID    string    `gorm:"type:uuid;not null;primaryKey" json:"userId"`
	FriendID  string    `gorm:"type:uuid;not null;primaryKey" json:"friendId"`
	Status    string    `gorm:"type:varchar(20);not null;default:'pending'" json:"status"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"createdAt"`
}

func (Friendship) TableName() string { return "friendships" }

// UserInviteCode holds a unique share code per user.
type UserInviteCode struct {
	UserID    string    `gorm:"type:uuid;not null;primaryKey" json:"userId"`
	Code      string    `gorm:"type:varchar(10);not null;uniqueIndex" json:"code"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"createdAt"`
}

func (UserInviteCode) TableName() string { return "user_invite_codes" }

// ── Achievements ───────────────────────────────────────────────────────────

// Achievement is a static badge definition (seeded once).
type Achievement struct {
	ID          string `gorm:"type:varchar(50);primaryKey" json:"id"`
	Title       string `gorm:"type:varchar(100);not null" json:"title"`
	Description string `gorm:"type:text;not null" json:"description"`
	Icon        string `gorm:"type:varchar(50);not null" json:"icon"`
	Tier        string `gorm:"type:varchar(20);not null" json:"tier"`
	XPBonus     int    `gorm:"not null;default:0" json:"xpBonus"`
	Category    string `gorm:"type:varchar(30);not null;default:'general'" json:"category"`
	SortOrder   int    `gorm:"not null;default:0" json:"sortOrder"`
}

func (Achievement) TableName() string { return "achievements" }

// UserAchievement records when a user unlocked an achievement.
type UserAchievement struct {
	UserID        string    `gorm:"type:uuid;not null;primaryKey" json:"userId"`
	AchievementID string    `gorm:"type:varchar(50);not null;primaryKey" json:"achievementId"`
	UnlockedAt    time.Time `gorm:"not null;autoCreateTime" json:"unlockedAt"`
}

func (UserAchievement) TableName() string { return "user_achievements" }

// ── Lesson stars ───────────────────────────────────────────────────────────

// LessonAttempt records each completed attempt with stars and timing.
type LessonAttempt struct {
	ID          string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID      string    `gorm:"type:uuid;not null;index" json:"userId"`
	LessonID    string    `gorm:"type:uuid;not null;index" json:"lessonId"`
	Stars       int       `gorm:"not null;default:0" json:"stars"`
	HeartsLost  int       `gorm:"not null;default:0" json:"heartsLost"`
	TimeSecs    int       `gorm:"not null;default:0" json:"timeSecs"`
	CompletedAt time.Time `gorm:"not null;autoCreateTime" json:"completedAt"`
}

func (LessonAttempt) TableName() string { return "lesson_attempts" }

// ── XP Events + Daily Quests ───────────────────────────────────────────────

// XPEvent defines a time-bounded XP multiplier (e.g., 2× Weekend).
type XPEvent struct {
	ID          string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Multiplier  float64   `gorm:"type:numeric(3,1);not null;default:2.0" json:"multiplier"`
	StartsAt    time.Time `gorm:"not null" json:"startsAt"`
	EndsAt      time.Time `gorm:"not null" json:"endsAt"`
	Title       string    `gorm:"type:varchar(100)" json:"title"`
	BannerColor string    `gorm:"type:varchar(20);default:'#f97316'" json:"bannerColor"`
}

func (XPEvent) TableName() string { return "xp_events" }

// DailyQuest is a per-user daily challenge generated at midnight.
type DailyQuest struct {
	ID        string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID    string    `gorm:"type:uuid;not null;index" json:"userId"`
	QuestDate time.Time `gorm:"type:date;not null" json:"questDate"`
	QuestType string    `gorm:"type:varchar(50);not null" json:"questType"`
	Target    int       `gorm:"not null" json:"target"`
	Progress  int       `gorm:"not null;default:0" json:"progress"`
	Completed bool      `gorm:"not null;default:false" json:"completed"`
	XPReward  int       `gorm:"not null" json:"xpReward"`
}

func (DailyQuest) TableName() string { return "daily_quests" }
