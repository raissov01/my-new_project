// Package hub implements the in-memory real-time engine for live quiz sessions.
// Each active session lives as a *Room managed by the singleton *Hub. WebSocket
// connections are upgraded here; all game-state mutations happen under the
// room's mutex so a single room's lock never blocks other rooms.
package hub

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"strings"
	"sync"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
	"net/http"
)

// ──────────────────────────────────────────────────────────────
// Wire types (JSON over WebSocket)
// ──────────────────────────────────────────────────────────────

// Incoming messages (client → server)
const (
	CmdStartGame    = "start_game"
	CmdNextQuestion = "next_question"
	CmdEndGame      = "end_game"
	CmdSubmitAnswer = "submit_answer"
)

// Outgoing event types (server → client)
const (
	EvtSessionState  = "session_state"
	EvtPlayerJoined  = "player_joined"
	EvtPlayerLeft    = "player_left"
	EvtGameStarted   = "game_started"
	EvtQuestion      = "question"
	EvtAnswerOK      = "answer_accepted"
	EvtAnswerStats   = "answer_stats" // host-only
	EvtQuestionEnded = "question_ended"
	EvtGameEnded     = "game_ended"
	EvtError         = "error"
)

type InMsg struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data,omitempty"`
}

type OutMsg struct {
	Type string `json:"type"`
	Data any    `json:"data,omitempty"`
}

// ──────────────────────────────────────────────────────────────
// Quiz data snapshot (loaded once at session creation)
// ──────────────────────────────────────────────────────────────

type LiveQuestion struct {
	ID             string   `json:"id"`
	Index          int      `json:"index"`
	QuestionText   string   `json:"questionText"`
	QuestionType   string   `json:"questionType"`
	OptionA        string   `json:"optionA,omitempty"`
	OptionB        string   `json:"optionB,omitempty"`
	OptionC        string   `json:"optionC,omitempty"`
	OptionD        string   `json:"optionD,omitempty"`
	CorrectOption  string   `json:"-"` // never sent to players
	BlankAnswer    string   `json:"-"`
	ReorderItems   []string `json:"-"`                         // canonical correct order, never sent to players
	ReorderDisplay []string `json:"reorderItems,omitempty"`    // shuffled display order, sent to clients
	ImageURL       string   `json:"imageUrl,omitempty"`
	TimeLimit      int      `json:"timeLimit"` // seconds
}

type LiveQuiz struct {
	ID           string
	Title        string
	Questions    []LiveQuestion
	ShuffleOpts  bool
}

// ──────────────────────────────────────────────────────────────
// Client — one WebSocket connection
// ──────────────────────────────────────────────────────────────

type Client struct {
	conn          *websocket.Conn
	isHost        bool
	participantID string
	displayName   string
	room          *Room
	send          chan []byte
	ctx           context.Context
	cancel        context.CancelFunc
}

func (c *Client) sendMsg(msg OutMsg) {
	b, err := json.Marshal(msg)
	if err != nil {
		return
	}
	select {
	case c.send <- b:
	default:
		// drop if buffer full (slow client)
	}
}

// ──────────────────────────────────────────────────────────────
// Participant score snapshot (for leaderboard events)
// ──────────────────────────────────────────────────────────────

type ParticipantScore struct {
	ID          string `json:"id"`
	DisplayName string `json:"displayName"`
	Score       int    `json:"score"`
	Streak      int    `json:"streak"`
	Rank        int    `json:"rank"`
}

// ──────────────────────────────────────────────────────────────
// Room — one live session
// ──────────────────────────────────────────────────────────────

type Room struct {
	mu        sync.Mutex
	db        *gorm.DB
	hub       *Hub
	sessionID string
	joinCode  string
	quiz      *LiveQuiz
	mode      string // teacher_paced | self_paced
	status    string // lobby | active | finished

	host    *Client
	players map[string]*Client // participantID → client

	currentQ  int
	qActive   bool
	qDeadline time.Time
	qTimer    *time.Timer

	scores   map[string]int  // participantID → total score
	streaks  map[string]int  // participantID → current streak
	answered map[string]bool // participantID → answered current question

	// per-option answer counts for host stats display
	optionCounts map[string]int // "a","b","c","d","t","f" → count
}

func newRoom(db *gorm.DB, hub *Hub, sessionID, joinCode, mode string, quiz *LiveQuiz) *Room {
	return &Room{
		db:           db,
		hub:          hub,
		sessionID:    sessionID,
		joinCode:     joinCode,
		quiz:         quiz,
		mode:         mode,
		status:       "lobby",
		players:      make(map[string]*Client),
		scores:       make(map[string]int),
		streaks:      make(map[string]int),
		answered:     make(map[string]bool),
		optionCounts: make(map[string]int),
	}
}

// leaderboard builds a sorted ParticipantScore slice.
func (r *Room) leaderboard() []ParticipantScore {
	list := make([]ParticipantScore, 0, len(r.players))
	for pid, c := range r.players {
		list = append(list, ParticipantScore{
			ID:          pid,
			DisplayName: c.displayName,
			Score:       r.scores[pid],
			Streak:      r.streaks[pid],
		})
	}
	// sort descending by score
	for i := 0; i < len(list)-1; i++ {
		for j := i + 1; j < len(list); j++ {
			if list[j].Score > list[i].Score {
				list[i], list[j] = list[j], list[i]
			}
		}
	}
	for i := range list {
		list[i].Rank = i + 1
	}
	return list
}

// currentQuestion returns the question currently being presented (nil if none).
func (r *Room) currentQuestion() *LiveQuestion {
	if r.currentQ >= len(r.quiz.Questions) {
		return nil
	}
	return &r.quiz.Questions[r.currentQ]
}

// broadcast sends to all clients (host + players) that are in the room.
func (r *Room) broadcast(msg OutMsg) {
	b, err := json.Marshal(msg)
	if err != nil {
		return
	}
	if r.host != nil {
		select {
		case r.host.send <- b:
		default:
		}
	}
	for _, c := range r.players {
		select {
		case c.send <- b:
		default:
		}
	}
}

// broadcastPlayers sends to players only.
func (r *Room) broadcastPlayers(msg OutMsg) {
	b, err := json.Marshal(msg)
	if err != nil {
		return
	}
	for _, c := range r.players {
		select {
		case c.send <- b:
		default:
		}
	}
}

// sendToHost sends a message only to the host client.
func (r *Room) sendToHost(msg OutMsg) {
	if r.host != nil {
		r.host.sendMsg(msg)
	}
}

// sendSessionState sends the full lobby state to a newly connected client.
func (r *Room) sendSessionState(c *Client) {
	parts := make([]ParticipantScore, 0, len(r.players))
	for pid, p := range r.players {
		parts = append(parts, ParticipantScore{
			ID:          pid,
			DisplayName: p.displayName,
			Score:       r.scores[pid],
			Streak:      r.streaks[pid],
		})
	}
	type state struct {
		Status         string             `json:"status"`
		Mode           string             `json:"mode"`
		JoinCode       string             `json:"joinCode"`
		QuizTitle      string             `json:"quizTitle"`
		TotalQuestions int                `json:"totalQuestions"`
		CurrentQ       int                `json:"currentQuestion"`
		Participants   []ParticipantScore `json:"participants"`
	}
	c.sendMsg(OutMsg{
		Type: EvtSessionState,
		Data: state{
			Status:         r.status,
			Mode:           r.mode,
			JoinCode:       r.joinCode,
			QuizTitle:      r.quiz.Title,
			TotalQuestions: len(r.quiz.Questions),
			CurrentQ:       r.currentQ,
			Participants:   parts,
		},
	})
}

// startGame transitions the room from lobby → active and sends the first question.
// Must be called with r.mu held.
func (r *Room) startGame() {
	if r.status != "lobby" {
		return
	}
	r.status = "active"
	r.currentQ = 0

	// Persist started_at
	now := time.Now()
	r.db.Model(&models.QuizLiveSession{}).
		Where("id = ?", r.sessionID).
		Updates(map[string]any{"status": "active", "started_at": now})

	r.broadcast(OutMsg{Type: EvtGameStarted, Data: map[string]any{
		"totalQuestions": len(r.quiz.Questions),
		"mode":           r.mode,
	}})

	r.showQuestion()
}

// showQuestion broadcasts the current question and starts the timer.
// Must be called with r.mu held.
func (r *Room) showQuestion() {
	q := r.currentQuestion()
	if q == nil {
		r.endGame()
		return
	}

	// Reset per-question state
	r.answered = make(map[string]bool)
	r.optionCounts = make(map[string]int)

	deadline := time.Now().Add(time.Duration(q.TimeLimit) * time.Second)
	r.qDeadline = deadline
	r.qActive = true

	// Persist current_question index
	r.db.Model(&models.QuizLiveSession{}).
		Where("id = ?", r.sessionID).
		Update("current_question", r.currentQ)

	type questionEvt struct {
		Index     int          `json:"index"`
		Total     int          `json:"total"`
		Question  LiveQuestion `json:"question"`
		Deadline  int64        `json:"deadlineMs"` // unix ms
	}
	r.broadcast(OutMsg{Type: EvtQuestion, Data: questionEvt{
		Index:    r.currentQ,
		Total:    len(r.quiz.Questions),
		Question: *q,
		Deadline: deadline.UnixMilli(),
	}})

	// Auto-advance when timer expires
	r.qTimer = time.AfterFunc(time.Duration(q.TimeLimit)*time.Second, func() {
		r.mu.Lock()
		defer r.mu.Unlock()
		if r.qActive {
			r.endQuestion(true)
		}
	})
}

// endQuestion broadcasts results + leaderboard for the current question,
// then either advances or ends the game.
// Must be called with r.mu held. timedOut=true when called by the timer.
func (r *Room) endQuestion(timedOut bool) {
	if !r.qActive {
		return
	}
	r.qActive = false
	if r.qTimer != nil {
		r.qTimer.Stop()
		r.qTimer = nil
	}

	q := r.currentQuestion()
	if q == nil {
		r.endGame()
		return
	}

	lb := r.leaderboard()
	type endEvt struct {
		QuestionIndex int                `json:"questionIndex"`
		CorrectOption string             `json:"correctOption,omitempty"`
		BlankAnswer   string             `json:"blankAnswer,omitempty"`
		CorrectOrder  []string           `json:"correctOrder,omitempty"` // for reorder reveal
		Leaderboard   []ParticipantScore `json:"leaderboard"`
	}
	evt := endEvt{
		QuestionIndex: r.currentQ,
		Leaderboard:   lb,
	}
	switch q.QuestionType {
	case "mcq", "true_false":
		evt.CorrectOption = q.CorrectOption
	case "fill_blank":
		evt.BlankAnswer = q.BlankAnswer
	case "reorder":
		evt.CorrectOrder = q.ReorderItems
	}
	r.broadcast(OutMsg{Type: EvtQuestionEnded, Data: evt})

	// Advance in self_paced or teacher_paced (teacher_paced advances on CmdNextQuestion,
	// but when timer fires we still auto-advance to keep the game moving)
	r.currentQ++
	if r.currentQ >= len(r.quiz.Questions) {
		r.endGame()
	} else if r.mode == "self_paced" || timedOut {
		// small delay so clients can display the result screen
		time.AfterFunc(3*time.Second, func() {
			r.mu.Lock()
			defer r.mu.Unlock()
			if r.status == "active" && !r.qActive {
				r.showQuestion()
			}
		})
	}
	// teacher_paced + !timedOut → teacher sends CmdNextQuestion to advance
}

// endGame persists final scores and notifies all clients.
// Must be called with r.mu held.
func (r *Room) endGame() {
	if r.status == "finished" {
		return
	}
	r.status = "finished"
	now := time.Now()

	// Persist final scores for all participants
	for pid, score := range r.scores {
		r.db.Model(&models.QuizLiveParticipant{}).
			Where("id = ?", pid).
			Updates(map[string]any{
				"score":       score,
				"streak":      r.streaks[pid],
				"finished_at": now,
			})
	}
	r.db.Model(&models.QuizLiveSession{}).
		Where("id = ?", r.sessionID).
		Updates(map[string]any{"status": "finished", "finished_at": now})

	lb := r.leaderboard()
	r.broadcast(OutMsg{Type: EvtGameEnded, Data: map[string]any{
		"finalLeaderboard": lb,
	}})

	// Remove room from hub after a cleanup delay
	go func(code string) {
		time.Sleep(5 * time.Minute)
		r.hub.removeRoom(code)
	}(r.joinCode)
}

// handleMessage processes an incoming message from a client.
func (r *Room) handleMessage(c *Client, msg InMsg) {
	r.mu.Lock()
	defer r.mu.Unlock()

	switch msg.Type {
	case CmdStartGame:
		if !c.isHost {
			c.sendMsg(OutMsg{Type: EvtError, Data: map[string]string{"message": "only host can start game"}})
			return
		}
		r.startGame()

	case CmdNextQuestion:
		if !c.isHost {
			c.sendMsg(OutMsg{Type: EvtError, Data: map[string]string{"message": "only host can advance"}})
			return
		}
		if r.status != "active" {
			return
		}
		if r.qActive {
			r.endQuestion(false)
		} else if r.currentQ < len(r.quiz.Questions) {
			r.showQuestion()
		}

	case CmdEndGame:
		if !c.isHost {
			c.sendMsg(OutMsg{Type: EvtError, Data: map[string]string{"message": "only host can end game"}})
			return
		}
		if r.qTimer != nil {
			r.qTimer.Stop()
			r.qTimer = nil
		}
		r.endGame()

	case CmdSubmitAnswer:
		if c.isHost {
			return // hosts don't submit answers
		}
		r.handleAnswer(c, msg.Data)
	}
}

type submitAnswerData struct {
	Option      string   `json:"option"`      // for mcq/true_false: a/b/c/d/t/f
	TextAns     string   `json:"textAnswer"`  // for fill_blank
	OrderAnswer []string `json:"orderAnswer"` // for reorder: items in submitted sequence
	TimeSpent   int      `json:"timeSpent"`
}

func (r *Room) handleAnswer(c *Client, data json.RawMessage) {
	if r.status != "active" || !r.qActive {
		return
	}
	if r.answered[c.participantID] {
		return // already answered
	}

	var req submitAnswerData
	if err := json.Unmarshal(data, &req); err != nil {
		return
	}

	q := r.currentQuestion()
	if q == nil {
		return
	}

	// Grade the answer
	var isCorrect bool
	switch q.QuestionType {
	case "mcq", "true_false":
		isCorrect = strings.EqualFold(req.Option, q.CorrectOption)
	case "fill_blank":
		isCorrect = normalizeBlank(req.TextAns) == normalizeBlank(q.BlankAnswer)
	case "reorder":
		isCorrect = liveSlicesEqual(req.OrderAnswer, q.ReorderItems)
	default:
		isCorrect = false
	}

	// Score: base 100 + time bonus (faster = more points, max 50 bonus)
	points := 0
	if isCorrect {
		remaining := time.Until(r.qDeadline).Seconds()
		if remaining < 0 {
			remaining = 0
		}
		bonus := int(remaining / float64(q.TimeLimit) * 50)
		points = 100 + bonus
		r.scores[c.participantID] += points
		r.streaks[c.participantID]++
	} else {
		r.streaks[c.participantID] = 0
	}

	r.answered[c.participantID] = true

	// Track option distribution for host
	if req.Option != "" {
		r.optionCounts[strings.ToLower(req.Option)]++
	}

	// Persist the answer
	var selOpt *string
	if req.Option != "" {
		s := strings.ToLower(req.Option)
		selOpt = &s
	}
	var textAns *string
	if req.TextAns != "" {
		textAns = &req.TextAns
	}
	// For reorder, store the submitted sequence as JSON in TextAnswer
	if q.QuestionType == "reorder" && len(req.OrderAnswer) > 0 {
		if b, err := json.Marshal(req.OrderAnswer); err == nil {
			s := string(b)
			textAns = &s
		}
	}
	r.db.Create(&models.QuizLiveAnswer{
		SessionID:      r.sessionID,
		ParticipantID:  c.participantID,
		QuestionIndex:  r.currentQ,
		SelectedOption: selOpt,
		TextAnswer:     textAns,
		IsCorrect:      isCorrect,
		TimeSpent:      req.TimeSpent,
		PointsEarned:   points,
	})

	// Acknowledge to the player
	c.sendMsg(OutMsg{Type: EvtAnswerOK, Data: map[string]any{
		"isCorrect":    isCorrect,
		"pointsEarned": points,
		"totalScore":   r.scores[c.participantID],
		"streak":       r.streaks[c.participantID],
	}})

	// Send live answer stats to host
	total := len(r.players)
	answeredCount := len(r.answered)
	r.sendToHost(OutMsg{Type: EvtAnswerStats, Data: map[string]any{
		"counts":       r.optionCounts,
		"answered":     answeredCount,
		"total":        total,
		"questionIndex": r.currentQ,
	}})

	// Auto-end question when all players have answered
	if answeredCount >= total && total > 0 {
		if r.qTimer != nil {
			r.qTimer.Stop()
			r.qTimer = nil
		}
		r.endQuestion(true)
	}
}

func normalizeBlank(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

// liveSlicesEqual returns true if a and b have the same length and identical elements.
func liveSlicesEqual(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

// ──────────────────────────────────────────────────────────────
// Hub — registry of all active rooms
// ──────────────────────────────────────────────────────────────

type Hub struct {
	mu    sync.RWMutex
	rooms map[string]*Room // joinCode → room
	db    *gorm.DB
}

var globalHub *Hub
var hubOnce sync.Once

// GetHub returns the process-level singleton hub, initialised with the given db
// on first call. Subsequent calls ignore the db argument.
func GetHub(db *gorm.DB) *Hub {
	hubOnce.Do(func() {
		globalHub = &Hub{
			rooms: make(map[string]*Room),
			db:    db,
		}
	})
	return globalHub
}

func (h *Hub) GetRoom(code string) *Room {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.rooms[code]
}

func (h *Hub) CreateRoom(sessionID, code, mode string, quiz *LiveQuiz) *Room {
	r := newRoom(h.db, h, sessionID, code, mode, quiz)
	h.mu.Lock()
	h.rooms[code] = r
	h.mu.Unlock()
	return r
}

func (h *Hub) removeRoom(code string) {
	h.mu.Lock()
	delete(h.rooms, code)
	h.mu.Unlock()
}

// ──────────────────────────────────────────────────────────────
// WebSocket upgrade — called from the HTTP handler
// ──────────────────────────────────────────────────────────────

// ServeWS upgrades the HTTP connection to WebSocket and runs the client loop.
// Query params:
//   - role=host  + token=<sessionID>   (host auth)
//   - role=player + pid=<participantID> (player auth)
func (h *Hub) ServeWS(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")
	role := r.URL.Query().Get("role")
	token := r.URL.Query().Get("token") // host: sessionID
	pid := r.URL.Query().Get("pid")     // player: participantID

	room := h.GetRoom(code)
	if room == nil {
		http.Error(w, `{"error":"session not found"}`, http.StatusNotFound)
		return
	}

	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		InsecureSkipVerify: true, // CORS checked at app level
	})
	if err != nil {
		log.Printf("ws accept error: %v", err)
		return
	}

	ctx, cancel := context.WithCancel(r.Context())
	client := &Client{
		conn:   conn,
		send:   make(chan []byte, 64),
		ctx:    ctx,
		cancel: cancel,
		room:   room,
	}

	if role == "host" {
		if token != room.sessionID {
			_ = conn.Close(websocket.StatusPolicyViolation, "invalid host token")
			cancel()
			return
		}
		client.isHost = true
		client.displayName = "host"

		room.mu.Lock()
		room.host = client
		room.mu.Unlock()

	} else {
		// player
		if pid == "" {
			_ = conn.Close(websocket.StatusPolicyViolation, "missing pid")
			cancel()
			return
		}
		// Verify participant exists in DB
		var part models.QuizLiveParticipant
		if err := h.db.Where("id = ? AND session_id = ?", pid, room.sessionID).First(&part).Error; err != nil {
			_ = conn.Close(websocket.StatusPolicyViolation, "participant not found")
			cancel()
			return
		}
		client.participantID = pid
		client.displayName = part.DisplayName

		room.mu.Lock()
		room.players[pid] = client
		room.scores[pid] = 0
		room.streaks[pid] = 0
		room.mu.Unlock()

		// Notify others
		room.broadcast(OutMsg{Type: EvtPlayerJoined, Data: map[string]any{
			"participant": ParticipantScore{
				ID:          pid,
				DisplayName: part.DisplayName,
			},
			"count": func() int {
				room.mu.Lock()
				defer room.mu.Unlock()
				return len(room.players)
			}(),
		}})
	}

	// Send current session state so the client can restore UI
	room.mu.Lock()
	room.sendSessionState(client)
	room.mu.Unlock()

	// Write pump
	go func() {
		defer func() {
			conn.Close(websocket.StatusNormalClosure, "")
			cancel()
		}()
		for {
			select {
			case data, ok := <-client.send:
				if !ok {
					return
				}
				if err := conn.Write(ctx, websocket.MessageText, data); err != nil {
					return
				}
			case <-ctx.Done():
				return
			}
		}
	}()

	// Read pump (blocks until disconnect)
	defer func() {
		cancel()
		room.mu.Lock()
		if client.isHost {
			room.host = nil
		} else {
			delete(room.players, client.participantID)
			room.broadcast(OutMsg{Type: EvtPlayerLeft, Data: map[string]any{
				"participantId": client.participantID,
				"displayName":   client.displayName,
			}})
		}
		room.mu.Unlock()
	}()

	for {
		var msg InMsg
		if err := wsjson.Read(ctx, conn, &msg); err != nil {
			break
		}
		room.handleMessage(client, msg)
	}
}

// ──────────────────────────────────────────────────────────────
// Anonymous name generator (Kazakh-themed)
// ──────────────────────────────────────────────────────────────

var kazakhAdj = []string{
	"Алтын", "Батыр", "Жылдам", "Күшті", "Ақылды",
	"Шапшаң", "Зерек", "Сергек", "Айбарлы", "Дарынды",
	"Асқар", "Биік", "Ғажап", "Қайратты", "Ерлі",
}

var kazakhNoun = []string{
	"Барыс", "Сұңқар", "Бүркіт", "Арыстан", "Бөрі",
	"Тарпан", "Аю", "Тазы", "Марқа", "Мерген",
	"Батыр", "Сарбаз", "Жолбарыс", "Жайыр", "Найзагер",
}

// RandomKazakhName returns a random Kazakh-themed display name.
func RandomKazakhName() string {
	adj := kazakhAdj[rand.Intn(len(kazakhAdj))]
	noun := kazakhNoun[rand.Intn(len(kazakhNoun))]
	return fmt.Sprintf("%s %s", adj, noun)
}
