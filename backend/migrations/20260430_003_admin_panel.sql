-- 20260430_003_admin_panel.sql
--
-- Developer/owner admin panel + Quizizz analytics groundwork.
--
-- This file is documentation; production migration is performed by
-- AutoMigrate in backend/internal/database/migrate.go which runs the
-- same statements idempotently on server startup.
--
-- After deploying, bootstrap your first superadmin:
--   UPDATE users SET is_superadmin = TRUE WHERE email = '<your-email>';

-- 1) is_superadmin gates the developer admin panel. Distinct from role='admin'
--    (the latter is reserved for a future "school admin" tier).
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) is_active lets a superadmin soft-deactivate a user without deleting data.
--    The login handler returns 403 when is_active = FALSE.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- 3) is_hidden_by_admin lets a superadmin pull a quiz from public listings
--    without affecting the owner's ability to edit it.
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_hidden_by_admin BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_quizzes_is_hidden_by_admin
  ON quizzes(is_hidden_by_admin) WHERE is_hidden_by_admin = TRUE;

-- 4) Rename quiz_usage_events.anonymous_id → session_id and add ip_address.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'quiz_usage_events' AND column_name = 'anonymous_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'quiz_usage_events' AND column_name = 'session_id') THEN
    ALTER TABLE quiz_usage_events RENAME COLUMN anonymous_id TO session_id;
  END IF;
END$$;

DROP INDEX IF EXISTS idx_quiz_usage_events_anon_created;
-- The new idx_quiz_usage_events_session_created index is created by GORM
-- AutoMigrate from the QuizUsageEvent model's tag.

ALTER TABLE quiz_usage_events ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);

-- 5) admin_audit_log records every superadmin mutation.
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID         NOT NULL,
  action        VARCHAR(64)  NOT NULL,
  target_type   VARCHAR(32)  NOT NULL,
  target_id     VARCHAR(64),
  before_value  JSONB,
  after_value   JSONB,
  ip_address    VARCHAR(45),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_created
  ON admin_audit_log (admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action_created
  ON admin_audit_log (action, created_at DESC);
