-- Audio question type: URL to an audio clip (MP3/WAV/OGG)
ALTER TABLE quiz_questions
    ADD COLUMN IF NOT EXISTS audio_url text;
