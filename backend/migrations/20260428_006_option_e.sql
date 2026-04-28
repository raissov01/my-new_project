-- Add optional 5th MCQ option to quiz questions and attempt answer snapshots.
-- option_e is nullable so existing 4-option questions are unaffected.

ALTER TABLE quiz_questions
    ADD COLUMN IF NOT EXISTS option_e TEXT;

ALTER TABLE quiz_attempt_answers
    ADD COLUMN IF NOT EXISTS option_e_snapshot TEXT;
