package service

import (
	"crypto/rand"
	"fmt"
	"log"
	"math/big"
	"strings"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/email"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"github.com/midoriya/flashlearn-backend/internal/notifier"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const leagueGroupMaxSize = 30

// GamificationService holds all retention-loop business logic.
type GamificationService struct {
	db    *gorm.DB
	email *email.Sender
}

func NewGamification(db *gorm.DB, emailSender *email.Sender) *GamificationService {
	return &GamificationService{db: db, email: emailSender}
}

func (s *GamificationService) DB() *gorm.DB { return s.db }

// ─────────────────────────────────────────────────────────────────────────────
// STREAK
// ─────────────────────────────────────────────────────────────────────────────

// RecordDailyActivity upserts today's activity and updates the user's streak.
func (s *GamificationService) RecordDailyActivity(userID string, xpEarned, lessonsCompleted int) error {
	today := time.Now().UTC().Truncate(24 * time.Hour)

	// Upsert daily_activity
	act := models.DailyActivity{
		UserID:       userID,
		ActivityDate: today,
	}
	if err := s.db.Where("user_id = ? AND activity_date = ?", userID, today).
		FirstOrCreate(&act).Error; err != nil {
		return err
	}
	if err := s.db.Model(&act).Updates(map[string]any{
		"xp_earned":         act.XPEarned + xpEarned,
		"lessons_completed": act.LessonsCompleted + lessonsCompleted,
	}).Error; err != nil {
		return err
	}

	// Update streak on user
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return err
	}

	yesterday := today.AddDate(0, 0, -1)

	var lastActive time.Time
	if user.LastActiveDate != nil {
		parsed, err := time.Parse("2006-01-02", *user.LastActiveDate)
		if err == nil {
			lastActive = parsed
		}
	}

	updates := map[string]any{
		"last_active_date": today.Format("2006-01-02"),
	}

	switch {
	case lastActive.IsZero():
		updates["streak_days"] = 1
	case lastActive.Equal(today):
		// already recorded today — no change
	case lastActive.Equal(yesterday):
		updates["streak_days"] = user.StreakDays + 1
	default:
		// gap > 1 day
		if user.StreakFreezesAvailable > 0 {
			updates["streak_freezes_available"] = user.StreakFreezesAvailable - 1
			updates["streak_freezes_used_this_week"] = user.StreakFreezesUsedThisWeek + 1
			// streak continues
		} else {
			updates["streak_days"] = 1
		}
	}

	if err := s.db.Model(&user).Updates(updates).Error; err != nil {
		return err
	}

	// Sync streak to EngSimUserProgress as well. The branches above only set
	// streak_days when it actually changes; on a same-day repeat, or a gap
	// covered by a freeze, the map entry is missing — we must fall back to
	// the user's current value or we'd write NULL into a NOT NULL column.
	syncedStreak, ok := updates["streak_days"].(int)
	if !ok {
		syncedStreak = user.StreakDays
	}
	s.db.Model(&models.EngSimUserProgress{}).
		Where("user_id = ?", userID).
		Updates(map[string]any{"current_streak": syncedStreak, "last_practice_date": today.Format("2006-01-02")})

	// Best-effort achievement unlock pass. Errors are swallowed because the
	// daily activity write is the load-bearing operation; achievements are a
	// follow-on UX nicety and must never fail the activity record.
	s.evaluateAchievementsAfterActivity(userID, lessonsCompleted)

	return nil
}

// evaluateAchievementsAfterActivity rebuilds an AchievementEvent from the
// user's current totals and unlocks any newly earned badges, writing a
// notification per unlock so the bell dropdown reflects the win.
func (s *GamificationService) evaluateAchievementsAfterActivity(userID string, lessonsJustCompleted int) {
	var u models.User
	if err := s.db.First(&u, "id = ?", userID).Error; err != nil {
		return
	}

	var lessonsTotal int64
	s.db.Model(&models.LessonAttempt{}).Where("user_id = ?", userID).Count(&lessonsTotal)

	var starsTotal int64
	s.db.Model(&models.LessonAttempt{}).Where("user_id = ?", userID).
		Select("COALESCE(SUM(stars), 0)").Scan(&starsTotal)

	var totalXP int
	s.db.Model(&models.EngSimUserProgress{}).Where("user_id = ?", userID).
		Select("COALESCE(total_xp, 0)").Scan(&totalXP)

	var friendsCount int64
	s.db.Model(&models.Friendship{}).
		Where("user_id = ? AND status = 'accepted'", userID).
		Count(&friendsCount)

	now := time.Now()
	wd := now.Weekday()
	ev := AchievementEvent{
		StreakDays:   u.StreakDays,
		LessonsTotal: int(lessonsTotal),
		TotalStars:   int(starsTotal),
		TotalXP:      totalXP,
		FriendsCount: int(friendsCount),
		Hour:         now.Hour(),
		IsWeekend:    wd == time.Saturday || wd == time.Sunday,
	}
	_ = lessonsJustCompleted // reserved for future "perfect lesson" wiring

	unlocked, err := s.CheckAchievements(userID, ev)
	if err != nil || len(unlocked) == 0 {
		return
	}
	for _, ach := range unlocked {
		title := "🏆 Achievement unlocked: " + ach.Title
		body := ach.Description
		link := "/achievements"
		notifier.Create(s.db, userID, "achievement_unlocked", title, body, &link)
	}
}

// DayStatus represents one calendar cell in the streak calendar.
type DayStatus struct {
	Date   string `json:"date"`
	Status string `json:"status"` // "active" | "freeze" | "miss" | "future"
	XP     int    `json:"xp"`
}

// GetStreakCalendar returns the last `days` calendar entries for a user.
func (s *GamificationService) GetStreakCalendar(userID string, days int) ([]DayStatus, error) {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	start := today.AddDate(0, 0, -(days - 1))

	var activities []models.DailyActivity
	s.db.Where("user_id = ? AND activity_date >= ?", userID, start).Find(&activities)

	actMap := make(map[string]models.DailyActivity)
	for _, a := range activities {
		actMap[a.ActivityDate.Format("2006-01-02")] = a
	}

	result := make([]DayStatus, 0, days)
	for i := 0; i < days; i++ {
		d := start.AddDate(0, 0, i)
		key := d.Format("2006-01-02")
		if d.After(today) {
			result = append(result, DayStatus{Date: key, Status: "future"})
			continue
		}
		if act, ok := actMap[key]; ok {
			result = append(result, DayStatus{Date: key, Status: "active", XP: act.XPEarned})
		} else {
			result = append(result, DayStatus{Date: key, Status: "miss"})
		}
	}
	return result, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// LEAGUES
// ─────────────────────────────────────────────────────────────────────────────

func currentWeekMonday() time.Time {
	now := time.Now().UTC()
	weekday := int(now.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	return now.Truncate(24*time.Hour).AddDate(0, 0, -(weekday - 1))
}

// AssignLeague places a user into an open league group for the current week.
// Idempotent — does nothing if the user already has a membership this week.
func (s *GamificationService) AssignLeague(userID string) error {
	weekStart := currentWeekMonday()

	// Check if user already in a league this week
	var existing models.LeagueMembership
	err := s.db.Joins("JOIN league_groups ON league_groups.id = league_memberships.league_group_id").
		Where("league_memberships.user_id = ? AND league_groups.week_starts_on = ?", userID, weekStart).
		First(&existing).Error
	if err == nil {
		return nil // already assigned
	}

	// Find or create an open bronze group for this week
	tier := "bronze"

	var group models.LeagueGroup
	err = s.db.Raw(`
		SELECT lg.* FROM league_groups lg
		WHERE lg.tier = ? AND lg.week_starts_on = ?
		AND (SELECT COUNT(*) FROM league_memberships lm WHERE lm.league_group_id = lg.id) < ?
		ORDER BY lg.created_at ASC
		LIMIT 1
	`, tier, weekStart, leagueGroupMaxSize).Scan(&group).Error

	if err != nil || group.ID == "" {
		group = models.LeagueGroup{Tier: tier, WeekStartsOn: weekStart}
		if err := s.db.Create(&group).Error; err != nil {
			return fmt.Errorf("create league group: %w", err)
		}
	}

	membership := models.LeagueMembership{UserID: userID, LeagueGroupID: group.ID}
	return s.db.Clauses(clause.OnConflict{DoNothing: true}).Create(&membership).Error
}

// GetCurrentLeague returns the user's current week league group and all members.
func (s *GamificationService) GetCurrentLeague(userID string) (*models.LeagueGroup, []LeagueMember, error) {
	weekStart := currentWeekMonday()

	var membership models.LeagueMembership
	err := s.db.Joins("JOIN league_groups ON league_groups.id = league_memberships.league_group_id").
		Where("league_memberships.user_id = ? AND league_groups.week_starts_on = ?", userID, weekStart).
		First(&membership).Error
	if err != nil {
		return nil, nil, nil // not in a league yet
	}

	var group models.LeagueGroup
	if err := s.db.First(&group, "id = ?", membership.LeagueGroupID).Error; err != nil {
		return nil, nil, err
	}

	members, err := s.GetLeagueMembers(group.ID)
	return &group, members, err
}

// LeagueMember is a view model for leaderboard rows.
type LeagueMember struct {
	UserID   string `json:"userId"`
	Username string `json:"username"`
	Avatar   string `json:"avatarUrl"`
	WeeklyXP int    `json:"weeklyXp"`
	Rank     int    `json:"rank"`
}

func (s *GamificationService) GetLeagueMembers(groupID string) ([]LeagueMember, error) {
	rows, err := s.db.Raw(`
		SELECT
			lm.user_id, u.username, COALESCE(u.avatar_url, '') as avatar, lm.weekly_xp,
			RANK() OVER (ORDER BY lm.weekly_xp DESC) as rank
		FROM league_memberships lm
		JOIN users u ON u.id = lm.user_id
		WHERE lm.league_group_id = ?
		ORDER BY lm.weekly_xp DESC
	`, groupID).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []LeagueMember
	for rows.Next() {
		var m LeagueMember
		if err := rows.Scan(&m.UserID, &m.Username, &m.Avatar, &m.WeeklyXP, &m.Rank); err != nil {
			continue
		}
		members = append(members, m)
	}
	return members, nil
}

// AddWeeklyXP increments a user's weekly_xp in their current league group.
func (s *GamificationService) AddWeeklyXP(userID string, xp int) {
	weekStart := currentWeekMonday()
	s.db.Exec(`
		UPDATE league_memberships lm
		SET weekly_xp = lm.weekly_xp + ?
		FROM league_groups lg
		WHERE lg.id = lm.league_group_id
		  AND lm.user_id = ?
		  AND lg.week_starts_on = ?
	`, xp, userID, weekStart)
}

// ProcessLeagueWeek runs at Sunday 23:59 UTC: promotes/demotes and creates new groups.
func (s *GamificationService) ProcessLeagueWeek() error {
	weekStart := currentWeekMonday().AddDate(0, 0, -7) // last Monday

	var groups []models.LeagueGroup
	if err := s.db.Where("week_starts_on = ?", weekStart).Find(&groups).Error; err != nil {
		return err
	}

	nextWeek := currentWeekMonday().AddDate(0, 0, 7)

	for _, group := range groups {
		members, err := s.GetLeagueMembers(group.ID)
		if err != nil {
			log.Printf("league process: get members for %s: %v", group.ID, err)
			continue
		}
		if len(members) == 0 {
			continue
		}

		promote := 7
		demote := 5
		if len(members) < 15 {
			promote = len(members) / 4
			demote = len(members) / 6
		}

		tierIdx := tierIndex(group.Tier)

		for i, m := range members {
			rank := i + 1
			newTier := group.Tier
			if rank <= promote && tierIdx < len(models.LeagueTierOrder)-1 {
				newTier = models.LeagueTierOrder[tierIdx+1]
			} else if rank > len(members)-demote && tierIdx > 0 {
				newTier = models.LeagueTierOrder[tierIdx-1]
			}

			// Assign to new group next week
			if err := s.assignToLeagueGroup(m.UserID, newTier, nextWeek); err != nil {
				log.Printf("league process: assign %s to %s: %v", m.UserID, newTier, err)
			}

			// Email for top 3 finishes
			if rank <= 3 {
				s.sendLeaguePromotionEmail(m.UserID, rank, group.Tier, newTier)
			}
		}
	}
	return nil
}

func (s *GamificationService) assignToLeagueGroup(userID, tier string, weekStart time.Time) error {
	var group models.LeagueGroup
	err := s.db.Raw(`
		SELECT lg.* FROM league_groups lg
		WHERE lg.tier = ? AND lg.week_starts_on = ?
		AND (SELECT COUNT(*) FROM league_memberships lm WHERE lm.league_group_id = lg.id) < ?
		ORDER BY lg.created_at ASC LIMIT 1
	`, tier, weekStart, leagueGroupMaxSize).Scan(&group).Error
	if err != nil || group.ID == "" {
		group = models.LeagueGroup{Tier: tier, WeekStartsOn: weekStart}
		if err := s.db.Create(&group).Error; err != nil {
			return err
		}
	}
	membership := models.LeagueMembership{UserID: userID, LeagueGroupID: group.ID}
	return s.db.Clauses(clause.OnConflict{DoNothing: true}).Create(&membership).Error
}

func tierIndex(tier string) int {
	for i, t := range models.LeagueTierOrder {
		if t == tier {
			return i
		}
	}
	return 0
}

// ─────────────────────────────────────────────────────────────────────────────
// FRIENDS
// ─────────────────────────────────────────────────────────────────────────────

// GetOrCreateInviteCode returns (or creates) the user's invite code.
func (s *GamificationService) GetOrCreateInviteCode(userID string) (string, error) {
	var code models.UserInviteCode
	if err := s.db.First(&code, "user_id = ?", userID).Error; err == nil {
		return code.Code, nil
	}
	raw, err := generateInviteCode()
	if err != nil {
		return "", err
	}
	code = models.UserInviteCode{UserID: userID, Code: raw}
	if err := s.db.Create(&code).Error; err != nil {
		return "", err
	}
	return raw, nil
}

func generateInviteCode() (string, error) {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, 8)
	for i := range b {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
		if err != nil {
			return "", err
		}
		b[i] = chars[n.Int64()]
	}
	return string(b[:4]) + "-" + string(b[4:]), nil
}

// SendFriendRequest creates a pending friendship from userID → targetID.
func (s *GamificationService) SendFriendRequest(userID, targetID string) error {
	if userID == targetID {
		return fmt.Errorf("cannot add yourself")
	}
	f := models.Friendship{UserID: userID, FriendID: targetID, Status: "pending"}
	return s.db.Clauses(clause.OnConflict{DoNothing: true}).Create(&f).Error
}

// AcceptFriendRequest accepts and creates the reverse row.
func (s *GamificationService) AcceptFriendRequest(userID, requesterID string) error {
	// Mark the requester→user row as accepted
	if err := s.db.Model(&models.Friendship{}).
		Where("user_id = ? AND friend_id = ? AND status = 'pending'", requesterID, userID).
		Update("status", "accepted").Error; err != nil {
		return err
	}
	// Create reverse row
	reverse := models.Friendship{UserID: userID, FriendID: requesterID, Status: "accepted"}
	return s.db.Clauses(clause.OnConflict{DoNothing: true}).Create(&reverse).Error
}

// FriendWithStats is returned in the friends list.
type FriendWithStats struct {
	UserID   string `json:"userId"`
	Username string `json:"username"`
	Avatar   string `json:"avatarUrl"`
	Streak   int    `json:"streakDays"`
	WeeklyXP int    `json:"weeklyXp"`
	Status   string `json:"status"`
}

// GetFriends returns all accepted friends with their weekly XP.
func (s *GamificationService) GetFriends(userID string) ([]FriendWithStats, error) {
	weekStart := currentWeekMonday()
	rows, err := s.db.Raw(`
		SELECT
			f.friend_id AS user_id,
			u.username,
			COALESCE(u.avatar_url, '') AS avatar,
			u.streak_days,
			COALESCE(lm.weekly_xp, 0) AS weekly_xp,
			f.status
		FROM friendships f
		JOIN users u ON u.id = f.friend_id
		LEFT JOIN league_memberships lm ON lm.user_id = f.friend_id
			AND lm.league_group_id IN (
				SELECT id FROM league_groups WHERE week_starts_on = ?
			)
		WHERE f.user_id = ?
		ORDER BY weekly_xp DESC
	`, weekStart, userID).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var friends []FriendWithStats
	for rows.Next() {
		var f FriendWithStats
		if err := rows.Scan(&f.UserID, &f.Username, &f.Avatar, &f.Streak, &f.WeeklyXP, &f.Status); err != nil {
			continue
		}
		friends = append(friends, f)
	}
	return friends, nil
}

// SearchUsers finds users by username or invite code (for friend search).
func (s *GamificationService) SearchUsers(query string) ([]models.User, error) {
	var users []models.User
	q := "%" + strings.ToLower(query) + "%"

	// Also check invite codes
	var byCode models.UserInviteCode
	_ = s.db.Where("UPPER(code) = ?", strings.ToUpper(query)).First(&byCode)

	s.db.Where("(LOWER(username) LIKE ? OR id = ?) AND email_verified = true", q, byCode.UserID).
		Limit(10).Find(&users)
	return users, nil
}

// GetPendingRequests returns incoming pending friend requests.
func (s *GamificationService) GetPendingRequests(userID string) ([]FriendWithStats, error) {
	rows, err := s.db.Raw(`
		SELECT f.user_id, u.username, COALESCE(u.avatar_url,'') AS avatar,
		       u.streak_days, 0, f.status
		FROM friendships f
		JOIN users u ON u.id = f.user_id
		WHERE f.friend_id = ? AND f.status = 'pending'
	`, userID).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []FriendWithStats
	for rows.Next() {
		var f FriendWithStats
		rows.Scan(&f.UserID, &f.Username, &f.Avatar, &f.Streak, &f.WeeklyXP, &f.Status)
		result = append(result, f)
	}
	return result, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// ACHIEVEMENTS
// ─────────────────────────────────────────────────────────────────────────────

// AchievementEvent carries context needed to decide which badges to unlock.
type AchievementEvent struct {
	Type          string // "lesson_complete" | "streak_update" | "league_finish" | "friend_added" | "placement_done"
	StreakDays    int
	LessonsTotal  int
	TotalStars    int
	TotalXP       int
	LeagueRank    int
	LeagueTier    string
	FriendsCount  int
	IsNoMistake   bool
	PlacementLevel string
	Hour          int // local hour for early_bird / night_owl
	IsWeekend     bool
}

// CheckAchievements unlocks any newly earned achievements and returns them.
func (s *GamificationService) CheckAchievements(userID string, ev AchievementEvent) ([]models.Achievement, error) {
	// Load already-unlocked
	var existing []models.UserAchievement
	s.db.Where("user_id = ?", userID).Find(&existing)
	has := make(map[string]bool, len(existing))
	for _, ua := range existing {
		has[ua.AchievementID] = true
	}

	candidates := s.candidateIDs(ev)

	var unlocked []models.Achievement
	for _, id := range candidates {
		if has[id] {
			continue
		}
		var ach models.Achievement
		if err := s.db.First(&ach, "id = ?", id).Error; err != nil {
			continue
		}
		ua := models.UserAchievement{UserID: userID, AchievementID: id}
		if err := s.db.Create(&ua).Error; err != nil {
			continue
		}
		unlocked = append(unlocked, ach)
		// Award bonus XP
		if ach.XPBonus > 0 {
			s.db.Model(&models.EngSimUserProgress{}).
				Where("user_id = ?", userID).
				UpdateColumn("total_xp", gorm.Expr("total_xp + ?", ach.XPBonus))
		}
	}
	return unlocked, nil
}

func (s *GamificationService) candidateIDs(ev AchievementEvent) []string {
	var ids []string
	add := func(id string) { ids = append(ids, id) }

	// Streak
	if ev.StreakDays >= 1 {
		add("streak_1")
	}
	if ev.StreakDays >= 3 {
		add("streak_3")
	}
	if ev.StreakDays >= 7 {
		add("streak_7")
	}
	if ev.StreakDays >= 14 {
		add("streak_14")
	}
	if ev.StreakDays >= 30 {
		add("streak_30")
	}
	if ev.StreakDays >= 60 {
		add("streak_60")
	}
	if ev.StreakDays >= 100 {
		add("streak_100")
	}
	if ev.StreakDays >= 365 {
		add("streak_365")
	}

	// Lessons
	if ev.LessonsTotal >= 1 {
		add("first_lesson")
	}
	if ev.LessonsTotal >= 10 {
		add("lessons_10")
	}
	if ev.LessonsTotal >= 50 {
		add("lessons_50")
	}
	if ev.LessonsTotal >= 100 {
		add("lessons_100")
	}
	if ev.LessonsTotal >= 500 {
		add("lessons_500")
	}
	if ev.IsNoMistake {
		add("perfect_lesson_1")
	}

	// Stars
	if ev.TotalStars >= 10 {
		add("stars_10")
	}
	if ev.TotalStars >= 100 {
		add("stars_100")
	}

	// XP
	if ev.TotalXP >= 500 {
		add("xp_500")
	}
	if ev.TotalXP >= 5000 {
		add("xp_5000")
	}
	if ev.TotalXP >= 25000 {
		add("xp_25000")
	}

	// Placement
	if ev.PlacementLevel != "" {
		add("placement_" + strings.ToLower(ev.PlacementLevel))
	}

	// League
	if ev.LeagueRank > 0 {
		add("league_join")
	}
	if ev.LeagueRank > 0 && ev.LeagueRank <= 10 {
		add("top_10_league")
	}
	if ev.LeagueRank > 0 && ev.LeagueRank <= 3 {
		add("top_3_league")
	}
	if ev.LeagueRank == 1 {
		add("top_1_league")
	}
	switch ev.LeagueTier {
	case "silver":
		add("promote_silver")
	case "gold":
		add("promote_gold")
	case "diamond":
		add("promote_diamond")
	}

	// Friends
	if ev.FriendsCount >= 1 {
		add("friend_1")
	}
	if ev.FriendsCount >= 3 {
		add("friend_3")
	}
	if ev.FriendsCount >= 10 {
		add("friend_10")
	}

	// Time-of-day
	if ev.Hour < 6 {
		add("early_bird")
	}
	if ev.Hour >= 23 {
		add("night_owl")
	}
	if ev.IsWeekend {
		add("weekend_warrior")
	}

	return ids
}

// ─────────────────────────────────────────────────────────────────────────────
// XP EVENTS + DAILY QUESTS
// ─────────────────────────────────────────────────────────────────────────────

// GetActiveXPEvent returns the currently active XP multiplier event, or nil.
func (s *GamificationService) GetActiveXPEvent() (*models.XPEvent, error) {
	var ev models.XPEvent
	now := time.Now().UTC()
	err := s.db.Where("starts_at <= ? AND ends_at >= ?", now, now).
		Order("multiplier DESC").First(&ev).Error
	if err != nil {
		return nil, nil
	}
	return &ev, nil
}

// CreateWeekendXPEvent creates a 2× XP event for the upcoming weekend.
func (s *GamificationService) CreateWeekendXPEvent() error {
	now := time.Now().UTC()
	// Find next Saturday 00:00 UTC
	weekday := int(now.Weekday()) // 0=Sun, 6=Sat
	daysUntilSat := (6 - weekday + 7) % 7
	if daysUntilSat == 0 {
		daysUntilSat = 7
	}
	satStart := now.Truncate(24 * time.Hour).AddDate(0, 0, daysUntilSat)
	sunEnd := satStart.AddDate(0, 0, 2) // Monday 00:00

	ev := models.XPEvent{
		Multiplier:  2.0,
		StartsAt:    satStart,
		EndsAt:      sunEnd,
		Title:       "🔥 Double XP Weekend!",
		BannerColor: "#f97316",
	}
	return s.db.Clauses(clause.OnConflict{DoNothing: true}).Create(&ev).Error
}

// GenerateDailyQuests creates 3 varied quests for a user (idempotent for today).
func (s *GamificationService) GenerateDailyQuests(userID string) error {
	today := time.Now().UTC().Truncate(24 * time.Hour)

	type questDef struct {
		QuestType string
		Target    int
		XPReward  int
	}

	pool := []questDef{
		{"earn_xp_50", 50, 30},
		{"earn_xp_100", 100, 60},
		{"complete_3_lessons", 3, 50},
		{"complete_5_lessons", 5, 80},
		{"perfect_lesson_1", 1, 75},
		{"listen_3_clips", 3, 40},
		{"translate_10", 10, 45},
		{"word_builder_5", 5, 35},
	}

	// Pick 3 deterministically (based on day-of-year mod pool size for variety)
	day := today.YearDay()
	chosen := []questDef{
		pool[day%len(pool)],
		pool[(day+2)%len(pool)],
		pool[(day+5)%len(pool)],
	}

	for _, q := range chosen {
		quest := models.DailyQuest{
			UserID:    userID,
			QuestDate: today,
			QuestType: q.QuestType,
			Target:    q.Target,
			XPReward:  q.XPReward,
		}
		s.db.Clauses(clause.OnConflict{DoNothing: true}).Create(&quest)
	}
	return nil
}

// GetDailyQuests returns today's quests for a user.
func (s *GamificationService) GetDailyQuests(userID string) ([]models.DailyQuest, error) {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	var quests []models.DailyQuest
	err := s.db.Where("user_id = ? AND quest_date = ?", userID, today).Find(&quests).Error
	return quests, err
}

// UpdateQuestProgress increments a matching quest type and marks completed.
func (s *GamificationService) UpdateQuestProgress(userID, questType string, delta int) {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	s.db.Model(&models.DailyQuest{}).
		Where("user_id = ? AND quest_date = ? AND quest_type = ? AND completed = false", userID, today, questType).
		UpdateColumn("progress", gorm.Expr("LEAST(progress + ?, target)", delta))

	// Mark completed where progress >= target
	s.db.Model(&models.DailyQuest{}).
		Where("user_id = ? AND quest_date = ? AND completed = false AND progress >= target", userID, today).
		Update("completed", true)
}

// ─────────────────────────────────────────────────────────────────────────────
// LESSON STARS
// ─────────────────────────────────────────────────────────────────────────────

// RecordLessonAttempt saves the attempt and updates the user's best stars.
func (s *GamificationService) RecordLessonAttempt(userID, lessonID string, stars, heartsLost, timeSecs int) error {
	attempt := models.LessonAttempt{
		UserID:     userID,
		LessonID:   lessonID,
		Stars:      stars,
		HeartsLost: heartsLost,
		TimeSecs:   timeSecs,
	}
	if err := s.db.Create(&attempt).Error; err != nil {
		return err
	}

	// Update best stars in EngSimLessonProgress
	s.db.Model(&models.EngSimLessonProgress{}).
		Where("user_id = ? AND lesson_id = ? AND best_stars < ?", userID, lessonID, stars).
		UpdateColumn("best_stars", stars)

	// Increment total_stars on user if this is a new best
	s.db.Exec(`
		UPDATE users SET total_stars = total_stars + ?
		WHERE id = ?
	`, stars, userID)

	// Perfect-lesson achievement: heartsLost == 0 means no mistakes. We pass
	// it as a one-shot signal so CheckAchievements can award perfect_lesson_1
	// even when the user's other totals haven't crossed a new threshold.
	if heartsLost == 0 {
		s.evaluatePerfectLesson(userID)
	}

	return nil
}

// evaluatePerfectLesson awards the no-mistake badge and emits a notification.
// Separate from RecordDailyActivity's pass because the perfect-lesson signal
// is per-attempt, not per-day.
func (s *GamificationService) evaluatePerfectLesson(userID string) {
	unlocked, err := s.CheckAchievements(userID, AchievementEvent{IsNoMistake: true})
	if err != nil || len(unlocked) == 0 {
		return
	}
	for _, ach := range unlocked {
		title := "🏆 Achievement unlocked: " + ach.Title
		body := ach.Description
		link := "/achievements"
		notifier.Create(s.db, userID, "achievement_unlocked", title, body, &link)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL PROOF
// ─────────────────────────────────────────────────────────────────────────────

// GetLevelStudentCount returns how many users are actively learning at a CEFR level today.
func (s *GamificationService) GetLevelStudentCount(level string) (int64, error) {
	var count int64
	today := time.Now().UTC().Truncate(24 * time.Hour)
	s.db.Model(&models.DailyActivity{}).
		Joins("JOIN eng_sim_user_progress ep ON ep.user_id = daily_activity.user_id").
		Where("ep.current_level = ? AND daily_activity.activity_date >= ?", level, today.AddDate(0, 0, -1)).
		Count(&count)
	return count, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL
// ─────────────────────────────────────────────────────────────────────────────

func (s *GamificationService) sendLeaguePromotionEmail(userID string, rank int, oldTier, newTier string) {
	if s.email == nil {
		return
	}
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return
	}
	promoted := newTier != oldTier
	_ = s.email.SendLeagueResultEmail(user.Email, user.FullName, rank, oldTier, newTier, promoted)
}

// SendStreakWarningBatch sends streak-warning emails to all users who were
// active yesterday but not today, and have streak_days > 0.
func (s *GamificationService) SendStreakWarningBatch() {
	if s.email == nil {
		return
	}
	today := time.Now().UTC().Truncate(24 * time.Hour)
	yesterday := today.AddDate(0, 0, -1)

	rows, err := s.db.Raw(`
		SELECT u.id, u.email, u.full_name, u.streak_days
		FROM users u
		WHERE u.streak_days > 0
		  AND u.last_active_date = ?
		  AND NOT EXISTS (
			SELECT 1 FROM daily_activity da
			WHERE da.user_id = u.id AND da.activity_date = ?
		  )
	`, yesterday.Format("2006-01-02"), today.Format("2006-01-02")).Rows()
	if err != nil {
		log.Printf("streak warning batch: %v", err)
		return
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var id, email2, fullName string
		var streak int
		if err := rows.Scan(&id, &email2, &fullName, &streak); err != nil {
			continue
		}
		_ = s.email.SendStreakWarningEmail(email2, fullName, streak)
		count++
	}
	log.Printf("streak warning emails sent: %d", count)
}

// SendComebackBatch sends comeback emails to users inactive for 1, 3, or 7 days.
func (s *GamificationService) SendComebackBatch() {
	if s.email == nil {
		return
	}
	now := time.Now().UTC()

	for _, gap := range []int{1, 3, 7} {
		targetDate := now.AddDate(0, 0, -gap).Format("2006-01-02")
		rows, err := s.db.Raw(`
			SELECT u.email, u.full_name, u.streak_days
			FROM users u
			WHERE u.last_active_date = ?
			  AND NOT EXISTS (
				SELECT 1 FROM daily_activity da
				WHERE da.user_id = u.id AND da.activity_date > ?
			  )
		`, targetDate, targetDate).Rows()
		if err != nil {
			continue
		}
		for rows.Next() {
			var email2, fullName string
			var streak int
			rows.Scan(&email2, &fullName, &streak)
			_ = s.email.SendComebackEmail(email2, fullName, streak, gap)
		}
		rows.Close()
	}
}
