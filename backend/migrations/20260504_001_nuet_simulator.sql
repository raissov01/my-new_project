-- NUET simulator phase: strict-mode full mocks with persisted question sets
-- and violation tracking.

ALTER TABLE nuet_attempts
    ADD COLUMN IF NOT EXISTS strict_mode BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS question_set JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS results JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS last_saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS nuet_simulator_violations (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id  UUID         NOT NULL REFERENCES nuet_attempts(id) ON DELETE CASCADE,
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(32)  NOT NULL CHECK (type IN ('tab_switch','fullscreen_exit','copy','paste','right_click','dev_tools','blur')),
    details     TEXT,
    occurred_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS nuet_simulator_violations_attempt_idx
    ON nuet_simulator_violations(attempt_id, occurred_at ASC);
