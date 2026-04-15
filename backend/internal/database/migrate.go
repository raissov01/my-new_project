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
		&models.Quiz{},
		&models.QuizQuestion{},
		&models.QuizTag{},
		&models.QuizAttempt{},
		&models.QuizAttemptAnswer{},
		&models.ClassQuizAssignment{},
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
		&models.IELTSStudyPlanJob{},
		&models.IELTSTaskCompletion{},
		&models.IELTSWeeklyReflection{},
		&models.TelegramPost{},
		&models.ChatMessage{},
		&models.MaterialNote{},
		&models.EngSimPlacement{},
		&models.EngSimUnit{},
		&models.EngSimLesson{},
		&models.EngSimLessonSession{},
		&models.EngSimUserProgress{},
		&models.EngSimUnitProgress{},
		&models.EngSimLessonProgress{},
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

	// Expand ielts_materials constraints to support the 900+ materials library.
	// Old category constraint only had reading/writing/speaking/listening;
	// SeedIELTSMaterialsLibrary inserts vocabulary/grammar/general rows which
	// caused a CHECK violation crash on every server startup after a1fb332.
	db.Exec(`ALTER TABLE ielts_materials DROP CONSTRAINT IF EXISTS chk_ielts_materials_category`)
	db.Exec(`ALTER TABLE ielts_materials ADD CONSTRAINT chk_ielts_materials_category CHECK (category IN ('reading','writing','speaking','listening','vocabulary','grammar','general'))`)
	// Old type constraint only had lesson/practice/tip; library adds book/mock_test/feedback_prompt.
	db.Exec(`ALTER TABLE ielts_materials DROP CONSTRAINT IF EXISTS chk_ielts_materials_type`)
	db.Exec(`ALTER TABLE ielts_materials ADD CONSTRAINT chk_ielts_materials_type CHECK (type IN ('lesson','practice','tip','book','mock','mock_test','feedback_prompt'))`)

	// Relax quiz_questions constraints so non-MCQ types (true_false, fill_blank, reorder)
	// can leave the legacy option columns empty. Also widen correct_option from char(1)
	// to varchar(2) to accept 't'/'f' for true_false in addition to a/b/c/d.
	db.Exec(`ALTER TABLE quiz_questions ALTER COLUMN option_a DROP NOT NULL`)
	db.Exec(`ALTER TABLE quiz_questions ALTER COLUMN option_b DROP NOT NULL`)
	db.Exec(`ALTER TABLE quiz_questions ALTER COLUMN option_c DROP NOT NULL`)
	db.Exec(`ALTER TABLE quiz_questions ALTER COLUMN option_d DROP NOT NULL`)
	db.Exec(`ALTER TABLE quiz_questions ALTER COLUMN correct_option DROP NOT NULL`)
	db.Exec(`ALTER TABLE quiz_questions ALTER COLUMN correct_option TYPE varchar(2)`)
	db.Exec(`ALTER TABLE quiz_questions DROP CONSTRAINT IF EXISTS chk_quiz_questions_question_type`)
	db.Exec(`ALTER TABLE quiz_questions ADD CONSTRAINT chk_quiz_questions_question_type CHECK (question_type IN ('mcq','true_false','fill_blank','reorder'))`)

	// Widen quiz_attempt_answers.selected_option for 't'/'f' on true_false questions.
	db.Exec(`ALTER TABLE quiz_attempt_answers ALTER COLUMN selected_option TYPE varchar(2)`)

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

	if err := SeedIELTSMaterialsLibrary(db); err != nil {
		return err
	}

	if err := SeedEngSimCurriculum(db); err != nil {
		return err
	}

	return nil
}
