package database

import (
	"log"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

type unitDef struct {
	Level      string
	Title      string
	Desc       string
	Skill      string
	Emoji      string
	Color      string
	Lessons    []lessonDef
}

type lessonDef struct {
	Title string
	Type  string // standard, review, boss
}

var curriculum = []unitDef{
	// ── A1 Level ──
	{Level: "A1", Title: "Basic Vocabulary", Desc: "Essential everyday words and phrases", Skill: "vocabulary", Emoji: "🔤", Color: "#22c55e", Lessons: []lessonDef{
		{Title: "Greetings & Introductions", Type: "standard"},
		{Title: "Numbers & Colors", Type: "standard"},
		{Title: "Family & People", Type: "standard"},
		{Title: "Food & Drinks", Type: "standard"},
		{Title: "Vocabulary Review", Type: "boss"},
	}},
	{Level: "A1", Title: "Grammar Foundations", Desc: "Present simple, articles, pronouns", Skill: "grammar", Emoji: "📝", Color: "#3b82f6", Lessons: []lessonDef{
		{Title: "To Be & Articles", Type: "standard"},
		{Title: "Present Simple", Type: "standard"},
		{Title: "Pronouns & Possessives", Type: "standard"},
		{Title: "Questions & Negatives", Type: "standard"},
		{Title: "Grammar Challenge", Type: "boss"},
	}},
	{Level: "A1", Title: "First Reading", Desc: "Short texts and simple comprehension", Skill: "reading", Emoji: "📖", Color: "#8b5cf6", Lessons: []lessonDef{
		{Title: "Signs & Notices", Type: "standard"},
		{Title: "Short Messages", Type: "standard"},
		{Title: "Simple Descriptions", Type: "standard"},
		{Title: "Reading Boss", Type: "boss"},
	}},

	// ── A2 Level ──
	{Level: "A2", Title: "Academic Vocabulary I", Desc: "Expanding word bank for IELTS", Skill: "vocabulary", Emoji: "📚", Color: "#f59e0b", Lessons: []lessonDef{
		{Title: "Places & Directions", Type: "standard"},
		{Title: "Jobs & Occupations", Type: "standard"},
		{Title: "Weather & Nature", Type: "standard"},
		{Title: "Health & Body", Type: "standard"},
		{Title: "Vocab Master", Type: "boss"},
	}},
	{Level: "A2", Title: "Sentence Building", Desc: "Past tense, conjunctions, comparatives", Skill: "grammar", Emoji: "🏗️", Color: "#ec4899", Lessons: []lessonDef{
		{Title: "Past Simple", Type: "standard"},
		{Title: "Conjunctions & Linking", Type: "standard"},
		{Title: "Comparatives & Superlatives", Type: "standard"},
		{Title: "Future with Will & Going To", Type: "standard"},
		{Title: "Sentence Boss", Type: "boss"},
	}},
	{Level: "A2", Title: "Listening Basics", Desc: "Understanding spoken English", Skill: "listening", Emoji: "🎧", Color: "#06b6d4", Lessons: []lessonDef{
		{Title: "Numbers & Spelling", Type: "standard"},
		{Title: "Daily Conversations", Type: "standard"},
		{Title: "Following Directions", Type: "standard"},
		{Title: "Listening Challenge", Type: "boss"},
	}},

	// ── B1 Level ──
	{Level: "B1", Title: "IELTS Reading Strategies", Desc: "Skimming, scanning, True/False/NG", Skill: "reading", Emoji: "🎯", Color: "#6366f1", Lessons: []lessonDef{
		{Title: "Skimming for Main Ideas", Type: "standard"},
		{Title: "Scanning for Details", Type: "standard"},
		{Title: "True / False / Not Given", Type: "standard"},
		{Title: "Matching Headings", Type: "standard"},
		{Title: "Reading Strategy Boss", Type: "boss"},
	}},
	{Level: "B1", Title: "Writing Task 1 Intro", Desc: "Describing charts, graphs, processes", Skill: "writing", Emoji: "✍️", Color: "#10b981", Lessons: []lessonDef{
		{Title: "Describing Trends", Type: "standard"},
		{Title: "Comparing Data", Type: "standard"},
		{Title: "Process Descriptions", Type: "standard"},
		{Title: "Overview Writing", Type: "standard"},
		{Title: "Task 1 Challenge", Type: "boss"},
	}},
	{Level: "B1", Title: "Cohesive Devices", Desc: "Linking words, transitions, paragraphing", Skill: "grammar", Emoji: "🔗", Color: "#f97316", Lessons: []lessonDef{
		{Title: "Addition & Contrast", Type: "standard"},
		{Title: "Cause & Effect", Type: "standard"},
		{Title: "Sequencing & Time", Type: "standard"},
		{Title: "Cohesion Boss", Type: "boss"},
	}},

	// ── B2 Level ──
	{Level: "B2", Title: "Academic Writing", Desc: "Essay structure, argument building", Skill: "writing", Emoji: "🎓", Color: "#a855f7", Lessons: []lessonDef{
		{Title: "Essay Structure", Type: "standard"},
		{Title: "Thesis Statements", Type: "standard"},
		{Title: "Supporting Arguments", Type: "standard"},
		{Title: "Formal Register", Type: "standard"},
		{Title: "Writing Boss", Type: "boss"},
	}},
	{Level: "B2", Title: "Speaking Fluency", Desc: "IELTS Speaking Parts 1-3 preparation", Skill: "speaking", Emoji: "🗣️", Color: "#ef4444", Lessons: []lessonDef{
		{Title: "Part 1: Personal Questions", Type: "standard"},
		{Title: "Part 2: Cue Card Strategy", Type: "standard"},
		{Title: "Part 3: Discussion Skills", Type: "standard"},
		{Title: "Idiomatic Expressions", Type: "standard"},
		{Title: "Speaking Boss", Type: "boss"},
	}},
	{Level: "B2", Title: "Advanced Reading", Desc: "IELTS Academic reading mastery", Skill: "reading", Emoji: "🧠", Color: "#14b8a6", Lessons: []lessonDef{
		{Title: "Sentence Completion", Type: "standard"},
		{Title: "Summary Completion", Type: "standard"},
		{Title: "Multiple Choice Passages", Type: "standard"},
		{Title: "Matching Information", Type: "standard"},
		{Title: "Reading Master Boss", Type: "boss"},
	}},
}

// SeedEngSimCurriculum inserts units and lessons if they don't exist yet.
func SeedEngSimCurriculum(db *gorm.DB) error {
	var existingCount int64
	db.Model(&models.EngSimUnit{}).Count(&existingCount)
	if existingCount > 0 {
		log.Printf("[engsim] curriculum already seeded (%d units), skipping", existingCount)
		return nil
	}

	log.Println("[engsim] seeding curriculum...")

	var totalUnits, totalLessons int

	for i, u := range curriculum {
		unit := models.EngSimUnit{
			Level:       u.Level,
			SortOrder:   i + 1,
			Title:       u.Title,
			Description: u.Desc,
			IELTSSkill:  u.Skill,
			IconEmoji:   u.Emoji,
			Color:       u.Color,
		}
		if err := db.Create(&unit).Error; err != nil {
			return err
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
				return err
			}
			totalLessons++
		}
	}

	log.Printf("[engsim] seeded %d units, %d lessons", totalUnits, totalLessons)
	return nil
}
