ALTER TABLE nuet_questions
    ADD COLUMN IF NOT EXISTS pdf_test_id UUID REFERENCES nuet_pdf_tests(id) ON DELETE CASCADE;

ALTER TABLE nuet_questions
    ADD COLUMN IF NOT EXISTS position INT NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS nuet_q_pdf_pos_uniq
    ON nuet_questions(pdf_test_id, position)
    WHERE pdf_test_id IS NOT NULL;
