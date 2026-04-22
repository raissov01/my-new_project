-- Streak System
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_freezes_available INT NOT NULL DEFAULT 2;
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_freezes_used_this_week INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_stars INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) NOT NULL DEFAULT 'UTC';

CREATE TABLE IF NOT EXISTS daily_activity (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  xp_earned INT NOT NULL DEFAULT 0,
  lessons_completed INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, activity_date)
);
