package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/midoriya/flashlearn-backend/internal/middleware"
)

type Dependencies struct {
	InternalAPIToken string
	JWTSecret        string
	Environment      string

	Auth            *AuthHandler
	GoogleOAuth     *GoogleOAuthHandler
	IELTSMaterial   *IELTSMaterialHandler
	IELTSExaminer   *IELTSExaminerHandler
	Leaderboard   *Leaderboard
	Profile       *Profile
	Set           *Set
	Dashboard     *Dashboard
	Classroom     *Classroom
	Progress      *Progress
	Flashcard     *FlashcardHandler
	Challenge     *ChallengeHandler
	ProfileWrite  *ProfileWriteHandler
	AI            *AIHandler
	DebugDatabase http.HandlerFunc
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

	// ── Public auth routes (no token required) ──────────────────────────
	api.POST("/auth/register", deps.Auth.Register)
	api.POST("/auth/login", deps.Auth.Login)
	api.GET("/auth/verify-email", deps.Auth.VerifyEmail)
	api.POST("/auth/resend-verification", deps.Auth.ResendVerification)
	api.GET("/auth/google", deps.GoogleOAuth.RedirectToGoogle)
	api.GET("/auth/google/callback", deps.GoogleOAuth.HandleCallback)

	// ── Public IELTS routes (no auth required for reading) ──────────────
	api.GET("/ielts/materials", deps.IELTSMaterial.List)
	api.GET("/ielts/materials/:id", deps.IELTSMaterial.Get)
	api.GET("/ielts/questions", wrapHTTP(deps.IELTSExaminer.GetQuestions))

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
		internal.POST("/ai/generate", wrapHTTP(deps.AI.Generate))

		// IELTS AI examiner (requires internal auth)
		internal.POST("/ielts/writing/evaluate", wrapHTTP(deps.IELTSExaminer.EvaluateWriting))
		internal.GET("/ielts/writing/history", wrapHTTP(deps.IELTSExaminer.GetWritingHistory))
		internal.POST("/ielts/speaking/evaluate", wrapHTTP(deps.IELTSExaminer.EvaluateSpeaking))
		internal.GET("/ielts/speaking/history", wrapHTTP(deps.IELTSExaminer.GetSpeakingHistory))

		// IELTS material admin CRUD (requires internal auth — teacher/admin)
		internal.POST("/ielts/materials", deps.IELTSMaterial.Create)
		internal.PUT("/ielts/materials/:id", deps.IELTSMaterial.Update)
		internal.DELETE("/ielts/materials/:id", deps.IELTSMaterial.Delete)
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
