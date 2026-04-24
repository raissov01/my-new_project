package database

import (
	"log"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

type unitDef struct {
	Level   string
	Title   string
	Desc    string
	Skill   string
	Emoji   string
	Color   string
	Course  string // "GENERAL" | "IELTS"
	Lessons []lessonDef
}

type lessonDef struct {
	Title string
	Type  string // standard, review, boss
}

var curriculum = []unitDef{
	// ── A1 Level ──
	{Level: "A1", Course: "GENERAL", Title: "Basic Vocabulary", Desc: "Essential everyday words and phrases", Skill: "vocabulary", Emoji: "🔤", Color: "#22c55e", Lessons: []lessonDef{
		{Title: "Greetings & Introductions", Type: "standard"},
		{Title: "Numbers & Colors", Type: "standard"},
		{Title: "Family & People", Type: "standard"},
		{Title: "Food & Drinks", Type: "standard"},
		{Title: "Days, Months & Time", Type: "standard"},
		{Title: "Animals & Nature", Type: "standard"},
		{Title: "Clothes & Shopping", Type: "standard"},
		{Title: "Home & Furniture", Type: "standard"},
		{Title: "Common Verbs", Type: "standard"},
		{Title: "Vocabulary Review", Type: "boss"},
	}},
	{Level: "A1", Course: "GENERAL", Title: "Grammar Foundations", Desc: "Present simple, articles, pronouns", Skill: "grammar", Emoji: "📝", Color: "#3b82f6", Lessons: []lessonDef{
		{Title: "To Be & Articles", Type: "standard"},
		{Title: "Present Simple", Type: "standard"},
		{Title: "Pronouns & Possessives", Type: "standard"},
		{Title: "Questions & Negatives", Type: "standard"},
		{Title: "There Is / There Are", Type: "standard"},
		{Title: "Have Got", Type: "standard"},
		{Title: "Imperatives & Requests", Type: "standard"},
		{Title: "Can & Can't", Type: "standard"},
		{Title: "Simple Adjectives", Type: "standard"},
		{Title: "Grammar Challenge", Type: "boss"},
	}},
	{Level: "A1", Course: "GENERAL", Title: "First Reading", Desc: "Short texts and simple comprehension", Skill: "reading", Emoji: "📖", Color: "#8b5cf6", Lessons: []lessonDef{
		{Title: "Signs & Notices", Type: "standard"},
		{Title: "Short Messages", Type: "standard"},
		{Title: "Simple Descriptions", Type: "standard"},
		{Title: "Personal Profiles", Type: "standard"},
		{Title: "Menus & Lists", Type: "standard"},
		{Title: "Basic Instructions", Type: "standard"},
		{Title: "Email Greetings", Type: "standard"},
		{Title: "Short Stories", Type: "standard"},
		{Title: "Timetables & Schedules", Type: "standard"},
		{Title: "Reading Boss", Type: "boss"},
	}},

	// ── A2 Level ──
	{Level: "A2", Course: "GENERAL", Title: "Academic Vocabulary I", Desc: "Expanding word bank for everyday contexts", Skill: "vocabulary", Emoji: "📚", Color: "#f59e0b", Lessons: []lessonDef{
		{Title: "Places & Directions", Type: "standard"},
		{Title: "Jobs & Occupations", Type: "standard"},
		{Title: "Weather & Nature", Type: "standard"},
		{Title: "Health & Body", Type: "standard"},
		{Title: "Transport & Travel", Type: "standard"},
		{Title: "Feelings & Emotions", Type: "standard"},
		{Title: "Hobbies & Sports", Type: "standard"},
		{Title: "Technology & Gadgets", Type: "standard"},
		{Title: "Money & Shopping", Type: "standard"},
		{Title: "Vocab Master", Type: "boss"},
	}},
	{Level: "A2", Course: "GENERAL", Title: "Sentence Building", Desc: "Past tense, conjunctions, comparatives", Skill: "grammar", Emoji: "🏗️", Color: "#ec4899", Lessons: []lessonDef{
		{Title: "Past Simple", Type: "standard"},
		{Title: "Conjunctions & Linking", Type: "standard"},
		{Title: "Comparatives & Superlatives", Type: "standard"},
		{Title: "Future with Will & Going To", Type: "standard"},
		{Title: "Present Continuous", Type: "standard"},
		{Title: "Past Continuous", Type: "standard"},
		{Title: "Frequency Adverbs", Type: "standard"},
		{Title: "Count & Uncount Nouns", Type: "standard"},
		{Title: "Modal Verbs: Should / Must", Type: "standard"},
		{Title: "Sentence Boss", Type: "boss"},
	}},
	{Level: "A2", Course: "GENERAL", Title: "Listening Basics", Desc: "Understanding spoken English", Skill: "listening", Emoji: "🎧", Color: "#06b6d4", Lessons: []lessonDef{
		{Title: "Numbers & Spelling", Type: "standard"},
		{Title: "Daily Conversations", Type: "standard"},
		{Title: "Following Directions", Type: "standard"},
		{Title: "Short Announcements", Type: "standard"},
		{Title: "Phone Calls & Voicemails", Type: "standard"},
		{Title: "Weather Forecasts", Type: "standard"},
		{Title: "Shopping Dialogues", Type: "standard"},
		{Title: "At the Doctor", Type: "standard"},
		{Title: "News Headlines", Type: "standard"},
		{Title: "Listening Challenge", Type: "boss"},
	}},

	// ── B1 Level — General English ──
	{Level: "B1", Course: "GENERAL", Title: "Conditionals & Opinions", Desc: "If-clauses, expressing views and disagreement", Skill: "grammar", Emoji: "💭", Color: "#6366f1", Lessons: []lessonDef{
		{Title: "Zero & First Conditionals", Type: "standard"},
		{Title: "Second & Third Conditionals", Type: "standard"},
		{Title: "Expressing Opinions", Type: "standard"},
		{Title: "Agreeing & Disagreeing", Type: "standard"},
		{Title: "Mixed Conditionals", Type: "standard"},
		{Title: "Wish & Regret Structures", Type: "standard"},
		{Title: "Hedging Language", Type: "standard"},
		{Title: "Reporting Opinions", Type: "standard"},
		{Title: "Opinion Writing Practice", Type: "standard"},
		{Title: "Conditionals Boss", Type: "boss"},
	}},
	{Level: "B1", Course: "GENERAL", Title: "Travel & Experiences", Desc: "Describing trips, past experiences, narrating events", Skill: "vocabulary", Emoji: "✈️", Color: "#0ea5e9", Lessons: []lessonDef{
		{Title: "Describing a Journey", Type: "standard"},
		{Title: "Past Experiences with Have/Have Been", Type: "standard"},
		{Title: "Narrative Tenses", Type: "standard"},
		{Title: "Travel Vocabulary", Type: "standard"},
		{Title: "Transport & Accommodation", Type: "standard"},
		{Title: "Booking & Reservations", Type: "standard"},
		{Title: "Asking for Help Abroad", Type: "standard"},
		{Title: "Cultural Customs", Type: "standard"},
		{Title: "Postcards & Travel Blogs", Type: "standard"},
		{Title: "Travel Boss", Type: "boss"},
	}},
	{Level: "B1", Course: "GENERAL", Title: "Media & Culture", Desc: "Discussing news, films, music and cultural topics", Skill: "vocabulary", Emoji: "📰", Color: "#8b5cf6", Lessons: []lessonDef{
		{Title: "Talking About News", Type: "standard"},
		{Title: "Films & Books", Type: "standard"},
		{Title: "Music & Art", Type: "standard"},
		{Title: "Cultural Differences", Type: "standard"},
		{Title: "Social Media Language", Type: "standard"},
		{Title: "Advertising & Persuasion", Type: "standard"},
		{Title: "Pop Culture Vocabulary", Type: "standard"},
		{Title: "Interviews & Talk Shows", Type: "standard"},
		{Title: "Expressing Preferences", Type: "standard"},
		{Title: "Media Boss", Type: "boss"},
	}},

	// ── B2 Level ──
	{Level: "B2", Course: "GENERAL", Title: "Academic Writing", Desc: "Essay structure, argument building", Skill: "writing", Emoji: "🎓", Color: "#a855f7", Lessons: []lessonDef{
		{Title: "Essay Structure", Type: "standard"},
		{Title: "Thesis Statements", Type: "standard"},
		{Title: "Supporting Arguments", Type: "standard"},
		{Title: "Formal Register", Type: "standard"},
		{Title: "Counterarguments & Concession", Type: "standard"},
		{Title: "Cohesive Paragraph Writing", Type: "standard"},
		{Title: "Academic Collocations", Type: "standard"},
		{Title: "Passive Voice in Writing", Type: "standard"},
		{Title: "Conclusions & Summaries", Type: "standard"},
		{Title: "Writing Boss", Type: "boss"},
	}},
	{Level: "B2", Course: "GENERAL", Title: "Speaking Fluency", Desc: "Fluent conversation and discussion skills", Skill: "speaking", Emoji: "🗣️", Color: "#ef4444", Lessons: []lessonDef{
		{Title: "Expressing Complex Ideas", Type: "standard"},
		{Title: "Discussion Techniques", Type: "standard"},
		{Title: "Agreeing & Challenging", Type: "standard"},
		{Title: "Idiomatic Expressions", Type: "standard"},
		{Title: "Paraphrasing & Rephrasing", Type: "standard"},
		{Title: "Emphasising & Contrasting", Type: "standard"},
		{Title: "Linking Words in Speech", Type: "standard"},
		{Title: "Speculating & Hypothesising", Type: "standard"},
		{Title: "Fluency Practice Round", Type: "standard"},
		{Title: "Speaking Boss", Type: "boss"},
	}},
	{Level: "B2", Course: "GENERAL", Title: "Advanced Reading", Desc: "Complex texts and reading mastery", Skill: "reading", Emoji: "🧠", Color: "#14b8a6", Lessons: []lessonDef{
		{Title: "Inference & Implication", Type: "standard"},
		{Title: "Author's Purpose", Type: "standard"},
		{Title: "Complex Vocabulary in Context", Type: "standard"},
		{Title: "Critical Reading", Type: "standard"},
		{Title: "Text Structure Analysis", Type: "standard"},
		{Title: "Opinion vs Fact", Type: "standard"},
		{Title: "Identifying Tone & Bias", Type: "standard"},
		{Title: "Summarising Long Texts", Type: "standard"},
		{Title: "Reading Speed Drills", Type: "standard"},
		{Title: "Reading Master Boss", Type: "boss"},
	}},

	// ── C1 Level ──
	{Level: "C1", Course: "GENERAL", Title: "Nuance & Idioms", Desc: "Advanced idiomatic expressions and nuanced meaning", Skill: "vocabulary", Emoji: "🎭", Color: "#d946ef", Lessons: []lessonDef{
		{Title: "Body Language Idioms", Type: "standard"},
		{Title: "Phrasal Verbs in Context", Type: "standard"},
		{Title: "Subtle Register Shifts", Type: "standard"},
		{Title: "Collocation Mastery", Type: "standard"},
		{Title: "Near-Synonym Distinctions", Type: "standard"},
		{Title: "Connotation & Implication", Type: "standard"},
		{Title: "Discourse Markers Advanced", Type: "standard"},
		{Title: "Lexical Chunks in Context", Type: "standard"},
		{Title: "Vocabulary in Use: C1 Practice", Type: "standard"},
		{Title: "Idioms Boss", Type: "boss"},
	}},
	{Level: "C1", Course: "GENERAL", Title: "Academic Discourse", Desc: "Formal writing, academic vocabulary, argumentation", Skill: "grammar", Emoji: "🎓", Color: "#0369a1", Lessons: []lessonDef{
		{Title: "Academic Vocabulary Tier 2", Type: "standard"},
		{Title: "Hedging & Qualifying", Type: "standard"},
		{Title: "Complex Sentence Structures", Type: "standard"},
		{Title: "Citing & Referencing", Type: "standard"},
		{Title: "Nominalisation", Type: "standard"},
		{Title: "Abstract Noun Phrases", Type: "standard"},
		{Title: "Cleft Sentences & Emphasis", Type: "standard"},
		{Title: "Inversion & Fronting", Type: "standard"},
		{Title: "Critical Thinking in Writing", Type: "standard"},
		{Title: "Academic Discourse Boss", Type: "boss"},
	}},
	{Level: "C1", Course: "GENERAL", Title: "Rhetoric & Persuasion", Desc: "Persuasive techniques, rhetorical devices, debate", Skill: "speaking", Emoji: "🏛️", Color: "#7c3aed", Lessons: []lessonDef{
		{Title: "Persuasive Techniques", Type: "standard"},
		{Title: "Rhetorical Questions & Devices", Type: "standard"},
		{Title: "Debate Skills", Type: "standard"},
		{Title: "Logical Fallacies", Type: "standard"},
		{Title: "Ethos, Pathos, Logos", Type: "standard"},
		{Title: "Structuring a Speech", Type: "standard"},
		{Title: "Counter-Argument Handling", Type: "standard"},
		{Title: "Satire & Irony", Type: "standard"},
		{Title: "Extended Persuasive Practice", Type: "standard"},
		{Title: "Rhetoric Boss", Type: "boss"},
	}},

	// ── C2 Level ──
	{Level: "C2", Course: "GENERAL", Title: "Literary Analysis", Desc: "Analysing literature, tone, style and literary devices", Skill: "reading", Emoji: "📜", Color: "#dc2626", Lessons: []lessonDef{
		{Title: "Tone & Mood", Type: "standard"},
		{Title: "Figurative Language", Type: "standard"},
		{Title: "Narrative Perspective", Type: "standard"},
		{Title: "Symbolism & Theme", Type: "standard"},
		{Title: "Irony & Paradox", Type: "standard"},
		{Title: "Stream of Consciousness", Type: "standard"},
		{Title: "Allegory & Metaphor", Type: "standard"},
		{Title: "Poetry Analysis", Type: "standard"},
		{Title: "Comparing Two Texts", Type: "standard"},
		{Title: "Literary Boss", Type: "boss"},
	}},
	{Level: "C2", Course: "GENERAL", Title: "Professional Contexts", Desc: "Business communication, negotiation, formal register", Skill: "writing", Emoji: "💼", Color: "#334155", Lessons: []lessonDef{
		{Title: "Business Communication", Type: "standard"},
		{Title: "Negotiation Language", Type: "standard"},
		{Title: "Presentations & Reports", Type: "standard"},
		{Title: "Formal Emails & Correspondence", Type: "standard"},
		{Title: "Minutes & Meeting Language", Type: "standard"},
		{Title: "Executive Summaries", Type: "standard"},
		{Title: "Cross-Cultural Communication", Type: "standard"},
		{Title: "Legal & Contract Language", Type: "standard"},
		{Title: "Professional Storytelling", Type: "standard"},
		{Title: "Professional Boss", Type: "boss"},
	}},

	// ── IELTS Path (shown on /ielts/roadmap only) ──
	{Level: "B1", Course: "IELTS", Title: "IELTS Reading Strategies", Desc: "Skimming, scanning, True/False/NG", Skill: "reading", Emoji: "🎯", Color: "#6366f1", Lessons: []lessonDef{
		{Title: "Skimming for Main Ideas", Type: "standard"},
		{Title: "Scanning for Details", Type: "standard"},
		{Title: "True / False / Not Given", Type: "standard"},
		{Title: "Matching Headings", Type: "standard"},
		{Title: "Sentence Completion", Type: "standard"},
		{Title: "Summary Completion", Type: "standard"},
		{Title: "Multiple Choice", Type: "standard"},
		{Title: "Short Answer Questions", Type: "standard"},
		{Title: "Matching Information", Type: "standard"},
		{Title: "Reading Strategy Boss", Type: "boss"},
	}},
	{Level: "B1", Course: "IELTS", Title: "Writing Task 1 Intro", Desc: "Describing charts, graphs, processes", Skill: "writing", Emoji: "✍️", Color: "#10b981", Lessons: []lessonDef{
		{Title: "Describing Trends", Type: "standard"},
		{Title: "Comparing Data", Type: "standard"},
		{Title: "Process Descriptions", Type: "standard"},
		{Title: "Overview Writing", Type: "standard"},
		{Title: "Pie Charts & Bar Graphs", Type: "standard"},
		{Title: "Line Graph Language", Type: "standard"},
		{Title: "Map & Diagram Tasks", Type: "standard"},
		{Title: "Selecting Key Features", Type: "standard"},
		{Title: "Timed Task 1 Practice", Type: "standard"},
		{Title: "Task 1 Challenge", Type: "boss"},
	}},
	{Level: "B1", Course: "IELTS", Title: "Cohesive Devices", Desc: "Linking words, transitions, paragraphing", Skill: "grammar", Emoji: "🔗", Color: "#f97316", Lessons: []lessonDef{
		{Title: "Addition & Contrast", Type: "standard"},
		{Title: "Cause & Effect", Type: "standard"},
		{Title: "Sequencing & Time", Type: "standard"},
		{Title: "Exemplification & Clarification", Type: "standard"},
		{Title: "Concession & Concessive Clauses", Type: "standard"},
		{Title: "Paragraph Openers", Type: "standard"},
		{Title: "Substitution & Ellipsis", Type: "standard"},
		{Title: "Reference Chains", Type: "standard"},
		{Title: "Cohesive Writing Practice", Type: "standard"},
		{Title: "Cohesion Boss", Type: "boss"},
	}},
}

// SeedEngSimCurriculum inserts units and lessons if they don't exist yet.
// Uses title-based deduplication so it's safe to call on restarts.
func SeedEngSimCurriculum(db *gorm.DB) error {
	log.Println("[engsim] checking curriculum seed...")

	var totalUnits, totalLessons int

	// Use high sort_orders for IELTS units so they don't conflict with General path
	ieltsOffset := 100
	ieltsIdx := 0

	for i, u := range curriculum {
		// Check if this unit already exists by title
		var existing models.EngSimUnit
		if db.Where("title = ?", u.Title).First(&existing).Error == nil {
			// Ensure course field is set correctly on existing rows
			if existing.Course != u.Course {
				db.Model(&existing).Update("course", u.Course)
			}
			// Add any missing lessons
			for j, l := range u.Lessons {
				var existingLesson models.EngSimLesson
				if db.Where("unit_id = ? AND title = ?", existing.ID, l.Title).First(&existingLesson).Error != nil {
					lesson := models.EngSimLesson{
						UnitID:     existing.ID,
						SortOrder:  j + 1,
						Title:      l.Title,
						LessonType: l.Type,
					}
					db.Create(&lesson)
					totalLessons++
				}
			}
			continue
		}

		var sortOrder int
		if u.Course == "IELTS" {
			sortOrder = ieltsOffset + ieltsIdx + 1
			ieltsIdx++
		} else {
			sortOrder = i + 1
		}

		unit := models.EngSimUnit{
			Level:       u.Level,
			SortOrder:   sortOrder,
			Title:       u.Title,
			Description: u.Desc,
			IELTSSkill:  u.Skill,
			IconEmoji:   u.Emoji,
			Color:       u.Color,
			Course:      u.Course,
		}
		if err := db.Create(&unit).Error; err != nil {
			log.Printf("[engsim] failed to create unit %q: %v", u.Title, err)
			continue
		}
		totalUnits++

		for j, l := range u.Lessons {
			lesson := models.EngSimLesson{
				UnitID:     unit.ID,
				SortOrder:  j + 1,
				Title:      l.Title,
				LessonType: l.Type,
			}
			if err := db.Create(&lesson).Error; err != nil {
				log.Printf("[engsim] failed to create lesson %q: %v", l.Title, err)
				continue
			}
			totalLessons++
		}
	}

	if totalUnits > 0 || totalLessons > 0 {
		log.Printf("[engsim] seeded %d new units, %d new lessons", totalUnits, totalLessons)
	} else {
		log.Println("[engsim] curriculum up to date, nothing new to seed")
	}
	return nil
}
