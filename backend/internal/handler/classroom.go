package handler

import (
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/model"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"github.com/midoriya/flashlearn-backend/internal/notifier"
	"github.com/midoriya/flashlearn-backend/internal/service"
	"gorm.io/gorm"
)

// Classroom handles read-only classroom/challenge routes used by Next.js during migration.
type Classroom struct {
	svc *service.Classroom
	db  *gorm.DB
	env string
}

func NewClassroom(svc *service.Classroom, db *gorm.DB, env string) *Classroom {
	return &Classroom{svc: svc, db: db, env: env}
}

// quizTitle returns the quiz title for use in notification text. Best-effort:
// if the lookup fails, callers fall back to a generic phrase.
func (h *Classroom) quizTitle(quizID string) string {
	var q models.Quiz
	if err := h.db.Select("title").Where("id = ?", quizID).First(&q).Error; err != nil {
		return ""
	}
	return q.Title
}

// groupOwnerID returns the teacher (owner) of a class group, or empty on lookup failure.
func (h *Classroom) groupOwnerID(groupID string) string {
	var g models.ClassGroup
	if err := h.db.Select("owner_id").Where("id = ?", groupID).First(&g).Error; err != nil {
		return ""
	}
	return g.OwnerID
}

// userDisplayName resolves a user ID to a name suitable for notification text.
func (h *Classroom) userDisplayName(userID string) string {
	var u models.User
	if err := h.db.Select("full_name", "username").
		Where("id = ?", userID).
		First(&u).Error; err != nil {
		return "A new student"
	}
	if u.FullName != "" {
		return u.FullName
	}
	if u.Username != "" {
		return u.Username
	}
	return "A new student"
}

func (h *Classroom) isDev() bool {
	return h.env == "development"
}

func (h *Classroom) GetOwnedGroups(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	resp, err := h.svc.GetOwnedGroups(r.Context(), userID)
	if err != nil {
		log.Printf("owned groups error: %v", err)
		msg := "failed to load owned groups"
		if h.isDev() {
			msg = err.Error()
		}
		writeError(w, http.StatusInternalServerError, msg, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"items": resp})
}

func (h *Classroom) GetAvailableSets(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	resp, err := h.svc.GetAvailableSets(r.Context(), userID)
	if err != nil {
		log.Printf("available sets error: %v", err)
		msg := "failed to load available sets"
		if h.isDev() {
			msg = err.Error()
		}
		writeError(w, http.StatusInternalServerError, msg, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"items": resp})
}

func (h *Classroom) GetMyChallenges(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	resp, err := h.svc.GetMyChallenges(r.Context(), userID)
	if err != nil {
		log.Printf("my challenges error: %v", err)
		msg := "failed to load class challenges"
		if h.isDev() {
			msg = err.Error()
		}
		writeError(w, http.StatusInternalServerError, msg, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"items": resp})
}

func (h *Classroom) GetTeacherClassroomDetail(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	groupID := strings.TrimSpace(r.PathValue("groupID"))
	if groupID == "" {
		writeError(w, http.StatusBadRequest, "group id is required", nil)
		return
	}

	resp, err := h.svc.GetTeacherClassroomDetail(r.Context(), userID, groupID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "classroom not found", err)
			return
		}

		log.Printf("teacher classroom detail error: %v", err)
		msg := "failed to load classroom detail"
		if h.isDev() {
			msg = err.Error()
		}
		writeError(w, http.StatusInternalServerError, msg, err)
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *Classroom) CreateGroup(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var req model.CreateGroupRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Members = strings.TrimSpace(req.Members)

	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "class name is required", nil)
		return
	}

	resp, err := h.svc.CreateGroup(r.Context(), userID, req)
	if err != nil {
		log.Printf("create group error: %v", err)
		msg := "failed to create class"
		status := http.StatusInternalServerError

		normalized := strings.ToLower(err.Error())
		switch {
		case strings.Contains(normalized, "unknown usernames:"):
			msg = err.Error()
			status = http.StatusBadRequest
		case strings.Contains(normalized, "class name is required"):
			msg = err.Error()
			status = http.StatusBadRequest
		case h.isDev():
			msg = err.Error()
		}

		writeError(w, status, msg, err)
		return
	}

	writeJSON(w, http.StatusCreated, resp)
}

func (h *Classroom) JoinByCode(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var req model.JoinByCodeRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	req.JoinCode = strings.ToUpper(strings.TrimSpace(req.JoinCode))
	if req.JoinCode == "" {
		writeError(w, http.StatusBadRequest, "class code is required", nil)
		return
	}

	groupID, err := h.svc.JoinByCode(r.Context(), userID, req.JoinCode)
	if err != nil {
		log.Printf("join by code error: %v", err)
		msg := "failed to join class"
		status := http.StatusInternalServerError
		normalized := strings.ToLower(err.Error())
		switch {
		case strings.Contains(normalized, "class not found"):
			msg = "class not found"
			status = http.StatusNotFound
		case h.isDev():
			msg = err.Error()
		}
		writeError(w, status, msg, err)
		return
	}

	// Notify the teacher (group owner) that a new student joined.
	if ownerID := h.groupOwnerID(groupID); ownerID != "" && ownerID != userID {
		studentName := h.userDisplayName(userID)
		link := "/classes/" + groupID
		notifier.Create(
			h.db,
			ownerID,
			"class_join",
			"New student joined",
			studentName+" joined your class",
			&link,
		)
	}

	writeJSON(w, http.StatusOK, map[string]string{"groupId": groupID})
}

func (h *Classroom) AssignSet(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var req model.AssignSetRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	req.GroupID = strings.TrimSpace(req.GroupID)
	req.SetID = strings.TrimSpace(req.SetID)
	if req.GroupID == "" || req.SetID == "" {
		writeError(w, http.StatusBadRequest, "class and flashcard set are required", nil)
		return
	}

	if err := h.svc.AssignSet(r.Context(), userID, req); err != nil {
		log.Printf("assign set error: %v", err)
		msg := "failed to assign flashcard set"
		status := http.StatusInternalServerError
		normalized := strings.ToLower(err.Error())
		switch {
		case strings.Contains(normalized, "access denied"):
			msg = "access denied"
			status = http.StatusForbidden
		case strings.Contains(normalized, "set access denied"):
			msg = "set access denied"
			status = http.StatusForbidden
		case h.isDev():
			msg = err.Error()
		}
		writeError(w, status, msg, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Classroom) CreateChallenge(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var req model.CreateClassChallengeRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	req.GroupID = strings.TrimSpace(req.GroupID)
	req.SetID = strings.TrimSpace(req.SetID)
	req.Title = strings.TrimSpace(req.Title)
	if req.GroupID == "" || req.SetID == "" || req.Title == "" {
		writeError(w, http.StatusBadRequest, "group, set, and challenge title are required", nil)
		return
	}

	challengeID, err := h.svc.CreateChallenge(r.Context(), userID, req)
	if err != nil {
		log.Printf("create challenge error: %v", err)
		msg := "failed to create class challenge"
		status := http.StatusInternalServerError
		normalized := strings.ToLower(err.Error())
		switch {
		case strings.Contains(normalized, "access denied"):
			msg = "access denied"
			status = http.StatusForbidden
		case h.isDev():
			msg = err.Error()
		}
		writeError(w, status, msg, err)
		return
	}

	// Notify every student in the group (excluding the teacher who created it).
	link := "/classes/" + req.GroupID + "/challenges/" + challengeID
	notifier.CreateForGroupMembers(
		h.db,
		req.GroupID,
		userID,
		"class_challenge",
		"New class challenge: "+req.Title,
		"A new challenge is waiting in your class",
		&link,
	)

	writeJSON(w, http.StatusCreated, map[string]string{"challengeId": challengeID})
}

func (h *Classroom) JoinChallenge(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var req struct {
		ChallengeID string `json:"challengeId"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	req.ChallengeID = strings.TrimSpace(req.ChallengeID)
	if req.ChallengeID == "" {
		writeError(w, http.StatusBadRequest, "challenge id is required", nil)
		return
	}

	if err := h.svc.JoinChallenge(r.Context(), userID, req.ChallengeID); err != nil {
		log.Printf("join challenge error: %v", err)
		msg := "failed to join challenge"
		if h.isDev() {
			msg = err.Error()
		}
		writeError(w, http.StatusInternalServerError, msg, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Classroom) RemoveStudent(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	req := model.RemoveStudentRequest{
		GroupID: strings.TrimSpace(r.PathValue("groupID")),
		UserID:  strings.TrimSpace(r.PathValue("memberID")),
	}
	if req.GroupID == "" || req.UserID == "" {
		writeError(w, http.StatusBadRequest, "group id and member id are required", nil)
		return
	}

	if err := h.svc.RemoveStudent(r.Context(), userID, req); err != nil {
		log.Printf("remove student error: %v", err)
		msg := "failed to remove student"
		status := http.StatusInternalServerError
		switch {
		case strings.Contains(strings.ToLower(err.Error()), "access denied"):
			msg = "access denied"
			status = http.StatusForbidden
		case h.isDev():
			msg = err.Error()
		}
		writeError(w, status, msg, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Classroom) GetChallengeDetail(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	challengeID := strings.TrimSpace(r.PathValue("challengeID"))
	if challengeID == "" {
		writeError(w, http.StatusBadRequest, "challenge id is required", nil)
		return
	}

	resp, err := h.svc.GetChallengeDetail(r.Context(), userID, challengeID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "challenge not found", err)
			return
		}

		log.Printf("challenge detail error: %v", err)
		msg := "failed to load challenge detail"
		if h.isDev() {
			msg = err.Error()
		}
		writeError(w, http.StatusInternalServerError, msg, err)
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *Classroom) AssignQuiz(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	var req model.AssignQuizRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	req.GroupID = strings.TrimSpace(req.GroupID)
	req.QuizID = strings.TrimSpace(req.QuizID)
	if req.GroupID == "" || req.QuizID == "" {
		writeError(w, http.StatusBadRequest, "class and quiz are required", nil)
		return
	}
	if req.Deadline != nil {
		trimmed := strings.TrimSpace(*req.Deadline)
		if trimmed == "" {
			req.Deadline = nil
		} else {
			req.Deadline = &trimmed
		}
	}

	if err := h.svc.AssignQuiz(r.Context(), userID, req); err != nil {
		log.Printf("assign quiz error: %v", err)
		msg := "failed to assign quiz"
		status := http.StatusInternalServerError
		normalized := strings.ToLower(err.Error())
		switch {
		case strings.Contains(normalized, "quiz access denied"):
			msg = "quiz access denied"
			status = http.StatusForbidden
		case strings.Contains(normalized, "access denied"):
			msg = "access denied"
			status = http.StatusForbidden
		case h.isDev():
			msg = err.Error()
		}
		writeError(w, status, msg, err)
		return
	}

	// Notify every student in the group (excluding the teacher who assigned it).
	title := h.quizTitle(req.QuizID)
	if title == "" {
		title = "New quiz"
	}
	body := "A new quiz is waiting in your class"
	if req.Deadline != nil && *req.Deadline != "" {
		body = "Deadline: " + *req.Deadline
	}
	link := "/quizzes/" + req.QuizID
	notifier.CreateForGroupMembers(
		h.db,
		req.GroupID,
		userID,
		"quiz_assigned",
		"New quiz: "+title,
		body,
		&link,
	)

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Classroom) GetClassQuizLeaderboard(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}
	groupID := strings.TrimSpace(r.PathValue("groupID"))
	quizID := strings.TrimSpace(r.PathValue("quizID"))
	if groupID == "" || quizID == "" {
		writeError(w, http.StatusBadRequest, "group id and quiz id are required", nil)
		return
	}

	resp, err := h.svc.GetClassQuizLeaderboard(r.Context(), userID, groupID, quizID)
	if err != nil {
		log.Printf("class quiz leaderboard error: %v", err)
		msg := "failed to load quiz leaderboard"
		status := http.StatusInternalServerError
		normalized := strings.ToLower(err.Error())
		switch {
		case strings.Contains(normalized, "access denied"):
			msg = "access denied"
			status = http.StatusForbidden
		case strings.Contains(normalized, "not found"):
			msg = "quiz assignment not found"
			status = http.StatusNotFound
		case h.isDev():
			msg = err.Error()
		}
		writeError(w, status, msg, err)
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *Classroom) GetClassQuizTeacherStats(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}
	groupID := strings.TrimSpace(r.PathValue("groupID"))
	quizID := strings.TrimSpace(r.PathValue("quizID"))
	if groupID == "" || quizID == "" {
		writeError(w, http.StatusBadRequest, "group id and quiz id are required", nil)
		return
	}

	resp, err := h.svc.GetClassQuizTeacherStats(r.Context(), userID, groupID, quizID)
	if err != nil {
		log.Printf("class quiz teacher stats error: %v", err)
		msg := "failed to load quiz stats"
		status := http.StatusInternalServerError
		normalized := strings.ToLower(err.Error())
		switch {
		case strings.Contains(normalized, "access denied"):
			msg = "access denied"
			status = http.StatusForbidden
		case strings.Contains(normalized, "not found"):
			msg = "quiz assignment not found"
			status = http.StatusNotFound
		case h.isDev():
			msg = err.Error()
		}
		writeError(w, status, msg, err)
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *Classroom) GetRecentTeacherQuizActivity(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	resp, err := h.svc.GetRecentTeacherQuizActivity(r.Context(), userID, 10)
	if err != nil {
		log.Printf("recent teacher quiz activity error: %v", err)
		msg := "failed to load recent quiz activity"
		if h.isDev() {
			msg = err.Error()
		}
		writeError(w, http.StatusInternalServerError, msg, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": resp})
}

func (h *Classroom) GetStudentQuizAssignments(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	resp, err := h.svc.GetStudentQuizAssignments(r.Context(), userID)
	if err != nil {
		log.Printf("student quiz assignments error: %v", err)
		msg := "failed to load quiz assignments"
		if h.isDev() {
			msg = err.Error()
		}
		writeError(w, http.StatusInternalServerError, msg, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": resp})
}

func (h *Classroom) GetChallengeRanking(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	challengeID := strings.TrimSpace(r.PathValue("challengeID"))
	if challengeID == "" {
		writeError(w, http.StatusBadRequest, "challenge id is required", nil)
		return
	}

	resp, err := h.svc.GetChallengeRanking(r.Context(), userID, challengeID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "challenge not found", err)
			return
		}

		log.Printf("challenge ranking error: %v", err)
		msg := "failed to load challenge ranking"
		if h.isDev() {
			msg = err.Error()
		}
		writeError(w, http.StatusInternalServerError, msg, err)
		return
	}

	writeJSON(w, http.StatusOK, resp)
}
