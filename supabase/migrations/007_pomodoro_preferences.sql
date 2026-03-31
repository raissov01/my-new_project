-- ============================================================================
-- 007: Pomodoro Preferences
-- ============================================================================

CREATE TABLE IF NOT EXISTS pomodoro_preferences (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  work_minutes int NOT NULL DEFAULT 25 CHECK (work_minutes >= 5),
  break_minutes int NOT NULL DEFAULT 5 CHECK (break_minutes >= 1),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pomodoro_preferences_updated_at
  ON pomodoro_preferences(updated_at DESC);

ALTER TABLE pomodoro_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pomodoro_preferences'
      AND policyname = 'Users can view own pomodoro preferences'
  ) THEN
    CREATE POLICY "Users can view own pomodoro preferences"
      ON pomodoro_preferences FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pomodoro_preferences'
      AND policyname = 'Users can upsert own pomodoro preferences'
  ) THEN
    CREATE POLICY "Users can upsert own pomodoro preferences"
      ON pomodoro_preferences FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pomodoro_preferences'
      AND policyname = 'Users can update own pomodoro preferences'
  ) THEN
    CREATE POLICY "Users can update own pomodoro preferences"
      ON pomodoro_preferences FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname
  INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'pomodoro_sessions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%preset%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE pomodoro_sessions DROP CONSTRAINT %I',
      constraint_name
    );
  END IF;
END $$;

ALTER TABLE pomodoro_sessions
  ALTER COLUMN preset TYPE text,
  ALTER COLUMN preset SET DEFAULT '25/5';

ALTER TABLE pomodoro_sessions
  ADD CONSTRAINT pomodoro_sessions_preset_check
  CHECK (preset IN ('15/5', '25/5', '50/10', 'custom'));
