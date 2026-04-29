-- Quiz invite links: limited-use shareable tokens for private (and public) quizzes.
-- max_uses NULL means unlimited. use_count tracks total "joins" so far.
-- is_active can be toggled off by the owner to revoke access immediately.

CREATE TABLE IF NOT EXISTS public.quiz_invite_links (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id     UUID        NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    created_by  TEXT        NOT NULL,
    max_uses    INT,
    use_count   INT         NOT NULL DEFAULT 0,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_invite_links_quiz_id ON public.quiz_invite_links(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_invite_links_created_by ON public.quiz_invite_links(created_by);
