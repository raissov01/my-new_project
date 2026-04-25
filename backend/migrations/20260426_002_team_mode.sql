-- Add team mode support to live quiz sessions.
ALTER TABLE quiz_live_sessions
  ADD COLUMN IF NOT EXISTS team_mode  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS team_count INT     NOT NULL DEFAULT 2;

-- Store each participant's assigned team (0-indexed).
ALTER TABLE quiz_live_participants
  ADD COLUMN IF NOT EXISTS team_id INT NOT NULL DEFAULT 0;
