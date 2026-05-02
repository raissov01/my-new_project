-- Quizizz usage analytics event stream.

CREATE TABLE IF NOT EXISTS quiz_usage_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type   VARCHAR(40) NOT NULL,
  quiz_id      UUID REFERENCES quizzes(id) ON DELETE SET NULL,
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  anonymous_id VARCHAR(128),
  attempt_id   UUID REFERENCES quiz_attempts(id) ON DELETE SET NULL,
  question_id  UUID REFERENCES quiz_questions(id) ON DELETE SET NULL,
  metadata     JSONB,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_quiz_usage_events_event_type CHECK (
    event_type IN (
      'quiz_page_opened',
      'quiz_started',
      'question_answered',
      'quiz_finished',
      'quiz_abandoned',
      'heartbeat'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_quiz_usage_events_type_created
  ON quiz_usage_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_usage_events_quiz_created
  ON quiz_usage_events(quiz_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_usage_events_user_created
  ON quiz_usage_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_usage_events_anon_created
  ON quiz_usage_events(anonymous_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_usage_events_attempt_id
  ON quiz_usage_events(attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_usage_events_question_id
  ON quiz_usage_events(question_id);
