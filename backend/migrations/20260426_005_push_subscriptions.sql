-- Web Push subscription storage.
-- One row per browser/device per user; endpoint is unique (browser-issued).
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint   TEXT        NOT NULL UNIQUE,
    p256_d_h   TEXT        NOT NULL,
    auth       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions(user_id);
