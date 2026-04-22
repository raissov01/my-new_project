-- Lesson Attempts (3-star rating system)
CREATE TABLE IF NOT EXISTS lesson_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL,
  stars INT NOT NULL DEFAULT 0 CHECK (stars >= 0 AND stars <= 3),
  hearts_lost INT NOT NULL DEFAULT 0,
  time_secs INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_attempts_user ON lesson_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_attempts_lesson ON lesson_attempts(lesson_id);
