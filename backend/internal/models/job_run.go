package models

import "time"

// JobRun is one row per background job execution. Written by the cron
// scheduler so the admin panel can answer "did the daily news job run, when,
// and did it succeed?" without ssh into the container.
//
// FinishedAt may be zero for jobs killed mid-flight by a process restart;
// the admin UI shows those as "stuck/abandoned" so they're visually distinct
// from clean failures.
type JobRun struct {
	ID         string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name       string    `gorm:"type:varchar(64);not null;index"                json:"name"`
	StartedAt  time.Time `gorm:"not null;index"                                 json:"startedAt"`
	FinishedAt time.Time `gorm:"index"                                          json:"finishedAt"`
	DurationMs int       `gorm:"not null;default:0"                             json:"durationMs"`
	Status     string    `gorm:"type:varchar(16);not null;index"                json:"status"`
	Error      string    `gorm:"type:text;not null;default:''"                  json:"error,omitempty"`
}

func (JobRun) TableName() string {
	return "job_runs"
}
