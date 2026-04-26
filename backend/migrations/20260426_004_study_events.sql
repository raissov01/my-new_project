-- Per-event study log used by daily/weekly leaderboards.
-- study_progress stores cumulative totals, which makes time-windowed
-- aggregation impossible without this table.
CREATE TABLE IF NOT EXISTS study_events (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
    flashcard_id UUID        NOT NULL REFERENCES flashcards(id)  ON DELETE CASCADE,
    correct      BOOLEAN     NOT NULL,
    studied_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS study_events_user_at_idx
    ON study_events(user_id, studied_at DESC);
