package database

// ielts_materials_library.go
//
// Complete mapping of all 900+ telegram-media files into the studywithraissov
// database schema. Files are split into two destinations:
//
//   1. IELTSMaterial  → Materials Library (books, lessons, tips, vocab, grammar)
//   2. IELTSQuestion  → Simulator question bank (mock tests, practice sets)
//
// FilePath values are relative to the telegram-media/ directory.
// Run seedIELTSMaterialsLibrary() from the migrate command after initial setup.

import (
	"log"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// SeedIELTSMaterialsLibrary seeds the full materials library from the
// telegram-media file mapping. Safe to call multiple times (upserts by title).
// Includes: study materials, mock tests, tips, and AI feedback prompts.
func SeedIELTSMaterialsLibrary(db *gorm.DB) error {
	// Combine all entry sources
	all := buildMaterialsLibrary()
	all = append(all, buildMockTests()...)
	all = append(all, buildFeedbackPrompts()...)

	created, skipped := 0, 0
	for _, m := range all {
		var existing models.IELTSMaterial
		res := db.Where("title = ?", m.Title).First(&existing)
		if res.Error == nil {
			skipped++
			continue
		}
		if err := db.Create(&m).Error; err != nil {
			return err
		}
		created++
	}
	log.Printf("[library] materials: created=%d skipped=%d total=%d", created, skipped, len(all))
	return nil
}

func buildMaterialsLibrary() []models.IELTSMaterial {
	s := 1
	next := func() int { v := s; s++; return v }

	return []models.IELTSMaterial{

		// ── WRITING BOOKS ─────────────────────────────────────────────────────

		{
			Title:       "Collins Writing for IELTS",
			Description: "Step-by-step guide covering both Task 1 and Task 2. Includes model answers, band descriptors, and skill-building exercises for bands 5.0–7.5.",
			Category:    "writing",
			Type:        "book",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/114_Collins Writing for IELTS.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Writing Task 1 Course Pack",
			Description: "Complete course pack for Academic Task 1: graphs, charts, tables, maps, diagrams, and processes. Includes overview-writing drills.",
			Category:    "writing",
			Type:        "lesson",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/105_writing_task_one_course_pack.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Writing Task 2 Course Pack",
			Description: "Structured course covering all Task 2 essay types: opinion, discussion, advantages/disadvantages, problem/solution, and two-part questions.",
			Category:    "writing",
			Type:        "lesson",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/106_writing_task_two_course_pack.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "How to Write at a Band 9 Level",
			Description: "Examiner-authored guide explaining precisely what separates Band 7 from Band 9 writing. Covers Task Achievement, Coherence, Lexis, and Grammar criteria.",
			Category:    "writing",
			Type:        "lesson",
			Difficulty:  "advanced",
			FilePath:    "telegram-media/1061_How To Write At A  9  Level.PDF",
			SortOrder:   next(),
		},
		{
			Title:       "Get IELTS Band 9 in Writing Task",
			Description: "Band 9 strategies for both tasks with annotated model answers showing exactly how top scores are achieved.",
			Category:    "writing",
			Type:        "lesson",
			Difficulty:  "advanced",
			FilePath:    "telegram-media/111_get ielts band 9 in writing task.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "IELTS Made Easy — Step-by-Step Guide to Task 1",
			Description: "Beginner-friendly breakdown of Task 1. Teaches how to identify the key visual type, write an overview, and structure paragraphs in 20 minutes.",
			Category:    "writing",
			Type:        "lesson",
			Difficulty:  "beginner",
			FilePath:    "telegram-media/23_IELTS_Made_easy_stepbystep_Guide_to_Writing_a_task_1.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Master IELTS Essays — Task 2 (Tahasoni)",
			Description: "Tahasoni's acclaimed method: PEER paragraph structure (Point, Explain, Example, Result). Full essay samples for every question type at Band 7–9.",
			Category:    "writing",
			Type:        "book",
			Difficulty:  "advanced",
			FilePath:    "telegram-media/140_Tahasoni_Master_IELTS_Essays_writing_task_two.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Master IELTS Visuals — Task 1 (Tahasoni)",
			Description: "Every Task 1 visual type with Tahasoni's framework: line graphs, bar charts, pie charts, tables, maps before/after, and process diagrams.",
			Category:    "writing",
			Type:        "book",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/139_Master_IELTS_Visuals_Tahasoni_E__2020.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "IELTS Writing Masterclass 8.5",
			Description: "Masterclass targeting Band 8.5. Advanced collocations, discourse markers, and complex grammar structures for Task 1 and Task 2.",
			Category:    "writing",
			Type:        "lesson",
			Difficulty:  "advanced",
			FilePath:    "telegram-media/297_IELTS_Writing_Masterclass_8_5.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Rachel Mitchell — Academic Writing Task 1 & 2",
			Description: "Systematic approach to both tasks with annotated model answers. Covers all visual types and all Task 2 essay structures.",
			Category:    "writing",
			Type:        "book",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/383_IELTS_Academic_Writing_Task_1&2_By_Rachel_Mitchell.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "High Scoring IELTS Writing",
			Description: "Practical guide to achieving Band 7+ with real examiner strategies, common mistake avoidance, and timed writing practice.",
			Category:    "writing",
			Type:        "book",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/145_High Scoring IELTS Writing (1).pdf",
			SortOrder:   next(),
		},
		{
			Title:       "The Easy Way to IELTS Writing — Academic Module",
			Description: "Simplified methodology for Task 1 and Task 2. Ideal for students moving from Band 5.5 to 6.5.",
			Category:    "writing",
			Type:        "lesson",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/2114_@MULTI_LEVEL_CEFR_The_Easy_Way_to_IELTS_Writing_Academic_Module.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Simon — Band 9 Essay Ideas",
			Description: "Simon's curated bank of Band 9 ideas and arguments organised by topic for Task 2. Essential for building idea vocabulary.",
			Category:    "writing",
			Type:        "lesson",
			Difficulty:  "advanced",
			FilePath:    "telegram-media/537_SIMON BAND 9 IDEAS @johnnys_IELTS.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Liz — Band 9 Essay Ideas",
			Description: "Liz IELTS's comprehensive idea bank for every common Task 2 topic. Organised by topic with Band 9 vocabulary.",
			Category:    "writing",
			Type:        "lesson",
			Difficulty:  "advanced",
			FilePath:    "telegram-media/536_LIZ BAND 9 IDEAS @johnnys_IELTS.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Key to IELTS Writing Task 1",
			Description: "Johnny's structured answer keys for Task 1. Shows examiner thinking and scoring rationale for each visual type.",
			Category:    "writing",
			Type:        "practice",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/532_KEY TO IELTS WRITING TASK 1 @johnnys_IELTS.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Key to IELTS Writing Task 2",
			Description: "Johnny's answer keys for Task 2. Every major question type covered with band-annotated model essays.",
			Category:    "writing",
			Type:        "practice",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/531_KEY TO IELTS WRITING TASK 2 @johnnys_IELTS.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Grammar for IELTS Writing",
			Description: "Johnny's guide to grammar structures that raise band scores in Task 2: conditionals, passive voice, complex noun phrases, and relative clauses.",
			Category:    "writing",
			Type:        "lesson",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/535_GRAMMAR FOR WRITING @johnnys_IELTS.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Panda Writing — 2nd Edition",
			Description: "College Panda's IELTS Writing guide. Compact, exam-focused coverage of both tasks with error analysis and correction drills.",
			Category:    "writing",
			Type:        "book",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/1358_Panda Writing 2nd edition (2).pdf",
			SortOrder:   next(),
		},
		{
			Title:       "IELTS Examiner's Tips",
			Description: "Officially compiled examiner tips covering all four sections. Primary source for the studywithraissov grading methodology.",
			Category:    "writing",
			Type:        "tip",
			Difficulty:  "all",
			FilePath:    "telegram-media/2113_@MULTI_LEVEL_CEFR             IELTS Examiner's Tips.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "IELTS Writing Band Descriptors (Official)",
			Description: "Cambridge's official public band descriptor tables for Writing Task 1 and Task 2. Used directly by examiners to assign scores.",
			Category:    "writing",
			Type:        "lesson",
			Difficulty:  "all",
			FilePath:    "telegram-media/1473_ielts-writing-band-descriptors.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "300 IELTS Writing Sample Essays",
			Description: "Large bank of Task 2 sample essays across all topics and question types. Band scores annotated for comparison.",
			Category:    "writing",
			Type:        "practice",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/1593_300_IELTS_Writing_Samples_Essay_YES_IELTS__z-lib_org.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "50 Sample Essays Task 1 & Task 2",
			Description: "Fifty model essays spanning both tasks at Band 6.5–8.0 with examiner commentary.",
			Category:    "writing",
			Type:        "practice",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/144_50 Sample Essays Task 1 & Task 2.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Simon — Task 2 Essay Analysis (CEFR Multi-Level)",
			Description: "Simon's sentence-level analysis of Band 9 Task 2 essays. Shows exactly what earns each criterion score.",
			Category:    "writing",
			Type:        "lesson",
			Difficulty:  "advanced",
			FilePath:    "telegram-media/2111_@MULTI_LEVEL_CEFR_Writing_Task_2_IELTS_Simons_Essay_Analysis.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "IELTS Writing Grammar (Grammar Task 2)",
			Description: "Johnny's grammar guide specifically for Task 2: tense consistency, punctuation, sentence variety, and error classification.",
			Category:    "writing",
			Type:        "lesson",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/538_GRAMMAR TASK 2 @johnnys_IELTS.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Diagrams — Task 1 Diagram Writing Guide",
			Description: "Specialist guide for process diagrams and map descriptions in Task 1. Covers passive voice and sequencing language.",
			Category:    "writing",
			Type:        "lesson",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/107_Diagrams.docx",
			SortOrder:   next(),
		},
		{
			Title:       "IELTS Writing Task 2 Samples (Akhlima Begum Band 7.0)",
			Description: "Real Band 7.0 essays with examiner feedback. Useful for seeing what a 7.0 looks and feels like before aiming higher.",
			Category:    "writing",
			Type:        "practice",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/493_begum_akhlima_ielts_writing_samples_band_70_ielts_writing_ta.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "IELTS Common Mistakes for Bands 6–7",
			Description: "Cambridge's documented list of errors that prevent students from breaking Band 7. Essential for self-correction at intermediate level.",
			Category:    "writing",
			Type:        "tip",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/1995_IELTS Common Mistakes for 6-7.pdf",
			SortOrder:   next(),
		},

		// ── SPEAKING BOOKS ────────────────────────────────────────────────────

		{
			Title:       "Collins Speaking for IELTS",
			Description: "Systematic speaking guide from Collins. Covers all three parts with model answers, pronunciation guidance, and vocabulary for common topics.",
			Category:    "speaking",
			Type:        "book",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/3084_Collins Speaking for IELTS.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "IELTS Advantage — Speaking & Listening Skills",
			Description: "Cambridge-aligned guide for combined Speaking and Listening improvement. Includes strategy and practice exercises.",
			Category:    "speaking",
			Type:        "book",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/1475_IELTS Advantage Speaking_Listening Skills.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "IELTS Speaking Strategies 2020",
			Description: "Comprehensive strategy guide with speaking samples and vocabulary banks for every Part 1/2/3 topic type.",
			Category:    "speaking",
			Type:        "lesson",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/351_IELTS_SPEAKING_STRATEGIES_2020_Speaking_Samples_Vocabulary_Collocations.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "IELTS Speaking 8.5 Master Plan",
			Description: "Advanced plan targeting Band 8.5. Covers complex structures, idiomatic language, and abstract Part 3 reasoning.",
			Category:    "speaking",
			Type:        "lesson",
			Difficulty:  "advanced",
			FilePath:    "telegram-media/298_IELTS_Speaking_8_5_Master_Plan.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Mat Clark — IELTS Speaking",
			Description: "Mat Clark's influential speaking guide with model answers for all parts. Includes vocabulary and natural expression banks.",
			Category:    "speaking",
			Type:        "book",
			Difficulty:  "advanced",
			FilePath:    "telegram-media/21_mat_clark__ielts_speaking_1_-1.docx",
			SortOrder:   next(),
		},
		{
			Title:       "179 IELTS Speaking Part 2 Samples",
			Description: "Bank of 179 model cue card answers. Organized by topic for targeted practice before the exam.",
			Category:    "speaking",
			Type:        "practice",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/1480_[@IELTS_Speaking_9] 179 IELTS Speaking Part 2 Samples..pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Makkar Speaking Cue Cards — Jan–Apr 2024",
			Description: "Kiran Makkar's predicted cue cards for January–April 2024. High-accuracy predictions with model answers.",
			Category:    "speaking",
			Type:        "practice",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/153_Makkar_IELTS_Speaking_Jan_Apr_2024_Final_Version_@officialieltsreality.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Makkar Speaking Cue Cards — May–Aug 2023",
			Description: "Kiran Makkar's predicted cue cards for May–August 2023 exam season.",
			Category:    "speaking",
			Type:        "practice",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/138_Kiran_Makkar_s_Speaking_Cue_Cards_May_Aug_2023_Final_Version_22.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Makkar Speaking Cue Cards — Sep–Dec 2024",
			Description: "Kiran Makkar's final version cue cards for September–December 2024.",
			Category:    "speaking",
			Type:        "practice",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/528_Kiran Makkar Speaking  Sep-DEc 2024 Final (1).pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Makkar Speaking Cue Cards — Jan–Apr 2025",
			Description: "Kiran Makkar's first version predictions for January–April 2025 exam season.",
			Category:    "speaking",
			Type:        "practice",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/2437_Kiran Makkar Speaking Cue Cards 1st Version Jan-Apr2025.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Makkar Speaking Cue Cards — May–Aug 2025",
			Description: "Kiran Makkar's final version predictions for May–August 2025 exam season.",
			Category:    "speaking",
			Type:        "practice",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/3108_Kiran_Makkar's_Speaking_Cue_Cards_Final_Version_May_Aug_2025.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Makkar Speaking Cue Cards — Sep–Dec 2025",
			Description: "Kiran Makkar's final version predictions for September–December 2025 exam season.",
			Category:    "speaking",
			Type:        "practice",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/3423_Kiran_Makkar_Speaking_Cue_Cards_Final_Version_98989Sep_Dec_2025.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Makkar Speaking Cue Cards — Jan–Apr 2026",
			Description: "Kiran Makkar's first version predictions for January–April 2026. Most recent available predictions.",
			Category:    "speaking",
			Type:        "practice",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/3464_Kiran_Makkars_Speaking_Cue_Cards_First_Version_Jan_Apr_2026_.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "All Speaking Questions Sep 2024 – Aug 2025",
			Description: "Complete collection of actual speaking questions used in exams from September 2024 to August 2025.",
			Category:    "speaking",
			Type:        "practice",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/3066_All Speaking Questions Sep 2024 - Aug 2025.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Speaking Topics 2025 (Jan–Apr)",
			Description: "Curated speaking topic list for January–April 2025 with model answer outlines.",
			Category:    "speaking",
			Type:        "practice",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/2438_Speaking topics 2025 (JAN-APR) (3).pdf",
			SortOrder:   next(),
		},
		{
			Title:       "IELTS Speaking Part 1–2–3 Questions 2025 (Jan–Apr)",
			Description: "All three parts' questions compiled for January–April 2025 with suggested response structures.",
			Category:    "speaking",
			Type:        "practice",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/2439_IELTS SPEAKING PART 1-2-3 QUESTIONS 2025 JAN-APR.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Predicted Topics for Speaking Part 2 & 3 — Jan–Apr 2025",
			Description: "High-accuracy Part 2 and 3 topic predictions for January–April 2025 exam window.",
			Category:    "speaking",
			Type:        "practice",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/2440_Predicted Topics For Speaking Part 2 & 3. Jan-April 2025.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Idioms for IELTS Speaking (Rachel)",
			Description: "Rachel Mitchell's curated idiom list for speaking. Natural, examiner-approved idioms with example sentences.",
			Category:    "speaking",
			Type:        "lesson",
			Difficulty:  "advanced",
			FilePath:    "telegram-media/484_Idioms_For_IELTS_Speaking_by_Rachel.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "50 Idioms for IELTS (StudyWithRaissov)",
			Description: "StudyWithRaissov's hand-picked 50 idioms for IELTS speaking with usage examples and common mistakes.",
			Category:    "speaking",
			Type:        "tip",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/337_50idiomsforIELTS_fromraissov.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Say This to the IELTS Examiner",
			Description: "Phrase guide for natural examiner interaction: opening lines, clarification requests, topic transitions, and natural closings.",
			Category:    "speaking",
			Type:        "tip",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/1781_Say this to the IELTS examiner.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "IELTS Speaking Band Descriptors (Official)",
			Description: "Cambridge's official public band descriptor tables for the Speaking test. The primary scoring reference.",
			Category:    "speaking",
			Type:        "lesson",
			Difficulty:  "all",
			FilePath:    "telegram-media/1474_ielts-speaking-band-descriptors.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Speaking Study Plan — 1 Week",
			Description: "Intensive one-week speaking preparation plan for students taking the exam soon.",
			Category:    "speaking",
			Type:        "lesson",
			Difficulty:  "all",
			FilePath:    "telegram-media/121_IELTS_Speaking_Study_Plan_1_Week.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Speaking Study Plan — 1 Month",
			Description: "Four-week structured speaking preparation plan with daily activities.",
			Category:    "speaking",
			Type:        "lesson",
			Difficulty:  "all",
			FilePath:    "telegram-media/120_IELTS_Speaking_Study_Plan_1_Month.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Speaking Study Plan — 2 Months",
			Description: "Two-month comprehensive speaking plan. Best for students starting from Band 5.5.",
			Category:    "speaking",
			Type:        "lesson",
			Difficulty:  "all",
			FilePath:    "telegram-media/123_IELTS_Speaking_Study_Plan_2_Months.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "IELTS Speaking Library (Complete)",
			Description: "Full speaking library with hundreds of model answers organized by part and topic.",
			Category:    "speaking",
			Type:        "book",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/3473_ielts-speaking-library.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Speaking Strategies and Rules + Vocabulary",
			Description: "Compact handbook of speaking rules, strategies, and high-value vocabulary for all three parts.",
			Category:    "speaking",
			Type:        "lesson",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/1778_SPEAKING STRATEGIES AND RULES + VOCABULARY.docx",
			SortOrder:   next(),
		},
		{
			Title:       "IELTS Speaking — Topic PDFs (Books, Clothes, Family, Food, Health, etc.)",
			Description: "Collection of topic-specific speaking answer sets: Books, Clothes, Describing People, Education, Environment, Family, Food, Health, Hometown, Internet, Media, Technology, Travel, Work.",
			Category:    "speaking",
			Type:        "practice",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/57_Books-IELTS-Speaking-Topic-PDF.pdf",
			SortOrder:   next(),
		},

		// ── READING BOOKS ─────────────────────────────────────────────────────

		{
			Title:       "Collins Reading for IELTS",
			Description: "Systematic reading skills development: skimming, scanning, True/False/Not Given, matching headings, and paragraph information questions.",
			Category:    "reading",
			Type:        "book",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/3082_Collins Reading for IELTS.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "IELTS Advantage — Reading Skills",
			Description: "Cambridge-aligned reading guide focusing on academic texts and question-type strategies.",
			Category:    "reading",
			Type:        "book",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/1477_IELTS Advantage Reading Skills.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "IELTS Reading Strategies — Ultimate Guide",
			Description: "Rachel Mitchell's comprehensive reading strategy guide with tips, tricks, and full practice passages.",
			Category:    "reading",
			Type:        "book",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/382_IELTS_Reading_Strategies_The_Ultimate_Guide_with_Tips_and_Tricks.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "IELTS Reading — 600 Academic Words",
			Description: "Essential academic vocabulary for reading comprehension. Organised by frequency with definitions and context examples.",
			Category:    "reading",
			Type:        "lesson",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/3465_IELTS-Readin-600-academic-words.docx",
			SortOrder:   next(),
		},
		{
			Title:       "Cambridge Thinking Skills",
			Description: "Cambridge's critical thinking and problem-solving resource. Builds the reasoning skills needed for Reading Part 3 and complex passages.",
			Category:    "reading",
			Type:        "lesson",
			Difficulty:  "advanced",
			FilePath:    "telegram-media/976_Cambridge Thinking skills.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Barron's — Essential Words for IELTS",
			Description: "Barron's vocabulary list for IELTS reading and writing. Covers the most frequently tested academic words.",
			Category:    "reading",
			Type:        "lesson",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/609_Essential Words For IELTS, Barron's.pdf",
			SortOrder:   next(),
		},

		// ── LISTENING BOOKS ───────────────────────────────────────────────────

		{
			Title:       "Collins Listening for IELTS",
			Description: "Section-by-section listening training: form completion, multiple choice, matching, and map/plan labelling.",
			Category:    "listening",
			Type:        "book",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/3085_7_Collins_Listening_for_IELTS_Book.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "IELTS Listening Strategies — Ultimate Guide",
			Description: "Rachel Mitchell's listening strategies: prediction techniques, distractor spotting, and transfer-time management.",
			Category:    "listening",
			Type:        "book",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/381_IELTS_Listening_Strategies_The_Ultimate_Guide_with_Tips,_Tricks.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "1200 Most Common IELTS Listening Words",
			Description: "Frequency-ranked vocabulary list for Listening. Knowing these words prevents blanks during section 4.",
			Category:    "listening",
			Type:        "lesson",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/1779_Copy of 1200 Words for  IELTS Listening Test.pdf",
			SortOrder:   next(),
		},

		// ── VOCABULARY ────────────────────────────────────────────────────────

		{
			Title:       "IELTS Vocabulary Masterclass 8.5",
			Description: "Advanced vocabulary system for scoring Band 8.5. Topic-by-topic collocations, academic synonyms, and natural expression banks.",
			Category:    "vocabulary",
			Type:        "book",
			Difficulty:  "advanced",
			FilePath:    "telegram-media/300_IELTS_Vocabulary_Masterclass_8_5.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "IELTS Collocations Masterclass",
			Description: "Comprehensive collocation guide. Every major IELTS topic covered with high-frequency collocations and usage examples.",
			Category:    "vocabulary",
			Type:        "book",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/299_IELTS_Collocations_Masterclass.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Collins Vocabulary for IELTS",
			Description: "Collins systematic vocabulary building program. Covers the Academic Word List with contextual exercises.",
			Category:    "vocabulary",
			Type:        "book",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/3083_Collins_Vocabulary_for_IELTS.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "IELTS Writing Vocabulary",
			Description: "Topic-organised writing vocabulary: environment, technology, health, education, society. Ready-to-use phrases and collocations.",
			Category:    "vocabulary",
			Type:        "lesson",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/3358_IELTS-Writing-Vocabulary.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "IELTS Writing Collocations",
			Description: "High-frequency collocations specifically tested in IELTS Writing. Covers Task 1 data language and Task 2 argument collocations.",
			Category:    "vocabulary",
			Type:        "lesson",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/148_IELTS WRITING COLLOCATIONS.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "IELTS Linking Words",
			Description: "Complete reference for discourse markers and cohesive devices. Organised by function: addition, contrast, cause, result, exemplification.",
			Category:    "vocabulary",
			Type:        "lesson",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/1772_IELTS-Linking-Words.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "IELTS Vocabulary Series — Parts 1–5 (@officialieltsreality)",
			Description: "Five-part vocabulary series covering 500+ topic-organised words with definitions and example sentences for IELTS.",
			Category:    "vocabulary",
			Type:        "practice",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/124_IELTS Vocabulary 1 @officialieltsreality.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Vocabulary for IELTS — #studywithraissov Edition",
			Description: "StudyWithRaissov's curated vocabulary selection aligned with the platform's teaching methodology.",
			Category:    "vocabulary",
			Type:        "lesson",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/175_VocabularyforIELTS_#studywithraissov.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Boost Your Vocabulary — Cambridge IELTS 8–16 (8 volumes)",
			Description: "Vocabulary extracted directly from Cambridge IELTS tests 8 through 16. Words are in authentic exam context.",
			Category:    "vocabulary",
			Type:        "practice",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/1452_Boost Your Vocabulary Cambridge IELTS 10.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Cambridge Vocabulary for IELTS Advanced",
			Description: "Cambridge's advanced vocabulary book targeting Band 7+. Academic collocations and sophisticated expressions.",
			Category:    "vocabulary",
			Type:        "book",
			Difficulty:  "advanced",
			FilePath:    "telegram-media/3357_Cambridge_Vocabulary_for_IELTS_Advanced_Avaye_Shahir.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "English Collocations in Use — Advanced",
			Description: "Cambridge's Advanced Collocations in Use. Covers formal and academic collocations essential for Band 7+ writing.",
			Category:    "vocabulary",
			Type:        "book",
			Difficulty:  "advanced",
			FilePath:    "telegram-media/1482_English Collocations in Use-Advanced.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Idioms and Phrasal Verbs — Intermediate",
			Description: "Oxford's intermediate idiom and phrasal verb guide. Contextual exercises with IELTS-relevant topics.",
			Category:    "vocabulary",
			Type:        "book",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/1483_Idioms and Phrasal Verbs Intermediate.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Idioms and Phrasal Verbs — Advanced",
			Description: "Oxford's advanced idiom and phrasal verb guide. Sophisticated expressions for Band 7.5+ speaking and writing.",
			Category:    "vocabulary",
			Type:        "book",
			Difficulty:  "advanced",
			FilePath:    "telegram-media/1484_Idioms and Phrasal Verbs. Advanced.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Vocabulary Building Series (Parts 1–3)",
			Description: "Three-part progressive vocabulary building series from beginner to intermediate academic level.",
			Category:    "vocabulary",
			Type:        "practice",
			Difficulty:  "beginner",
			FilePath:    "telegram-media/1081_Vocabulary-Building-1---93.pdf",
			SortOrder:   next(),
		},

		// ── GRAMMAR ───────────────────────────────────────────────────────────

		{
			Title:       "Grammar for IELTS (Cambridge)",
			Description: "Cambridge's dedicated IELTS grammar book. Covers all grammar structures tested in IELTS with practice exercises.",
			Category:    "grammar",
			Type:        "book",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/1063_Book Grammar For IELTS.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Cambridge English Grammar in Use (Intermediate)",
			Description: "Raymond Murphy's essential grammar reference. The most widely used grammar book for IELTS preparation worldwide.",
			Category:    "grammar",
			Type:        "book",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/1671_Cambridge English grammar In Use.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Cambridge English Grammar in Use Essential (2nd Ed)",
			Description: "Elementary version of Grammar in Use for students at A1–B1 level building foundational grammar.",
			Category:    "grammar",
			Type:        "book",
			Difficulty:  "beginner",
			FilePath:    "telegram-media/1672_Cambridge English Grammar in Use Essential 2nd.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Top 50 Grammar Mistakes — How to Avoid Them",
			Description: "The 50 most frequent grammar errors in IELTS writing with corrections and explanations. Direct input to the AI grading system.",
			Category:    "grammar",
			Type:        "tip",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/136_Top_50_Grammar_Mistakes_How_to_Avoid_Them.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Top 50 Vocabulary Mistakes",
			Description: "The 50 most common vocabulary errors in IELTS with corrections. Companion to the Grammar Mistakes guide.",
			Category:    "grammar",
			Type:        "tip",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/1066_Top 50 Vocabulary Mistakes.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Common Mistakes at IELTS Advanced",
			Description: "Cambridge's documented common errors specific to advanced candidates targeting Band 7–8.",
			Category:    "grammar",
			Type:        "tip",
			Difficulty:  "advanced",
			FilePath:    "telegram-media/608_Common_Mistakes_at_IELTS_Advanced.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Common Mistakes at IELTS Advanced (Companion)",
			Description: "Extended version of the Cambridge Common Mistakes guide with additional exercises and error drills.",
			Category:    "grammar",
			Type:        "tip",
			Difficulty:  "advanced",
			FilePath:    "telegram-media/3349_Common_Mistakes_at_IELTS_Advanced_and_how_to_avoid_them.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Grammar Parts of Speech Series",
			Description: "Individual grammar modules: Adjectives, Adverbs, Conjunctions, Interjections, Nouns, Prepositions, Pronouns, Punctuation, Similes & Metaphors, Synonyms & Antonyms, Verbs, Prefixes & Suffixes.",
			Category:    "grammar",
			Type:        "lesson",
			Difficulty:  "beginner",
			FilePath:    "telegram-media/1084_Adjectives.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Oxford Practice Grammar — Basic Tests",
			Description: "Grammar practice tests at basic/elementary level for students beginning their IELTS preparation.",
			Category:    "grammar",
			Type:        "practice",
			Difficulty:  "beginner",
			FilePath:    "telegram-media/1782_Oxford practice grammar basic tests.pdf",
			SortOrder:   next(),
		},

		// ── GENERAL / COMPLETE GUIDES ─────────────────────────────────────────

		{
			Title:       "The Official Cambridge Guide to IELTS",
			Description: "The most comprehensive official Cambridge preparation book. Covers all sections, question types, and includes 8 practice tests.",
			Category:    "general",
			Type:        "book",
			Difficulty:  "all",
			FilePath:    "telegram-media/51_The Official Cambridge Guide to IELTS.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Official Guide to IELTS (British Council)",
			Description: "The British Council's official IELTS guide. Authoritative overview of test format, scoring, and preparation strategies.",
			Category:    "general",
			Type:        "book",
			Difficulty:  "all",
			FilePath:    "telegram-media/22_3. offficial guide to Ielts.PDF",
			SortOrder:   next(),
		},
		{
			Title:       "IELTS Band Up",
			Description: "Quick-reference guide for raising your band score by 0.5–1.0 in each section. Focused tips for exam day.",
			Category:    "general",
			Type:        "tip",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/2117_IELTS Band Up.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "50 Steps to IELTS",
			Description: "Step-by-step IELTS preparation program covering all four skills in 50 structured learning steps.",
			Category:    "general",
			Type:        "lesson",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/86_50stepsIELTS.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Practical IELTS",
			Description: "Practical preparation guide with real-world practice activities for all four sections.",
			Category:    "general",
			Type:        "lesson",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/1062_Practical IELTS.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "IELTS Secret",
			Description: "Insider strategies and techniques from experienced IELTS teachers and high-scoring candidates.",
			Category:    "general",
			Type:        "lesson",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/91_IELTS SECRET.PDF",
			SortOrder:   next(),
		},
		{
			Title:       "IELTS in 2 Months — Study Plan",
			Description: "Structured 8-week preparation plan for candidates with limited time. Daily and weekly task breakdown.",
			Category:    "general",
			Type:        "lesson",
			Difficulty:  "all",
			FilePath:    "telegram-media/25_IELTS за 2 месяца.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "Barron's IELTS Strategies and Tips (2016 4th Ed)",
			Description: "Barron's comprehensive strategy book. Covers all question types with proven techniques and full practice tests.",
			Category:    "general",
			Type:        "book",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/41_Barron_39_s_IELTS_Strategies_and_Tips.pdf",
			SortOrder:   next(),
		},
		{
			Title:       "202 Useful Exercises for IELTS",
			Description: "202 targeted exercises covering all skills and question types. Ideal for focused weakness practice.",
			Category:    "general",
			Type:        "practice",
			Difficulty:  "intermediate",
			FilePath:    "telegram-media/42_202_useful_exercises_for_IELTS.pdf",
			SortOrder:   next(),
		},
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// FILE → SIMULATOR MAPPING (IELTSQuestion bank)
// ═══════════════════════════════════════════════════════════════════════════
//
// The following files feed the IELTSQuestion table (Simulator module).
// They are NOT loaded automatically — content must be extracted and seeded
// into IELTSQuestion records using the existing seedIELTSQuestions() pipeline.
//
// Extraction priority (highest → lowest):
//
//  TIER 1 — Cambridge Official (mock_type = "cambridge_style")
//  ──────────────────────────────────────────────────────────
//  Cambridge IELTS 3  → 75_Cambridge ielts 7.pdf [sic numbering]
//  Cambridge IELTS 5  → 102_Cambridge IELTS ACADEMIC 5.pdf
//  Cambridge IELTS 6  → 100_Cambridge IELTS ACADEMIC 6-2part.pdf
//  Cambridge IELTS 7  → 85_Cambridge ielts 7.pdf
//  Cambridge IELTS 8  → 75_Cambridge IELTS 8.pdf
//  Cambridge IELTS 9  → 82_Cambridge IELTS 9.pdf
//  Cambridge IELTS 10 → 80_Cambridge IELTS 10.pdf
//  Cambridge IELTS 11 → 76_Cambridge IELTS 11 - Clear PDF Version.pdf
//  Cambridge IELTS 12 → 79_Cambridge IELTS 12 PDF.pdf
//  Cambridge IELTS 13 → 77_IELTS Cambridge 13.pdf
//  Cambridge IELTS 14 → 81_IELTS Cambridge IELTS 14.pdf
//  Cambridge IELTS 15 → 78_s cambridge_ielts_15.pdf
//  Cambridge IELTS 15.2 → 724_Cambridge IELTS 15.2.pdf
//  Cambridge IELTS 16 → 83_x Cambridge IELTS 16 Academic.pdf
//  Cambridge IELTS 18 → 606_Cambridge_IELTS_18_L_cambridge_library.pdf
//  Cambridge IELTS 20 → 3110_CAMBRIDGE IELTS 20 (@REALEXAMIELTS).pdf
//  Actual Reading Oct–Jan 2021–2022 → 101_IELTS Actual Reading Oct-Jan 2021 2022.pdf
//  Actual Speaking Oct–Jan 2021–2022 → 103_IELTS Actual Speaking Oct-Jan 2021 2022.pdf
//  Actual Reading Jun–Sep 2021 → 95_Actual Tests Academic Reading Jun-Sep 2021.pdf
//  Actual Speaking Jan–Apr 2022 → 73_IELTS Speaking Actual Test Oct to January 2022.pdf
//  Barron's Practice Exams → 84_barrons_ielts_practice_exams.pdf / 601_1608297442Barron's IELTS_2016, 4th.pdf
//  IELTS Trainer (6 tests) → 374_IELTS-Trainer.pdf
//  IELTS Trainer 2 → 3350_IELTS_Trainer_2.pdf
//
//  TIER 2 — Predictions (mock_type = "predictions")
//  ─────────────────────────────────────────────────
//  Makkar Speaking Jan–Apr 2024 → 153_Makkar_IELTS_Speaking_Jan_Apr_2024_...pdf
//  Makkar Speaking May–Aug 2021 → 98_Makkar IELTS Speaking 5-8.2021...pdf
//  Makkar Speaking Jan–Apr 2022 → 97_Makkar_IELTS_Speaking_January_to_April_2022...pdf
//  Makkar Speaking May–Aug 2023 → 138_Kiran_Makkar_s_Speaking_Cue_Cards_May_Aug_2023...pdf
//  Makkar Speaking Sep–Dec 2024 → 528_Kiran Makkar Speaking Sep-Dec 2024 Final.pdf
//  Makkar Speaking Jan–Apr 2025 → 2437_Kiran Makkar Speaking Cue Cards 1st Version Jan-Apr2025.pdf
//  Makkar Speaking May–Aug 2025 → 3108_Kiran_Makkar's_Speaking_Cue_Cards_Final_Version_May_Aug_2025.pdf
//  Makkar Speaking Sep–Dec 2025 → 3423_Kiran_Makkar_Speaking_Cue_Cards...Sep_Dec_2025.pdf
//  Makkar Speaking Jan–Apr 2026 → 3464_Kiran_Makkars_Speaking_Cue_Cards_First_Version_Jan_Apr_2026_.pdf
//  Predicted Speaking Part 1 → 99_Predicted IELTS Speaking Questions (Part 1).pdf
//  Predicted Speaking Part 2&3 → 96_Predicted IELTS Speaking Questions (Part 2&3).pdf
//  Speaking Forecast Sep–Dec → 3333_Forecast speaking (september to decepber).pdf
//  May Speaking Predictions → 3067_May Speaking Predictions.pdf
//  2024 Real Exam Questions → 533_2024 REAL EXAM QUESTIONS @johnnys_IELTS.pdf
//  Speaking Recent Topics 2024 → 154_IELTS Speaking Recent Topics [2024_ May-August].pdf
//  Speaking 2025 Jan–Apr Part 1 → 3150_Speaking Quý 2.2025 question- phần 1.pdf
//  Speaking 2026 → 3455_Speaking 2026.pdf
//  Vietnam Writing 2025 → 2255_VIETNAM WRITING 2025.pdf
//
//  TIER 3 — Original (mock_type = "original")
//  ──────────────────────────────────────────
//  IELTS Practice Tests + Key → 129_pdfcoffee_com_ielts_practice_tests_with_explanatory_key.pdf
//  IELTS Tests Set 1 → 130_IELTS_tests.pdf
//  IELTS Tests Set 2 → 131_IELTS_tests.pdf
//  IELTS Tests Set 3 → 44_IELTS_tests.pdf
//  Practice Tests 1–5 → 1339–1343_Practice Test 1-5.pdf
//  General Training Tests → 610_General Training - Practice tests.pdf
//  IELTS General Training Reading → 115, 116_IELTS Reading Test (General Training).pdf
//  Barron's IELTS Writing → 604_Barron's Writing for the IELTS.pdf
//  Dr. Chung — 63 Tips & 16 Tests → 913_Dr.Chung-63tips-16Tests.pdf / 1345_Dr.Chung-63tips-16Tests.pdf
//  IELTS Special Journals 1–9 → 267–275_IELTS Special Journal 1-9.pdf
//  20-Day IELTS Essay Challenge → 494_The 20 day IELTS essay challenge.pdf
//  IELTS Model Essays → 495_IELTS Model Essays.pdf
//  Reading 1, Reading 2 practice → 117_Reading 1.pdf, 118_Reading 2.pdf
//  Master IELTS Writing Band 9.0 → 1460_Master IELTS Writing Band 9.0 Essays.pdf
//
// ═══════════════════════════════════════════════════════════════════════════
