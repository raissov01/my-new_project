package database

import (
	"log"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// SeedAchievements upserts all 50+ achievement definitions.
// Safe to run multiple times (ON CONFLICT DO NOTHING via FirstOrCreate).
func SeedAchievements(db *gorm.DB) error {
	log.Println("Seeding achievements...")

	achievements := []models.Achievement{
		// ── Streak ──────────────────────────────────────────────────────────
		{ID: "streak_1", Title: "First Flame", Description: "Complete your first day of learning.", Icon: "🔥", Tier: "bronze", XPBonus: 10, Category: "streak", SortOrder: 10},
		{ID: "streak_3", Title: "Getting Hot", Description: "Maintain a 3-day streak.", Icon: "🔥", Tier: "bronze", XPBonus: 50, Category: "streak", SortOrder: 11},
		{ID: "streak_7", Title: "On Fire", Description: "Maintain a 7-day streak.", Icon: "🔥", Tier: "silver", XPBonus: 100, Category: "streak", SortOrder: 12},
		{ID: "streak_14", Title: "Two-Week Warrior", Description: "Maintain a 14-day streak.", Icon: "🔥", Tier: "silver", XPBonus: 200, Category: "streak", SortOrder: 13},
		{ID: "streak_30", Title: "Unstoppable", Description: "Maintain a 30-day streak.", Icon: "🔥", Tier: "gold", XPBonus: 500, Category: "streak", SortOrder: 14},
		{ID: "streak_60", Title: "Dedicated", Description: "Maintain a 60-day streak.", Icon: "💪", Tier: "gold", XPBonus: 1000, Category: "streak", SortOrder: 15},
		{ID: "streak_100", Title: "Legendary", Description: "Maintain a 100-day streak.", Icon: "💎", Tier: "diamond", XPBonus: 2000, Category: "streak", SortOrder: 16},
		{ID: "streak_365", Title: "Year-Long Journey", Description: "Maintain a full year streak.", Icon: "🌟", Tier: "diamond", XPBonus: 5000, Category: "streak", SortOrder: 17},

		// ── Lessons ─────────────────────────────────────────────────────────
		{ID: "first_lesson", Title: "First Step", Description: "Complete your very first lesson.", Icon: "🌱", Tier: "bronze", XPBonus: 25, Category: "lesson", SortOrder: 20},
		{ID: "lessons_10", Title: "Getting Started", Description: "Complete 10 lessons.", Icon: "📖", Tier: "bronze", XPBonus: 75, Category: "lesson", SortOrder: 21},
		{ID: "lessons_50", Title: "Committed Learner", Description: "Complete 50 lessons.", Icon: "📚", Tier: "silver", XPBonus: 200, Category: "lesson", SortOrder: 22},
		{ID: "lessons_100", Title: "Century Club", Description: "Complete 100 lessons.", Icon: "🎓", Tier: "gold", XPBonus: 500, Category: "lesson", SortOrder: 23},
		{ID: "lessons_500", Title: "Scholar", Description: "Complete 500 lessons.", Icon: "🏛️", Tier: "diamond", XPBonus: 2000, Category: "lesson", SortOrder: 24},
		{ID: "perfect_lesson_1", Title: "Flawless", Description: "Complete a lesson without any mistakes.", Icon: "⭐", Tier: "silver", XPBonus: 100, Category: "lesson", SortOrder: 25},
		{ID: "perfect_lesson_10", Title: "Perfectionist", Description: "Complete 10 lessons without any mistakes.", Icon: "⭐", Tier: "gold", XPBonus: 300, Category: "lesson", SortOrder: 26},
		{ID: "stars_10", Title: "Star Collector", Description: "Earn 10 lesson stars.", Icon: "⭐", Tier: "bronze", XPBonus: 50, Category: "lesson", SortOrder: 27},
		{ID: "stars_100", Title: "Star Master", Description: "Earn 100 lesson stars.", Icon: "⭐", Tier: "silver", XPBonus: 300, Category: "lesson", SortOrder: 28},

		// ── XP / Level ──────────────────────────────────────────────────────
		{ID: "xp_500", Title: "XP Earner", Description: "Earn 500 total XP.", Icon: "⚡", Tier: "bronze", XPBonus: 0, Category: "xp", SortOrder: 30},
		{ID: "xp_5000", Title: "XP Hunter", Description: "Earn 5,000 total XP.", Icon: "⚡", Tier: "silver", XPBonus: 0, Category: "xp", SortOrder: 31},
		{ID: "xp_25000", Title: "XP Legend", Description: "Earn 25,000 total XP.", Icon: "⚡", Tier: "gold", XPBonus: 0, Category: "xp", SortOrder: 32},
		{ID: "placement_a1", Title: "A1 Level", Description: "Achieve A1 on placement test.", Icon: "🏅", Tier: "bronze", XPBonus: 25, Category: "level", SortOrder: 40},
		{ID: "placement_a2", Title: "A2 Level", Description: "Achieve A2 on placement test.", Icon: "🥉", Tier: "bronze", XPBonus: 50, Category: "level", SortOrder: 41},
		{ID: "placement_b1", Title: "B1 Level", Description: "Achieve B1 on placement test.", Icon: "🥈", Tier: "silver", XPBonus: 100, Category: "level", SortOrder: 42},
		{ID: "placement_b2", Title: "B2 Level", Description: "Achieve B2 on placement test.", Icon: "🥇", Tier: "silver", XPBonus: 150, Category: "level", SortOrder: 43},
		{ID: "placement_c1", Title: "C1 Level", Description: "Achieve C1 on placement test.", Icon: "🏆", Tier: "gold", XPBonus: 250, Category: "level", SortOrder: 44},
		{ID: "placement_c2", Title: "C2 Mastery", Description: "Achieve C2 on placement test.", Icon: "💎", Tier: "diamond", XPBonus: 500, Category: "level", SortOrder: 45},

		// ── Leagues ─────────────────────────────────────────────────────────
		{ID: "league_join", Title: "League Starter", Description: "Join your first league.", Icon: "🏟️", Tier: "bronze", XPBonus: 25, Category: "league", SortOrder: 50},
		{ID: "top_10_league", Title: "Contender", Description: "Finish in the top 10 of your league.", Icon: "📈", Tier: "bronze", XPBonus: 50, Category: "league", SortOrder: 51},
		{ID: "top_3_league", Title: "Podium", Description: "Finish in the top 3 of your league.", Icon: "🥉", Tier: "silver", XPBonus: 150, Category: "league", SortOrder: 52},
		{ID: "top_1_league", Title: "Champion", Description: "Finish #1 in your league.", Icon: "🥇", Tier: "gold", XPBonus: 300, Category: "league", SortOrder: 53},
		{ID: "promote_silver", Title: "Rising Star", Description: "Promote from Bronze to Silver.", Icon: "🌙", Tier: "bronze", XPBonus: 100, Category: "league", SortOrder: 54},
		{ID: "promote_gold", Title: "Going for Gold", Description: "Promote to Gold League.", Icon: "✨", Tier: "silver", XPBonus: 200, Category: "league", SortOrder: 55},
		{ID: "promote_diamond", Title: "Diamond Status", Description: "Reach Diamond League.", Icon: "💎", Tier: "diamond", XPBonus: 1000, Category: "league", SortOrder: 56},

		// ── Friends ─────────────────────────────────────────────────────────
		{ID: "friend_1", Title: "Not Alone", Description: "Add your first friend.", Icon: "🤝", Tier: "bronze", XPBonus: 25, Category: "social", SortOrder: 60},
		{ID: "friend_3", Title: "Social", Description: "Add 3 friends.", Icon: "👥", Tier: "bronze", XPBonus: 50, Category: "social", SortOrder: 61},
		{ID: "friend_10", Title: "Popular", Description: "Add 10 friends.", Icon: "🌐", Tier: "silver", XPBonus: 150, Category: "social", SortOrder: 62},
		{ID: "invite_accepted", Title: "Recruiter", Description: "A friend joins via your invite code.", Icon: "📨", Tier: "bronze", XPBonus: 75, Category: "social", SortOrder: 63},

		// ── Daily Quests / Habits ────────────────────────────────────────────
		{ID: "quest_1", Title: "Daily Achiever", Description: "Complete your first daily quest.", Icon: "✅", Tier: "bronze", XPBonus: 25, Category: "quest", SortOrder: 70},
		{ID: "quest_7_days", Title: "Quest Habit", Description: "Complete daily quests 7 days in a row.", Icon: "🗓️", Tier: "silver", XPBonus: 150, Category: "quest", SortOrder: 71},
		{ID: "quest_30_days", Title: "Quest Master", Description: "Complete daily quests 30 days in a row.", Icon: "📅", Tier: "gold", XPBonus: 500, Category: "quest", SortOrder: 72},
		{ID: "double_xp_use", Title: "Double Dipper", Description: "Earn XP during a 2× XP event.", Icon: "⚡", Tier: "bronze", XPBonus: 50, Category: "quest", SortOrder: 73},

		// ── Time-of-day ──────────────────────────────────────────────────────
		{ID: "early_bird", Title: "Early Bird", Description: "Complete a lesson before 06:00.", Icon: "🐦", Tier: "bronze", XPBonus: 50, Category: "habit", SortOrder: 80},
		{ID: "night_owl", Title: "Night Owl", Description: "Complete a lesson after 23:00.", Icon: "🦉", Tier: "bronze", XPBonus: 50, Category: "habit", SortOrder: 81},
		{ID: "weekend_warrior", Title: "Weekend Warrior", Description: "Earn 50+ XP on a Saturday or Sunday.", Icon: "💪", Tier: "silver", XPBonus: 100, Category: "habit", SortOrder: 82},
		{ID: "comeback", Title: "Comeback Kid", Description: "Return after a 7-day break and complete a lesson.", Icon: "🔄", Tier: "bronze", XPBonus: 100, Category: "habit", SortOrder: 83},

		// ── Skills ───────────────────────────────────────────────────────────
		{ID: "listening_10", Title: "Sharp Ears", Description: "Complete 10 listening exercises.", Icon: "🎧", Tier: "bronze", XPBonus: 50, Category: "skill", SortOrder: 90},
		{ID: "listening_50", Title: "Audiophile", Description: "Complete 50 listening exercises.", Icon: "🎧", Tier: "silver", XPBonus: 150, Category: "skill", SortOrder: 91},
		{ID: "speaking_5", Title: "Speak Up", Description: "Complete 5 speaking practices.", Icon: "🗣️", Tier: "bronze", XPBonus: 75, Category: "skill", SortOrder: 92},
		{ID: "speaking_20", Title: "Conversationalist", Description: "Complete 20 speaking practices.", Icon: "🗣️", Tier: "silver", XPBonus: 200, Category: "skill", SortOrder: 93},
		{ID: "translate_50", Title: "Translator", Description: "Complete 50 translation exercises.", Icon: "🌍", Tier: "bronze", XPBonus: 75, Category: "skill", SortOrder: 94},
	}

	for _, a := range achievements {
		if err := db.Clauses(clause.OnConflict{DoNothing: true}).Create(&a).Error; err != nil {
			log.Printf("warning: seed achievement %s: %v", a.ID, err)
		}
	}

	log.Printf("Achievements seeded (%d definitions)", len(achievements))
	return nil
}
