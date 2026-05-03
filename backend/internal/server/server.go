package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/midoriya/flashlearn-backend/internal/config"
	"github.com/midoriya/flashlearn-backend/internal/cron"
	"github.com/midoriya/flashlearn-backend/internal/database"
	"github.com/midoriya/flashlearn-backend/internal/email"
	"github.com/midoriya/flashlearn-backend/internal/handler"
	"github.com/midoriya/flashlearn-backend/internal/hub"
	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/repository"
	"github.com/midoriya/flashlearn-backend/internal/service"
	"github.com/rs/cors"
	"gorm.io/gorm"
)

type Server struct {
	cfg        *config.Config
	db         *pgxpool.Pool
	gormDB     *gorm.DB
	httpServer *http.Server
	scheduler  *cron.Scheduler
}

func New(cfg *config.Config) (*Server, error) {
	readyCtx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	if err := database.WaitUntilReady(readyCtx, cfg.DatabaseURL); err != nil {
		return nil, fmt.Errorf("database readiness: %w", err)
	}

	// pgx pool (for existing repository layer — will be replaced incrementally)
	pool, err := database.Connect(context.Background(), cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("database (pgx): %w", err)
	}

	// GORM connection (for auth + new models)
	gormDB, err := database.ConnectGorm(cfg.DatabaseURL, cfg.Environment)
	if err != nil {
		pool.Close()
		return nil, fmt.Errorf("database (gorm): %w", err)
	}

	// Auto-migrate GORM models (creates/updates tables)
	if err := database.AutoMigrate(gormDB); err != nil {
		pool.Close()
		return nil, fmt.Errorf("migration: %w", err)
	}

	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery(), middleware.APIMetrics())

	gameSvc := service.NewGamification(gormDB, email.NewSender(cfg.ResendAPIKey, cfg.ResendFrom, cfg.FrontendURL, gormDB))
	newsSvc := service.NewDailyNews(gormDB, cfg.OpenAIAPIKey, cfg.OpenAIModelMini, cfg.AIRequestTimeout)
	scheduler := cron.New(gameSvc, newsSvc, gormDB)

	deps := buildDependencies(cfg, pool, gormDB)
	deps.AdminJobs = handler.NewAdminJobs(gormDB, scheduler)
	handler.SetDependencies(deps)
	handler.RegisterRoutes(router)

	scheduler.Start()

	httpServer := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      buildHTTPHandler(cfg, router),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 600 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	return &Server{
		cfg:        cfg,
		db:         pool,
		gormDB:     gormDB,
		httpServer: httpServer,
		scheduler:  scheduler,
	}, nil
}

func (s *Server) Run() error {
	defer s.db.Close()
	defer s.scheduler.Stop()
	log.Println("database connected (pgx + GORM)")

	errCh := make(chan error, 1)
	go func() {
		log.Printf("server listening on %s (%s)", s.httpServer.Addr, s.cfg.Environment)
		if err := s.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errCh <- err
			return
		}
		errCh <- nil
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	select {
	case sig := <-quit:
		log.Printf("shutting down on %s...", sig)
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := s.httpServer.Shutdown(ctx); err != nil {
			return fmt.Errorf("shutdown: %w", err)
		}
		log.Println("server stopped")
		return nil
	case err := <-errCh:
		if err != nil {
			return fmt.Errorf("listen: %w", err)
		}
		return nil
	}
}

func buildHTTPHandler(cfg *config.Config, router *gin.Engine) http.Handler {
	c := cors.New(cors.Options{
		AllowedOrigins:   cfg.CORSOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type", "X-User-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	})
	return c.Handler(router)
}

func buildDependencies(cfg *config.Config, pool *pgxpool.Pool, gormDB *gorm.DB) handler.Dependencies {
	leaderboardRepo := repository.NewLeaderboard(pool)
	leaderboardSvc := service.NewLeaderboard(leaderboardRepo)

	profileRepo := repository.NewProfile(pool)
	profileSvc := service.NewProfile(profileRepo)

	setRepo := repository.NewSet(pool)
	setSvc := service.NewSet(setRepo)

	dashboardRepo := repository.NewDashboard(pool)
	dashboardSvc := service.NewDashboard(dashboardRepo)

	classroomRepo := repository.NewClassroom(pool)
	classroomSvc := service.NewClassroom(classroomRepo)

	progressRepo := repository.NewProgress(pool)
	progressSvc := service.NewProgress(progressRepo)

	flashcardRepo := repository.NewFlashcard(pool)
	flashcardSvc := service.NewFlashcard(flashcardRepo)

	quizRepo := repository.NewQuiz(pool)
	quizSvc := service.NewQuiz(quizRepo)

	challengeRepo := repository.NewChallenge(pool)
	challengeSvc := service.NewChallenge(challengeRepo)

	chatRepo := repository.NewChat(gormDB)

	emailSender := email.NewSender(cfg.ResendAPIKey, cfg.ResendFrom, cfg.FrontendURL, gormDB)

	adminLiveHub := hub.NewAdminLiveHub()

	return handler.Dependencies{
		InternalAPIToken:   cfg.InternalAPIToken,
		JWTSecret:          cfg.JWTSecret,
		Environment:        cfg.Environment,
		GormDB:             gormDB,
		Auth:               handler.NewAuth(gormDB, cfg.JWTSecret, emailSender, cfg.FrontendURL),
		GoogleOAuth:        handler.NewGoogleOAuth(gormDB, cfg.JWTSecret, cfg.GoogleClientID, cfg.GoogleClientSecret, cfg.GoogleRedirectURL, cfg.FrontendURL),
		Leaderboard:        handler.NewLeaderboard(leaderboardSvc, cfg.Environment),
		Profile:            handler.NewProfile(profileSvc, cfg.Environment),
		Set:                handler.NewSet(setSvc, cfg.Environment),
		Dashboard:          handler.NewDashboard(dashboardSvc, cfg.Environment),
		Classroom:          handler.NewClassroom(classroomSvc, gormDB, cfg.Environment),
		Progress:           handler.NewProgress(progressSvc, cfg.Environment),
		Flashcard:          handler.NewFlashcard(flashcardSvc, cfg.Environment),
		Quiz:               handler.NewQuiz(quizSvc, cfg.Environment),
		QuizUsageEvent:     handler.NewQuizUsageEvent(gormDB, adminLiveHub),
		Challenge:          handler.NewChallengeHandler(challengeSvc, cfg.Environment),
		ProfileWrite:       handler.NewProfileWrite(classroomRepo, cfg.Environment),
		AI:                 handler.NewAI(gormDB, cfg.OpenAIAPIKey, cfg.OpenAIModelMini, cfg.OpenAIModelMiniFallback, cfg.AIRequestTimeout, cfg.MaxUploadBytes),
		IELTSMaterial:      handler.NewIELTSMaterial(gormDB),
		IELTSExaminer:      handler.NewIELTSExaminer(gormDB, cfg.OpenAIAPIKey, cfg.OpenAIModel, cfg.ClaudeAPIKey, cfg.ClaudeModel, cfg.ClaudeFallbackModel, cfg.ClaudeAPIURL, cfg.AIRequestTimeout),
		IELTSAttempt:       handler.NewIELTSAttempt(gormDB),
		IELTSStudyPlan:     handler.NewIELTSStudyPlan(gormDB, cfg.OpenAIAPIKey, cfg.OpenAIModel, cfg.ClaudeAPIKey, cfg.ClaudeModel, cfg.ClaudeFallbackModel, cfg.ClaudeAPIURL, cfg.AIRequestTimeout),
		IELTSDashboard:     handler.NewIELTSDashboard(gormDB),
		IELTSQuestionAdmin: handler.NewIELTSQuestionAdmin(gormDB),
		Chat:               handler.NewChat(chatRepo, cfg.OpenAIAPIKey, cfg.OpenAIModel, cfg.ClaudeAPIKey, cfg.ClaudeModel, cfg.ClaudeFallbackModel, cfg.ClaudeAPIURL, cfg.AIRequestTimeout),
		Files:              handler.NewFiles("telegram-media"),
		QuizImage:          handler.NewQuizImage("uploads/quiz-images", 5*1024*1024),
		QuizAudio:          handler.NewQuizAudio("uploads/quiz-audio", 25*1024*1024),
		QuizLive:           handler.NewQuizLive(gormDB),
		QuizAIGenerate:     handler.NewQuizAIGenerate(service.NewQuizAIGenerate(gormDB, cfg.OpenAIAPIKey, cfg.OpenAIModelMini, cfg.AIRequestTimeout)),
		MaterialNotes:      handler.NewMaterialNotes(gormDB),
		EngSim:             handler.NewEngSim(gormDB, cfg.ClaudeAPIKey, cfg.ClaudeModel, cfg.ClaudeFallbackModel, cfg.ClaudeAPIURL, cfg.OpenAIAPIKey, cfg.OpenAIModel, cfg.AIRequestTimeout),
		Gamification:       handler.NewGamification(gormDB, emailSender),
		Listening:          handler.NewListening(gormDB),
		AITutor:            handler.NewAITutor(gormDB, cfg.OpenAIAPIKey, cfg.OpenAIModelMini, cfg.ClaudeAPIKey, cfg.ClaudeModel, cfg.ClaudeAPIURL, cfg.AIRequestTimeout),
		QuestionReview:     handler.NewQuestionReview(gormDB),
		AdminAnalytics:     handler.NewAdminQuizizzAnalytics(gormDB),
		AdminUsers:         handler.NewAdminUsers(gormDB),
		AdminQuizzes:       handler.NewAdminQuizzes(gormDB),
		AdminAuditLog:      handler.NewAdminAuditLog(gormDB),
		AdminLiveWS:        handler.NewAdminLiveWS(gormDB, adminLiveHub, cfg.JWTSecret),
		AdminSystem:        handler.NewAdminSystem(pool),
		AdminAPIMetrics:    handler.NewAdminAPIMetrics(),
		AdminAIUsage:       handler.NewAdminAIUsage(gormDB),
		AdminDeliverability: handler.NewAdminDeliverability(gormDB),
		AdminStorage: handler.NewAdminStorage([]handler.NamedPath{
			{Name: "Quiz images", Path: "uploads/quiz-images"},
			{Name: "Quiz audio", Path: "uploads/quiz-audio"},
			{Name: "Telegram media", Path: "telegram-media"},
			{Name: "Listening clips", Path: "/usr/share/nginx/audio"},
		}),
		DailyNews:          handler.NewDailyNews(gormDB, cfg.OpenAIAPIKey, cfg.OpenAIModelMini, cfg.AIRequestTimeout),
		Mining:             handler.NewMining(gormDB, cfg.OpenAIAPIKey, cfg.OpenAIModelMini, cfg.AIRequestTimeout),
		Billing:            handler.NewBilling(gormDB, cfg.LemonSqueezyWebhookSecret, cfg.LemonSqueezyCheckoutURL),
		Push:               handler.NewPush(gormDB, cfg.VAPIDPublicKey, cfg.VAPIDPrivateKey),
		Notification:       handler.NewNotification(gormDB),
		Contact:            handler.NewContact(emailSender, cfg.ContactEmail),
		DebugDatabase:      buildDebugDatabaseHandler(pool),
	}
}

func buildDebugDatabaseHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		checks := []string{
			"users", "flashcard_sets", "flashcards", "study_progress",
			"class_groups", "class_group_members", "class_challenges",
			"challenge_attempts", "pomodoro_preferences", "pomodoro_sessions",
		}
		results := make(map[string]string)
		for _, name := range checks {
			var exists bool
			err := pool.QueryRow(r.Context(),
				`SELECT EXISTS (
					SELECT 1 FROM information_schema.tables
					WHERE table_schema = 'public' AND table_name = $1
				)`, name).Scan(&exists)
			if err != nil {
				results[name] = "error: " + err.Error()
			} else if exists {
				results[name] = "ok"
			} else {
				results[name] = "MISSING"
			}
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(results)
	}
}
