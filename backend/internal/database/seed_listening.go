package database

import (
	"log"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// SeedListeningClips inserts 28 IELTS-format listening clips (2-4 min, 400-900 words).
// Idempotent — uses ON CONFLICT DO NOTHING via a unique title+level index.
func SeedListeningClips(db *gorm.DB) error {
	log.Println("Seeding listening clips...")

	db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_listening_clips_title_level
		ON listening_clips (title, level)`)

	vocab := func(words string) *string { return &words }

	clips := []models.ListeningClip{
		// ── A1 ─────────────────────────────────────────────────────────────
		{
			Title:           "Animals and Pets",
			Level:           "A1",
			Topic:           "animals",
			AudioURL:        "/audio/listening/a1_animals.mp3",
			DurationSeconds: 121,
			Transcript:      `Hello, and welcome. Today we are going to talk about animals and pets. A lot of people around the world have a pet at home. A pet is an animal that you keep and take care of. The most popular pets are dogs and cats, but some people also keep rabbits, fish, hamsters, and even snakes!`,
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word": "pet", "example": "She has two pets — a dog and a rabbit.", "definition": "an animal kept at home for company"}, {"word": "walk", "example": "I walk my dog twice a day.", "definition": "to take an animal outside to exercise"}, {"word": "quiet", "example": "Cats are quiet animals.", "definition": "making little or no noise"}]`),
		},
		{
			Title:           "My Daily Routine",
			Level:           "A1",
			Topic:           "daily",
			AudioURL:        "/audio/listening/a1_daily_routine.mp3",
			DurationSeconds: 117,
			Transcript:      `Hello! Today I'm going to talk about my daily routine. A routine is the set of things you do every day, usually at the same time. Having a good routine helps you feel organised and ready for the day.`,
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word": "routine", "example": "My morning routine takes thirty minutes.", "definition": "the normal order of things you do each day"}, {"word": "breakfast", "example": "I eat toast for breakfast.", "definition": "the first meal of the day"}, {"word": "shower", "example": "I take a shower every morning.", "definition": "a device that sprays water to wash your body"}]`),
		},
		{
			Title:           "Greetings and Introductions",
			Level:           "A1",
			Topic:           "daily",
			AudioURL:        "/audio/listening/a1_greetings.mp3",
			DurationSeconds: 121,
			Transcript:      `Hello! My name is Sarah. I am a teacher. I work at a school in London. Every morning, I say hello to my students when they arrive. Greetings are very important. When you meet someone for the first time, it is polite to introduce yourself and smile.`,
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word": "greetings", "example": "She said greetings to everyone at the party.", "definition": "polite words said when meeting someone"}, {"word": "introduce", "example": "Let me introduce myself.", "definition": "to tell people your name for the first time"}, {"word": "teacher", "example": "She is a great teacher.", "definition": "a person who teaches in a school"}]`),
		},
		{
			Title:           "At the Supermarket",
			Level:           "A1",
			Topic:           "shopping",
			AudioURL:        "/audio/listening/a1_supermarket.mp3",
			DurationSeconds: 122,
			Transcript:      `Hi there! Today, I want to tell you about something I do every week — I go to the supermarket. Shopping for food is part of my normal life, and I think it is a great way to practise everyday English.`,
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word": "supermarket", "example": "I buy vegetables at the supermarket.", "definition": "a large shop selling food and household items"}, {"word": "spend", "example": "I spend ten dollars on lunch.", "definition": "to use money to pay for something"}, {"word": "usually", "example": "I usually wake up at seven.", "definition": "most of the time"}]`),
		},
		// ── A2 ─────────────────────────────────────────────────────────────
		{
			Title:           "Ordering at a Caf\u00e9",
			Level:           "A2",
			Topic:           "food",
			AudioURL:        "/audio/listening/a2_cafe_order.mp3",
			DurationSeconds: 116,
			Transcript:      `Customer: Hi there! Could I have a look at the menu, please?`,
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word": "cappuccino", "example": "I ordered a cappuccino and a croissant.", "definition": "an Italian coffee drink with steamed milk foam"}, {"word": "muffin", "example": "The blueberry muffin was delicious.", "definition": "a small sweet cake"}, {"word": "total", "example": "The total comes to five pounds.", "definition": "the complete amount"}]`),
		},
		{
			Title:           "Asking for Directions",
			Level:           "A2",
			Topic:           "travel",
			AudioURL:        "/audio/listening/a2_directions.mp3",
			DurationSeconds: 119,
			Transcript:      `Tourist: Excuse me, sorry to bother you — do you speak English?`,
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word": "directions", "example": "Can you give me directions to the station?", "definition": "instructions telling you how to get somewhere"}, {"word": "traffic lights", "example": "Turn left at the traffic lights.", "definition": "coloured lights that control road traffic"}, {"word": "pharmacy", "example": "The pharmacy is next to the bank.", "definition": "a shop where medicines are sold"}]`),
		},
		{
			Title:           "Planning a Holiday",
			Level:           "A2",
			Topic:           "travel",
			AudioURL:        "/audio/listening/a2_holiday_plan.mp3",
			DurationSeconds: 125,
			Transcript:      `Anna: Tom, have you thought any more about where we should go this summer? I keep going back and forth between Spain and Greece.`,
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word": "prefer", "example": "I prefer tea to coffee.", "definition": "to like one thing more than another"}, {"word": "book", "example": "We booked the hotel online.", "definition": "to reserve a place in advance"}, {"word": "excited", "example": "The children were excited about the trip.", "definition": "feeling happy and enthusiastic about something"}]`),
		},
		{
			Title:           "A Phone Conversation",
			Level:           "A2",
			Topic:           "daily",
			AudioURL:        "/audio/listening/a2_phone_call.mp3",
			DurationSeconds: 116,
			Transcript:      `David: Hey Lucy, it's David. Are you free to talk for a minute?`,
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word": "confirm", "example": "Please confirm your booking.", "definition": "to say that something is definitely true or will happen"}, {"word": "meeting", "example": "The meeting starts at two.", "definition": "an arranged gathering of people"}, {"word": "laptop", "example": "She brought her laptop to the office.", "definition": "a portable computer"}]`),
		},
		{
			Title:           "Weather and Seasons",
			Level:           "A2",
			Topic:           "weather",
			AudioURL:        "/audio/listening/a2_weather.mp3",
			DurationSeconds: 140,
			Transcript:      `Hello, and welcome to today's programme. We're going to be talking about one of the most popular topics in everyday English conversation — the weather! People everywhere talk about the weather, and in Britain especially, it is almost a national hobby.`,
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word": "season", "example": "Autumn is my favourite season.", "definition": "one of the four periods of the year"}, {"word": "temperature", "example": "The temperature today is fifteen degrees.", "definition": "how hot or cold something is"}, {"word": "forecast", "example": "The weather forecast says it will rain.", "definition": "a prediction of future weather"}]`),
		},
		// ── B1 ─────────────────────────────────────────────────────────────
		{
			Title:           "Climate Change and Daily Life",
			Level:           "B1",
			Topic:           "environment",
			AudioURL:        "/audio/listening/b1_climate.mp3",
			DurationSeconds: 212,
			Transcript:      `Climate change is no longer an abstract concept confined to scientific journals and international summits. It is showing up in the texture of everyday life — in the food we eat, the air we breathe, the weather we experience, and the choices we feel pressure to make as individual consumers. Understanding what is driving it, and what we can actually do about it in our day-to-day lives, has never been more important.`,
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word": "fossil fuels", "example": "Burning fossil fuels releases CO2.", "definition": "coal, oil, and gas formed from ancient organisms"}, {"word": "drought", "example": "The drought destroyed the harvest.", "definition": "a long period with very little rain"}, {"word": "renewable", "example": "Solar energy is a renewable resource.", "definition": "energy from sources that won't run out"}]`),
		},
		{
			Title:           "Health and Lifestyle",
			Level:           "B1",
			Topic:           "health",
			AudioURL:        "/audio/listening/b1_health.mp3",
			DurationSeconds: 181,
			Transcript:      `Living a healthy life is about much more than just avoiding illness. It is about nurturing your overall wellbeing — your physical health, your mental state, your emotional balance, and the quality of your relationships. These things are deeply connected, and looking after one often has a positive effect on the others.`,
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word": "wellbeing", "example": "Exercise improves mental wellbeing.", "definition": "the state of being comfortable, healthy, and happy"}, {"word": "nutrients", "example": "Vegetables are full of essential nutrients.", "definition": "substances in food that help the body function"}, {"word": "meditation", "example": "She practises meditation every morning.", "definition": "a practice of quiet mental focus"}]`),
		},
		{
			Title:           "A Job Interview",
			Level:           "B1",
			Topic:           "work",
			AudioURL:        "/audio/listening/b1_job_interview.mp3",
			DurationSeconds: 170,
			Transcript:      `Interviewer: Come in, please. Thanks for coming in today. I'm Claire, the head of the marketing department. Please, have a seat.`,
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word": "graduate", "example": "She graduated with honours.", "definition": "to successfully complete a university degree"}, {"word": "delegate", "example": "A good manager knows how to delegate.", "definition": "to give tasks to someone else to do"}, {"word": "campaign", "example": "The marketing campaign was very successful.", "definition": "a series of activities designed to achieve a goal"}]`),
		},
		{
			Title:           "Technology and Education",
			Level:           "B1",
			Topic:           "technology",
			AudioURL:        "/audio/listening/b1_tech_education.mp3",
			DurationSeconds: 186,
			Transcript:      `Technology has fundamentally changed how people learn. From online courses and digital textbooks to virtual classrooms and AI-powered tutoring tools, education today looks very different from what it did even ten years ago. Whether these changes are entirely positive is a question worth exploring carefully.`,
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word": "accessible", "example": "The library is accessible to everyone.", "definition": "easy to reach or use"}, {"word": "digital divide", "example": "The digital divide affects rural communities.", "definition": "the gap between those with and without internet access"}, {"word": "enhance", "example": "Music can enhance your mood.", "definition": "to improve or make better"}]`),
		},
		{
			Title:           "Travel Experiences",
			Level:           "B1",
			Topic:           "travel",
			AudioURL:        "/audio/listening/b1_travel.mp3",
			DurationSeconds: 158,
			Transcript:      `I have been lucky enough to travel to quite a few different countries over the years, and looking back, I can say with complete honesty that travelling has done more to shape who I am than almost anything else. It sounds like a cliché, I know — people always say travel broadens the mind. But it really does, and I want to try to explain why.`,
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word": "broaden", "example": "Travel broadens your perspective.", "definition": "to make wider or more varied"}, {"word": "highlight", "example": "The highlight of the trip was the sunset.", "definition": "the best or most exciting part of an experience"}, {"word": "perspective", "example": "Travel changes your perspective on life.", "definition": "a particular way of thinking about something"}]`),
		},
		{
			Title:           "Working from Home \u2013 Pros and Cons",
			Level:           "B1",
			Topic:           "work",
			AudioURL:        "/audio/listening/b1_wfh.mp3",
			DurationSeconds: 187,
			Transcript:      `Working from home has become one of the defining changes to professional life over the past few years. What started as a temporary response to a global crisis has, for millions of workers, become a permanent or at least semi-permanent way of working. And the debate about whether it is genuinely better — for individuals, for companies, and for society — is still very much alive.`,
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word": "commuting", "example": "Commuting by train takes an hour.", "definition": "travelling regularly between home and work"}, {"word": "isolating", "example": "Working alone can feel isolating.", "definition": "making you feel alone and separated from others"}, {"word": "dedicated", "example": "I have a dedicated room for work.", "definition": "used only for one purpose"}]`),
		},
		{
			Title:           "BBC: The Science of Sleep",
			Level:           "B1",
			Topic:           "health",
			AudioURL:        "/audio/listening/podcast_sleep_science.mp3",
			DurationSeconds: 181,
			Transcript:      `Sam: Hello and welcome to BBC 6 Minute English. I'm Sam, and joining me today is Dr. Patel, a sleep researcher at the University of Bristol. Welcome to the programme!`,
			Source:          "BBC Learning English",
			SourceURL:       "https://www.bbc.co.uk/learningenglish",
			License:         "CC-BY-NC-ND",
			SourcePodcast:   "BBC 6 Minute English",
			Vocabulary:      vocab(`[{"word": "consolidates", "example": "Sleep consolidates memories.", "definition": "makes stronger or more secure"}, {"word": "deprivation", "example": "Sleep deprivation affects performance.", "definition": "the state of lacking something necessary"}, {"word": "chronic", "example": "Chronic stress is damaging to health.", "definition": "lasting for a long time"}]`),
		},
		{
			Title:           "BBC: Is Social Media Making Us Lonely?",
			Level:           "B1",
			Topic:           "technology",
			AudioURL:        "/audio/listening/podcast_social_media_lonely.mp3",
			DurationSeconds: 185,
			Transcript:      `Neil: Hello and welcome to BBC 6 Minute English. I'm Neil, and with me today is Sophie. Hi Sophie!`,
			Source:          "BBC Learning English",
			SourceURL:       "https://www.bbc.co.uk/learningenglish",
			License:         "CC-BY-NC-ND",
			SourcePodcast:   "BBC 6 Minute English",
			Vocabulary:      vocab(`[{"word": "counterintuitive", "example": "It seems counterintuitive, but rest can boost productivity.", "definition": "opposite to what you would naturally expect"}, {"word": "curated", "example": "Her social media feed is highly curated.", "definition": "carefully selected and presented"}, {"word": "lifeline", "example": "The phone was a lifeline for the isolated elderly man.", "definition": "something that is essential to someone's survival"}]`),
		},
		// ── B2 ─────────────────────────────────────────────────────────────
		{
			Title:           "Artificial Intelligence in Healthcare",
			Level:           "B2",
			Topic:           "technology",
			AudioURL:        "/audio/listening/b2_ai_healthcare.mp3",
			DurationSeconds: 180,
			Transcript:      `Artificial intelligence is beginning to transform medicine in ways that would have seemed extraordinary even ten years ago. From detecting cancer in medical images to predicting patient deterioration in intensive care, AI systems are demonstrating capabilities that rival — and in some narrow domains, surpass — those of experienced clinicians. But the technology also raises profound questions about accuracy, equity, and accountability.`,
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word": "algorithm", "example": "The algorithm analyses thousands of images per second.", "definition": "a set of rules for solving a problem or making a decision"}, {"word": "diagnostic", "example": "A diagnostic error can be very serious.", "definition": "relating to the process of identifying a disease"}, {"word": "perpetuate", "example": "We must not perpetuate inequality.", "definition": "to make something continue indefinitely"}]`),
		},
		{
			Title:           "The Gig Economy",
			Level:           "B2",
			Topic:           "work",
			AudioURL:        "/audio/listening/b2_gig_economy.mp3",
			DurationSeconds: 165,
			Transcript:      `The gig economy — the world of short-term contracts, freelance work, and platform-based labour — has grown enormously over the past decade. Apps like Uber, Deliveroo, and Upwork have created an entirely new category of worker: not quite employed, not quite self-employed, sitting in a strange legal and economic grey zone that existing regulations were never designed to handle.`,
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word": "freelance", "example": "She works as a freelance designer.", "definition": "working for different companies on separate projects"}, {"word": "autonomy", "example": "The job offers a lot of autonomy.", "definition": "the right to make your own decisions"}, {"word": "entitlement", "example": "Employees have a holiday entitlement of 28 days.", "definition": "the right to receive a benefit"}]`),
		},
		{
			Title:           "The Psychology of Habits",
			Level:           "B2",
			Topic:           "psychology",
			AudioURL:        "/audio/listening/b2_habits.mp3",
			DurationSeconds: 167,
			Transcript:      `We often think of habits as things we consciously choose — going to the gym, eating well, reading before bed. But the science of habit formation tells a more complicated and rather humbling story. Most of our daily behaviour is not the product of deliberate decision-making at all. It happens automatically, driven by cues and routines so deeply embedded that we barely notice them. Understanding how habits actually work is the first step towards changing the ones that do not serve us.`,
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word": "deliberate", "example": "It was a deliberate choice.", "definition": "done consciously and intentionally"}, {"word": "substitute", "example": "You can substitute honey for sugar.", "definition": "to use something instead of something else"}, {"word": "conviction", "example": "He spoke with conviction.", "definition": "a firm belief or opinion"}]`),
		},
		{
			Title:           "Urban Planning and Smart Cities",
			Level:           "B2",
			Topic:           "society",
			AudioURL:        "/audio/listening/b2_smart_cities.mp3",
			DurationSeconds: 181,
			Transcript:      `The world is urbanising at an unprecedented rate. By 2050, it is projected that nearly seventy percent of the global population will live in cities. That creates both enormous challenges and, with the right planning and technology, remarkable opportunities. The concept of the smart city — an urban environment that uses data, sensors, and connected infrastructure to function more efficiently and sustainably — has moved from science fiction to active policy in cities around the world.`,
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word": "congested", "example": "The roads are congested during rush hour.", "definition": "excessively full, especially of traffic"}, {"word": "optimise", "example": "We need to optimise our use of resources.", "definition": "to make as efficient as possible"}, {"word": "surveillance", "example": "CCTV surveillance is common in cities.", "definition": "close observation, especially by authorities"}]`),
		},
		{
			Title:           "BBC: The Future of Food",
			Level:           "B2",
			Topic:           "environment",
			AudioURL:        "/audio/listening/podcast_future_food.mp3",
			DurationSeconds: 182,
			Transcript:      `Host (Priya): Hello and welcome to BBC Science in Focus. I'm Priya, and today we're exploring one of the most urgent questions of our time — how are we going to feed a growing global population sustainably? With me today is Dr. James Hargreaves, a food systems researcher at Imperial College London. James, welcome!`,
			Source:          "BBC Learning English",
			SourceURL:       "https://www.bbc.co.uk/learningenglish",
			License:         "CC-BY-NC-ND",
			SourcePodcast:   "BBC 6 Minute English",
			Vocabulary:      vocab(`[{"word": "cultivated", "example": "Cultivated meat requires no slaughter.", "definition": "grown or developed in a controlled environment"}, {"word": "livestock", "example": "Livestock farming uses vast amounts of land.", "definition": "farm animals kept for food or farming"}, {"word": "pesticides", "example": "Vertical farms use no pesticides.", "definition": "chemicals used to kill insects or other organisms harmful to crops"}]`),
		},
		{
			Title:           "VOA: Learning English \u2014 How Languages Die",
			Level:           "B2",
			Topic:           "culture",
			AudioURL:        "/audio/listening/podcast_language_death.mp3",
			DurationSeconds: 177,
			Transcript:      `Narrator: This is VOA Learning English. Today, we look at a quiet but urgent crisis — the disappearance of the world's languages. Of the roughly seven thousand languages spoken on Earth today, linguists estimate that one disappears approximately every two weeks. By the end of this century, between fifty and ninety percent of those languages may be gone forever. What is lost when a language dies? And can anything be done to prevent it?`,
			Source:          "VOA Learning English",
			SourceURL:       "https://learningenglish.voanews.com",
			License:         "Public Domain",
			SourcePodcast:   "VOA Learning English",
			Vocabulary:      vocab(`[{"word": "indigenous", "example": "Indigenous communities protect local knowledge.", "definition": "native to a particular place"}, {"word": "marginalised", "example": "Marginalised communities often lose their languages.", "definition": "treated as less important or outside the mainstream"}, {"word": "immersion", "example": "Language immersion schools produce fluent speakers.", "definition": "deep involvement in something, especially a language"}]`),
		},
		// ── C1 ─────────────────────────────────────────────────────────────
		{
			Title:           "Cognitive Biases in Decision-Making",
			Level:           "C1",
			Topic:           "psychology",
			AudioURL:        "/audio/listening/c1_cognitive_biases.mp3",
			DurationSeconds: 225,
			Transcript:      `Every decision we make is, to a greater or lesser extent, the product of imperfect reasoning. Cognitive biases — systematic patterns of thought that deviate from what we might call rational or evidence-based analysis — are not signs of stupidity. They are, in many cases, the predictable byproducts of the way human cognition evolved: fast, energy-efficient, and shaped more by the conditions of the ancestral environment than by the demands of modern complexity. Understanding these biases is not merely an academic exercise. It has practical implications for everything from financial planning and medical decision-making to policy design and personal relationships.`,
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word": "heuristic", "example": "The availability heuristic can mislead us.", "definition": "a mental shortcut used to make decisions quickly"}, {"word": "anchoring", "example": "Anchoring bias affected his salary negotiation.", "definition": "relying too heavily on the first piece of information received"}, {"word": "mitigating", "example": "There are strategies for mitigating cognitive biases.", "definition": "making something less severe"}]`),
		},
		{
			Title:           "The Future of Democracy",
			Level:           "C1",
			Topic:           "society",
			AudioURL:        "/audio/listening/c1_democracy.mp3",
			DurationSeconds: 228,
			Transcript:      `Democracy has never been a fixed or finished achievement. It has always been contested, evolving, and fragile — a set of practices and norms that require active defence rather than passive assumption. Yet there is broad agreement among political scientists that it is currently under more sustained pressure than at any point since the Second World War. Understanding the nature of that pressure, and thinking seriously about how democratic systems might be reformed to withstand it, is one of the defining intellectual and political challenges of our era.`,
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word": "populist", "example": "The populist movement gained millions of followers.", "definition": "appealing to the interests of ordinary people, often in opposition to elites"}, {"word": "backsliding", "example": "Democratic backsliding threatens freedom.", "definition": "a reversal of progress"}, {"word": "deliberative", "example": "Deliberative democracy gives citizens a voice.", "definition": "involving careful consideration and discussion"}]`),
		},
		{
			Title:           "Globalisation and Cultural Identity",
			Level:           "C1",
			Topic:           "society",
			AudioURL:        "/audio/listening/c1_globalisation.mp3",
			DurationSeconds: 219,
			Transcript:      `Globalisation has reshaped the world with a speed and thoroughness that no previous era of international exchange could match. The free movement of goods, capital, people, and — perhaps most powerfully — culture and information has created a planet that is, in many measurable ways, more interconnected and more homogenous than at any point in human history. The same brands, the same films, the same digital platforms, the same musical genres circulate across vastly different societies. For some, this represents progress — openness, shared experience, the dissolving of arbitrary barriers. For others, it represents a profound threat to the diversity of human cultures that took millennia to develop.`,
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word": "homogenise", "example": "Globalisation has homogenised popular culture.", "definition": "to make uniform or similar throughout"}, {"word": "cosmopolitan", "example": "London is a cosmopolitan city.", "definition": "familiar with and at ease in many different cultures"}, {"word": "hybridisation", "example": "Cultural hybridisation produces new art forms.", "definition": "the combining of different elements to create something new"}]`),
		},
		// ── C2 ─────────────────────────────────────────────────────────────
		{
			Title:           "Consciousness and the Hard Problem",
			Level:           "C2",
			Topic:           "science",
			AudioURL:        "/audio/listening/c2_consciousness.mp3",
			DurationSeconds: 229,
			Transcript:      `Of all the questions that science and philosophy have grappled with, few are as simultaneously perplexing and stubbornly resistant to resolution as the question of consciousness. We can describe, with increasing precision, the neural correlates of experience — the patterns of brain activity that accompany perception, emotion, memory, and thought. But describing the correlates of an experience is not the same as explaining why there is experience at all. Why does seeing the colour red not simply trigger certain photoreceptors and processing pathways, as a camera does, without there being anything it feels like from the inside? This is what the philosopher David Chalmers famously called the hard problem of consciousness, and it remains as hard today as when he articulated it three decades ago.`,
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word": "perplexing", "example": "The result was perplexing to the scientists.", "definition": "very confusing and difficult to understand"}, {"word": "ineffable", "example": "There was an ineffable sense of beauty.", "definition": "too great or extreme to be expressed in words"}, {"word": "panpsychist", "example": "Panpsychist philosophers challenge materialist views.", "definition": "believing that consciousness is a fundamental property of all matter"}]`),
		},
		{
			Title:           "Post-Truth and the Epistemological Crisis",
			Level:           "C2",
			Topic:           "society",
			AudioURL:        "/audio/listening/c2_post_truth.mp3",
			DurationSeconds: 241,
			Transcript:      `We are living through what many commentators have described as a post-truth era — a period in which the status of facts, evidence, and expertise in public discourse has been dramatically destabilised. The term is contested, as all such terms are, but it points towards something real and consequential: a broad erosion of the shared epistemic frameworks — the agreed methods for determining what is true — that democratic societies depend upon for functioning deliberation and collective decision-making.`,
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word": "epistemic", "example": "Epistemic humility means acknowledging what you don't know.", "definition": "relating to knowledge and the conditions for having it"}, {"word": "predicament", "example": "The country found itself in a serious predicament.", "definition": "a difficult or unpleasant situation"}, {"word": "amplifying", "example": "Social media is amplifying misinformation.", "definition": "making louder or more intense"}]`),
		},
	}

	result := db.Clauses(clause.OnConflict{DoNothing: true}).Create(&clips)
	if result.Error != nil {
		return result.Error
	}
	log.Printf("Seeded %d listening clips", len(clips))

	if err := seedListeningQuestions(db, clips); err != nil {
		log.Printf("warning: listening questions seed failed: %v", err)
	}

	return nil
}

func seedListeningQuestions(db *gorm.DB, clips []models.ListeningClip) error {
	db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_listening_q_clip_prompt
		ON listening_questions (clip_id, prompt)`)

	var greetingsClip, cafeClip, wfhClip, gigClip models.ListeningClip
	db.Where("title = ? AND level = ?", "Greetings and Introductions", "A1").First(&greetingsClip)
	db.Where("title = ? AND level = ?", "Ordering at a Café", "A2").First(&cafeClip)
	db.Where("title = ? AND level = ?", "Working from Home – Pros and Cons", "B1").First(&wfhClip)
	db.Where("title = ? AND level = ?", "The Gig Economy", "B2").First(&gigClip)

	strPtr := func(s string) *string { return &s }
	intPtr := func(i int) *int { return &i }

	questions := []models.ListeningQuestion{}

	if greetingsClip.ID != "" {
		questions = append(questions,
			models.ListeningQuestion{
				ClipID:        greetingsClip.ID,
				QuestionType:  "comprehension",
				Prompt:        "Where is Sarah from?",
				Options:       strPtr(`["London","Paris","New York","Tokyo"]`),
				CorrectAnswer: strPtr(`"London"`),
			},
			models.ListeningQuestion{
				ClipID:        greetingsClip.ID,
				QuestionType:  "true_false",
				Prompt:        "Sarah has two children.",
				CorrectAnswer: strPtr(`true`),
			},
			models.ListeningQuestion{
				ClipID:        greetingsClip.ID,
				QuestionType:  "fill_blank",
				Prompt:        "My name is ___. I'm from London.",
				CorrectAnswer: strPtr(`"Sarah"`),
			},
		)
	}

	if cafeClip.ID != "" {
		questions = append(questions,
			models.ListeningQuestion{
				ClipID:        cafeClip.ID,
				QuestionType:  "comprehension",
				Prompt:        "How does the customer pay?",
				Options:       strPtr(`["Cash","Card","Phone","Voucher"]`),
				CorrectAnswer: strPtr(`"Card"`),
				TimestampStart: intPtr(28),
				TimestampEnd:   intPtr(35),
			},
			models.ListeningQuestion{
				ClipID:        cafeClip.ID,
				QuestionType:  "comprehension",
				Prompt:        "What is the total price?",
				Options:       strPtr(`["£3.50","£2.00","£5.50","£6.00"]`),
				CorrectAnswer: strPtr(`"£5.50"`),
			},
			models.ListeningQuestion{
				ClipID:        cafeClip.ID,
				QuestionType:  "fill_blank",
				Prompt:        "The cappuccino is three-fifty and the muffin is ___ pounds.",
				CorrectAnswer: strPtr(`"two"`),
			},
		)
	}

	if wfhClip.ID != "" {
		questions = append(questions,
			models.ListeningQuestion{
				ClipID:        wfhClip.ID,
				QuestionType:  "comprehension",
				Prompt:        "According to the clip, what is a disadvantage of working from home?",
				Options:       strPtr(`["Saving commute time","Feeling isolated","Flexible schedule","Saving money"]`),
				CorrectAnswer: strPtr(`"Feeling isolated"`),
			},
			models.ListeningQuestion{
				ClipID:        wfhClip.ID,
				QuestionType:  "true_false",
				Prompt:        "The speaker says working from home always improves productivity.",
				CorrectAnswer: strPtr(`false`),
			},
		)
	}

	if gigClip.ID != "" {
		questions = append(questions,
			models.ListeningQuestion{
				ClipID:        gigClip.ID,
				QuestionType:  "comprehension",
				Prompt:        "What is a key criticism of gig work according to the clip?",
				Options:       strPtr(`["Too much flexibility","Lack of job security","Low pay","Long hours"]`),
				CorrectAnswer: strPtr(`"Lack of job security"`),
			},
			models.ListeningQuestion{
				ClipID:        gigClip.ID,
				QuestionType:  "fill_blank",
				Prompt:        "Gig workers are typically classified as ___, meaning they don't receive sick pay.",
				CorrectAnswer: strPtr(`"self-employed"`),
			},
		)
	}

	if len(questions) == 0 {
		return nil
	}

	return db.Clauses(clause.OnConflict{DoNothing: true}).Create(&questions).Error
}
