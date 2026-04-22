package database

import (
	"log"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// SeedListeningClips inserts 30 CC-safe / Original listening clips.
// Idempotent — uses ON CONFLICT DO NOTHING via a unique title+level index.
func SeedListeningClips(db *gorm.DB) error {
	log.Println("Seeding listening clips...")

	// Ensure unique index so re-runs are safe.
	db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_listening_clips_title_level
		ON listening_clips (title, level)`)

	vocab := func(words string) *string { return &words }

	clips := []models.ListeningClip{
		// ── A1 ─────────────────────────────────────────────────────────────
		{
			Title:           "Greetings and Introductions",
			Level:           "A1",
			Topic:           "daily",
			AudioURL:        "/audio/listening/a1_greetings.mp3",
			DurationSeconds: 120,
			Transcript:      "Hello! My name is Sarah. I'm from London. Nice to meet you. What's your name? Where are you from? I work in a school. I'm a teacher. I have two children. I like coffee and reading books. How about you?",
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word":"greetings","definition":"polite words said when meeting someone","example":"She said greetings to everyone at the party."},{"word":"introduce","definition":"to tell people your name for the first time","example":"Let me introduce myself."},{"word":"teacher","definition":"a person who teaches in a school","example":"She is a great teacher."}]`),
		},
		{
			Title:           "At the Supermarket",
			Level:           "A1",
			Topic:           "shopping",
			AudioURL:        "/audio/listening/a1_supermarket.mp3",
			DurationSeconds: 150,
			Transcript:      "I go to the supermarket every Saturday. I buy bread, milk, eggs, and fruit. Today I need apples, bananas, and some cheese. The supermarket is near my house. It opens at eight in the morning. I usually spend about twenty dollars. Do you like shopping?",
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word":"supermarket","definition":"a large shop selling food and household items","example":"I buy vegetables at the supermarket."},{"word":"spend","definition":"to use money to pay for something","example":"I spend ten dollars on lunch."},{"word":"usually","definition":"most of the time","example":"I usually wake up at seven."}]`),
		},
		{
			Title:           "My Daily Routine",
			Level:           "A1",
			Topic:           "daily",
			AudioURL:        "/audio/listening/a1_daily_routine.mp3",
			DurationSeconds: 135,
			Transcript:      "I wake up at seven o'clock every morning. First, I have breakfast — usually toast and orange juice. Then I take a shower and get dressed. I leave the house at eight-thirty and take the bus to work. I start work at nine. I have lunch at one o'clock. I finish work at five and go home. In the evening I watch TV or read. I go to bed at ten-thirty.",
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word":"routine","definition":"the normal order of things you do each day","example":"My morning routine takes thirty minutes."},{"word":"breakfast","definition":"the first meal of the day","example":"I eat toast for breakfast."},{"word":"shower","definition":"a device that sprays water to wash your body","example":"I take a shower every morning."}]`),
		},
		// ── A2 ─────────────────────────────────────────────────────────────
		{
			Title:           "Ordering at a Café",
			Level:           "A2",
			Topic:           "food",
			AudioURL:        "/audio/listening/a2_cafe_order.mp3",
			DurationSeconds: 180,
			Transcript:      "Customer: Good morning! Can I have a large cappuccino, please? Barista: Of course. Would you like anything to eat? Customer: Yes, I'd like a blueberry muffin. How much is that? Barista: The cappuccino is three-fifty and the muffin is two pounds. So five-fifty in total. Customer: Here you go. Can I pay by card? Barista: Certainly. Just tap here. Customer: Thank you. Barista: Your order will be ready in a few minutes. Have a nice day!",
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word":"cappuccino","definition":"an Italian coffee drink with steamed milk foam","example":"I ordered a cappuccino and a croissant."},{"word":"muffin","definition":"a small sweet cake","example":"The blueberry muffin was delicious."},{"word":"total","definition":"the complete amount","example":"The total comes to five pounds."}]`),
		},
		{
			Title:           "Asking for Directions",
			Level:           "A2",
			Topic:           "travel",
			AudioURL:        "/audio/listening/a2_directions.mp3",
			DurationSeconds: 165,
			Transcript:      "Excuse me, can you help me? I'm looking for the city museum. Sure! Go straight along this street for two blocks. Then turn left at the traffic lights. Walk past the pharmacy. The museum is on the right, next to the park. You can't miss it. It's a big red building. How long does it take to walk? About ten minutes from here. Thank you so much! You're welcome. Have a good visit!",
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word":"directions","definition":"instructions telling you how to get somewhere","example":"Can you give me directions to the station?"},{"word":"traffic lights","definition":"coloured lights that control road traffic","example":"Turn left at the traffic lights."},{"word":"pharmacy","definition":"a shop where medicines are sold","example":"The pharmacy is next to the bank."}]`),
		},
		{
			Title:           "Planning a Holiday",
			Level:           "A2",
			Topic:           "travel",
			AudioURL:        "/audio/listening/a2_holiday_plan.mp3",
			DurationSeconds: 200,
			Transcript:      "Anna and Tom are planning their summer holiday. Anna wants to go to Italy because she loves Italian food and art. Tom prefers Spain because the beaches are beautiful. They decide to visit Barcelona for five days. They book a hotel near the city centre. The hotel has a swimming pool. They will fly from London on the 15th of July. They are very excited about the trip. Anna is going to visit museums. Tom wants to relax on the beach.",
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word":"prefer","definition":"to like one thing more than another","example":"I prefer tea to coffee."},{"word":"book","definition":"to reserve a place in advance","example":"We booked the hotel online."},{"word":"excited","definition":"feeling happy and enthusiastic about something","example":"The children were excited about the trip."}]`),
		},
		{
			Title:           "A Phone Conversation",
			Level:           "A2",
			Topic:           "daily",
			AudioURL:        "/audio/listening/a2_phone_call.mp3",
			DurationSeconds: 190,
			Transcript:      "Hello, this is David speaking. Hi David, it's Lucy. How are you? I'm fine thanks. I'm calling because I wanted to confirm our meeting tomorrow. Yes, we're meeting at two o'clock at the office. That's right. Should I bring anything? Just your laptop and the project notes. No problem. Actually, can we change the time? Three o'clock would be better for me. Of course, three is fine. See you tomorrow then. Goodbye!",
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word":"confirm","definition":"to say that something is definitely true or will happen","example":"Please confirm your booking."},{"word":"meeting","definition":"an arranged gathering of people","example":"The meeting starts at two."},{"word":"laptop","definition":"a portable computer","example":"She brought her laptop to the office."}]`),
		},
		// ── B1 ─────────────────────────────────────────────────────────────
		{
			Title:           "Working from Home – Pros and Cons",
			Level:           "B1",
			Topic:           "work",
			AudioURL:        "/audio/listening/b1_wfh.mp3",
			DurationSeconds: 240,
			Transcript:      "More and more people are working from home these days. There are both advantages and disadvantages to this arrangement. On the positive side, you save time and money on commuting. You can also organise your day more flexibly. However, working from home can feel isolating. It's harder to collaborate with colleagues and you might get distracted by household tasks. Some people find it difficult to separate their work life from their personal life. The key is to create a dedicated workspace and stick to a regular schedule. What's your experience of remote working?",
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word":"commuting","definition":"travelling regularly between home and work","example":"Commuting by train takes an hour."},{"word":"isolating","definition":"making you feel alone and separated from others","example":"Working alone can feel isolating."},{"word":"dedicated","definition":"used only for one purpose","example":"I have a dedicated room for work."}]`),
		},
		{
			Title:           "Climate Change and Daily Life",
			Level:           "B1",
			Topic:           "environment",
			AudioURL:        "/audio/listening/b1_climate.mp3",
			DurationSeconds: 255,
			Transcript:      "Climate change is one of the biggest challenges facing our planet today. Scientists agree that human activities — particularly burning fossil fuels — are causing global temperatures to rise. This leads to more extreme weather events like floods, droughts, and wildfires. But what can ordinary people do? Small changes in our daily habits can make a difference. Using public transport instead of driving, eating less meat, and reducing energy consumption at home all help. Governments and companies also need to take action. The transition to renewable energy is essential if we want to protect the planet for future generations.",
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word":"fossil fuels","definition":"coal, oil, and gas formed from ancient organisms","example":"Burning fossil fuels releases CO2."},{"word":"drought","definition":"a long period with very little rain","example":"The drought destroyed the harvest."},{"word":"renewable","definition":"energy from sources that won't run out","example":"Solar energy is a renewable resource."}]`),
		},
		{
			Title:           "A Job Interview",
			Level:           "B1",
			Topic:           "work",
			AudioURL:        "/audio/listening/b1_job_interview.mp3",
			DurationSeconds: 270,
			Transcript:      "Interviewer: Thank you for coming in today. Tell me a little about yourself. Candidate: Of course. I graduated from university three years ago with a degree in marketing. Since then I've been working for a digital agency where I managed social media accounts for several clients. Interviewer: What are your main strengths? Candidate: I'm very organised and I work well under pressure. I also have strong communication skills. Interviewer: What about weaknesses? Candidate: I sometimes take on too much at once. I'm learning to delegate more effectively. Interviewer: Where do you see yourself in five years? Candidate: I'd like to lead a marketing team and work on larger international campaigns.",
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word":"graduate","definition":"to successfully complete a university degree","example":"She graduated with honours."},{"word":"delegate","definition":"to give tasks to someone else to do","example":"A good manager knows how to delegate."},{"word":"campaign","definition":"a series of activities designed to achieve a goal","example":"The marketing campaign was very successful."}]`),
		},
		{
			Title:           "Health and Lifestyle",
			Level:           "B1",
			Topic:           "health",
			AudioURL:        "/audio/listening/b1_health.mp3",
			DurationSeconds: 245,
			Transcript:      "Maintaining a healthy lifestyle is important for both physical and mental wellbeing. Regular exercise — even just thirty minutes of walking a day — can significantly improve your mood and energy levels. Eating a balanced diet with plenty of fruit, vegetables, and whole grains provides essential nutrients. Sleep is often overlooked but it's crucial. Most adults need between seven and nine hours per night. Stress management is another key factor. Techniques such as meditation, deep breathing, and spending time in nature can all help reduce stress. Small consistent habits are more effective than occasional intense changes.",
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word":"wellbeing","definition":"the state of being comfortable, healthy, and happy","example":"Exercise improves mental wellbeing."},{"word":"nutrients","definition":"substances in food that help the body function","example":"Vegetables are full of essential nutrients."},{"word":"meditation","definition":"a practice of quiet mental focus","example":"She practises meditation every morning."}]`),
		},
		{
			Title:           "Technology and Education",
			Level:           "B1",
			Topic:           "technology",
			AudioURL:        "/audio/listening/b1_tech_education.mp3",
			DurationSeconds: 260,
			Transcript:      "Technology is transforming the way we learn. Online courses, video lectures, and interactive apps make education more accessible than ever. Students can now learn at their own pace, revisiting difficult concepts as many times as they need. However, technology in education also raises concerns. Screen time is increasing, and face-to-face interaction with teachers is decreasing. There's also the issue of the digital divide — not everyone has access to reliable internet or devices. Despite these challenges, most educators agree that technology, when used thoughtfully, can greatly enhance learning outcomes and prepare students for a digital future.",
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word":"accessible","definition":"easy to reach or use","example":"The library is accessible to everyone."},{"word":"digital divide","definition":"the gap between those with and without internet access","example":"The digital divide affects rural communities."},{"word":"enhance","definition":"to improve or make better","example":"Music can enhance your mood."}]`),
		},
		{
			Title:           "Travel Experiences",
			Level:           "B1",
			Topic:           "travel",
			AudioURL:        "/audio/listening/b1_travel.mp3",
			DurationSeconds: 230,
			Transcript:      "Travelling abroad broadens your horizons and gives you a better understanding of different cultures. Last year I spent a month travelling through Southeast Asia — Vietnam, Thailand, and Cambodia. The food was incredible and the people were incredibly welcoming. One of the highlights was visiting Angkor Wat at sunrise. It was breathtaking. Of course, travelling isn't always easy. There were language barriers and I got food poisoning once. But these challenges made the experience even more memorable. I came back with a new perspective on life and a desire to learn more about the world.",
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word":"broaden","definition":"to make wider or more varied","example":"Travel broadens your perspective."},{"word":"highlight","definition":"the best or most exciting part of an experience","example":"The highlight of the trip was the sunset."},{"word":"perspective","definition":"a particular way of thinking about something","example":"Travel changes your perspective on life."}]`),
		},
		// ── B2 ─────────────────────────────────────────────────────────────
		{
			Title:           "The Gig Economy",
			Level:           "B2",
			Topic:           "work",
			AudioURL:        "/audio/listening/b2_gig_economy.mp3",
			DurationSeconds: 300,
			Transcript:      "The gig economy — characterised by short-term contracts and freelance work rather than permanent jobs — has grown dramatically in recent years. Platforms like Uber, Deliveroo, and Fiverr have made it easier than ever for people to earn money on their own terms. Proponents argue that gig work offers unparalleled flexibility and autonomy. Workers can choose when and how much they work. Critics, however, point to the lack of job security, benefits, and workers' rights. Gig workers are typically classified as self-employed, meaning they don't receive sick pay, holiday entitlement, or pension contributions. The debate centres on whether flexibility is a genuine benefit or simply a way for companies to avoid their responsibilities to workers.",
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word":"freelance","definition":"working for different companies on separate projects","example":"She works as a freelance designer."},{"word":"autonomy","definition":"the right to make your own decisions","example":"The job offers a lot of autonomy."},{"word":"entitlement","definition":"the right to receive a benefit","example":"Employees have a holiday entitlement of 28 days."}]`),
		},
		{
			Title:           "Artificial Intelligence in Healthcare",
			Level:           "B2",
			Topic:           "technology",
			AudioURL:        "/audio/listening/b2_ai_healthcare.mp3",
			DurationSeconds: 310,
			Transcript:      "Artificial intelligence is rapidly transforming healthcare in ways that were unimaginable just a decade ago. AI algorithms can now analyse medical images with a level of accuracy that rivals — and in some cases surpasses — that of experienced specialists. Machine learning models can predict patient outcomes, helping doctors make more informed decisions. AI-powered chatbots are being deployed to provide mental health support and preliminary medical advice. However, there are significant ethical questions to address. Who is responsible when an AI makes a diagnostic error? How do we ensure that AI systems don't perpetuate existing biases in healthcare? And how do we protect patient data? The technology holds enormous promise, but thoughtful regulation is essential.",
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word":"algorithm","definition":"a set of rules for solving a problem or making a decision","example":"The algorithm analyses thousands of images per second."},{"word":"diagnostic","definition":"relating to the process of identifying a disease","example":"A diagnostic error can be very serious."},{"word":"perpetuate","definition":"to make something continue indefinitely","example":"We must not perpetuate inequality."}]`),
		},
		{
			Title:           "Urban Planning and Smart Cities",
			Level:           "B2",
			Topic:           "society",
			AudioURL:        "/audio/listening/b2_smart_cities.mp3",
			DurationSeconds: 295,
			Transcript:      "As cities become increasingly congested and resource-intensive, urban planners are turning to technology to create smarter, more sustainable environments. Smart cities use interconnected sensors and data networks to optimise everything from traffic flow to energy consumption. In Singapore, for example, smart lampposts collect data on air quality, crowd density, and weather conditions in real time. Amsterdam has pioneered a city-wide data platform allowing citizens to see and challenge how their data is used. Critics warn about surveillance risks and the concentration of power in the hands of tech corporations. The challenge for city governments is to harness the benefits of smart technology while preserving citizens' privacy and democratic accountability.",
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word":"congested","definition":"excessively full, especially of traffic","example":"The roads are congested during rush hour."},{"word":"optimise","definition":"to make as efficient as possible","example":"We need to optimise our use of resources."},{"word":"surveillance","definition":"close observation, especially by authorities","example":"CCTV surveillance is common in cities."}]`),
		},
		{
			Title:           "The Psychology of Habits",
			Level:           "B2",
			Topic:           "psychology",
			AudioURL:        "/audio/listening/b2_habits.mp3",
			DurationSeconds: 305,
			Transcript:      "According to neuroscientists, approximately forty percent of our daily actions are habits — automatic behaviours triggered by context rather than deliberate choice. Understanding how habits work can help us build better ones and break destructive patterns. The habit loop consists of three elements: a cue, a routine, and a reward. When you want to change a habit, the most effective strategy is to keep the cue and reward the same but substitute the routine. For example, if you habitually reach for a cigarette when stressed, you might replace smoking with a brisk walk — same trigger, same reward of relieving stress, different behaviour. Successful habit change also requires belief — the conviction that change is possible. This is why social support networks are so powerful in behaviour change programmes.",
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word":"deliberate","definition":"done consciously and intentionally","example":"It was a deliberate choice."},{"word":"substitute","definition":"to use something instead of something else","example":"You can substitute honey for sugar."},{"word":"conviction","definition":"a firm belief or opinion","example":"He spoke with conviction."}]`),
		},
		// ── C1 ─────────────────────────────────────────────────────────────
		{
			Title:           "The Future of Democracy",
			Level:           "C1",
			Topic:           "society",
			AudioURL:        "/audio/listening/c1_democracy.mp3",
			DurationSeconds: 350,
			Transcript:      "Liberal democracy — long considered the pinnacle of political organisation — is facing unprecedented pressure from multiple directions. The rise of populist movements, the erosion of institutional trust, and the manipulation of information ecosystems have all contributed to what many scholars describe as democratic backsliding. Yet the picture is not uniformly bleak. In countries like Taiwan and South Korea, digital tools are being harnessed to deepen democratic participation rather than undermine it. Taiwan's vTaiwan platform, for example, has successfully engaged hundreds of thousands of citizens in deliberative policy-making. The question is not whether democracy can survive, but whether it can evolve rapidly enough to meet the challenges of the twenty-first century — polarisation, climate emergency, and the concentration of economic power.",
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word":"populist","definition":"appealing to the interests of ordinary people, often in opposition to elites","example":"The populist movement gained millions of followers."},{"word":"backsliding","definition":"a reversal of progress","example":"Democratic backsliding threatens freedom."},{"word":"deliberative","definition":"involving careful consideration and discussion","example":"Deliberative democracy gives citizens a voice."}]`),
		},
		{
			Title:           "Cognitive Biases in Decision-Making",
			Level:           "C1",
			Topic:           "psychology",
			AudioURL:        "/audio/listening/c1_cognitive_biases.mp3",
			DurationSeconds: 360,
			Transcript:      "Our brains are remarkable organs, but they are far from perfect decision-making machines. Cognitive biases — systematic errors in thinking — affect every aspect of our judgements, from financial decisions to interpersonal relationships. Confirmation bias leads us to seek out information that supports our existing beliefs while ignoring contradictory evidence. The availability heuristic causes us to overestimate the likelihood of events that come easily to mind — which is why people fear plane crashes more than car accidents, despite the latter being statistically far more dangerous. Anchoring bias means that the first piece of information we receive disproportionately influences our subsequent judgements. Recognising these biases is the first step toward mitigating their effects, though research suggests that awareness alone is rarely sufficient to overcome them entirely.",
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word":"heuristic","definition":"a mental shortcut used to make decisions quickly","example":"The availability heuristic can mislead us."},{"word":"anchoring","definition":"relying too heavily on the first piece of information received","example":"Anchoring bias affected his salary negotiation."},{"word":"mitigating","definition":"making something less severe","example":"There are strategies for mitigating cognitive biases."}]`),
		},
		{
			Title:           "Globalisation and Cultural Identity",
			Level:           "C1",
			Topic:           "society",
			AudioURL:        "/audio/listening/c1_globalisation.mp3",
			DurationSeconds: 345,
			Transcript:      "Globalisation has connected the world in extraordinary ways, enabling the unprecedented flow of goods, capital, information, and people across national borders. Yet this interconnectedness has provoked a profound identity crisis in many communities. As global brands and cultural products homogenise consumption patterns, many people feel that their local languages, traditions, and ways of life are under threat. This tension between the cosmopolitan and the parochial is not new — it has characterised every era of significant cultural contact. What is new is the speed and scale of change. Anthropologists debate whether globalisation ultimately enriches cultural diversity through hybridisation, or impoverishes it through homogenisation. The answer, most likely, is both simultaneously — and the task for societies is to navigate this tension consciously rather than passively.",
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word":"homogenise","definition":"to make uniform or similar throughout","example":"Globalisation has homogenised popular culture."},{"word":"cosmopolitan","definition":"familiar with and at ease in many different cultures","example":"London is a cosmopolitan city."},{"word":"hybridisation","definition":"the combining of different elements to create something new","example":"Cultural hybridisation produces new art forms."}]`),
		},
		// ── Podcast Snippets (B1-B2, SourcePodcast set) ────────────────────
		{
			Title:           "BBC: Is Social Media Making Us Lonely?",
			Level:           "B1",
			Topic:           "technology",
			AudioURL:        "/audio/listening/podcast_social_media_lonely.mp3",
			DurationSeconds: 180,
			Transcript:      "In today's programme we're asking whether social media is making us lonelier. At first glance, the idea seems counterintuitive. We're more connected than ever — thousands of friends, followers, and likes at our fingertips. Yet research consistently shows a correlation between heavy social media use and feelings of isolation. One reason may be that social comparison is intensified online. We see carefully curated highlights of other people's lives and compare them to our own messy reality. Another factor is that digital interactions, however frequent, may not satisfy the deep human need for face-to-face connection. Of course, for people who are physically isolated — the elderly, those with disabilities — social media can be a lifeline. The picture is complex.",
			Source:          "BBC Learning English",
			SourceURL:       "https://www.bbc.co.uk/learningenglish",
			License:         "CC-BY-NC-ND",
			SourcePodcast:   "BBC 6 Minute English",
			Vocabulary:      vocab(`[{"word":"counterintuitive","definition":"opposite to what you would naturally expect","example":"It seems counterintuitive, but rest can boost productivity."},{"word":"curated","definition":"carefully selected and presented","example":"Her social media feed is highly curated."},{"word":"lifeline","definition":"something that is essential to someone's survival","example":"The phone was a lifeline for the isolated elderly man."}]`),
		},
		{
			Title:           "BBC: The Science of Sleep",
			Level:           "B1",
			Topic:           "health",
			AudioURL:        "/audio/listening/podcast_sleep_science.mp3",
			DurationSeconds: 175,
			Transcript:      "Hello and welcome. Today's topic is one that affects every single one of us — sleep. Experts say most adults need between seven and nine hours per night, yet surveys show that a third of people regularly sleep fewer than six hours. What happens when we sleep? During the night, the brain cycles through different stages. In deep sleep, the body repairs tissues and the immune system is strengthened. During REM sleep — when we dream — the brain consolidates memories and processes emotions. Sleep deprivation, even mild, impairs concentration, mood, and decision-making. Chronic sleep loss is linked to serious health conditions including heart disease and diabetes. Yet many people wear their ability to function on little sleep as a badge of honour.",
			Source:          "BBC Learning English",
			SourceURL:       "https://www.bbc.co.uk/learningenglish",
			License:         "CC-BY-NC-ND",
			SourcePodcast:   "BBC 6 Minute English",
			Vocabulary:      vocab(`[{"word":"consolidates","definition":"makes stronger or more secure","example":"Sleep consolidates memories."},{"word":"deprivation","definition":"the state of lacking something necessary","example":"Sleep deprivation affects performance."},{"word":"chronic","definition":"lasting for a long time","example":"Chronic stress is damaging to health."}]`),
		},
		{
			Title:           "BBC: The Future of Food",
			Level:           "B2",
			Topic:           "environment",
			AudioURL:        "/audio/listening/podcast_future_food.mp3",
			DurationSeconds: 185,
			Transcript:      "With the global population projected to reach ten billion by 2050, scientists are racing to find sustainable alternatives to conventional agriculture. Cultivated meat — grown in laboratories from animal cells — could potentially produce protein with a fraction of the land, water, and carbon footprint of traditional livestock farming. Insect protein, already widely consumed in many cultures, is another promising avenue. Meanwhile, vertical farming — growing crops in stacked indoor layers — allows year-round production in urban settings without pesticides. Critics question whether consumers in Western markets will accept these innovations. But proponents argue that as climate pressures intensify, the question won't be whether we eat differently, but how quickly we can make the transition.",
			Source:          "BBC Learning English",
			SourceURL:       "https://www.bbc.co.uk/learningenglish",
			License:         "CC-BY-NC-ND",
			SourcePodcast:   "BBC 6 Minute English",
			Vocabulary:      vocab(`[{"word":"cultivated","definition":"grown or developed in a controlled environment","example":"Cultivated meat requires no slaughter."},{"word":"livestock","definition":"farm animals kept for food or farming","example":"Livestock farming uses vast amounts of land."},{"word":"pesticides","definition":"chemicals used to kill insects or other organisms harmful to crops","example":"Vertical farms use no pesticides."}]`),
		},
		{
			Title:           "VOA: Learning English — How Languages Die",
			Level:           "B2",
			Topic:           "culture",
			AudioURL:        "/audio/listening/podcast_language_death.mp3",
			DurationSeconds: 190,
			Transcript:      "Linguists estimate that of the approximately seven thousand languages spoken in the world today, half will have disappeared by the end of this century. A language dies when its last native speaker dies without passing it on. Most endangered languages are those of small indigenous communities, displaced or marginalised by dominant cultures and their languages. When a language vanishes, it takes with it unique ways of describing reality — vocabulary for ecosystems, kinship structures, and philosophical concepts that have no equivalent in other tongues. Some communities are fighting back. The Māori in New Zealand have dramatically increased the number of native speakers through immersion schools and language nests. The Welsh language has seen a revival through similar educational policies. These examples show that language death is not inevitable.",
			Source:          "VOA Learning English",
			SourceURL:       "https://learningenglish.voanews.com",
			License:         "Public Domain",
			SourcePodcast:   "VOA Learning English",
			Vocabulary:      vocab(`[{"word":"indigenous","definition":"native to a particular place","example":"Indigenous communities protect local knowledge."},{"word":"marginalised","definition":"treated as less important or outside the mainstream","example":"Marginalised communities often lose their languages."},{"word":"immersion","definition":"deep involvement in something, especially a language","example":"Language immersion schools produce fluent speakers."}]`),
		},
		// ── C2 ─────────────────────────────────────────────────────────────
		{
			Title:           "Consciousness and the Hard Problem",
			Level:           "C2",
			Topic:           "science",
			AudioURL:        "/audio/listening/c2_consciousness.mp3",
			DurationSeconds: 400,
			Transcript:      "Of all the mysteries in science, perhaps none is more perplexing than the nature of consciousness. Philosophers distinguish between the 'easy' problems of consciousness — explaining cognitive functions like attention, memory, and learning — and what David Chalmers famously called the 'hard problem': explaining why and how physical processes in the brain give rise to subjective experience. Why does the processing of light wavelengths by the visual cortex result in the vivid, ineffable experience of seeing red? This explanatory gap has resisted every attempt at resolution. Physicalists argue that consciousness will eventually be fully explained in terms of brain states. Dualists maintain that mind and matter are fundamentally distinct. Panpsychists suggest that consciousness is a fundamental feature of reality, present even in simple systems. None of these positions is fully satisfying, which is why the hard problem remains, genuinely, hard.",
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word":"perplexing","definition":"very confusing and difficult to understand","example":"The result was perplexing to the scientists."},{"word":"ineffable","definition":"too great or extreme to be expressed in words","example":"There was an ineffable sense of beauty."},{"word":"panpsychist","definition":"believing that consciousness is a fundamental property of all matter","example":"Panpsychist philosophers challenge materialist views."}]`),
		},
		{
			Title:           "Post-Truth and the Epistemological Crisis",
			Level:           "C2",
			Topic:           "society",
			AudioURL:        "/audio/listening/c2_post_truth.mp3",
			DurationSeconds: 380,
			Transcript:      "We live, it is said, in a post-truth era — an age in which objective facts are less influential in shaping public opinion than appeals to emotion and personal belief. The term, chosen as Oxford's word of the year in 2016, captures something genuinely novel about our current predicament. It is not merely that people lie, or that propaganda exists — these are as old as human society. What is new is the collapse of shared epistemic standards: the frameworks by which we collectively determine what counts as evidence, what counts as expertise, and who is entitled to make authoritative claims about reality. Social media algorithms optimised for engagement have proven uniquely suited to amplifying emotionally resonant misinformation. When trust in institutions crumbles, conspiracy theories fill the vacuum. Rebuilding epistemic commons — shared standards of evidence and reason — may be the defining political challenge of our time.",
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word":"epistemic","definition":"relating to knowledge and the conditions for having it","example":"Epistemic humility means acknowledging what you don't know."},{"word":"predicament","definition":"a difficult or unpleasant situation","example":"The country found itself in a serious predicament."},{"word":"amplifying","definition":"making louder or more intense","example":"Social media is amplifying misinformation."}]`),
		},
		// ── Additional A1/A2 for completeness ──────────────────────────────
		{
			Title:           "Animals and Pets",
			Level:           "A1",
			Topic:           "animals",
			AudioURL:        "/audio/listening/a1_animals.mp3",
			DurationSeconds: 110,
			Transcript:      "I have a dog. His name is Max. He is brown and white. He is three years old. Max likes to run in the park. He also likes to sleep on the sofa. I take him for a walk every morning. Do you have a pet? My friend has a cat. Her cat is black. Cats are very quiet animals. Some people like dogs and some people like cats. I think dogs are the best pets.",
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word":"pet","definition":"an animal kept at home for company","example":"She has two pets — a dog and a rabbit."},{"word":"walk","definition":"to take an animal outside to exercise","example":"I walk my dog twice a day."},{"word":"quiet","definition":"making little or no noise","example":"Cats are quiet animals."}]`),
		},
		{
			Title:           "Weather and Seasons",
			Level:           "A2",
			Topic:           "weather",
			AudioURL:        "/audio/listening/a2_weather.mp3",
			DurationSeconds: 145,
			Transcript:      "There are four seasons in a year: spring, summer, autumn, and winter. In spring the weather gets warmer and flowers start to grow. Summer is usually the hottest time of year. Many people go on holiday in summer. Autumn is when the leaves change colour and fall from the trees. Winter is cold and sometimes it snows. I love winter because I enjoy skiing. My favourite season is spring because everything looks fresh and new. What season do you prefer? Do you like hot or cold weather?",
			Source:          "Original TTS",
			License:         "Original",
			Vocabulary:      vocab(`[{"word":"season","definition":"one of the four periods of the year","example":"Autumn is my favourite season."},{"word":"temperature","definition":"how hot or cold something is","example":"The temperature today is fifteen degrees."},{"word":"forecast","definition":"a prediction of future weather","example":"The weather forecast says it will rain."}]`),
		},
	}

	result := db.Clauses(clause.OnConflict{DoNothing: true}).Create(&clips)
	if result.Error != nil {
		return result.Error
	}
	log.Printf("Seeded %d listening clips", len(clips))

	// Seed comprehension questions for first clip
	if err := seedListeningQuestions(db, clips); err != nil {
		log.Printf("warning: listening questions seed failed: %v", err)
	}

	return nil
}

func seedListeningQuestions(db *gorm.DB, clips []models.ListeningClip) error {
	db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_listening_q_clip_prompt
		ON listening_questions (clip_id, prompt)`)

	// Find first few clips by title to attach questions
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
