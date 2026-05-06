package handler

import (
	"crypto/rand"
	"encoding/base32"
	"encoding/json"
	mrand "math/rand"
	"net/http"
	"strconv"
	"strings"

	"github.com/midoriya/flashlearn-backend/internal/hub"
	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// QuizLiveHandler manages live quiz session REST endpoints.
// WebSocket upgrades are delegated to the hub.
type QuizLiveHandler struct {
	db  *gorm.DB
	hub *hub.Hub
}

func NewQuizLive(db *gorm.DB) *QuizLiveHandler {
	h := hub.GetHub(db)
	return &QuizLiveHandler{db: db, hub: h}
}

// ──────────────────────────────────────────────────────────────
// POST /api/v1/quizzes/:quizID/live-sessions
// Creates a new lobby session and returns its metadata.
// ──────────────────────────────────────────────────────────────

type createSessionRequest struct {
	Mode           string `json:"mode"` // teacher_paced | self_paced
	AllowAnonymous bool   `json:"allowAnonymous"`
	TeamMode       bool   `json:"teamMode"`
	TeamCount      int    `json:"teamCount"` // 2–4; 0 or 1 → defaults to 2
}

type createSessionResponse struct {
	ID        string `json:"id"`
	JoinCode  string `json:"joinCode"`
	Mode      string `json:"mode"`
	QuizTitle string `json:"quizTitle"`
}

func (h *QuizLiveHandler) CreateSession(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return
	}

	quizID := r.PathValue("quizID")
	if quizID == "" {
		writeError(w, http.StatusBadRequest, "missing quizID", nil)
		return
	}

	var req createSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// Defaults if no body
		req.Mode = "teacher_paced"
		req.AllowAnonymous = true
	}
	if req.Mode == "" {
		req.Mode = "teacher_paced"
	}
	if req.TeamMode && (req.TeamCount < 2 || req.TeamCount > 4) {
		req.TeamCount = 4
	}

	// Verify quiz exists and user owns it (or it's public)
	var quiz models.Quiz
	if err := h.db.Preload("Questions").First(&quiz, "id = ?", quizID).Error; err != nil {
		writeError(w, http.StatusNotFound, "quiz not found", nil)
		return
	}

	if quiz.UserID != userID && !quiz.IsPublic {
		writeError(w, http.StatusForbidden, "access denied", nil)
		return
	}

	if len(quiz.Questions) == 0 {
		writeError(w, http.StatusBadRequest, "quiz has no questions", nil)
		return
	}

	// Generate a unique 6-char join code
	code, err := generateJoinCode()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not generate join code", err)
		return
	}

	// Retry up to 5 times in case of collision (very unlikely)
	for i := 0; i < 5; i++ {
		var existing models.QuizLiveSession
		if h.db.Where("join_code = ? AND status != 'finished'", code).First(&existing).Error != nil {
			break // no collision, code is usable
		}
		code, _ = generateJoinCode()
	}

	session := models.QuizLiveSession{
		QuizID:         quizID,
		HostUserID:     userID,
		JoinCode:       code,
		Mode:           req.Mode,
		Status:         "lobby",
		AllowAnonymous: req.AllowAnonymous,
		TeamMode:       req.TeamMode,
		TeamCount:      req.TeamCount,
	}
	if err := h.db.Create(&session).Error; err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create session", err)
		return
	}

	// Load quiz data into the hub room
	liveQuiz := buildLiveQuiz(&quiz)
	h.hub.CreateRoom(session.ID, code, req.Mode, req.TeamMode, req.TeamCount, liveQuiz)

	writeJSON(w, http.StatusCreated, createSessionResponse{
		ID:        session.ID,
		JoinCode:  code,
		Mode:      session.Mode,
		QuizTitle: quiz.Title,
	})
}

// ──────────────────────────────────────────────────────────────
// Host control endpoints (force-next, pause, resume, kick, end)
// All require the caller to be the session creator (host).
// ──────────────────────────────────────────────────────────────

// hostSessionFromCode loads the session by code and verifies the caller owns it.
func (h *QuizLiveHandler) hostSessionFromCode(w http.ResponseWriter, r *http.Request) (*models.QuizLiveSession, bool) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required", nil)
		return nil, false
	}
	code := strings.ToUpper(r.PathValue("code"))
	if code == "" {
		writeError(w, http.StatusBadRequest, "missing code", nil)
		return nil, false
	}
	var session models.QuizLiveSession
	if err := h.db.Where("join_code = ?", code).First(&session).Error; err != nil {
		writeError(w, http.StatusNotFound, "session not found", nil)
		return nil, false
	}
	if session.HostUserID != userID {
		writeError(w, http.StatusForbidden, "only the host can perform this action", nil)
		return nil, false
	}
	return &session, true
}

// POST /api/v1/live-sessions/:code/force-next
func (h *QuizLiveHandler) ForceNext(w http.ResponseWriter, r *http.Request) {
	session, ok := h.hostSessionFromCode(w, r)
	if !ok {
		return
	}
	room := h.hub.GetRoom(session.JoinCode)
	if room == nil {
		writeError(w, http.StatusGone, "session not active", nil)
		return
	}
	room.HostForceNext()
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// POST /api/v1/live-sessions/:code/pause
func (h *QuizLiveHandler) PauseSession(w http.ResponseWriter, r *http.Request) {
	session, ok := h.hostSessionFromCode(w, r)
	if !ok {
		return
	}
	room := h.hub.GetRoom(session.JoinCode)
	if room == nil {
		writeError(w, http.StatusGone, "session not active", nil)
		return
	}
	room.HostPause()
	writeJSON(w, http.StatusOK, map[string]string{"status": "paused"})
}

// POST /api/v1/live-sessions/:code/resume
func (h *QuizLiveHandler) ResumeSession(w http.ResponseWriter, r *http.Request) {
	session, ok := h.hostSessionFromCode(w, r)
	if !ok {
		return
	}
	room := h.hub.GetRoom(session.JoinCode)
	if room == nil {
		writeError(w, http.StatusGone, "session not active", nil)
		return
	}
	room.HostResume()
	writeJSON(w, http.StatusOK, map[string]string{"status": "resumed"})
}

type kickParticipantRequest struct {
	ParticipantID string `json:"participantId"`
}

// POST /api/v1/live-sessions/:code/kick
func (h *QuizLiveHandler) KickParticipant(w http.ResponseWriter, r *http.Request) {
	session, ok := h.hostSessionFromCode(w, r)
	if !ok {
		return
	}
	var req kickParticipantRequest
	if err := decodeJSON(r, &req); err != nil || req.ParticipantID == "" {
		writeError(w, http.StatusBadRequest, "missing participantId", err)
		return
	}
	// Verify the participant is in this session before kicking.
	var part models.QuizLiveParticipant
	if err := h.db.Where("id = ? AND session_id = ?", req.ParticipantID, session.ID).First(&part).Error; err != nil {
		writeError(w, http.StatusNotFound, "participant not found", nil)
		return
	}
	room := h.hub.GetRoom(session.JoinCode)
	if room != nil {
		room.HostKick(req.ParticipantID)
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "kicked"})
}

// POST /api/v1/live-sessions/:code/end
func (h *QuizLiveHandler) EndSession(w http.ResponseWriter, r *http.Request) {
	session, ok := h.hostSessionFromCode(w, r)
	if !ok {
		return
	}
	room := h.hub.GetRoom(session.JoinCode)
	if room != nil {
		room.HostEndGame()
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ended"})
}

// ──────────────────────────────────────────────────────────────
// POST /api/v1/live-sessions/join
// Student joins by code; creates a participant record.
// ──────────────────────────────────────────────────────────────

type joinSessionRequest struct {
	Code        string `json:"code"`
	DisplayName string `json:"displayName"`
	Anonymous   bool   `json:"anonymous"` // if true, use random Kazakh name
}

type joinSessionResponse struct {
	ParticipantID string `json:"participantId"`
	SessionID     string `json:"sessionId"`
	DisplayName   string `json:"displayName"`
	QuizTitle     string `json:"quizTitle"`
	Mode          string `json:"mode"`
	TotalQ        int    `json:"totalQuestions"`
	TeamMode      bool   `json:"teamMode"`
	TeamID        int    `json:"teamId"` // -1 when not in team mode
	Role          string `json:"role"`   // "player" | "spectator"
}

func (h *QuizLiveHandler) JoinSession(w http.ResponseWriter, r *http.Request) {
	// This is a public endpoint — anonymous players are allowed.
	// For logged-in users the Next.js bridge sets X-User-ID; read it as a fallback
	// since no auth middleware injects the value into context here.
	userID, _ := middleware.UserIDFromContext(r.Context())
	if userID == "" {
		userID = strings.TrimSpace(r.Header.Get("X-User-ID"))
	}

	var req joinSessionRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	code := strings.ToUpper(strings.TrimSpace(req.Code))
	if len(code) < 4 {
		writeError(w, http.StatusBadRequest, "invalid join code", nil)
		return
	}

	// Look up active session
	var session models.QuizLiveSession
	if err := h.db.Where("join_code = ? AND status IN ('lobby','active')", code).First(&session).Error; err != nil {
		writeError(w, http.StatusNotFound, "session not found or already finished", nil)
		return
	}

	// Determine display name
	name := strings.TrimSpace(req.DisplayName)
	if name == "" || req.Anonymous {
		name = hub.RandomKazakhName()
	}
	if len(name) > 60 {
		name = name[:60]
	}

	// Build participant; team assignment + insert run inside a transaction with
	// SELECT … FOR UPDATE on the session row so concurrent joins don't both pick
	// the same team. Within the lock we recount members per team and pick the
	// team with the fewest members (tiebreak: lowest aggregate score).
	var uid *string
	if userID != "" {
		uid = &userID
	}
	teamID := 0
	// Anyone joining after the game has started becomes a spectator: they can
	// watch leaderboard/questions but cannot submit answers.
	isSpectator := session.Status == "active"
	participant := models.QuizLiveParticipant{
		SessionID:   session.ID,
		UserID:      uid,
		DisplayName: name,
		TeamID:      teamID,
		IsSpectator: isSpectator,
	}
	if err := h.db.Transaction(func(tx *gorm.DB) error {
		var locked models.QuizLiveSession
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ?", session.ID).First(&locked).Error; err != nil {
			return err
		}
		if locked.TeamMode && locked.TeamCount >= 2 {
			counts := make([]int64, locked.TeamCount)
			scores := make([]int64, locked.TeamCount)
			rows := []struct {
				TeamID int
				Cnt    int64
				Sum    int64
			}{}
			tx.Raw(`
				SELECT team_id AS team_id, COUNT(*) AS cnt, COALESCE(SUM(score),0) AS sum
				FROM quiz_live_participants
				WHERE session_id = ?
				GROUP BY team_id
			`, locked.ID).Scan(&rows)
			for _, r := range rows {
				if r.TeamID >= 0 && r.TeamID < locked.TeamCount {
					counts[r.TeamID] = r.Cnt
					scores[r.TeamID] = r.Sum
				}
			}
			best := 0
			for i := 1; i < locked.TeamCount; i++ {
				if counts[i] < counts[best] || (counts[i] == counts[best] && scores[i] < scores[best]) {
					best = i
				}
			}
			teamID = best
			participant.TeamID = teamID
		}
		return tx.Create(&participant).Error
	}); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to join session", err)
		return
	}

	// Load quiz data to return question count
	var quiz models.Quiz
	h.db.Preload("Questions").First(&quiz, "id = ?", session.QuizID)

	// Ensure the room exists in the hub.
	// After a server restart the hub is empty but the DB session is still valid.
	// Recreate the room so the player (and any reconnecting host) can continue.
	if h.hub.GetRoom(code) == nil {
		if len(quiz.Questions) == 0 {
			writeError(w, http.StatusGone, "session is no longer active", nil)
			return
		}
		liveQuiz := buildLiveQuiz(&quiz)
		h.hub.CreateRoom(session.ID, code, session.Mode, session.TeamMode, session.TeamCount, liveQuiz)
	}

	// Return -1 when not in team mode so the frontend can safely ignore the field.
	teamIDResp := -1
	if session.TeamMode {
		teamIDResp = teamID
	}

	role := "player"
	if isSpectator {
		role = "spectator"
	}

	writeJSON(w, http.StatusOK, joinSessionResponse{
		ParticipantID: participant.ID,
		SessionID:     session.ID,
		DisplayName:   name,
		QuizTitle:     quiz.Title,
		Mode:          session.Mode,
		TotalQ:        len(quiz.Questions),
		TeamMode:      session.TeamMode,
		TeamID:        teamIDResp,
		Role:          role,
	})
}

// ──────────────────────────────────────────────────────────────
// GET /api/v1/live-sessions/:code
// Returns current session state (for page hydration).
// ──────────────────────────────────────────────────────────────

func (h *QuizLiveHandler) GetSession(w http.ResponseWriter, r *http.Request) {
	code := strings.ToUpper(r.PathValue("code"))

	var session models.QuizLiveSession
	if err := h.db.Where("join_code = ?", code).First(&session).Error; err != nil {
		writeError(w, http.StatusNotFound, "session not found", nil)
		return
	}

	var quiz models.Quiz
	h.db.Preload("Questions").First(&quiz, "id = ?", session.QuizID)

	type resp struct {
		ID             string `json:"id"`
		JoinCode       string `json:"joinCode"`
		Status         string `json:"status"`
		Mode           string `json:"mode"`
		QuizTitle      string `json:"quizTitle"`
		TotalQuestions int    `json:"totalQuestions"`
		CurrentQ       int    `json:"currentQuestion"`
	}
	writeJSON(w, http.StatusOK, resp{
		ID:             session.ID,
		JoinCode:       session.JoinCode,
		Status:         session.Status,
		Mode:           session.Mode,
		QuizTitle:      quiz.Title,
		TotalQuestions: len(quiz.Questions),
		CurrentQ:       session.CurrentQuestion,
	})
}

// ──────────────────────────────────────────────────────────────
// GET /api/v1/live/:code/ws  (WebSocket upgrade)
// ──────────────────────────────────────────────────────────────

func (h *QuizLiveHandler) WebSocket(w http.ResponseWriter, r *http.Request) {
	h.hub.ServeWS(w, r)
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

// generateJoinCode produces a random uppercase alphanumeric 6-character code.
func generateJoinCode() (string, error) {
	b := make([]byte, 4)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	// base32 gives [A-Z2-7]; we only need 6 chars
	s := base32.StdEncoding.EncodeToString(b)[:6]
	return s, nil
}

// buildLiveQuiz converts GORM quiz + questions to the hub's LiveQuiz type.
func buildLiveQuiz(quiz *models.Quiz) *hub.LiveQuiz {
	questions := make([]hub.LiveQuestion, 0, len(quiz.Questions))
	for i, q := range quiz.Questions {
		lq := hub.LiveQuestion{
			ID:            q.ID,
			Index:         i,
			QuestionText:  q.QuestionText,
			QuestionType:  q.QuestionType,
			OptionA:       q.OptionA,
			OptionB:       q.OptionB,
			OptionC:       q.OptionC,
			OptionD:       q.OptionD,
			CorrectOption: q.CorrectOption,
			TimeLimit:     quiz.TimePerQuestion,
		}
		if q.BlankAnswer != nil {
			lq.BlankAnswer = *q.BlankAnswer
		}
		if q.ImageURL != nil {
			lq.ImageURL = *q.ImageURL
		}
		if q.AudioURL != nil {
			lq.AudioURL = *q.AudioURL
		}
		if q.VideoURL != nil {
			lq.VideoURL = *q.VideoURL
		}
		if q.ReorderItems != nil && *q.ReorderItems != "" {
			var items []string
			if err := json.Unmarshal([]byte(*q.ReorderItems), &items); err == nil {
				lq.ReorderItems = items
				// Build a shuffled copy for display (students must not see the correct order)
				display := make([]string, len(items))
				copy(display, items)
				mrand.Shuffle(len(display), func(i, j int) { display[i], display[j] = display[j], display[i] })
				lq.ReorderDisplay = display
			}
		}
		if q.MatchPairs != nil && *q.MatchPairs != "" {
			type pair struct {
				Left  string `json:"left"`
				Right string `json:"right"`
			}
			var pairs []pair
			if err := json.Unmarshal([]byte(*q.MatchPairs), &pairs); err == nil && len(pairs) > 0 {
				left := make([]string, len(pairs))
				right := make([]string, len(pairs))
				correct := make(map[string]string, len(pairs))
				for k, p := range pairs {
					left[k] = p.Left
					right[k] = p.Right
					correct[p.Left] = p.Right
				}
				// Shuffle right column so players can't trivially match by position.
				mrand.Shuffle(len(right), func(i, j int) { right[i], right[j] = right[j], right[i] })
				lq.MatchLeft = left
				lq.MatchRight = right
				lq.MatchCorrect = correct
			}
		}
		if q.ComprehensionData != nil && *q.ComprehensionData != "" {
			type subQ struct {
				ID      string `json:"id"`
				Type    string `json:"type"`
				Prompt  string `json:"prompt"`
				OptionA string `json:"optionA,omitempty"`
				OptionB string `json:"optionB,omitempty"`
				OptionC string `json:"optionC,omitempty"`
				OptionD string `json:"optionD,omitempty"`
				Correct string `json:"correct"`
			}
			var cd struct {
				Passage      string  `json:"passage"`
				SubQuestions []subQ  `json:"subQuestions"`
			}
			if err := json.Unmarshal([]byte(*q.ComprehensionData), &cd); err == nil {
				lq.ComprehensionPassage = cd.Passage
				correct := make(map[string]string, len(cd.SubQuestions))
				sqs := make([]hub.ComprehensionSubQuestion, len(cd.SubQuestions))
				for k, sq := range cd.SubQuestions {
					sqs[k] = hub.ComprehensionSubQuestion{
						ID:      sq.ID,
						Type:    sq.Type,
						Prompt:  sq.Prompt,
						OptionA: sq.OptionA,
						OptionB: sq.OptionB,
						OptionC: sq.OptionC,
						OptionD: sq.OptionD,
					}
					correct[sq.ID] = sq.Correct
				}
				lq.ComprehensionSubQuestions = sqs
				lq.ComprehensionCorrect = correct
			}
		}
		if q.HotspotZones != nil && *q.HotspotZones != "" {
			type zone struct {
				ID           int     `json:"id"`
				X            float64 `json:"x"`
				Y            float64 `json:"y"`
				R            float64 `json:"r"`
				Label        string  `json:"label,omitempty"`
				CorrectLabel string  `json:"correctLabel,omitempty"`
			}
			var zones []zone
			if err := json.Unmarshal([]byte(*q.HotspotZones), &zones); err == nil {
				liveZones := make([]hub.LiveHotspotZone, len(zones))
				labelingCorrect := make(map[string]string, len(zones))
				for k, z := range zones {
					liveZones[k] = hub.LiveHotspotZone{ID: z.ID, X: z.X, Y: z.Y, R: z.R, Label: z.Label}
					if z.CorrectLabel != "" {
						labelingCorrect[strconv.Itoa(z.ID)] = z.CorrectLabel
					}
				}
				lq.HotspotZones = liveZones
				if q.QuestionType == "labeling" {
					lq.LabelingCorrect = labelingCorrect
				}
			}
		}
		questions = append(questions, lq)
	}
	return &hub.LiveQuiz{
		ID:          quiz.ID,
		Title:       quiz.Title,
		Questions:   questions,
		ShuffleOpts: quiz.ShuffleOptions,
	}
}
