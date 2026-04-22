-- Leagues System
CREATE TABLE IF NOT EXISTS league_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier VARCHAR(20) NOT NULL,
  week_starts_on DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS league_memberships (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  league_group_id UUID NOT NULL REFERENCES league_groups(id) ON DELETE CASCADE,
  weekly_xp INT NOT NULL DEFAULT 0,
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, league_group_id)
);

CREATE INDEX IF NOT EXISTS idx_league_xp ON league_memberships(league_group_id, weekly_xp DESC);
CREATE INDEX IF NOT EXISTS idx_league_groups_week ON league_groups(tier, week_starts_on);
