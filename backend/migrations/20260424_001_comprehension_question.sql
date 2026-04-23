-- Comprehension question type: passage + sub-questions stored as JSONB
ALTER TABLE quiz_questions
    ADD COLUMN IF NOT EXISTS comprehension_data jsonb;

ALTER TABLE quiz_attempt_answers
    ADD COLUMN IF NOT EXISTS comprehension_data_snapshot jsonb;
