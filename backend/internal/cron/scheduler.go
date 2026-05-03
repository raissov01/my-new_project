// Package cron runs periodic background jobs for gamification retention loops.
// Jobs are idempotent — safe to re-run after a restart.
package cron

import (
	"fmt"
	"log"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"github.com/midoriya/flashlearn-backend/internal/service"
	"gorm.io/gorm"
)

// Scheduler holds the gamification and daily-news services and runs timed jobs.
type Scheduler struct {
	svc     *service.GamificationService
	newsSvc *service.DailyNewsService
	db      *gorm.DB
	stop    chan struct{}
}

func New(svc *service.GamificationService, newsSvc *service.DailyNewsService, db *gorm.DB) *Scheduler {
	return &Scheduler{svc: svc, newsSvc: newsSvc, db: db, stop: make(chan struct{})}
}

// Start launches all background goroutines. Call Stop() to halt.
func (s *Scheduler) Start() {
	log.Println("cron: starting scheduler")
	go s.runDaily("streak-warning", 22, 0, s.svc.SendStreakWarningBatch)
	go s.runDaily("comeback-emails", 9, 0, s.svc.SendComebackBatch)
	go s.runWeekly("league-week", time.Sunday, 23, 59, func() { _ = s.svc.ProcessLeagueWeek() })
	go s.runWeekly("weekend-xp", time.Friday, 18, 0, func() { _ = s.svc.CreateWeekendXPEvent() })
	go s.runDaily("daily-news", 6, 0, func() { _ = s.newsSvc.GenerateToday() })
}

// Stop signals all goroutines to exit cleanly.
func (s *Scheduler) Stop() {
	close(s.stop)
}

// runDaily fires fn every day when the clock reaches hh:mm UTC.
func (s *Scheduler) runDaily(name string, hour, minute int, fn func()) {
	for {
		next := nextOccurrence(hour, minute)
		log.Printf("cron: %s scheduled at %s", name, next.Format(time.RFC3339))
		select {
		case <-time.After(time.Until(next)):
			s.runJob(name, fn)
		case <-s.stop:
			return
		}
	}
}

// runWeekly fires fn every week on the given weekday at hh:mm UTC.
func (s *Scheduler) runWeekly(name string, weekday time.Weekday, hour, minute int, fn func()) {
	for {
		next := nextWeeklyOccurrence(weekday, hour, minute)
		log.Printf("cron: %s scheduled at %s", name, next.Format(time.RFC3339))
		select {
		case <-time.After(time.Until(next)):
			s.runJob(name, fn)
		case <-s.stop:
			return
		}
	}
}

// RunNow triggers a named job out-of-band (used by the admin "Run now" button).
// The schedule loop keeps ticking — this just adds an extra invocation.
func (s *Scheduler) RunNow(name string) error {
	switch name {
	case "streak-warning":
		go s.runJob(name, s.svc.SendStreakWarningBatch)
	case "comeback-emails":
		go s.runJob(name, s.svc.SendComebackBatch)
	case "league-week":
		go s.runJob(name, func() { _ = s.svc.ProcessLeagueWeek() })
	case "weekend-xp":
		go s.runJob(name, func() { _ = s.svc.CreateWeekendXPEvent() })
	case "daily-news":
		go s.runJob(name, func() { _ = s.newsSvc.GenerateToday() })
	default:
		return fmt.Errorf("unknown job: %s", name)
	}
	return nil
}

// JobNames returns the canonical list of jobs the scheduler knows about, in
// display order. The admin UI iterates this so a job that has never run yet
// still gets a row.
func (s *Scheduler) JobNames() []string {
	return []string{"daily-news", "streak-warning", "comeback-emails", "weekend-xp", "league-week"}
}

// runJob wraps fn with start/finish logging and a job_runs row so the admin
// panel can show last-run/last-error per job. Panics are caught and recorded
// as errors instead of crashing the scheduler goroutine.
func (s *Scheduler) runJob(name string, fn func()) {
	log.Printf("cron: running %s", name)
	start := time.Now()
	row := models.JobRun{Name: name, StartedAt: start, Status: "success"}
	defer func() {
		if r := recover(); r != nil {
			row.Status = "error"
			row.Error = fmt.Sprintf("panic: %v", r)
			log.Printf("cron: %s panic: %v", name, r)
		}
		end := time.Now()
		row.FinishedAt = end
		row.DurationMs = int(end.Sub(start).Milliseconds())
		if s.db != nil {
			if err := s.db.Create(&row).Error; err != nil {
				log.Printf("cron: failed to record job_run for %s: %v", name, err)
			}
		}
	}()
	fn()
}

// nextOccurrence returns the next UTC time for hh:mm today-or-tomorrow.
func nextOccurrence(hour, minute int) time.Time {
	now := time.Now().UTC()
	t := time.Date(now.Year(), now.Month(), now.Day(), hour, minute, 0, 0, time.UTC)
	if !t.After(now) {
		t = t.AddDate(0, 0, 1)
	}
	return t
}

// nextWeeklyOccurrence returns the next time the given weekday+hh:mm occurs.
func nextWeeklyOccurrence(weekday time.Weekday, hour, minute int) time.Time {
	now := time.Now().UTC()
	today := int(now.Weekday())
	target := int(weekday)
	daysAhead := (target - today + 7) % 7

	candidate := time.Date(now.Year(), now.Month(), now.Day()+daysAhead, hour, minute, 0, 0, time.UTC)
	if !candidate.After(now) {
		candidate = candidate.AddDate(0, 0, 7)
	}
	return candidate
}
