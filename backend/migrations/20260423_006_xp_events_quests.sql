-- XP Boost Events
CREATE TABLE IF NOT EXISTS xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  multiplier NUMERIC(3,1) NOT NULL DEFAULT 2.0,
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL,
  title VARCHAR(100),
  banner_color VARCHAR(20) DEFAULT '#f97316'
);

CREATE INDEX IF NOT EXISTS idx_xp_events_active ON xp_events(starts_at, ends_at);

-- Daily Quests
CREATE TABLE IF NOT EXISTS daily_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_date DATE NOT NULL,
  quest_type VARCHAR(50) NOT NULL,
  target INT NOT NULL,
  progress INT NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  xp_reward INT NOT NULL,
  UNIQUE(user_id, quest_date, quest_type)
);

CREATE INDEX IF NOT EXISTS idx_daily_quests_user_date ON daily_quests(user_id, quest_date);
