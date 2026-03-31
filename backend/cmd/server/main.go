package main

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

	"github.com/midoriya/flashlearn-backend/internal/config"
	"github.com/midoriya/flashlearn-backend/internal/database"
	"github.com/midoriya/flashlearn-backend/internal/handler"
	"github.com/midoriya/flashlearn-backend/internal/middleware"
	"github.com/midoriya/flashlearn-backend/internal/repository"
	"github.com/midoriya/flashlearn-backend/internal/service"
	"github.com/rs/cors"
)

func main() {
	// ── Load config ─────────────────────────────────────────────────────────
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	// ── Connect to database ─────────────────────────────────────────────────
	pool, err := database.Connect(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer pool.Close()
	log.Println("database connected")

	// ── Wire dependencies ───────────────────────────────────────────────────
	internalAuth := func(next http.HandlerFunc) http.HandlerFunc {
		return middleware.InternalAuth(cfg.InternalAPIToken, next)
	}

	// Existing read-only modules
	leaderboardRepo := repository.NewLeaderboard(pool)
	leaderboardSvc := service.NewLeaderboard(leaderboardRepo)
	leaderboardH := handler.NewLeaderboard(leaderboardSvc, cfg.Environment)

	profileRepo := repository.NewProfile(pool)
	profileSvc := service.NewProfile(profileRepo)
	profileH := handler.NewProfile(profileSvc, cfg.Environment)

	setRepo := repository.NewSet(pool)
	setSvc := service.NewSet(setRepo)
	setH := handler.NewSet(setSvc, cfg.Environment)

	dashboardRepo := repository.NewDashboard(pool)
	dashboardSvc := service.NewDashboard(dashboardRepo)
	dashboardH := handler.NewDashboard(dashboardSvc, cfg.Environment)

	classroomRepo := repository.NewClassroom(pool)
	classroomSvc := service.NewClassroom(classroomRepo)
	classroomH := handler.NewClassroom(classroomSvc, cfg.Environment)

	// New write modules
	progressRepo := repository.NewProgress(pool)
	progressSvc := service.NewProgress(progressRepo)
	progressH := handler.NewProgress(progressSvc, cfg.Environment)

	flashcardRepo := repository.NewFlashcard(pool)
	flashcardSvc := service.NewFlashcard(flashcardRepo)
	flashcardH := handler.NewFlashcard(flashcardSvc, cfg.Environment)

	challengeRepo := repository.NewChallenge(pool)
	challengeSvc := service.NewChallenge(challengeRepo)
	challengeH := handler.NewChallengeHandler(challengeSvc, cfg.Environment)

	profileWriteH := handler.NewProfileWrite(classroomRepo, cfg.Environment)

	aiH := handler.NewAI(cfg.GeminiAPIKey, cfg.GeminiModel, cfg.MaxUploadBytes)

	// ── Routes ──────────────────────────────────────────────────────────────
	mux := http.NewServeMux()

	// Health
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	// ── READ endpoints (existing) ──────────────────────────────────────────
	mux.HandleFunc("GET /api/v1/leaderboard", middleware.OptionalAuth(leaderboardH.GetLeaderboard))
	mux.HandleFunc("GET /api/v1/me", internalAuth(profileH.GetMe))
	mux.HandleFunc("GET /api/v1/sets/overview", internalAuth(setH.GetOverview))
	mux.HandleFunc("GET /api/v1/dashboard/teacher", internalAuth(dashboardH.GetTeacherSummary))
	mux.HandleFunc("GET /api/v1/dashboard/student", internalAuth(dashboardH.GetStudentSummary))
	mux.HandleFunc("GET /api/v1/classroom/owned-groups", internalAuth(classroomH.GetOwnedGroups))
	mux.HandleFunc("GET /api/v1/classroom/available-sets", internalAuth(classroomH.GetAvailableSets))
	mux.HandleFunc("GET /api/v1/classroom/my-challenges", internalAuth(classroomH.GetMyChallenges))
	mux.HandleFunc("GET /api/v1/classroom/groups/{groupID}", internalAuth(classroomH.GetTeacherClassroomDetail))

	// ── WRITE endpoints (new) ──────────────────────────────────────────────

	// Study progress
	mux.HandleFunc("POST /api/v1/progress/session", internalAuth(progressH.SaveSession))
	mux.HandleFunc("GET /api/v1/progress/stats", internalAuth(progressH.GetStats))
	mux.HandleFunc("POST /api/v1/progress/toggle-weak", internalAuth(progressH.ToggleWeak))

	// Pomodoro
	mux.HandleFunc("GET /api/v1/pomodoro/preferences", internalAuth(progressH.GetPomodoro))
	mux.HandleFunc("POST /api/v1/pomodoro/preferences", internalAuth(progressH.SavePomodoro))
	mux.HandleFunc("POST /api/v1/pomodoro/session", internalAuth(progressH.SavePomodoroSession))

	// Flashcard sets CRUD
	mux.HandleFunc("POST /api/v1/sets", internalAuth(flashcardH.CreateSet))
	mux.HandleFunc("GET /api/v1/sets/{setID}", internalAuth(flashcardH.GetSet))
	mux.HandleFunc("PUT /api/v1/sets/{setID}", internalAuth(flashcardH.UpdateSet))
	mux.HandleFunc("DELETE /api/v1/sets/{setID}", internalAuth(flashcardH.DeleteSet))

	// Challenges
	mux.HandleFunc("POST /api/v1/challenges/attempt", internalAuth(challengeH.SaveAttempt))
	mux.HandleFunc("GET /api/v1/challenges/ranking/{setID}", challengeH.GetRanking)
	mux.HandleFunc("POST /api/v1/challenges/class-attempt", internalAuth(challengeH.SaveClassAttempt))

	// Profile / role
	mux.HandleFunc("POST /api/v1/profile/role", internalAuth(profileWriteH.UpdateRole))

	// AI generation
	mux.HandleFunc("POST /api/v1/ai/generate", internalAuth(aiH.Generate))

	// ── Debug (dev only) ───────────────────────────────────────────────────
	if cfg.Environment == "development" {
		mux.HandleFunc("GET /debug/db", func(w http.ResponseWriter, r *http.Request) {
			checks := []string{
				"leaderboard_stats", "leaderboard_daily", "leaderboard_weekly",
				"profiles", "study_progress", "pomodoro_sessions",
				"flashcard_sets", "flashcards", "challenge_attempts",
				"class_groups", "class_group_members",
			}
			results := make(map[string]string)
			for _, name := range checks {
				var exists bool
				err := pool.QueryRow(r.Context(),
					`SELECT EXISTS (
						SELECT 1 FROM information_schema.tables
						WHERE table_schema = 'public' AND table_name = $1
						UNION
						SELECT 1 FROM pg_matviews
						WHERE schemaname = 'public' AND matviewname = $1
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
			json.NewEncoder(w).Encode(results)
		})
	}

	// ── CORS ────────────────────────────────────────────────────────────────
	c := cors.New(cors.Options{
		AllowedOrigins:   cfg.CORSOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type", "X-User-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	})

	// ── Server ──────────────────────────────────────────────────────────────
	addr := fmt.Sprintf(":%s", cfg.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      c.Handler(mux),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 60 * time.Second, // longer for AI generation
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("server listening on %s (%s)", addr, cfg.Environment)
		log.Printf("routes: %d READ + %d WRITE endpoints", 9, 12)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("shutdown: %v", err)
	}
	log.Println("server stopped")
}
