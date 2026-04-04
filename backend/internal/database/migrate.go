package database

import (
	"log"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// AutoMigrate creates/updates all database tables from GORM models.
func AutoMigrate(db *gorm.DB) error {
	log.Println("Running GORM auto-migration...")

	err := db.AutoMigrate(
		&models.User{},
		&models.FlashcardSet{},
		&models.Flashcard{},
		&models.StudyProgress{},
		&models.ClassGroup{},
		&models.ClassGroupMember{},
		&models.ClassSetAssignment{},
		&models.ClassChallenge{},
		&models.ClassChallengeParticipant{},
		&models.ChallengeAttempt{},
		&models.ClassChallengeAttempt{},
		&models.PomodoroPreference{},
		&models.PomodoroSession{},
		&models.IELTSMaterial{},
		&models.IELTSWritingSubmission{},
		&models.IELTSSpeakingSession{},
		&models.IELTSQuestion{},
		&models.IELTSMockExam{},
		&models.IELTSAttempt{},
		&models.IELTSViolation{},
		&models.IELTSStudyPlan{},
		&models.IELTSTaskCompletion{},
		&models.IELTSWeeklyReflection{},
		&models.TelegramPost{},
	)
	if err != nil {
		return err
	}

	log.Println("GORM auto-migration complete")

	// Drop old restrictive CHECK constraint on question_type and replace with
	// an expanded one that supports all IELTS question types.
	db.Exec(`ALTER TABLE ielts_questions DROP CONSTRAINT IF EXISTS chk_ielts_questions_question_type`)
	db.Exec(`ALTER TABLE ielts_questions ADD CONSTRAINT chk_ielts_questions_question_type CHECK (question_type IN ('task1','task2','part1','part2','part3','multiple_choice','fill_blank','true_false','matching','true_false_not_given','yes_no_not_given','matching_headings','matching_information','sentence_completion','summary_completion','short_answer'))`)

	// Expand task_completion status to include 'rescheduled'
	db.Exec(`ALTER TABLE ielts_task_completions DROP CONSTRAINT IF EXISTS chk_ielts_task_completions_status`)

	// Mark all existing users (who registered before email verification was added)
	// as verified so they are not locked out of their accounts.
	result := db.Exec(`UPDATE users SET email_verified = true WHERE email_verified = false AND verification_token IS NULL`)
	if result.Error != nil {
		log.Printf("warning: failed to backfill email_verified for existing users: %v", result.Error)
	} else if result.RowsAffected > 0 {
		log.Printf("backfilled email_verified=true for %d existing users", result.RowsAffected)
	}

	if err := seedIELTSContent(db); err != nil {
		return err
	}

	return nil
}
