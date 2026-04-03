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
	)
	if err != nil {
		return err
	}

	log.Println("GORM auto-migration complete")

	// Mark all existing users (who registered before email verification was added)
	// as verified so they are not locked out of their accounts.
	result := db.Exec(`UPDATE users SET email_verified = true WHERE email_verified = false AND verification_token IS NULL`)
	if result.Error != nil {
		log.Printf("warning: failed to backfill email_verified for existing users: %v", result.Error)
	} else if result.RowsAffected > 0 {
		log.Printf("backfilled email_verified=true for %d existing users", result.RowsAffected)
	}

	return nil
}
