package database

import (
	"log"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// AutoMigrate creates/updates all database tables from GORM models.
// This replaces the Supabase migration files.
func AutoMigrate(db *gorm.DB) error {
	log.Println("Running GORM auto-migration...")

	err := db.AutoMigrate(
		&models.User{},
		&models.FlashcardSet{},
		&models.Flashcard{},
		&models.StudyProgress{},
		&models.ClassGroup{},
		&models.ClassGroupMember{},
		&models.ClassChallenge{},
		&models.ChallengeAttempt{},
		&models.PomodoroPreference{},
		&models.PomodoroSession{},
	)
	if err != nil {
		return err
	}

	log.Println("GORM auto-migration complete")
	return nil
}
