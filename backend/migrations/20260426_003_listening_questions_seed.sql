-- Seed comprehension questions for the 24 listening clips that have none.
-- 3 questions per clip: comprehension (MCQ), true_false, fill_blank.

INSERT INTO listening_questions (clip_id, question_type, prompt, options, correct_answer) VALUES

-- ── A1: Animals and Pets ──────────────────────────────────────────────────────
('37e4be78-e7a1-4839-9b4a-6e91ce5027d0', 'comprehension',
 'What is the narrator''s dog called?',
 '["Max","Rex","Buddy","Charlie"]'::jsonb, '"Max"'::jsonb),
('37e4be78-e7a1-4839-9b4a-6e91ce5027d0', 'true_false',
 'Cats need to go for daily walks, just like dogs.',
 NULL, 'false'::jsonb),
('37e4be78-e7a1-4839-9b4a-6e91ce5027d0', 'fill_blank',
 'The narrator''s dog is a golden ___.',
 NULL, '"retriever"'::jsonb),

-- ── A1: At the Supermarket ────────────────────────────────────────────────────
('c40b783a-71e7-42a7-abbb-39d9bf8a12ee', 'comprehension',
 'When does the narrator usually go to the supermarket?',
 '["Saturday morning","Friday evening","Sunday afternoon","Monday morning"]'::jsonb, '"Saturday morning"'::jsonb),
('c40b783a-71e7-42a7-abbb-39d9bf8a12ee', 'true_false',
 'The narrator always makes a list before going shopping.',
 NULL, 'true'::jsonb),
('c40b783a-71e7-42a7-abbb-39d9bf8a12ee', 'fill_blank',
 'The narrator takes a shopping trolley or a ___ depending on how much they need.',
 NULL, '"basket"'::jsonb),

-- ── A1: My Daily Routine ──────────────────────────────────────────────────────
('e01cdb20-c1f7-4856-bd0a-36c1bd3b810a', 'comprehension',
 'What time does the narrator wake up every morning?',
 '["Seven o''clock","Six o''clock","Eight o''clock","Nine o''clock"]'::jsonb, '"Seven o''clock"'::jsonb),
('e01cdb20-c1f7-4856-bd0a-36c1bd3b810a', 'true_false',
 'Breakfast is the narrator''s favourite meal of the day.',
 NULL, 'true'::jsonb),
('e01cdb20-c1f7-4856-bd0a-36c1bd3b810a', 'fill_blank',
 'After the shower, the narrator goes downstairs to the ___.',
 NULL, '"kitchen"'::jsonb),

-- ── A2: A Phone Conversation ─────────────────────────────────────────────────
('20014708-778a-4294-b031-37b34fdb414d', 'comprehension',
 'Where has the meeting location been changed to?',
 '["Riverside offices","Bridge Street headquarters","City Hall","Central Station"]'::jsonb, '"Bridge Street headquarters"'::jsonb),
('20014708-778a-4294-b031-37b34fdb414d', 'true_false',
 'The meeting time has been changed from ten o''clock.',
 NULL, 'false'::jsonb),
('20014708-778a-4294-b031-37b34fdb414d', 'fill_blank',
 'The meeting room is on the ___ floor.',
 NULL, '"third"'::jsonb),

-- ── A2: Asking for Directions ─────────────────────────────────────────────────
('e5f9df85-2b36-49d1-a211-752bd4b3e207', 'comprehension',
 'What place is the tourist looking for?',
 '["A pharmacy","A hotel","A restaurant","A bank"]'::jsonb, '"A pharmacy"'::jsonb),
('e5f9df85-2b36-49d1-a211-752bd4b3e207', 'true_false',
 'The tourist should turn right at the traffic lights.',
 NULL, 'true'::jsonb),
('e5f9df85-2b36-49d1-a211-752bd4b3e207', 'fill_blank',
 'The pharmacy has a big ___ sign.',
 NULL, '"green"'::jsonb),

-- ── A2: Planning a Holiday ────────────────────────────────────────────────────
('6681c1dc-8101-4935-baca-f4a7e4f70009', 'comprehension',
 'Which country does Tom prefer for the summer holiday?',
 '["Spain","Greece","Italy","France"]'::jsonb, '"Greece"'::jsonb),
('6681c1dc-8101-4935-baca-f4a7e4f70009', 'true_false',
 'Anna and Tom agree that August is the best time to visit.',
 NULL, 'false'::jsonb),
('6681c1dc-8101-4935-baca-f4a7e4f70009', 'fill_blank',
 'Tom has always wanted to go to ___ in Greece.',
 NULL, '"Santorini"'::jsonb),

-- ── A2: Weather and Seasons ───────────────────────────────────────────────────
('67f551c4-076f-4ed6-9504-317a872e9171', 'comprehension',
 'How many seasons are there in a year?',
 '["Two","Three","Four","Five"]'::jsonb, '"Four"'::jsonb),
('67f551c4-076f-4ed6-9504-317a872e9171', 'true_false',
 'Talking about the weather is especially popular in Britain.',
 NULL, 'true'::jsonb),
('67f551c4-076f-4ed6-9504-317a872e9171', 'fill_blank',
 'In spring, flowers start to ___ and the days get longer.',
 NULL, '"bloom"'::jsonb),

-- ── B1: A Job Interview ───────────────────────────────────────────────────────
('b084e092-1f29-45c6-98f5-894f5157e7b4', 'comprehension',
 'What is the interviewer''s name?',
 '["Claire","Sarah","Emma","Kate"]'::jsonb, '"Claire"'::jsonb),
('b084e092-1f29-45c6-98f5-894f5157e7b4', 'true_false',
 'The candidate has a degree in Communications.',
 NULL, 'true'::jsonb),
('b084e092-1f29-45c6-98f5-894f5157e7b4', 'fill_blank',
 'The candidate is applying for the Senior Campaign ___ role.',
 NULL, '"Manager"'::jsonb),

-- ── B1: BBC — Is Social Media Making Us Lonely? ───────────────────────────────
('73902329-6bce-4c61-89ac-3478e6d26837', 'comprehension',
 'What is the name of Neil''s co-presenter in this episode?',
 '["Sophie","Sarah","Emma","Lucy"]'::jsonb, '"Sophie"'::jsonb),
('73902329-6bce-4c61-89ac-3478e6d26837', 'true_false',
 'The hosts argue that social media always makes people feel more connected.',
 NULL, 'false'::jsonb),
('73902329-6bce-4c61-89ac-3478e6d26837', 'fill_blank',
 'The episode explores whether social media makes us more or less ___ to the people around us.',
 NULL, '"connected"'::jsonb),

-- ── B1: BBC — The Science of Sleep ───────────────────────────────────────────
('6114237d-969f-4e24-83dc-84985a9716dc', 'comprehension',
 'Where does Dr. Patel work as a sleep researcher?',
 '["University of Bristol","University of Oxford","Imperial College London","University of Manchester"]'::jsonb, '"University of Bristol"'::jsonb),
('6114237d-969f-4e24-83dc-84985a9716dc', 'true_false',
 'Dr. Patel guesses that people spend twenty-five years sleeping over a lifetime.',
 NULL, 'true'::jsonb),
('6114237d-969f-4e24-83dc-84985a9716dc', 'fill_blank',
 'Sleep takes up roughly a ___ of our lives.',
 NULL, '"third"'::jsonb),

-- ── B1: Climate Change and Daily Life ────────────────────────────────────────
('9325f821-a1c5-40f9-a4bf-de822f5ee2f9', 'comprehension',
 'What is described as the main driver of climate change?',
 '["Fossil fuels","Deforestation","Agriculture","Overpopulation"]'::jsonb, '"Fossil fuels"'::jsonb),
('9325f821-a1c5-40f9-a4bf-de822f5ee2f9', 'true_false',
 'Climate change is now affecting everyday life, not just scientific reports.',
 NULL, 'true'::jsonb),
('9325f821-a1c5-40f9-a4bf-de822f5ee2f9', 'fill_blank',
 'Burning fossil fuels releases ___ dioxide and other greenhouse gases.',
 NULL, '"carbon"'::jsonb),

-- ── B1: Health and Lifestyle ──────────────────────────────────────────────────
('a34c6c91-8dde-4e32-b2be-66f92a584a7a', 'comprehension',
 'According to the recording, what does a nutrient-rich diet support?',
 '["Immune function and mood","Only physical strength","Only weight loss","Athletic performance"]'::jsonb, '"Immune function and mood"'::jsonb),
('a34c6c91-8dde-4e32-b2be-66f92a584a7a', 'true_false',
 'The recording states that physical and mental health are completely independent of each other.',
 NULL, 'false'::jsonb),
('a34c6c91-8dde-4e32-b2be-66f92a584a7a', 'fill_blank',
 'A healthy life is about nurturing your overall ___.',
 NULL, '"wellbeing"'::jsonb),

-- ── B1: Technology and Education ─────────────────────────────────────────────
('da9fb022-4686-4b8e-8cba-c100cf5c264f', 'comprehension',
 'What is identified as the most obvious benefit of technology in education?',
 '["Accessibility","Lower cost","Better teachers","Faster exams"]'::jsonb, '"Accessibility"'::jsonb),
('da9fb022-4686-4b8e-8cba-c100cf5c264f', 'true_false',
 'In the past, high-quality education was available to everyone equally.',
 NULL, 'false'::jsonb),
('da9fb022-4686-4b8e-8cba-c100cf5c264f', 'fill_blank',
 'Anyone with a smartphone and an internet connection can now access ___ from world-class universities.',
 NULL, '"lectures"'::jsonb),

-- ── B1: Travel Experiences ────────────────────────────────────────────────────
('3b90ed90-922b-455a-9f00-04ce8f122ce2', 'comprehension',
 'Which country does the narrator describe as their most perspective-changing trip?',
 '["India","Japan","Brazil","Morocco"]'::jsonb, '"India"'::jsonb),
('3b90ed90-922b-455a-9f00-04ce8f122ce2', 'true_false',
 'The narrator grew up in a large city.',
 NULL, 'false'::jsonb),
('3b90ed90-922b-455a-9f00-04ce8f122ce2', 'fill_blank',
 'The narrator spent ___ in India in their early twenties.',
 NULL, '"a month"'::jsonb),

-- ── B2: Artificial Intelligence in Healthcare ─────────────────────────────────
('e1520aaa-436c-4d11-a010-3dee440f1b50', 'comprehension',
 'In which area does AI currently show the strongest diagnostic capability?',
 '["Medical imaging","Surgery","Drug development","Mental health"]'::jsonb, '"Medical imaging"'::jsonb),
('e1520aaa-436c-4d11-a010-3dee440f1b50', 'true_false',
 'AI systems have already surpassed human doctors in all areas of medicine.',
 NULL, 'false'::jsonb),
('e1520aaa-436c-4d11-a010-3dee440f1b50', 'fill_blank',
 'AI in healthcare typically works through machine ___ algorithms.',
 NULL, '"learning"'::jsonb),

-- ── B2: BBC — The Future of Food ─────────────────────────────────────────────
('7785fcd6-cc62-47ac-a677-ab388e6f7762', 'comprehension',
 'What are the two biggest levers for reducing food system emissions, according to Dr. Hargreaves?',
 '["Livestock and food waste","Transport and packaging","Water use and energy","Soil quality and biodiversity"]'::jsonb, '"Livestock and food waste"'::jsonb),
('7785fcd6-cc62-47ac-a677-ab388e6f7762', 'true_false',
 'The global food system is responsible for around a third of greenhouse gas emissions.',
 NULL, 'true'::jsonb),
('7785fcd6-cc62-47ac-a677-ab388e6f7762', 'fill_blank',
 'Dr. Hargreaves is a food ___ researcher at Imperial College London.',
 NULL, '"systems"'::jsonb),

-- ── B2: The Psychology of Habits ─────────────────────────────────────────────
('f2fb2c56-e6a0-4848-9fae-9d67432fefc1', 'comprehension',
 'In the habit loop, what triggers a routine?',
 '["A cue","A reward","A goal","A decision"]'::jsonb, '"A cue"'::jsonb),
('f2fb2c56-e6a0-4848-9fae-9d67432fefc1', 'true_false',
 'Most of our daily behaviour is the result of conscious decision-making.',
 NULL, 'false'::jsonb),
('f2fb2c56-e6a0-4848-9fae-9d67432fefc1', 'fill_blank',
 'The habit loop was popularised by the psychologist Charles ___.',
 NULL, '"Duhigg"'::jsonb),

-- ── B2: Urban Planning and Smart Cities ──────────────────────────────────────
('d3df68fd-bcb9-487b-930d-2fe5da210c08', 'comprehension',
 'What percentage of the global population is projected to live in cities by 2050?',
 '["50%","60%","70%","80%"]'::jsonb, '"70%"'::jsonb),
('d3df68fd-bcb9-487b-930d-2fe5da210c08', 'true_false',
 'Traffic congestion is one of the problems that smart city technology aims to solve.',
 NULL, 'true'::jsonb),
('d3df68fd-bcb9-487b-930d-2fe5da210c08', 'fill_blank',
 'A ___ city uses data, sensors, and connected infrastructure to function more efficiently.',
 NULL, '"smart"'::jsonb),

-- ── B2: VOA — How Languages Die ──────────────────────────────────────────────
('621ad66c-02b9-48fd-8b20-a3792a8e8d32', 'comprehension',
 'Approximately how often does a language disappear from the world?',
 '["Every day","Every week","Every two weeks","Every month"]'::jsonb, '"Every two weeks"'::jsonb),
('621ad66c-02b9-48fd-8b20-a3792a8e8d32', 'true_false',
 'All seven thousand languages spoken today will definitely be gone by 2100.',
 NULL, 'false'::jsonb),
('621ad66c-02b9-48fd-8b20-a3792a8e8d32', 'fill_blank',
 'There are roughly ___ thousand languages spoken on Earth today.',
 NULL, '"seven"'::jsonb),

-- ── C1: Cognitive Biases in Decision-Making ──────────────────────────────────
('b0854c61-11bc-43ee-be36-fad2476c014d', 'comprehension',
 'What is a heuristic described as in the recording?',
 '["A mental shortcut","A logical fallacy","A type of bias","A cognitive error"]'::jsonb, '"A mental shortcut"'::jsonb),
('b0854c61-11bc-43ee-be36-fad2476c014d', 'true_false',
 'The recording says cognitive biases are signs of low intelligence.',
 NULL, 'false'::jsonb),
('b0854c61-11bc-43ee-be36-fad2476c014d', 'fill_blank',
 'A heuristic is a rule of ___ that allows us to make quick decisions.',
 NULL, '"thumb"'::jsonb),

-- ── C1: Globalisation and Cultural Identity ───────────────────────────────────
('d38e7bf4-af1e-48f3-8ea0-1721693cddbf', 'comprehension',
 'How does the recording describe the effect of globalisation on the world?',
 '["More interconnected and homogenous","More diverse and fragmented","More isolated and independent","More traditional and local"]'::jsonb, '"More interconnected and homogenous"'::jsonb),
('d38e7bf4-af1e-48f3-8ea0-1721693cddbf', 'true_false',
 'The recording presents globalisation as having only positive effects on culture.',
 NULL, 'false'::jsonb),
('d38e7bf4-af1e-48f3-8ea0-1721693cddbf', 'fill_blank',
 'Globalisation involves the free movement of goods, capital, people, and ___.',
 NULL, '"culture"'::jsonb),

-- ── C1: The Future of Democracy ──────────────────────────────────────────────
('51e10e27-2cb1-4440-b4b8-16c4206b924d', 'comprehension',
 'According to the recording, when was democracy last under this level of pressure?',
 '["Since the First World War","Since the Second World War","Since the Cold War","Since the 1990s"]'::jsonb, '"Since the Second World War"'::jsonb),
('51e10e27-2cb1-4440-b4b8-16c4206b924d', 'true_false',
 'The recording says populism is a clear and well-defined political concept.',
 NULL, 'false'::jsonb),
('51e10e27-2cb1-4440-b4b8-16c4206b924d', 'fill_blank',
 'Democracy requires ___ defence rather than passive assumption.',
 NULL, '"active"'::jsonb),

-- ── C2: Consciousness and the Hard Problem ────────────────────────────────────
('acfe7834-08da-4e40-b75d-ce1f4c921a3b', 'comprehension',
 'Who coined the term "the hard problem of consciousness"?',
 '["David Chalmers","Daniel Dennett","Francis Crick","John Searle"]'::jsonb, '"David Chalmers"'::jsonb),
('acfe7834-08da-4e40-b75d-ce1f4c921a3b', 'true_false',
 'The hard problem of consciousness has been fully resolved by modern neuroscience.',
 NULL, 'false'::jsonb),
('acfe7834-08da-4e40-b75d-ce1f4c921a3b', 'fill_blank',
 'The neural ___ of experience are not the same as explaining why experience exists at all.',
 NULL, '"correlates"'::jsonb),

-- ── C2: Post-Truth and the Epistemological Crisis ────────────────────────────
('c10a0410-c56f-4c88-816a-bd24ec300887', 'comprehension',
 'What does the "post-truth" era describe, according to the recording?',
 '["A period where facts and expertise are destabilised","An era of unprecedented scientific accuracy","A time when science is more trusted","A new form of transparent debate"]'::jsonb, '"A period where facts and expertise are destabilised"'::jsonb),
('c10a0410-c56f-4c88-816a-bd24ec300887', 'true_false',
 'The recording says the core problem is simply that some people believe false things.',
 NULL, 'false'::jsonb),
('c10a0410-c56f-4c88-816a-bd24ec300887', 'fill_blank',
 'The post-truth era has eroded shared ___ frameworks that democratic societies depend upon.',
 NULL, '"epistemic"'::jsonb)

ON CONFLICT (clip_id, prompt) DO NOTHING;
