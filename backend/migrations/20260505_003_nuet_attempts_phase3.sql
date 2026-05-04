-- NUET phase 3 schema checkpoint for explicit SQL migration history.
-- Mirrors previously auto-migrated attempt columns and violations table.
-- Safe to re-run.

ALTER TABLE nuet_attempts
    ADD COLUMN IF NOT EXISTS strict_mode BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS question_set JSONB,
    ADD COLUMN IF NOT EXISTS results JSONB,
    ADD COLUMN IF NOT EXISTS last_saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS nuet_simulator_violations (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id  UUID         NOT NULL REFERENCES nuet_attempts(id) ON DELETE CASCADE,
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(32)  NOT NULL CHECK (type IN ('tab_switch','fullscreen_exit','copy','paste','right_click','dev_tools','blur')),
    details     JSONB,
    occurred_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS nuet_attempts_user_idx
    ON nuet_attempts(user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS nuet_simulator_violations_attempt_idx
    ON nuet_simulator_violations(attempt_id, occurred_at ASC);
