ALTER TABLE quiz_attempts
  ADD COLUMN IF NOT EXISTS power_ups_used JSONB;
