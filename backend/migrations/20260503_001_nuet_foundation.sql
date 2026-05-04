-- NUET (Nazarbayev University Entrance Test) preparation module foundation.
--
-- The exam has two sections — Mathematics and Critical Thinking & Problem
-- Solving — 30 multiple-choice questions each, 60 minutes per section,
-- scored 0-120 per section. Min state-grant threshold is 120 total.
--
-- This migration adds the curriculum/practice/attempt skeleton plus a
-- `tags` column on telegram_posts so the existing 1462-file library can
-- be filtered into "math", "critical_thinking", "mock", "book", etc.
-- categories without copying data into a parallel table.

-- ── Curriculum: 18 Math topics + 5 CT topics ─────────────────────────
CREATE TABLE IF NOT EXISTS nuet_topics (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        VARCHAR(120) NOT NULL UNIQUE,
    section     VARCHAR(32)  NOT NULL CHECK (section IN ('math', 'critical_thinking')),
    title       TEXT         NOT NULL,
    description TEXT         NOT NULL DEFAULT '',
    explanation TEXT         NOT NULL DEFAULT '',
    difficulty  VARCHAR(16)  NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('beginner', 'medium', 'advanced')),
    order_index INT          NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS nuet_topics_section_idx ON nuet_topics(section, order_index);

-- ── Question bank (populated incrementally in later phases) ──────────
CREATE TABLE IF NOT EXISTS nuet_questions (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id      UUID         REFERENCES nuet_topics(id) ON DELETE SET NULL,
    section       VARCHAR(32)  NOT NULL CHECK (section IN ('math', 'critical_thinking')),
    question_type VARCHAR(32)  NOT NULL DEFAULT 'multiple_choice',
    difficulty    VARCHAR(16)  NOT NULL DEFAULT 'medium',
    prompt        TEXT         NOT NULL,
    options       JSONB        NOT NULL DEFAULT '[]'::jsonb,
    answer        VARCHAR(8)   NOT NULL,
    explanation   TEXT         NOT NULL DEFAULT '',
    source        TEXT         NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS nuet_questions_topic_idx   ON nuet_questions(topic_id);
CREATE INDEX IF NOT EXISTS nuet_questions_section_idx ON nuet_questions(section, difficulty);

-- ── Mock-exam answer key (per published Trial Test / NUET Mock PDF) ──
-- Drives the "view PDF, submit answers manually, get scored" flow.
CREATE TABLE IF NOT EXISTS nuet_pdf_tests (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT         NOT NULL UNIQUE,
    test_type       VARCHAR(32)  NOT NULL CHECK (test_type IN ('trial_test', 'mock_test')),
    pdf_path        TEXT         NOT NULL,
    math_count      INT          NOT NULL DEFAULT 30,
    ct_count        INT          NOT NULL DEFAULT 30,
    answer_keys     JSONB        NOT NULL DEFAULT '[]'::jsonb,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── User attempts (mock exam runs and topic practice) ────────────────
CREATE TABLE IF NOT EXISTS nuet_attempts (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempt_type       VARCHAR(32)  NOT NULL CHECK (attempt_type IN ('full_mock', 'pdf_test', 'topic_practice', 'section_practice')),
    pdf_test_id        UUID         REFERENCES nuet_pdf_tests(id) ON DELETE SET NULL,
    topic_id           UUID         REFERENCES nuet_topics(id)    ON DELETE SET NULL,
    section            VARCHAR(32)  NOT NULL DEFAULT 'full' CHECK (section IN ('full', 'math', 'critical_thinking')),
    status             VARCHAR(16)  NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    answers            JSONB        NOT NULL DEFAULT '{}'::jsonb,
    correct_math       INT          NOT NULL DEFAULT 0,
    correct_ct         INT          NOT NULL DEFAULT 0,
    score_math         INT          NOT NULL DEFAULT 0,
    score_ct           INT          NOT NULL DEFAULT 0,
    score_total        INT          NOT NULL DEFAULT 0,
    time_taken_secs    INT          NOT NULL DEFAULT 0,
    violation_count    INT          NOT NULL DEFAULT 0,
    started_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at       TIMESTAMPTZ,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS nuet_attempts_user_idx   ON nuet_attempts(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS nuet_attempts_status_idx ON nuet_attempts(user_id, status);

-- ── Materials tagging on existing telegram_posts library ─────────────
-- The user already has 3069 imported posts (1462 with files). Rather than
-- duplicating into a parallel nuet_materials table, we tag the existing
-- rows so a single GIN index serves both /materials views (NUET, IELTS,
-- SAT, etc.) cheaply.
ALTER TABLE telegram_posts
    ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS telegram_posts_tags_gin_idx ON telegram_posts USING GIN (tags);
