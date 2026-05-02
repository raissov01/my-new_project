package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"gorm.io/gorm"
)

type Dependencies struct {
	InternalAPIToken string
	JWTSecret        string
	Environment      string
	GormDB           *gorm.DB

	Auth               *AuthHandler
	GoogleOAuth        *GoogleOAuthHandler
	IELTSMaterial      *IELTSMaterialHandler
	IELTSExaminer      *IELTSExaminerHandler
	IELTSAttempt       *IELTSAttemptHandler
	IELTSStudyPlan     *IELTSStudyPlanHandler
	IELTSDashboard     *IELTSDashboardHandler
	IELTSQuestionAdmin *IELTSQuestionAdminHandler
	Leaderboard        *Leaderboard
	Profile            *Profile
	Set                *Set
	Dashboard          *Dashboard
	Classroom          *Classroom
	Progress           *Progress
	Flashcard          *FlashcardHandler
	Quiz               *QuizHandler
	QuizUsageEvent     *QuizUsageEventHandler
	Challenge          *ChallengeHandler
	ProfileWrite       *ProfileWriteHandler
	AI                 *AIHandler
	Chat               *ChatHandler
	Files              *FilesHandler
	QuizImage          *QuizImageHandler
	QuizAudio          *QuizAudioHandler
	QuizLive           *QuizLiveHandler
	QuizAIGenerate     *QuizAIGenerateHandler
	EngSim             *EngSimHandler
	MaterialNotes      *MaterialNotesHandler
	Gamification       *GamificationHandler
	Listening          *ListeningHandler
	AITutor            *AITutorHandler
	QuestionReview     *QuestionReviewHandler
	AdminAnalytics     *AdminQuizizzAnalyticsHandler
	AdminUsers         *AdminUsersHandler
	AdminQuizzes       *AdminQuizzesHandler
	AdminAuditLog      *AdminAuditLogHandler
	DailyNews          *DailyNewsHandler
	Mining             *MiningHandler
	Billing            *BillingHandler
	Push               *PushHandler
	Contact            *ContactHandler
	DebugDatabase      http.HandlerFunc
}

var deps Dependencies

func SetDependencies(next Dependencies) {
	deps = next
}

func RegisterRoutes(router *gin.Engine) {
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	api := router.Group("/api/v1")
	api.Use(middleware.NewRateLimiter(120, 1*time.Minute).LimitByIP())

	// ── Public auth routes (no token required) ──────────────────────────
	authLimiter := middleware.NewRateLimiter(10, 1*time.Minute).LimitByIP()
	api.POST("/auth/register", authLimiter, deps.Auth.Register)
	api.POST("/auth/login", authLimiter, deps.Auth.Login)
	api.POST("/auth/verify-email", authLimiter, deps.Auth.VerifyEmail)
	api.POST("/auth/resend-verification", authLimiter, deps.Auth.ResendVerification)
	api.POST("/auth/forgot-password", authLimiter, deps.Auth.ForgotPassword)
	api.POST("/auth/reset-password", authLimiter, deps.Auth.ResetPassword)
	api.POST("/auth/change-verification-email", authLimiter, deps.Auth.ChangeVerificationEmail)
	api.GET("/auth/google", deps.GoogleOAuth.RedirectToGoogle)
	api.GET("/auth/google/callback", deps.GoogleOAuth.HandleCallback)

	// ── Contact form ─────────────────────────────────────────────────────
	contactLimiter := middleware.NewRateLimiter(5, 1*time.Minute).LimitByIP()
	api.POST("/contact", contactLimiter, func(c *gin.Context) { deps.Contact.Submit(c) })

	// ── Billing ──────────────────────────────────────────────────────────
	// Webhook is public but signature-verified inside the handler.
	api.POST("/billing/webhook", wrapHTTP(deps.Billing.Webhook))
	// Status is internal-auth protected (Next.js server-to-server).
	api.GET("/billing/status", middleware.InternalAuth(deps.InternalAPIToken), wrapHTTP(deps.Billing.Status))

	// ── Web Push (VAPID public key is public; subscribe requires auth) ──
	api.GET("/push/vapid-public-key", wrapHTTP(deps.Push.GetVAPIDPublicKey))

	// ── Public file serving (materials PDFs) ────────────────────────────
	api.GET("/files/*filepath", wrapHTTP(deps.Files.Serve))

	// ── Public quiz-question image/audio serving ────────────────────────
	// Upload is authenticated (see the internal group below); serving is
	// public so anyone playing a public quiz can see/hear the media.
	api.GET("/quizzes/images/:name", wrapHTTP(deps.QuizImage.Serve))
	api.GET("/quizzes/audio/:name", wrapHTTP(deps.QuizAudio.Serve))

	// ── Live quiz WebSocket (public upgrade — auth handled inside hub) ───
	api.GET("/live/:code/ws", wrapHTTP(deps.QuizLive.WebSocket))

	// ── Live quiz session join (public — anonymous players allowed) ─────
	// CreateSession stays authenticated (host must own the quiz).
	// JoinSession and GetSession are public: only code + name required.
	api.POST("/live-sessions/join", wrapHTTP(deps.QuizLive.JoinSession))
	api.GET("/live-sessions/:code", wrapHTTP(deps.QuizLive.GetSession))

	// ── Public IELTS routes (no auth required for reading) ──────────────
	api.GET("/ielts/materials", deps.IELTSMaterial.List)
	api.GET("/ielts/materials/:id", deps.IELTSMaterial.Get)
	api.GET("/ielts/questions", wrapHTTP(deps.IELTSExaminer.GetQuestions))
	api.GET("/ielts/mock", wrapHTTP(deps.IELTSExaminer.GetMockExam))

	// ── JWT-authenticated routes ────────────────────────────────────────
	authed := api.Group("")
	authed.Use(middleware.JWTAuth(deps.JWTSecret))
	{
		authed.GET("/auth/me", deps.Auth.Me)
		authed.POST("/auth/role", deps.Auth.UpdateRole)
	}

	// ── Internal auth routes (Next.js bridge — migration compatibility) ─
	internal := api.Group("")
	internal.Use(middleware.InternalAuth(deps.InternalAPIToken))
	{
		internal.GET("/leaderboard", wrapHTTP(deps.Leaderboard.GetLeaderboard))
		internal.GET("/me", wrapHTTP(deps.Profile.GetMe))
		internal.GET("/sets/overview", wrapHTTP(deps.Set.GetOverview))
		internal.GET("/sets/public", wrapHTTP(deps.Set.GetPublicOverview))
		internal.GET("/dashboard/teacher", wrapHTTP(deps.Dashboard.GetTeacherSummary))
		internal.GET("/dashboard/student", wrapHTTP(deps.Dashboard.GetStudentSummary))
		internal.GET("/classroom/owned-groups", wrapHTTP(deps.Classroom.GetOwnedGroups))
		internal.GET("/classroom/available-sets", wrapHTTP(deps.Classroom.GetAvailableSets))
		internal.GET("/classroom/my-challenges", wrapHTTP(deps.Classroom.GetMyChallenges))
		internal.GET("/classroom/groups/:groupID", wrapHTTP(deps.Classroom.GetTeacherClassroomDetail))
		internal.GET("/classroom/challenges/:challengeID", wrapHTTP(deps.Classroom.GetChallengeDetail))
		internal.GET("/classroom/challenges/:challengeID/ranking", wrapHTTP(deps.Classroom.GetChallengeRanking))
		internal.POST("/classroom/groups", wrapHTTP(deps.Classroom.CreateGroup))
		internal.POST("/classroom/join-by-code", wrapHTTP(deps.Classroom.JoinByCode))
		internal.POST("/classroom/assign-set", wrapHTTP(deps.Classroom.AssignSet))
		internal.POST("/classroom/assign-quiz", wrapHTTP(deps.Classroom.AssignQuiz))
		internal.GET("/classroom/groups/:groupID/quizzes/:quizID/leaderboard", wrapHTTP(deps.Classroom.GetClassQuizLeaderboard))
		internal.GET("/classroom/groups/:groupID/quizzes/:quizID/teacher-stats", wrapHTTP(deps.Classroom.GetClassQuizTeacherStats))
		internal.GET("/classroom/student/quiz-assignments", wrapHTTP(deps.Classroom.GetStudentQuizAssignments))
		internal.GET("/classroom/teacher/quiz-activity", wrapHTTP(deps.Classroom.GetRecentTeacherQuizActivity))
		internal.POST("/classroom/challenges", wrapHTTP(deps.Classroom.CreateChallenge))
		internal.POST("/classroom/challenges/join", wrapHTTP(deps.Classroom.JoinChallenge))
		internal.DELETE("/classroom/groups/:groupID/members/:memberID", wrapHTTP(deps.Classroom.RemoveStudent))

		internal.POST("/progress/session", wrapHTTP(deps.Progress.SaveSession))
		internal.GET("/progress/stats", wrapHTTP(deps.Progress.GetStats))
		internal.GET("/progress/set/:setID", wrapHTTP(deps.Progress.GetSetProgress))
		internal.POST("/progress/toggle-weak", wrapHTTP(deps.Progress.ToggleWeak))

		internal.GET("/pomodoro/preferences", wrapHTTP(deps.Progress.GetPomodoro))
		internal.POST("/pomodoro/preferences", wrapHTTP(deps.Progress.SavePomodoro))
		internal.POST("/pomodoro/session", wrapHTTP(deps.Progress.SavePomodoroSession))

		internal.POST("/sets", wrapHTTP(deps.Flashcard.CreateSet))
		internal.GET("/sets/:setID", wrapHTTP(deps.Flashcard.GetSet))
		internal.PUT("/sets/:setID", wrapHTTP(deps.Flashcard.UpdateSet))
		internal.DELETE("/sets/:setID", wrapHTTP(deps.Flashcard.DeleteSet))
		internal.POST("/sets/:setID/clone", wrapHTTP(deps.Flashcard.CloneSet))

		// Quizizz-style quiz module
		internal.GET("/quizzes/overview", wrapHTTP(deps.Quiz.GetOverview))
		internal.GET("/quizzes/mine", wrapHTTP(deps.Quiz.GetMine))
		internal.GET("/quizzes/dashboard/recent-attempts", wrapHTTP(deps.Quiz.GetRecentAttempts))
		internal.GET("/quizzes/dashboard/recommended", wrapHTTP(deps.Quiz.GetRecommendedPractice))
		internal.GET("/quizzes/attempts/:attemptID", wrapHTTP(deps.Quiz.GetAttempt))
		internal.POST("/quizzes", wrapHTTP(deps.Quiz.CreateQuiz))
		internal.PUT("/quizzes/:quizID", wrapHTTP(deps.Quiz.UpdateQuiz))
		internal.DELETE("/quizzes/:quizID", wrapHTTP(deps.Quiz.DeleteQuiz))
		internal.POST("/quizzes/:quizID/attempts", wrapHTTP(deps.Quiz.SubmitAttempt))
		internal.GET("/quizzes/:quizID/attempts", wrapHTTP(deps.Quiz.ListAttempts))
		internal.GET("/quizzes/:quizID/stats", wrapHTTP(deps.Quiz.GetQuestionStats))
		internal.POST("/quizzes/:quizID/clone", wrapHTTP(deps.Quiz.CloneQuiz))
		internal.POST("/quizzes/:quizID/invite-links", wrapHTTP(deps.Quiz.CreateInviteLink))
		internal.GET("/quizzes/:quizID/invite-links", wrapHTTP(deps.Quiz.ListInviteLinks))
		internal.POST("/quiz-invite/:token/use", wrapHTTP(deps.Quiz.UseInviteLink))
		internal.DELETE("/quiz-invite/:token", wrapHTTP(deps.Quiz.RevokeInviteLink))
		internal.POST("/quizzes/images", wrapHTTP(deps.QuizImage.Upload))
		internal.POST("/quizzes/audio", wrapHTTP(deps.QuizAudio.Upload))

		// Live quiz session management (host only — authentication required)
		internal.POST("/quizzes/:quizID/live-sessions", wrapHTTP(deps.QuizLive.CreateSession))

		internal.POST("/challenges/attempt", wrapHTTP(deps.Challenge.SaveAttempt))
		internal.GET("/challenges/ranking/:setID", wrapHTTP(deps.Challenge.GetRanking))
		internal.POST("/challenges/class-attempt", wrapHTTP(deps.Challenge.SaveClassAttempt))

		internal.POST("/profile/role", wrapHTTP(deps.ProfileWrite.UpdateRole))
		internal.PUT("/profile", deps.Auth.UpdateProfile)
		internal.PUT("/account/email", deps.Auth.UpdateEmail)
		internal.PUT("/account/password", deps.Auth.UpdatePassword)
		internal.DELETE("/account", deps.Auth.DeleteAccount)
		aiLimiter := middleware.NewRateLimiter(5, 1*time.Minute).LimitByUser()
		internal.POST("/ai/generate", aiLimiter, wrapHTTP(deps.AI.Generate))

		// AI quiz generation (separate limiter: 3 req/min, daily limit enforced in service)
		quizAILimiter := middleware.NewRateLimiter(3, 1*time.Minute).LimitByUser()
		internal.POST("/quizzes/ai-generate", quizAILimiter, wrapHTTP(deps.QuizAIGenerate.Generate))

		// IELTS AI examiner (requires internal auth)
		internal.POST("/ielts/writing/evaluate", aiLimiter, wrapHTTP(deps.IELTSExaminer.EvaluateWriting))
		internal.GET("/ielts/writing/history", wrapHTTP(deps.IELTSExaminer.GetWritingHistory))
		internal.POST("/ielts/speaking/evaluate", aiLimiter, wrapHTTP(deps.IELTSExaminer.EvaluateSpeaking))
		internal.GET("/ielts/speaking/history", wrapHTTP(deps.IELTSExaminer.GetSpeakingHistory))

		// Material notes (user's reading progress, notes, exercise answers)
		internal.GET("/materials/:materialID/notes", wrapHTTP(deps.MaterialNotes.GetNote))
		internal.POST("/materials/:materialID/notes", wrapHTTP(deps.MaterialNotes.SaveNote))

		// IELTS material admin CRUD (requires internal auth — teacher/admin)
		internal.POST("/ielts/materials", deps.IELTSMaterial.Create)
		internal.PUT("/ielts/materials/:id", deps.IELTSMaterial.Update)
		internal.DELETE("/ielts/materials/:id", deps.IELTSMaterial.Delete)

		// IELTS attempt lifecycle
		internal.POST("/ielts/attempts", wrapHTTP(deps.IELTSAttempt.StartAttempt))
		internal.PUT("/ielts/attempts/:attemptID/save", wrapHTTP(deps.IELTSAttempt.AutoSave))
		internal.PUT("/ielts/attempts/:attemptID/complete", wrapHTTP(deps.IELTSAttempt.Complete))
		internal.PUT("/ielts/attempts/:attemptID/abandon", wrapHTTP(deps.IELTSAttempt.Abandon))
		internal.GET("/ielts/attempts/:attemptID", wrapHTTP(deps.IELTSAttempt.GetAttempt))
		internal.GET("/ielts/attempts", wrapHTTP(deps.IELTSAttempt.ListAttempts))
		internal.POST("/ielts/attempts/:attemptID/violations", wrapHTTP(deps.IELTSAttempt.LogViolation))
		internal.GET("/ielts/attempts/:attemptID/violations", wrapHTTP(deps.IELTSAttempt.GetViolations))

		// IELTS dashboard & analytics
		internal.GET("/ielts/dashboard", wrapHTTP(deps.IELTSDashboard.GetDashboard))
		internal.GET("/ielts/dashboard/weakness", wrapHTTP(deps.IELTSDashboard.GetWeaknessAnalysis))
		internal.GET("/ielts/dashboard/score-history", wrapHTTP(deps.IELTSDashboard.GetScoreHistory))

		// IELTS study plan
		internal.POST("/ielts/study-plan", wrapHTTP(deps.IELTSStudyPlan.GeneratePlan))
		internal.GET("/ielts/study-plan", wrapHTTP(deps.IELTSStudyPlan.GetPlan))
		internal.GET("/ielts/study-plan/jobs/:jobID", wrapHTTP(deps.IELTSStudyPlan.GetPlanJob))
		internal.PUT("/ielts/study-plan/:planID", wrapHTTP(deps.IELTSStudyPlan.UpdatePlan))
		internal.POST("/ielts/study-plan/task", wrapHTTP(deps.IELTSStudyPlan.CompleteTask))
		internal.GET("/ielts/study-plan/tasks", wrapHTTP(deps.IELTSStudyPlan.GetTaskCompletions))
		internal.GET("/ielts/study-plan/progress", wrapHTTP(deps.IELTSStudyPlan.GetRoadmapProgress))
		internal.GET("/ielts/study-plan/history", wrapHTTP(deps.IELTSStudyPlan.GetPlanHistory))
		internal.POST("/ielts/study-plan/reflection", wrapHTTP(deps.IELTSStudyPlan.SubmitReflection))
		internal.GET("/ielts/study-plan/reflections", wrapHTTP(deps.IELTSStudyPlan.GetReflections))
		internal.GET("/ielts/study-plan/adaptive", wrapHTTP(deps.IELTSStudyPlan.CheckAdaptive))

		// English Learning Simulator
		internal.GET("/engsim/placement", wrapHTTP(deps.EngSim.GetPlacement))
		internal.POST("/engsim/placement/start", wrapHTTP(deps.EngSim.StartPlacement))
		internal.POST("/engsim/placement/submit", wrapHTTP(deps.EngSim.SubmitPlacement))
		internal.GET("/engsim/map", wrapHTTP(deps.EngSim.GetMap))
		internal.GET("/engsim/ielts-map", wrapHTTP(deps.EngSim.GetIELTSMap))
		internal.GET("/engsim/progress", wrapHTTP(deps.EngSim.GetProgress))
		internal.GET("/engsim/hearts", wrapHTTP(deps.EngSim.GetHearts))
		simLimiter := middleware.NewRateLimiter(10, 1*time.Minute).LimitByUser()
		internal.POST("/engsim/lessons/:lessonID/start", simLimiter, wrapHTTP(deps.EngSim.StartLesson))
		internal.POST("/engsim/lessons/:lessonID/answer", wrapHTTP(deps.EngSim.SubmitAnswer))
		internal.POST("/engsim/lessons/:lessonID/complete", wrapHTTP(deps.EngSim.CompleteLesson))
		internal.POST("/engsim/speaking", simLimiter, wrapHTTP(deps.EngSim.SpeakingPractice))

		// ── Gamification (streak, leagues, friends, achievements, quests) ──
		internal.POST("/gamification/activity", wrapHTTP(deps.Gamification.RecordActivity))
		internal.GET("/gamification/streak/calendar", wrapHTTP(deps.Gamification.GetStreakCalendar))
		internal.GET("/gamification/league", wrapHTTP(deps.Gamification.GetLeague))
		internal.GET("/gamification/friends", wrapHTTP(deps.Gamification.GetFriends))
		internal.POST("/gamification/friends/request", wrapHTTP(deps.Gamification.SendFriendRequest))
		internal.POST("/gamification/friends/accept", wrapHTTP(deps.Gamification.AcceptFriendRequest))
		internal.GET("/gamification/friends/search", wrapHTTP(deps.Gamification.SearchUsers))
		internal.GET("/gamification/achievements", wrapHTTP(deps.Gamification.GetAchievements))
		internal.GET("/gamification/quests", wrapHTTP(deps.Gamification.GetDailyQuests))
		internal.GET("/gamification/xp-event", wrapHTTP(deps.Gamification.GetXPEvent))
		internal.GET("/gamification/social-proof", wrapHTTP(deps.Gamification.GetSocialProof))
		// Cron endpoints (protected by same internal token)
		internal.POST("/gamification/cron/streak-warning", wrapHTTP(deps.Gamification.CronStreakWarning))
		internal.POST("/gamification/cron/comeback", wrapHTTP(deps.Gamification.CronComeback))
		internal.POST("/gamification/cron/league-week", wrapHTTP(deps.Gamification.CronLeagueWeek))
		internal.POST("/gamification/cron/weekend-xp", wrapHTTP(deps.Gamification.CronWeekendXP))

		// AI tutor chat
		chatLimiter := middleware.NewRateLimiter(20, 1*time.Minute).LimitByUser()
		internal.POST("/chat/message", chatLimiter, wrapHTTP(deps.Chat.SendMessage))
		internal.GET("/chat/history", wrapHTTP(deps.Chat.GetHistory))
		internal.DELETE("/chat/history", wrapHTTP(deps.Chat.ClearHistory))

		// Listening
		internal.GET("/listening/clips", wrapHTTP(deps.Listening.ListClips))
		internal.GET("/listening/clips/:id", wrapHTTP(deps.Listening.GetClip))
		internal.POST("/listening/progress", wrapHTTP(deps.Listening.RecordProgress))
		internal.GET("/listening/progress", wrapHTTP(deps.Listening.GetProgress))

		// AI Tutor scenarios
		tutorLimiter := middleware.NewRateLimiter(30, 1*time.Minute).LimitByUser()
		internal.GET("/tutor/scenarios", wrapHTTP(deps.AITutor.ListScenarios))
		internal.GET("/tutor/scenarios/:slug", wrapHTTP(deps.AITutor.GetScenario))
		internal.POST("/tutor/conversations", wrapHTTP(deps.AITutor.StartConversation))
		internal.POST("/tutor/conversations/:id/message", tutorLimiter, wrapHTTP(deps.AITutor.SendMessage))
		internal.POST("/tutor/conversations/:id/grade", wrapHTTP(deps.AITutor.GradeConversation))
		internal.GET("/tutor/history", wrapHTTP(deps.AITutor.GetHistory))

		// Web Push subscriptions
		internal.POST("/push/subscribe", wrapHTTP(deps.Push.Subscribe))
		internal.DELETE("/push/subscribe", wrapHTTP(deps.Push.Unsubscribe))

		// Sentence Mining
		miningLimiter := middleware.NewRateLimiter(20, 1*time.Minute).LimitByUser()
		internal.POST("/mining/extract", miningLimiter, wrapHTTP(deps.Mining.Extract))

		// Daily News
		internal.GET("/news/today", wrapHTTP(deps.DailyNews.GetToday))
		internal.GET("/news/recent", wrapHTTP(deps.DailyNews.GetRecent))
		internal.POST("/news/cron/generate", wrapHTTP(deps.DailyNews.CronGenerate))

		// IELTS admin question management
		internal.POST("/ielts/admin/questions", wrapHTTP(deps.IELTSQuestionAdmin.CreateQuestion))
		internal.PUT("/ielts/admin/questions/:questionID", wrapHTTP(deps.IELTSQuestionAdmin.UpdateQuestion))
		internal.DELETE("/ielts/admin/questions/:questionID", wrapHTTP(deps.IELTSQuestionAdmin.DeleteQuestion))
		internal.POST("/ielts/admin/questions/bulk", wrapHTTP(deps.IELTSQuestionAdmin.BulkCreateQuestions))
		internal.GET("/ielts/admin/questions/stats", wrapHTTP(deps.IELTSQuestionAdmin.GetQuestionStats))
	}

	// All admin routes are gated by RequireSuperadmin: developers/owners only.
	// (`role='admin'` is reserved for a future "school admin" role and does
	// NOT grant access here. Bootstrap with `UPDATE users SET is_superadmin=TRUE …`.)
	registerAdminRoutes := func(g *gin.RouterGroup) {
		g.Use(middleware.InternalAuth(deps.InternalAPIToken), middleware.RequireSuperadmin(deps.GormDB))
		// Question review (existing)
		g.GET("/review-questions", wrapHTTP(deps.QuestionReview.ListPending))
		g.POST("/review-questions/approve", wrapHTTP(deps.QuestionReview.ApproveBatch))
		// Quizizz analytics
		g.GET("/quizizz/analytics/summary", wrapHTTP(deps.AdminAnalytics.Summary))
		g.GET("/quizizz/analytics/daily", wrapHTTP(deps.AdminAnalytics.Daily))
		// Users
		g.GET("/users", wrapHTTP(deps.AdminUsers.List))
		g.PATCH("/users/:id", wrapHTTP(deps.AdminUsers.Patch))
		// Quizzes
		g.GET("/quizzes", wrapHTTP(deps.AdminQuizzes.List))
		g.PATCH("/quizzes/:id", wrapHTTP(deps.AdminQuizzes.Patch))
		// Audit log
		g.GET("/audit-log", wrapHTTP(deps.AdminAuditLog.List))
	}

	admin := api.Group("/admin")
	registerAdminRoutes(admin)

	adminAlias := router.Group("/api/admin")
	registerAdminRoutes(adminAlias)

	// Quiz read route — allows guests (empty X-User-ID) so unauthenticated
	// visitors can fetch public quiz data before signing up.
	guestOK := api.Group("")
	guestOK.Use(middleware.InternalAuthGuestOK(deps.InternalAPIToken))
	{
		guestOK.GET("/quizzes/:quizID", wrapHTTP(deps.Quiz.GetQuiz))
		guestOK.POST("/quizizz/events", wrapHTTP(deps.QuizUsageEvent.Create))
	}

	// Public read routes are registered above in the internal group.
	// They accept the internal token OR no auth (the handlers are permissive).

	if deps.Environment == "development" && deps.DebugDatabase != nil {
		router.GET("/debug/db", wrapHTTP(deps.DebugDatabase))
		router.POST("/dev/verify-email", deps.Auth.DevVerifyEmail)
	}
}

func wrapHTTP(next http.HandlerFunc) gin.HandlerFunc {
	return func(c *gin.Context) {
		req := cloneRequestWithParams(c)
		next(c.Writer, req)
	}
}

func cloneRequestWithParams(c *gin.Context) *http.Request {
	req := c.Request.Clone(c.Request.Context())
	for _, param := range c.Params {
		req.SetPathValue(param.Key, param.Value)
	}
	return req
}
