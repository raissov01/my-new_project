ALTER TABLE eng_sim_lessons ADD COLUMN IF NOT EXISTS cached_exercises_kk JSONB;
ALTER TABLE eng_sim_lessons ADD COLUMN IF NOT EXISTS cached_exercises_ru JSONB;
