-- In-app notification feed shown in the navbar bell dropdown.
-- A row is created any time the system needs to surface something to a user
-- (quiz invite accepted, class assignment, etc). The push_subscriptions table
-- handles browser Web Push separately — these two systems are independent.

CREATE TABLE IF NOT EXISTS notifications (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       VARCHAR(64)  NOT NULL,
    title      TEXT         NOT NULL,
    body       TEXT         NOT NULL DEFAULT '',
    link       TEXT,
    is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Composite index covers the bell dropdown query: per-user, newest first,
-- and the unread-count subquery (`WHERE user_id = ? AND is_read = false`).
CREATE INDEX IF NOT EXISTS notifications_user_created_idx
    ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
    ON notifications(user_id, is_read)
    WHERE is_read = FALSE;
