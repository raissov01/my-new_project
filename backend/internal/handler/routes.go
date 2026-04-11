package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/midoriya/flashlearn-backend/internal/middleware"
)

type Dependencies struct {
	InternalAPIToken string
	JWTSecret        string
	Environment      string

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
	Challenge          *ChallengeHandler
	ProfileWrite       *ProfileWriteHandler
	AI                 *AIHandler
	Chat               *ChatHandler
	Files              *FilesHandler
	EngSim             *EngSimHandler
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
	api.GET("/auth/verify-email", deps.Auth.VerifyEmail)
	api.POST("/auth/resend-verification", authLimiter, deps.Auth.ResendVerification)
	api.GET("/auth/google", deps.GoogleOAuth.RedirectToGoogle)
	api.GET("/auth/google/callback", deps.GoogleOAuth.HandleCallback)

	// ── Public file serving (materials PDFs) ────────────────────────────
	api.GET("/files/*filepath", wrapHTTP(deps.Files.Serve))

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

		// IELTS AI examiner (requires internal auth)
		internal.POST("/ielts/writing/evaluate", aiLimiter, wrapHTTP(deps.IELTSExaminer.EvaluateWriting))
		internal.GET("/ielts/writing/history", wrapHTTP(deps.IELTSExaminer.GetWritingHistory))
		internal.POST("/ielts/speaking/evaluate", aiLimiter, wrapHTTP(deps.IELTSExaminer.EvaluateSpeaking))
		internal.GET("/ielts/speaking/history", wrapHTTP(deps.IELTSExaminer.GetSpeakingHistory))

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
		internal.GET("/engsim/progress", wrapHTTP(deps.EngSim.GetProgress))
		internal.GET("/engsim/hearts", wrapHTTP(deps.EngSim.GetHearts))
		simLimiter := middleware.NewRateLimiter(10, 1*time.Minute).LimitByUser()
		internal.POST("/engsim/lessons/:lessonID/start", simLimiter, wrapHTTP(deps.EngSim.StartLesson))
		internal.POST("/engsim/lessons/:lessonID/answer", wrapHTTP(deps.EngSim.SubmitAnswer))
		internal.POST("/engsim/lessons/:lessonID/complete", wrapHTTP(deps.EngSim.CompleteLesson))
		internal.POST("/engsim/speaking", simLimiter, wrapHTTP(deps.EngSim.SpeakingPractice))

		// AI tutor chat
		chatLimiter := middleware.NewRateLimiter(20, 1*time.Minute).LimitByUser()
		internal.POST("/chat/message", chatLimiter, wrapHTTP(deps.Chat.SendMessage))
		internal.GET("/chat/history", wrapHTTP(deps.Chat.GetHistory))
		internal.DELETE("/chat/history", wrapHTTP(deps.Chat.ClearHistory))

		// IELTS admin question management
		internal.POST("/ielts/admin/questions", wrapHTTP(deps.IELTSQuestionAdmin.CreateQuestion))
		internal.PUT("/ielts/admin/questions/:questionID", wrapHTTP(deps.IELTSQuestionAdmin.UpdateQuestion))
		internal.DELETE("/ielts/admin/questions/:questionID", wrapHTTP(deps.IELTSQuestionAdmin.DeleteQuestion))
		internal.POST("/ielts/admin/questions/bulk", wrapHTTP(deps.IELTSQuestionAdmin.BulkCreateQuestions))
		internal.GET("/ielts/admin/questions/stats", wrapHTTP(deps.IELTSQuestionAdmin.GetQuestionStats))
	}

	// Public read routes are registered above in the internal group.
	// They accept the internal token OR no auth (the handlers are permissive).

	if deps.Environment == "development" && deps.DebugDatabase != nil {
		router.GET("/debug/db", wrapHTTP(deps.DebugDatabase))
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
