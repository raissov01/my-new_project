// Package cron runs periodic background jobs for gamification retention loops.
// Jobs are idempotent — safe to re-run after a restart.
package cron

import (
	"log"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/service"
)

// Scheduler holds the gamification service and runs timed jobs.
type Scheduler struct {
	svc  *service.GamificationService
	stop chan struct{}
}

func New(svc *service.GamificationService) *Scheduler {
	return &Scheduler{svc: svc, stop: make(chan struct{})}
}

// Start launches all background goroutines. Call Stop() to halt.
func (s *Scheduler) Start() {
	log.Println("cron: starting gamification scheduler")
	go s.runDaily("streak-warning",  22, 0,  s.svc.SendStreakWarningBatch)
	go s.runDaily("comeback-emails",  9, 0,  s.svc.SendComebackBatch)
	go s.runWeekly("league-week", time.Sunday, 23, 59, func() { _ = s.svc.ProcessLeagueWeek() })
	go s.runWeekly("weekend-xp",  time.Friday, 18,  0, func() { _ = s.svc.CreateWeekendXPEvent() })
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
			log.Printf("cron: running %s", name)
			fn()
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
			log.Printf("cron: running %s", name)
			fn()
		case <-s.stop:
			return
		}
	}
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
