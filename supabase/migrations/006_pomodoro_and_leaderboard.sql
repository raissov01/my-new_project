-- ============================================================================
-- 006: Pomodoro Sessions & Leaderboard Support
-- ============================================================================

-- ── Pomodoro sessions table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  set_id      uuid REFERENCES flashcard_sets(id) ON DELETE SET NULL,
  study_mode  text NOT NULL CHECK (study_mode IN ('flashcard', 'quiz', 'write')),
  preset      text NOT NULL DEFAULT '25/5' CHECK (preset IN ('15/5', '25/5', '50/10')),
  work_minutes    int NOT NULL,
  break_minutes   int NOT NULL,
  cards_reviewed  int NOT NULL DEFAULT 0,
  correct_answers int NOT NULL DEFAULT 0,
  completed   boolean NOT NULL DEFAULT false,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pomodoro_sessions_user_id ON pomodoro_sessions(user_id);
CREATE INDEX idx_pomodoro_sessions_finished_at ON pomodoro_sessions(finished_at);

-- RLS
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pomodoro sessions"
  ON pomodoro_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pomodoro sessions"
  ON pomodoro_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pomodoro sessions"
  ON pomodoro_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- ── Leaderboard materialized view ───────────────────────────────────────────
-- Aggregates user study activity for ranking.
-- Refresh periodically or after session save.

CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard_stats AS
SELECT
  p.id AS user_id,
  p.username,
  p.avatar_url,
  p.points,
  p.streak_days,
  COALESCE(SUM(sp.times_seen), 0)::int AS total_cards_reviewed,
  COALESCE(SUM(sp.times_correct), 0)::int AS total_correct,
  COALESCE(COUNT(DISTINCT ps.id) FILTER (WHERE ps.completed), 0)::int AS completed_sessions,
  COALESCE(SUM(ps.work_minutes) FILTER (WHERE ps.completed), 0)::int AS total_study_minutes,
  -- Composite ranking score
  (
    COALESCE(SUM(ps.work_minutes) FILTER (WHERE ps.completed), 0) * 2 +
    COALESCE(SUM(sp.times_seen), 0) +
    COALESCE(SUM(sp.times_correct), 0) * 3 +
    COALESCE(COUNT(DISTINCT ps.id) FILTER (WHERE ps.completed), 0) * 10 +
    p.points
  )::int AS ranking_score
FROM profiles p
LEFT JOIN study_progress sp ON sp.user_id = p.id
LEFT JOIN pomodoro_sessions ps ON ps.user_id = p.id
GROUP BY p.id, p.username, p.avatar_url, p.points, p.streak_days;

CREATE UNIQUE INDEX idx_leaderboard_stats_user_id ON leaderboard_stats(user_id);
CREATE INDEX idx_leaderboard_stats_ranking ON leaderboard_stats(ranking_score DESC);

-- ── Daily leaderboard view (activity in last 24h) ──────────────────────────

CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard_daily AS
SELECT
  p.id AS user_id,
  p.username,
  p.avatar_url,
  COALESCE(SUM(sp.times_seen) FILTER (WHERE sp.last_studied_at::date >= (now() - interval '1 day')::date), 0)::int AS total_cards_reviewed,
  COALESCE(SUM(sp.times_correct) FILTER (WHERE sp.last_studied_at::date >= (now() - interval '1 day')::date), 0)::int AS total_correct,
  COALESCE(COUNT(DISTINCT ps.id) FILTER (WHERE ps.completed AND ps.finished_at >= now() - interval '1 day'), 0)::int AS completed_sessions,
  COALESCE(SUM(ps.work_minutes) FILTER (WHERE ps.completed AND ps.finished_at >= now() - interval '1 day'), 0)::int AS total_study_minutes,
  (
    COALESCE(SUM(ps.work_minutes) FILTER (WHERE ps.completed AND ps.finished_at >= now() - interval '1 day'), 0) * 2 +
    COALESCE(SUM(sp.times_seen) FILTER (WHERE sp.last_studied_at::date >= (now() - interval '1 day')::date), 0) +
    COALESCE(SUM(sp.times_correct) FILTER (WHERE sp.last_studied_at::date >= (now() - interval '1 day')::date), 0) * 3 +
    COALESCE(COUNT(DISTINCT ps.id) FILTER (WHERE ps.completed AND ps.finished_at >= now() - interval '1 day'), 0) * 10
  )::int AS ranking_score
FROM profiles p
LEFT JOIN study_progress sp ON sp.user_id = p.id
LEFT JOIN pomodoro_sessions ps ON ps.user_id = p.id
GROUP BY p.id, p.username, p.avatar_url;

CREATE UNIQUE INDEX idx_leaderboard_daily_user_id ON leaderboard_daily(user_id);
CREATE INDEX idx_leaderboard_daily_ranking ON leaderboard_daily(ranking_score DESC);

-- ── Weekly leaderboard view (activity in last 7 days) ───────────────────────

CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard_weekly AS
SELECT
  p.id AS user_id,
  p.username,
  p.avatar_url,
  COALESCE(SUM(sp.times_seen) FILTER (WHERE sp.last_studied_at::date >= (now() - interval '7 days')::date), 0)::int AS total_cards_reviewed,
  COALESCE(SUM(sp.times_correct) FILTER (WHERE sp.last_studied_at::date >= (now() - interval '7 days')::date), 0)::int AS total_correct,
  COALESCE(COUNT(DISTINCT ps.id) FILTER (WHERE ps.completed AND ps.finished_at >= now() - interval '7 days'), 0)::int AS completed_sessions,
  COALESCE(SUM(ps.work_minutes) FILTER (WHERE ps.completed AND ps.finished_at >= now() - interval '7 days'), 0)::int AS total_study_minutes,
  (
    COALESCE(SUM(ps.work_minutes) FILTER (WHERE ps.completed AND ps.finished_at >= now() - interval '7 days'), 0) * 2 +
    COALESCE(SUM(sp.times_seen) FILTER (WHERE sp.last_studied_at::date >= (now() - interval '7 days')::date), 0) +
    COALESCE(SUM(sp.times_correct) FILTER (WHERE sp.last_studied_at::date >= (now() - interval '7 days')::date), 0) * 3 +
    COALESCE(COUNT(DISTINCT ps.id) FILTER (WHERE ps.completed AND ps.finished_at >= now() - interval '7 days'), 0) * 10
  )::int AS ranking_score
FROM profiles p
LEFT JOIN study_progress sp ON sp.user_id = p.id
LEFT JOIN pomodoro_sessions ps ON ps.user_id = p.id
GROUP BY p.id, p.username, p.avatar_url;

CREATE UNIQUE INDEX idx_leaderboard_weekly_user_id ON leaderboard_weekly(user_id);
CREATE INDEX idx_leaderboard_weekly_ranking ON leaderboard_weekly(ranking_score DESC);

-- ── Helper function to refresh all leaderboard views ────────────────────────

CREATE OR REPLACE FUNCTION refresh_leaderboard_views()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_daily;
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_weekly;
END;
$$;
