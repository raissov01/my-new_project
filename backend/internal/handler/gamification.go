package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/email"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"github.com/midoriya/flashlearn-backend/internal/notifier"
	"github.com/midoriya/flashlearn-backend/internal/service"
	"gorm.io/gorm"
)

// GamificationHandler serves all retention-loop endpoints.
type GamificationHandler struct {
	db  *gorm.DB
	svc *service.GamificationService
}

func NewGamification(db *gorm.DB, emailSender *email.Sender) *GamificationHandler {
	return &GamificationHandler{db: db, svc: service.NewGamification(db, emailSender)}
}

// displayName returns the user's full name, falling back to username, then ID.
func (h *GamificationHandler) displayName(userID string) string {
	var u models.User
	if err := h.db.Select("full_name", "username").
		Where("id = ?", userID).
		First(&u).Error; err != nil {
		return "Someone"
	}
	if u.FullName != "" {
		return u.FullName
	}
	if u.Username != "" {
		return u.Username
	}
	return "Someone"
}

// ── Streak ────────────────────────────────────────────────────────────────────

// POST /gamification/activity
func (h *GamificationHandler) RecordActivity(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	var body struct {
		XPEarned         int `json:"xpEarned"`
		LessonsCompleted int `json:"lessonsCompleted"`
	}
	if err := decodeJSON(r, &body); err != nil {
		jsonErr(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := h.svc.RecordDailyActivity(userID, body.XPEarned, body.LessonsCompleted); err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, map[string]any{"ok": true})
}

// GET /gamification/streak/calendar?days=30
func (h *GamificationHandler) GetStreakCalendar(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	days := 30
	if d := r.URL.Query().Get("days"); d != "" {
		if n, err := strconv.Atoi(d); err == nil && n > 0 && n <= 365 {
			days = n
		}
	}
	cal, err := h.svc.GetStreakCalendar(userID, days)
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, map[string]any{"calendar": cal})
}

// ── Leagues ───────────────────────────────────────────────────────────────────

// GET /gamification/league
func (h *GamificationHandler) GetLeague(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	_ = h.svc.AssignLeague(userID)

	group, members, err := h.svc.GetCurrentLeague(userID)
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}

	daysLeft := int(handlerWeekMonday().AddDate(0, 0, 7).Sub(time.Now().UTC()).Hours()/24) + 1
	jsonOK(w, map[string]any{
		"group":    group,
		"members":  members,
		"daysLeft": daysLeft,
	})
}

func handlerWeekMonday() time.Time {
	now := time.Now().UTC()
	weekday := int(now.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	return now.Truncate(24*time.Hour).AddDate(0, 0, -(weekday - 1))
}

// ── Friends ───────────────────────────────────────────────────────────────────

// GET /gamification/friends
func (h *GamificationHandler) GetFriends(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	code, _ := h.svc.GetOrCreateInviteCode(userID)
	friends, err := h.svc.GetFriends(userID)
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	pending, _ := h.svc.GetPendingRequests(userID)
	jsonOK(w, map[string]any{
		"inviteCode":      code,
		"friends":         friends,
		"pendingRequests": pending,
	})
}

// POST /gamification/friends/request  body: {targetId}
func (h *GamificationHandler) SendFriendRequest(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	var body struct {
		TargetID string `json:"targetId"`
	}
	if err := decodeJSON(r, &body); err != nil || body.TargetID == "" {
		jsonErr(w, "targetId required", http.StatusBadRequest)
		return
	}
	if err := h.svc.SendFriendRequest(userID, body.TargetID); err != nil {
		jsonErr(w, err.Error(), http.StatusBadRequest)
		return
	}
	senderName := h.displayName(userID)
	link := "/friends"
	notifier.Create(
		h.db,
		body.TargetID,
		"friend_request",
		"New friend request",
		senderName+" wants to be friends",
		&link,
	)
	jsonOK(w, map[string]any{"ok": true})
}

// POST /gamification/friends/accept  body: {requesterId}
func (h *GamificationHandler) AcceptFriendRequest(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	var body struct {
		RequesterID string `json:"requesterId"`
	}
	if err := decodeJSON(r, &body); err != nil || body.RequesterID == "" {
		jsonErr(w, "requesterId required", http.StatusBadRequest)
		return
	}
	if err := h.svc.AcceptFriendRequest(userID, body.RequesterID); err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	accepterName := h.displayName(userID)
	link := "/friends"
	notifier.Create(
		h.db,
		body.RequesterID,
		"friend_accepted",
		"Friend request accepted",
		accepterName+" accepted your friend request",
		&link,
	)
	jsonOK(w, map[string]any{"ok": true})
}

// GET /gamification/friends/search?q=username
func (h *GamificationHandler) SearchUsers(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if len(q) < 2 {
		jsonErr(w, "q must be at least 2 characters", http.StatusBadRequest)
		return
	}
	users, err := h.svc.SearchUsers(q)
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, map[string]any{"users": users})
}

// ── Achievements ──────────────────────────────────────────────────────────────

// GET /gamification/achievements
func (h *GamificationHandler) GetAchievements(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	var all []map[string]any
	h.svc.DB().Raw(`
		SELECT a.id, a.title, a.description, a.icon, a.tier, a.xp_bonus, a.category, a.sort_order,
		       (ua.user_id IS NOT NULL) AS unlocked,
		       ua.unlocked_at
		FROM achievements a
		LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ?
		ORDER BY a.sort_order
	`, userID).Scan(&all)
	jsonOK(w, map[string]any{"achievements": all})
}

// ── Daily Quests ──────────────────────────────────────────────────────────────

// GET /gamification/quests
func (h *GamificationHandler) GetDailyQuests(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	_ = h.svc.GenerateDailyQuests(userID)
	quests, err := h.svc.GetDailyQuests(userID)
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, map[string]any{"quests": quests})
}

// ── XP Events ─────────────────────────────────────────────────────────────────

// GET /gamification/xp-event
func (h *GamificationHandler) GetXPEvent(w http.ResponseWriter, r *http.Request) {
	ev, err := h.svc.GetActiveXPEvent()
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, map[string]any{"event": ev})
}

// ── Social Proof ──────────────────────────────────────────────────────────────

// GET /gamification/social-proof?level=A2
func (h *GamificationHandler) GetSocialProof(w http.ResponseWriter, r *http.Request) {
	level := r.URL.Query().Get("level")
	count, _ := h.svc.GetLevelStudentCount(level)
	jsonOK(w, map[string]any{"studentsToday": count})
}

// ── Cron endpoints ────────────────────────────────────────────────────────────

// POST /gamification/cron/streak-warning
func (h *GamificationHandler) CronStreakWarning(w http.ResponseWriter, r *http.Request) {
	go h.svc.SendStreakWarningBatch()
	jsonOK(w, map[string]any{"ok": true})
}

// POST /gamification/cron/comeback
func (h *GamificationHandler) CronComeback(w http.ResponseWriter, r *http.Request) {
	go h.svc.SendComebackBatch()
	jsonOK(w, map[string]any{"ok": true})
}

// POST /gamification/cron/league-week
func (h *GamificationHandler) CronLeagueWeek(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.ProcessLeagueWeek(); err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, map[string]any{"ok": true})
}

// POST /gamification/cron/weekend-xp
func (h *GamificationHandler) CronWeekendXP(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.CreateWeekendXPEvent(); err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, map[string]any{"ok": true})
}
