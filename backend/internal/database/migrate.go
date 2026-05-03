package database

import (
	"log"
	"sync"
	"time"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// migrationStatusMu guards the package-level migration status variables.
// Read by the admin panel; written once on each AutoMigrate call.
var (
	migrationStatusMu sync.RWMutex
	lastMigrationAt   time.Time
	lastMigrationDur  time.Duration
	lastMigrationErr  string
)

// MigrationStatus reports when AutoMigrate last finished and whether it succeeded.
func MigrationStatus() (at time.Time, dur time.Duration, errMsg string) {
	migrationStatusMu.RLock()
	defer migrationStatusMu.RUnlock()
	return lastMigrationAt, lastMigrationDur, lastMigrationErr
}

// AutoMigrate creates/updates all database tables from GORM models.
func AutoMigrate(db *gorm.DB) (err error) {
	log.Println("Running GORM auto-migration...")
	migrateStart := time.Now()
	defer func() {
		dur := time.Since(migrateStart)
		migrationStatusMu.Lock()
		lastMigrationAt = time.Now()
		lastMigrationDur = dur
		if err != nil {
			lastMigrationErr = err.Error()
		} else {
			lastMigrationErr = ""
		}
		migrationStatusMu.Unlock()
	}()

	err = db.AutoMigrate(
		&models.User{},
		&models.QuizLiveSession{},
		&models.QuizLiveParticipant{},
		&models.QuizLiveAnswer{},
		&models.FlashcardSet{},
		&models.Flashcard{},
		&models.StudyProgress{},
		&models.Quiz{},
		&models.QuizQuestion{},
		&models.QuizTag{},
		&models.QuizAttempt{},
		&models.QuizAttemptAnswer{},
		&models.QuizUsageEvent{},
		&models.AIQuizGenerationLog{},
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
		// Gamification
		&models.DailyActivity{},
		&models.LeagueGroup{},
		&models.LeagueMembership{},
		&models.Friendship{},
		&models.UserInviteCode{},
		&models.Achievement{},
		&models.UserAchievement{},
		&models.LessonAttempt{},
		&models.XPEvent{},
		&models.DailyQuest{},
		// Listening
		&models.ListeningClip{},
		&models.ListeningQuestion{},
		&models.UserListeningProgress{},
		// AI Tutor
		&models.AIScenario{},
		&models.AIConversation{},
		// Daily News
		&models.DailyNews{},
		// Billing
		&models.Subscription{},
		// Push notifications
		&models.PushSubscription{},
		// In-app notifications (bell dropdown)
		&models.Notification{},
		// Admin
		&models.AdminAuditLog{},
	)
	if err != nil {
		return err
	}

	log.Println("GORM auto-migration complete")

	// Role support: normal registration/self-service remains student/teacher,
	// but trusted DB-managed accounts may now be admins.
	db.Exec(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role`)
	db.Exec(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`)
	db.Exec(`ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('student','teacher','admin'))`)

	db.Exec(`ALTER TABLE quiz_usage_events DROP CONSTRAINT IF EXISTS chk_quiz_usage_events_event_type`)
	db.Exec(`ALTER TABLE quiz_usage_events ADD CONSTRAINT chk_quiz_usage_events_event_type CHECK (event_type IN ('quiz_page_opened','quiz_started','question_answered','quiz_finished','quiz_abandoned','heartbeat'))`)

	// Quiz invite links — limited-use shareable tokens for private quizzes.
	// Not a GORM model (raw pgx queries), so we create the table manually.
	db.Exec(`CREATE TABLE IF NOT EXISTS public.quiz_invite_links (
		id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
		quiz_id     UUID        NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
		created_by  TEXT        NOT NULL,
		max_uses    INT,
		use_count   INT         NOT NULL DEFAULT 0,
		is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
		created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
	)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_quiz_invite_links_quiz_id ON public.quiz_invite_links(quiz_id)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_quiz_invite_links_created_by ON public.quiz_invite_links(created_by)`)

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
	db.Exec(`ALTER TABLE quiz_questions ADD CONSTRAINT chk_quiz_questions_question_type CHECK (question_type IN ('mcq','mcq_multi','true_false','fill_blank','reorder','matching','hotspot'))`)
	db.Exec(`ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS hint TEXT`)
	db.Exec(`ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS match_pairs JSONB`)
	db.Exec(`ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS hotspot_zones JSONB`)

	// Widen quiz_attempt_answers.selected_option for 't'/'f' on true_false questions.
	db.Exec(`ALTER TABLE quiz_attempt_answers ALTER COLUMN selected_option TYPE varchar(2)`)

	// Quiz versioning: increment version on every edit; snapshot question content
	// at attempt-submission time so historical results survive quiz edits.
	db.Exec(`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1`)
	db.Exec(`ALTER TABLE quiz_attempt_answers ADD COLUMN IF NOT EXISTS question_text_snapshot TEXT`)
	db.Exec(`ALTER TABLE quiz_attempt_answers ADD COLUMN IF NOT EXISTS question_type_snapshot VARCHAR(20)`)
	db.Exec(`ALTER TABLE quiz_attempt_answers ADD COLUMN IF NOT EXISTS option_a_snapshot TEXT`)
	db.Exec(`ALTER TABLE quiz_attempt_answers ADD COLUMN IF NOT EXISTS option_b_snapshot TEXT`)
	db.Exec(`ALTER TABLE quiz_attempt_answers ADD COLUMN IF NOT EXISTS option_c_snapshot TEXT`)
	db.Exec(`ALTER TABLE quiz_attempt_answers ADD COLUMN IF NOT EXISTS option_d_snapshot TEXT`)
	db.Exec(`ALTER TABLE quiz_attempt_answers ADD COLUMN IF NOT EXISTS correct_option_snapshot TEXT`)
	db.Exec(`ALTER TABLE quiz_attempt_answers ADD COLUMN IF NOT EXISTS blank_answer_snapshot TEXT`)
	db.Exec(`ALTER TABLE quiz_attempt_answers ADD COLUMN IF NOT EXISTS reorder_items_snapshot JSONB`)
	db.Exec(`ALTER TABLE quiz_attempt_answers ADD COLUMN IF NOT EXISTS match_pairs_snapshot JSONB`)
	db.Exec(`ALTER TABLE quiz_attempt_answers ADD COLUMN IF NOT EXISTS order_index_snapshot INT NOT NULL DEFAULT 0`)

	// ── Billing column additions (idempotent) ───────────────────────────────
	db.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(20) NOT NULL DEFAULT 'free'`)
	db.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ls_customer_id BIGINT`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_users_ls_customer_id ON users(ls_customer_id) WHERE ls_customer_id IS NOT NULL`)

	// ── Gamification column additions (idempotent) ──────────────────────────
	db.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_freezes_available INT NOT NULL DEFAULT 2`)
	db.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_freezes_used_this_week INT NOT NULL DEFAULT 0`)
	db.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS total_stars INT NOT NULL DEFAULT 0`)
	db.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) NOT NULL DEFAULT 'UTC'`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_league_xp ON league_memberships(league_group_id, weekly_xp DESC)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_daily_quests_user_date ON daily_quests(user_id, quest_date)`)

	// ── Mark all existing users (who registered before email verification was added)
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

	// BUG-LEARN-002: Separate IELTS units from General English path.
	// Mark the three legacy IELTS B1 units and move them to high sort_orders
	// so General B1 slots (7-9) are free for new General English units.
	db.Exec(`UPDATE eng_sim_units
		SET course = 'IELTS', sort_order = sort_order + 100
		WHERE title IN ('IELTS Reading Strategies', 'Writing Task 1 Intro', 'Cohesive Devices')
		  AND sort_order < 100`)

	// BUG-LEARN-011: Add gems column to eng_sim_user_progress if missing.
	db.Exec(`ALTER TABLE eng_sim_user_progress ADD COLUMN IF NOT EXISTS gems INT NOT NULL DEFAULT 0`)

	if err := SeedAchievements(db); err != nil {
		return err
	}

	// Team mode columns — GORM AutoMigrate adds them from the model; these are safety guards.
	db.Exec(`ALTER TABLE quiz_live_sessions ADD COLUMN IF NOT EXISTS team_mode BOOLEAN NOT NULL DEFAULT FALSE`)
	db.Exec(`ALTER TABLE quiz_live_sessions ADD COLUMN IF NOT EXISTS team_count INT NOT NULL DEFAULT 2`)
	db.Exec(`ALTER TABLE quiz_live_participants ADD COLUMN IF NOT EXISTS team_id INT NOT NULL DEFAULT 0`)

	if err := SeedListeningClips(db); err != nil {
		return err
	}

	if err := SeedListeningQuestions(db); err != nil {
		return err
	}

	if err := SeedAIScenarios(db); err != nil {
		return err
	}

	// ── Admin panel + analytics (idempotent) ─────────────────────────────────
	// 1) is_superadmin flag — gates the developer/owner control panel. Distinct
	//    from role='admin' (which is reserved for a future "school admin" tier).
	db.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT FALSE`)

	// 2) is_active — soft-deactivate a user without deleting their data.
	//    The login handler returns 403 when is_active = FALSE.
	db.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`)

	// 3) is_hidden_by_admin — let a superadmin pull a quiz from public listings
	//    without affecting the owner's ability to edit it.
	db.Exec(`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_hidden_by_admin BOOLEAN NOT NULL DEFAULT FALSE`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_quizzes_is_hidden_by_admin ON quizzes(is_hidden_by_admin) WHERE is_hidden_by_admin = TRUE`)

	// 4) Rename quiz_usage_events.anonymous_id → session_id (idempotent: only
	//    rename when the old column still exists). The GORM AutoMigrate above
	//    will have already created session_id on fresh installs; this branch
	//    only runs on existing databases.
	db.Exec(`DO $$
	BEGIN
	  IF EXISTS (SELECT 1 FROM information_schema.columns
	             WHERE table_name = 'quiz_usage_events' AND column_name = 'anonymous_id')
	     AND NOT EXISTS (SELECT 1 FROM information_schema.columns
	                     WHERE table_name = 'quiz_usage_events' AND column_name = 'session_id') THEN
	    ALTER TABLE quiz_usage_events RENAME COLUMN anonymous_id TO session_id;
	  END IF;
	END$$`)
	// Drop the old anonymous_id index if it survived; the new session_id index
	// is created by GORM AutoMigrate via the model's index tag.
	db.Exec(`DROP INDEX IF EXISTS idx_quiz_usage_events_anon_created`)

	// 5) ip_address column for quiz_usage_events. Captured server-side from
	//    X-Forwarded-For via the Next.js proxy.
	db.Exec(`ALTER TABLE quiz_usage_events ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45)`)

	return nil
}
