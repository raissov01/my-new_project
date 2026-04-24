-- BUG-LEARN-001: Add C1/C2 General English units
-- BUG-LEARN-002: Separate IELTS units from General English path
-- Run after backend restart (AutoMigrate adds the column first)

-- 1. Mark existing IELTS-specific B1 units and move them to high sort_orders
UPDATE eng_sim_units
SET course = 'IELTS', sort_order = sort_order + 100
WHERE title IN ('IELTS Reading Strategies', 'Writing Task 1 Intro', 'Cohesive Devices')
  AND sort_order < 100;

-- 2. Insert General English B1 replacement units (skip if already present)
INSERT INTO eng_sim_units (id, level, sort_order, title, description, ielts_skill, icon_emoji, color, course, created_at)
SELECT gen_random_uuid(), 'B1', 7, 'Conditionals & Opinions',
       'If-clauses, expressing views and disagreement', 'grammar', '💭', '#6366f1', 'GENERAL', NOW()
WHERE NOT EXISTS (SELECT 1 FROM eng_sim_units WHERE title = 'Conditionals & Opinions');

INSERT INTO eng_sim_units (id, level, sort_order, title, description, ielts_skill, icon_emoji, color, course, created_at)
SELECT gen_random_uuid(), 'B1', 8, 'Travel & Experiences',
       'Describing trips, past experiences, narrating events', 'vocabulary', '✈️', '#0ea5e9', 'GENERAL', NOW()
WHERE NOT EXISTS (SELECT 1 FROM eng_sim_units WHERE title = 'Travel & Experiences');

INSERT INTO eng_sim_units (id, level, sort_order, title, description, ielts_skill, icon_emoji, color, course, created_at)
SELECT gen_random_uuid(), 'B1', 9, 'Media & Culture',
       'Discussing news, films, music and cultural topics', 'vocabulary', '📰', '#8b5cf6', 'GENERAL', NOW()
WHERE NOT EXISTS (SELECT 1 FROM eng_sim_units WHERE title = 'Media & Culture');

-- 3. Insert C1 General English units
INSERT INTO eng_sim_units (id, level, sort_order, title, description, ielts_skill, icon_emoji, color, course, created_at)
SELECT gen_random_uuid(), 'C1', 13, 'Nuance & Idioms',
       'Advanced idiomatic expressions and nuanced meaning', 'vocabulary', '🎭', '#d946ef', 'GENERAL', NOW()
WHERE NOT EXISTS (SELECT 1 FROM eng_sim_units WHERE title = 'Nuance & Idioms');

INSERT INTO eng_sim_units (id, level, sort_order, title, description, ielts_skill, icon_emoji, color, course, created_at)
SELECT gen_random_uuid(), 'C1', 14, 'Academic Discourse',
       'Formal writing, academic vocabulary, argumentation', 'grammar', '🎓', '#0369a1', 'GENERAL', NOW()
WHERE NOT EXISTS (SELECT 1 FROM eng_sim_units WHERE title = 'Academic Discourse');

INSERT INTO eng_sim_units (id, level, sort_order, title, description, ielts_skill, icon_emoji, color, course, created_at)
SELECT gen_random_uuid(), 'C1', 15, 'Rhetoric & Persuasion',
       'Persuasive techniques, rhetorical devices, debate', 'speaking', '🏛️', '#7c3aed', 'GENERAL', NOW()
WHERE NOT EXISTS (SELECT 1 FROM eng_sim_units WHERE title = 'Rhetoric & Persuasion');

-- 4. Insert C2 General English units
INSERT INTO eng_sim_units (id, level, sort_order, title, description, ielts_skill, icon_emoji, color, course, created_at)
SELECT gen_random_uuid(), 'C2', 16, 'Literary Analysis',
       'Analysing literature, tone, style and literary devices', 'reading', '📜', '#dc2626', 'GENERAL', NOW()
WHERE NOT EXISTS (SELECT 1 FROM eng_sim_units WHERE title = 'Literary Analysis');

INSERT INTO eng_sim_units (id, level, sort_order, title, description, ielts_skill, icon_emoji, color, course, created_at)
SELECT gen_random_uuid(), 'C2', 17, 'Professional Contexts',
       'Business communication, negotiation, formal register', 'writing', '💼', '#0f172a', 'GENERAL', NOW()
WHERE NOT EXISTS (SELECT 1 FROM eng_sim_units WHERE title = 'Professional Contexts');

-- 5. Add lessons for B1 General: Conditionals & Opinions
INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 1, 'Zero & First Conditionals', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Conditionals & Opinions'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Zero & First Conditionals');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 2, 'Second & Third Conditionals', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Conditionals & Opinions'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Second & Third Conditionals');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 3, 'Expressing Opinions', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Conditionals & Opinions'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Expressing Opinions');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 4, 'Agreeing & Disagreeing', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Conditionals & Opinions'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Agreeing & Disagreeing');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 5, 'Conditionals Boss', 'boss', NOW()
FROM eng_sim_units u WHERE u.title = 'Conditionals & Opinions'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Conditionals Boss');

-- 6. Add lessons for B1 General: Travel & Experiences
INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 1, 'Describing a Journey', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Travel & Experiences'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Describing a Journey');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 2, 'Past Experiences with Have/Have Been', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Travel & Experiences'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Past Experiences with Have/Have Been');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 3, 'Narrative Tenses', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Travel & Experiences'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Narrative Tenses');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 4, 'Travel Vocabulary', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Travel & Experiences'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Travel Vocabulary');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 5, 'Travel Boss', 'boss', NOW()
FROM eng_sim_units u WHERE u.title = 'Travel & Experiences'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Travel Boss');

-- 7. Add lessons for B1 General: Media & Culture
INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 1, 'Talking About News', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Media & Culture'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Talking About News');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 2, 'Films & Books', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Media & Culture'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Films & Books');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 3, 'Music & Art', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Media & Culture'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Music & Art');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 4, 'Cultural Differences', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Media & Culture'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Cultural Differences');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 5, 'Media Boss', 'boss', NOW()
FROM eng_sim_units u WHERE u.title = 'Media & Culture'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Media Boss');

-- 8. Add lessons for C1: Nuance & Idioms
INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 1, 'Body Language Idioms', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Nuance & Idioms'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Body Language Idioms');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 2, 'Phrasal Verbs in Context', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Nuance & Idioms'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Phrasal Verbs in Context');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 3, 'Subtle Register Shifts', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Nuance & Idioms'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Subtle Register Shifts');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 4, 'Collocation Mastery', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Nuance & Idioms'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Collocation Mastery');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 5, 'Idioms Boss', 'boss', NOW()
FROM eng_sim_units u WHERE u.title = 'Nuance & Idioms'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Idioms Boss');

-- 9. Add lessons for C1: Academic Discourse
INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 1, 'Academic Vocabulary Tier 2', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Academic Discourse'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Academic Vocabulary Tier 2');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 2, 'Hedging & Qualifying', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Academic Discourse'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Hedging & Qualifying');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 3, 'Complex Sentence Structures', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Academic Discourse'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Complex Sentence Structures');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 4, 'Citing & Referencing', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Academic Discourse'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Citing & Referencing');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 5, 'Academic Discourse Boss', 'boss', NOW()
FROM eng_sim_units u WHERE u.title = 'Academic Discourse'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Academic Discourse Boss');

-- 10. Add lessons for C1: Rhetoric & Persuasion
INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 1, 'Persuasive Techniques', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Rhetoric & Persuasion'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Persuasive Techniques');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 2, 'Rhetorical Questions & Devices', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Rhetoric & Persuasion'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Rhetorical Questions & Devices');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 3, 'Debate Skills', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Rhetoric & Persuasion'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Debate Skills');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 4, 'Logical Fallacies', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Rhetoric & Persuasion'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Logical Fallacies');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 5, 'Rhetoric Boss', 'boss', NOW()
FROM eng_sim_units u WHERE u.title = 'Rhetoric & Persuasion'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Rhetoric Boss');

-- 11. Add lessons for C2: Literary Analysis
INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 1, 'Tone & Mood', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Literary Analysis'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Tone & Mood');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 2, 'Figurative Language', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Literary Analysis'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Figurative Language');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 3, 'Narrative Perspective', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Literary Analysis'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Narrative Perspective');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 4, 'Symbolism & Theme', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Literary Analysis'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Symbolism & Theme');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 5, 'Literary Boss', 'boss', NOW()
FROM eng_sim_units u WHERE u.title = 'Literary Analysis'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Literary Boss');

-- 12. Add lessons for C2: Professional Contexts
INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 1, 'Business Communication', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Professional Contexts'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Business Communication');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 2, 'Negotiation Language', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Professional Contexts'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Negotiation Language');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 3, 'Presentations & Reports', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Professional Contexts'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Presentations & Reports');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 4, 'Formal Emails & Correspondence', 'standard', NOW()
FROM eng_sim_units u WHERE u.title = 'Professional Contexts'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Formal Emails & Correspondence');

INSERT INTO eng_sim_lessons (id, unit_id, sort_order, title, lesson_type, created_at)
SELECT gen_random_uuid(), u.id, 5, 'Professional Boss', 'boss', NOW()
FROM eng_sim_units u WHERE u.title = 'Professional Contexts'
  AND NOT EXISTS (SELECT 1 FROM eng_sim_lessons l WHERE l.unit_id = u.id AND l.title = 'Professional Boss');
