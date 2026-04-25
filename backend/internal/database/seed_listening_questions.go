package database

import (
	"encoding/json"
	"log"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// SeedListeningQuestions inserts comprehension questions for all listening clips
// that were added without questions. Idempotent (unique index on clip_id+prompt).
func SeedListeningQuestions(db *gorm.DB) error {
	log.Println("Seeding listening questions...")

	type qDef struct {
		ClipTitle    string
		ClipLevel    string
		QuestionType string
		Prompt       string
		Options      []string // nil → no options (true_false / fill_blank)
		Correct      string   // always the raw answer string
	}

	defs := []qDef{
		// ── A1: Animals and Pets ───────────────────────────────────────────────
		{"Animals and Pets", "A1", "comprehension", "What is the narrator's dog called?",
			[]string{"Max", "Rex", "Buddy", "Charlie"}, "Max"},
		{"Animals and Pets", "A1", "true_false", "Cats need to go for daily walks, just like dogs.", nil, "false"},
		{"Animals and Pets", "A1", "fill_blank", "The narrator's dog is a golden ___.", nil, "retriever"},

		// ── A1: At the Supermarket ─────────────────────────────────────────────
		{"At the Supermarket", "A1", "comprehension", "When does the narrator usually go to the supermarket?",
			[]string{"Saturday morning", "Friday evening", "Sunday afternoon", "Monday morning"}, "Saturday morning"},
		{"At the Supermarket", "A1", "true_false", "The narrator always makes a list before going shopping.", nil, "true"},
		{"At the Supermarket", "A1", "fill_blank", "The narrator takes a shopping trolley or a ___ depending on how much they need.", nil, "basket"},

		// ── A1: My Daily Routine ──────────────────────────────────────────────
		{"My Daily Routine", "A1", "comprehension", "What time does the narrator wake up every morning?",
			[]string{"Seven o'clock", "Six o'clock", "Eight o'clock", "Nine o'clock"}, "Seven o'clock"},
		{"My Daily Routine", "A1", "true_false", "Breakfast is the narrator's favourite meal of the day.", nil, "true"},
		{"My Daily Routine", "A1", "fill_blank", "After the shower, the narrator goes downstairs to the ___.", nil, "kitchen"},

		// ── A2: A Phone Conversation ──────────────────────────────────────────
		{"A Phone Conversation", "A2", "comprehension", "Where has the meeting location been changed to?",
			[]string{"Riverside offices", "Bridge Street headquarters", "City Hall", "Central Station"}, "Bridge Street headquarters"},
		{"A Phone Conversation", "A2", "true_false", "The meeting time has been changed from ten o'clock.", nil, "false"},
		{"A Phone Conversation", "A2", "fill_blank", "The meeting room is on the ___ floor.", nil, "third"},

		// ── A2: Asking for Directions ─────────────────────────────────────────
		{"Asking for Directions", "A2", "comprehension", "What place is the tourist looking for?",
			[]string{"A pharmacy", "A hotel", "A restaurant", "A bank"}, "A pharmacy"},
		{"Asking for Directions", "A2", "true_false", "The tourist should turn right at the traffic lights.", nil, "true"},
		{"Asking for Directions", "A2", "fill_blank", "The pharmacy has a big ___ sign.", nil, "green"},

		// ── A2: Planning a Holiday ────────────────────────────────────────────
		{"Planning a Holiday", "A2", "comprehension", "Which country does Tom prefer for the summer holiday?",
			[]string{"Spain", "Greece", "Italy", "France"}, "Greece"},
		{"Planning a Holiday", "A2", "true_false", "Anna and Tom agree that August is the best time to visit.", nil, "false"},
		{"Planning a Holiday", "A2", "fill_blank", "Tom has always wanted to go to ___ in Greece.", nil, "Santorini"},

		// ── A2: Weather and Seasons ───────────────────────────────────────────
		{"Weather and Seasons", "A2", "comprehension", "How many seasons are there in a year?",
			[]string{"Two", "Three", "Four", "Five"}, "Four"},
		{"Weather and Seasons", "A2", "true_false", "Talking about the weather is especially popular in Britain.", nil, "true"},
		{"Weather and Seasons", "A2", "fill_blank", "In spring, flowers start to ___ and the days get longer.", nil, "bloom"},

		// ── B1: A Job Interview ───────────────────────────────────────────────
		{"A Job Interview", "B1", "comprehension", "What is the interviewer's name?",
			[]string{"Claire", "Sarah", "Emma", "Kate"}, "Claire"},
		{"A Job Interview", "B1", "true_false", "The candidate has a degree in Communications.", nil, "true"},
		{"A Job Interview", "B1", "fill_blank", "The candidate is applying for the Senior Campaign ___ role.", nil, "Manager"},

		// ── B1: BBC — Is Social Media Making Us Lonely? ───────────────────────
		{"BBC: Is Social Media Making Us Lonely?", "B1", "comprehension", "What is the name of Neil's co-presenter in this episode?",
			[]string{"Sophie", "Sarah", "Emma", "Lucy"}, "Sophie"},
		{"BBC: Is Social Media Making Us Lonely?", "B1", "true_false", "The hosts argue that social media always makes people feel more connected.", nil, "false"},
		{"BBC: Is Social Media Making Us Lonely?", "B1", "fill_blank", "The episode explores whether social media makes us more or less ___ to the people around us.", nil, "connected"},

		// ── B1: BBC — The Science of Sleep ────────────────────────────────────
		{"BBC: The Science of Sleep", "B1", "comprehension", "Where does Dr. Patel work as a sleep researcher?",
			[]string{"University of Bristol", "University of Oxford", "Imperial College London", "University of Manchester"}, "University of Bristol"},
		{"BBC: The Science of Sleep", "B1", "true_false", "Dr. Patel guesses that people spend twenty-five years sleeping over a lifetime.", nil, "true"},
		{"BBC: The Science of Sleep", "B1", "fill_blank", "Sleep takes up roughly a ___ of our lives.", nil, "third"},

		// ── B1: Climate Change and Daily Life ────────────────────────────────
		{"Climate Change and Daily Life", "B1", "comprehension", "What is described as the main driver of climate change?",
			[]string{"Fossil fuels", "Deforestation", "Agriculture", "Overpopulation"}, "Fossil fuels"},
		{"Climate Change and Daily Life", "B1", "true_false", "Climate change is now affecting everyday life, not just scientific reports.", nil, "true"},
		{"Climate Change and Daily Life", "B1", "fill_blank", "Burning fossil fuels releases ___ dioxide and other greenhouse gases.", nil, "carbon"},

		// ── B1: Health and Lifestyle ──────────────────────────────────────────
		{"Health and Lifestyle", "B1", "comprehension", "According to the recording, what does a nutrient-rich diet support?",
			[]string{"Immune function and mood", "Only physical strength", "Only weight loss", "Athletic performance"}, "Immune function and mood"},
		{"Health and Lifestyle", "B1", "true_false", "The recording states that physical and mental health are completely independent.", nil, "false"},
		{"Health and Lifestyle", "B1", "fill_blank", "A healthy life is about nurturing your overall ___.", nil, "wellbeing"},

		// ── B1: Technology and Education ─────────────────────────────────────
		{"Technology and Education", "B1", "comprehension", "What is identified as the most obvious benefit of technology in education?",
			[]string{"Accessibility", "Lower cost", "Better teachers", "Faster exams"}, "Accessibility"},
		{"Technology and Education", "B1", "true_false", "In the past, high-quality education was available to everyone equally.", nil, "false"},
		{"Technology and Education", "B1", "fill_blank", "Anyone with a smartphone and an internet connection can now access ___ from world-class universities.", nil, "lectures"},

		// ── B1: Travel Experiences ────────────────────────────────────────────
		{"Travel Experiences", "B1", "comprehension", "Which country does the narrator describe as their most perspective-changing trip?",
			[]string{"India", "Japan", "Brazil", "Morocco"}, "India"},
		{"Travel Experiences", "B1", "true_false", "The narrator grew up in a large city.", nil, "false"},
		{"Travel Experiences", "B1", "fill_blank", "The narrator spent ___ in India in their early twenties.", nil, "a month"},

		// ── B2: Artificial Intelligence in Healthcare ─────────────────────────
		{"Artificial Intelligence in Healthcare", "B2", "comprehension", "In which area does AI currently show the strongest diagnostic capability?",
			[]string{"Medical imaging", "Surgery", "Drug development", "Mental health"}, "Medical imaging"},
		{"Artificial Intelligence in Healthcare", "B2", "true_false", "AI systems have already surpassed human doctors in all areas of medicine.", nil, "false"},
		{"Artificial Intelligence in Healthcare", "B2", "fill_blank", "AI in healthcare typically works through machine ___ algorithms.", nil, "learning"},

		// ── B2: BBC — The Future of Food ─────────────────────────────────────
		{"BBC: The Future of Food", "B2", "comprehension", "What are the two biggest levers for reducing food system emissions?",
			[]string{"Livestock and food waste", "Transport and packaging", "Water use and energy", "Soil quality and biodiversity"}, "Livestock and food waste"},
		{"BBC: The Future of Food", "B2", "true_false", "The global food system is responsible for around a third of greenhouse gas emissions.", nil, "true"},
		{"BBC: The Future of Food", "B2", "fill_blank", "Dr. Hargreaves is a food ___ researcher at Imperial College London.", nil, "systems"},

		// ── B2: The Psychology of Habits ─────────────────────────────────────
		{"The Psychology of Habits", "B2", "comprehension", "In the habit loop, what triggers a routine?",
			[]string{"A cue", "A reward", "A goal", "A decision"}, "A cue"},
		{"The Psychology of Habits", "B2", "true_false", "Most of our daily behaviour is the result of conscious decision-making.", nil, "false"},
		{"The Psychology of Habits", "B2", "fill_blank", "The habit loop was popularised by the psychologist Charles ___.", nil, "Duhigg"},

		// ── B2: Urban Planning and Smart Cities ──────────────────────────────
		{"Urban Planning and Smart Cities", "B2", "comprehension", "What percentage of the global population is projected to live in cities by 2050?",
			[]string{"50%", "60%", "70%", "80%"}, "70%"},
		{"Urban Planning and Smart Cities", "B2", "true_false", "Traffic congestion is one of the problems that smart city technology aims to solve.", nil, "true"},
		{"Urban Planning and Smart Cities", "B2", "fill_blank", "A ___ city uses data, sensors, and connected infrastructure to function more efficiently.", nil, "smart"},

		// ── B2: VOA — How Languages Die ──────────────────────────────────────
		{"VOA: Learning English — How Languages Die", "B2", "comprehension", "Approximately how often does a language disappear from the world?",
			[]string{"Every day", "Every week", "Every two weeks", "Every month"}, "Every two weeks"},
		{"VOA: Learning English — How Languages Die", "B2", "true_false", "All seven thousand languages spoken today will definitely be gone by 2100.", nil, "false"},
		{"VOA: Learning English — How Languages Die", "B2", "fill_blank", "There are roughly ___ thousand languages spoken on Earth today.", nil, "seven"},

		// ── C1: Cognitive Biases in Decision-Making ──────────────────────────
		{"Cognitive Biases in Decision-Making", "C1", "comprehension", "What is a heuristic described as in the recording?",
			[]string{"A mental shortcut", "A logical fallacy", "A type of bias", "A cognitive error"}, "A mental shortcut"},
		{"Cognitive Biases in Decision-Making", "C1", "true_false", "The recording says cognitive biases are signs of low intelligence.", nil, "false"},
		{"Cognitive Biases in Decision-Making", "C1", "fill_blank", "A heuristic is a rule of ___ that allows us to make quick decisions.", nil, "thumb"},

		// ── C1: Globalisation and Cultural Identity ───────────────────────────
		{"Globalisation and Cultural Identity", "C1", "comprehension", "How does the recording describe the effect of globalisation on the world?",
			[]string{"More interconnected and homogenous", "More diverse and fragmented", "More isolated and independent", "More traditional and local"}, "More interconnected and homogenous"},
		{"Globalisation and Cultural Identity", "C1", "true_false", "The recording presents globalisation as having only positive effects on culture.", nil, "false"},
		{"Globalisation and Cultural Identity", "C1", "fill_blank", "Globalisation involves the free movement of goods, capital, people, and ___.", nil, "culture"},

		// ── C1: The Future of Democracy ──────────────────────────────────────
		{"The Future of Democracy", "C1", "comprehension", "According to the recording, when was democracy last under this level of pressure?",
			[]string{"Since the First World War", "Since the Second World War", "Since the Cold War", "Since the 1990s"}, "Since the Second World War"},
		{"The Future of Democracy", "C1", "true_false", "The recording says populism is a clear and well-defined political concept.", nil, "false"},
		{"The Future of Democracy", "C1", "fill_blank", "Democracy requires ___ defence rather than passive assumption.", nil, "active"},

		// ── C2: Consciousness and the Hard Problem ────────────────────────────
		{"Consciousness and the Hard Problem", "C2", "comprehension", "Who coined the term 'the hard problem of consciousness'?",
			[]string{"David Chalmers", "Daniel Dennett", "Francis Crick", "John Searle"}, "David Chalmers"},
		{"Consciousness and the Hard Problem", "C2", "true_false", "The hard problem of consciousness has been fully resolved by modern neuroscience.", nil, "false"},
		{"Consciousness and the Hard Problem", "C2", "fill_blank", "The neural ___ of experience are not the same as explaining why experience exists at all.", nil, "correlates"},

		// ── C2: Post-Truth and the Epistemological Crisis ─────────────────────
		{"Post-Truth and the Epistemological Crisis", "C2", "comprehension", "What does the 'post-truth' era describe, according to the recording?",
			[]string{"A period where facts and expertise are destabilised", "An era of unprecedented scientific accuracy", "A time when science is more trusted", "A new form of transparent debate"}, "A period where facts and expertise are destabilised"},
		{"Post-Truth and the Epistemological Crisis", "C2", "true_false", "The recording says the core problem is simply that some people believe false things.", nil, "false"},
		{"Post-Truth and the Epistemological Crisis", "C2", "fill_blank", "The post-truth era has eroded shared ___ frameworks that democratic societies depend upon.", nil, "epistemic"},
	}

	// Build a map from (title, level) → clip ID for fast lookup.
	var clips []models.ListeningClip
	if err := db.Select("id, title, level").Find(&clips).Error; err != nil {
		return err
	}
	clipID := make(map[string]string, len(clips))
	for _, c := range clips {
		clipID[c.Title+"|"+c.Level] = c.ID
	}

	questions := make([]models.ListeningQuestion, 0, len(defs))
	for _, d := range defs {
		cid, ok := clipID[d.ClipTitle+"|"+d.ClipLevel]
		if !ok {
			log.Printf("SeedListeningQuestions: clip not found: %q (%s)", d.ClipTitle, d.ClipLevel)
			continue
		}

		var opts *string
		if len(d.Options) > 0 {
			b, _ := json.Marshal(d.Options)
			s := string(b)
			opts = &s
		}

		var correct string
		if d.QuestionType == "true_false" {
			correct = d.Correct // "true" or "false"
		} else {
			b, _ := json.Marshal(d.Correct)
			correct = string(b) // JSON-quoted string
		}

		questions = append(questions, models.ListeningQuestion{
			ClipID:        cid,
			QuestionType:  d.QuestionType,
			Prompt:        d.Prompt,
			CorrectAnswer: &correct,
			Options:       opts,
		})
	}

	result := db.Clauses(clause.OnConflict{DoNothing: true}).Create(&questions)
	if result.Error != nil {
		return result.Error
	}
	log.Printf("SeedListeningQuestions: inserted %d questions", result.RowsAffected)
	return nil
}
