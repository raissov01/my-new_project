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
	leaderboardRepo := repository.NewLeaderboard(pool)
	leaderboardSvc := service.NewLeaderboard(leaderboardRepo)
	leaderboardHandler := handler.NewLeaderboard(leaderboardSvc, cfg.Environment)
	profileRepo := repository.NewProfile(pool)
	profileSvc := service.NewProfile(profileRepo)
	profileHandler := handler.NewProfile(profileSvc, cfg.Environment)
	setRepo := repository.NewSet(pool)
	setSvc := service.NewSet(setRepo)
	setHandler := handler.NewSet(setSvc, cfg.Environment)
	dashboardRepo := repository.NewDashboard(pool)
	dashboardSvc := service.NewDashboard(dashboardRepo)
	dashboardHandler := handler.NewDashboard(dashboardSvc, cfg.Environment)
	classroomRepo := repository.NewClassroom(pool)
	classroomSvc := service.NewClassroom(classroomRepo)
	classroomHandler := handler.NewClassroom(classroomSvc, cfg.Environment)

	// ── Routes ──────────────────────────────────────────────────────────────
	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Leaderboard (public read, auth optional for "your rank")
	mux.HandleFunc("GET /api/v1/leaderboard", middleware.OptionalAuth(leaderboardHandler.GetLeaderboard))
	mux.HandleFunc("GET /api/v1/me", middleware.InternalAuth(cfg.InternalAPIToken, profileHandler.GetMe))
	mux.HandleFunc("GET /api/v1/sets/overview", middleware.InternalAuth(cfg.InternalAPIToken, setHandler.GetOverview))
	mux.HandleFunc("GET /api/v1/dashboard/teacher", middleware.InternalAuth(cfg.InternalAPIToken, dashboardHandler.GetTeacherSummary))
	mux.HandleFunc("GET /api/v1/dashboard/student", middleware.InternalAuth(cfg.InternalAPIToken, dashboardHandler.GetStudentSummary))
	mux.HandleFunc("GET /api/v1/classroom/owned-groups", middleware.InternalAuth(cfg.InternalAPIToken, classroomHandler.GetOwnedGroups))
	mux.HandleFunc("GET /api/v1/classroom/available-sets", middleware.InternalAuth(cfg.InternalAPIToken, classroomHandler.GetAvailableSets))
	mux.HandleFunc("GET /api/v1/classroom/my-challenges", middleware.InternalAuth(cfg.InternalAPIToken, classroomHandler.GetMyChallenges))
	mux.HandleFunc("GET /api/v1/classroom/groups/{groupID}", middleware.InternalAuth(cfg.InternalAPIToken, classroomHandler.GetTeacherClassroomDetail))

	// Debug: check if required views/tables exist (dev only)
	if cfg.Environment == "development" {
		mux.HandleFunc("GET /debug/db", func(w http.ResponseWriter, r *http.Request) {
			checks := []string{
				"leaderboard_stats",
				"leaderboard_daily",
				"leaderboard_weekly",
				"profiles",
				"study_progress",
				"pomodoro_sessions",
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
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	})

	// ── Server ──────────────────────────────────────────────────────────────
	addr := fmt.Sprintf(":%s", cfg.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      c.Handler(mux),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		log.Printf("server listening on %s", addr)
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
