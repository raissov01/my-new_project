-- Video question type: URL to a YouTube video or direct MP4/WebM file
ALTER TABLE quiz_questions
    ADD COLUMN IF NOT EXISTS video_url text;
