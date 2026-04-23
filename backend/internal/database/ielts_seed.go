package database

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

func seedIELTSContent(db *gorm.DB) error {
	if err := seedIELTSMaterials(db); err != nil {
		return err
	}
	if err := seedIELTSQuestions(db); err != nil {
		return err
	}
	return nil
}

func seedIELTSMaterials(db *gorm.DB) error {
	var count int64
	if err := db.Model(&models.IELTSMaterial{}).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	materials := []models.IELTSMaterial{
		{
			Title:     "Reading lesson: map the question before the passage",
			Content:   "Build a three-step routine: skim headings, underline keywords in the questions, then scan the passage for paraphrases. This keeps you from reading every sentence slowly and protects your timing across all three passages.",
			Category:  "reading",
			Type:      "lesson",
			SortOrder: 1,
		},
		{
			Title:     "Reading practice: True / False / Not Given workflow",
			Content:   "Decide whether the statement matches the writer's idea, directly contradicts it, or is never stated. Do not use outside knowledge. If the passage is silent about a detail, the answer is Not Given even when the statement looks reasonable.",
			Category:  "reading",
			Type:      "practice",
			SortOrder: 2,
		},
		{
			Title:     "Reading tip: train your paraphrase radar",
			Content:   "IELTS rarely repeats the exact wording from the question. Practice matching synonyms, changes in word class, and shorter paraphrases so you can spot the right paragraph faster under time pressure.",
			Category:  "reading",
			Type:      "tip",
			SortOrder: 3,
		},
		{
			Title:     "Listening lesson: predict before you hear",
			Content:   "Use the pause before each section to predict grammar and meaning. If the gap is after an article, expect a noun. If the question asks for a number or date, prepare for distractors and changes in information.",
			Category:  "listening",
			Type:      "lesson",
			SortOrder: 4,
		},
		{
			Title:     "Listening practice: distractor spotting",
			Content:   "Many answers are presented, rejected, and then corrected. Train yourself to wait for the final confirmed detail instead of writing the first option you hear. Focus on contrast signals such as however, actually, and instead.",
			Category:  "listening",
			Type:      "practice",
			SortOrder: 5,
		},
		{
			Title:     "Listening tip: write fast, check later",
			Content:   "During the recording, capture the answer quickly even if spelling is messy. Use the transfer time at the end to fix spelling, capitalization, and word limits.",
			Category:  "listening",
			Type:      "tip",
			SortOrder: 6,
		},
		{
			Title:     "Writing lesson: Task 2 paragraph blueprint",
			Content:   "Use a clear structure: introduction, two main body paragraphs, and a concise conclusion. Each body paragraph should start with one controlling idea, develop it with explanation, and finish with a relevant example or consequence.",
			Category:  "writing",
			Type:      "lesson",
			SortOrder: 7,
		},
		{
			Title:     "Writing practice: comparing data in Task 1",
			Content:   "Focus on overview first: highest, lowest, largest change, and stable trends. Then group the data logically instead of describing every number one by one. Comparison language often improves coherence more than raw detail.",
			Category:  "writing",
			Type:      "practice",
			SortOrder: 8,
		},
		{
			Title:     "Writing tip: improve without memorised phrases",
			Content:   "Band scores rise when your ideas are clear and natural, not when the essay is crowded with memorised templates. Use flexible linking and accurate grammar instead of forcing impressive vocabulary into weak arguments.",
			Category:  "writing",
			Type:      "tip",
			SortOrder: 9,
		},
		{
			Title:     "Speaking lesson: extend answers naturally",
			Content:   "In Part 1, give a direct answer, add a short reason, and finish with a simple example. This sounds natural and helps you avoid the one-sentence answers that keep the conversation too short.",
			Category:  "speaking",
			Type:      "lesson",
			SortOrder: 10,
		},
		{
			Title:     "Speaking practice: Part 2 note strategy",
			Content:   "Use your one minute to write four quick prompts: context, action, detail, reflection. These anchors help you speak for longer without memorising a script.",
			Category:  "speaking",
			Type:      "practice",
			SortOrder: 11,
		},
		{
			Title:     "Speaking tip: recover from mistakes like a real candidate",
			Content:   "If you hesitate or choose the wrong word, correct yourself and keep going. Examiners do not expect perfection, but they do reward flexible communication and calm self-repair.",
			Category:  "speaking",
			Type:      "tip",
			SortOrder: 12,
		},
	}

	if err := db.Create(&materials).Error; err != nil {
		return err
	}

	log.Printf("seeded %d IELTS materials", len(materials))
	return nil
}

func seedIELTSQuestions(db *gorm.DB) error {
	questions := buildIELTSQuestionSeed()

	var existing []models.IELTSQuestion
	if err := db.Select("id", "section", "mock_type", "exam_set", "question_group", "question_type", "sort_order").
		Find(&existing).Error; err != nil {
		return err
	}

	existingByKey := make(map[string]string, len(existing))
	for _, item := range existing {
		existingByKey[ieltsQuestionSeedKey(item)] = item.ID
	}

	created := 0
	updated := 0

	for _, question := range questions {
		key := ieltsQuestionSeedKey(question)
		if id, ok := existingByKey[key]; ok {
			if err := db.Model(&models.IELTSQuestion{}).Where("id = ?", id).Updates(map[string]any{
				"section":        question.Section,
				"question_type":  question.QuestionType,
				"difficulty":     question.Difficulty,
				"mock_type":      question.MockType,
				"topic":          question.Topic,
				"exam_set":       question.ExamSet,
				"question_group": question.QuestionGroup,
				"title":          question.Title,
				"prompt":         question.Prompt,
				"content":        question.Content,
				"audio_script":   question.AudioScript,
				"options":        question.Options,
				"answer":         question.Answer,
				"explanation":    question.Explanation,
				"band_target":     question.BandTarget,
				"passage_number":  question.PassageNumber,
				"sort_order":      question.SortOrder,
			}).Error; err != nil {
				return err
			}
			updated++
			continue
		}

		if err := db.Create(&question).Error; err != nil {
			return err
		}
		created++
	}

	log.Printf("synced IELTS questions: created=%d updated=%d total_seed=%d", created, updated, len(questions))
	return nil
}

func buildIELTSQuestionSeed() []models.IELTSQuestion {
	// Full-length reading passages (3 tests × 3 passages × ~13 questions = 120)
	questions := buildReadingTestBank()

	// Full-length listening sections (3 tests × 4 sections × 10 questions = 120)
	questions = append(questions, buildListeningTestBank()...)

	// Cambridge IELTS 12-20 extended reading bank (OCR-extracted, 72 passages)
	questions = append(questions, buildCambridgeExtendedReadingBank()...)

	// Legacy question seed (writing, speaking, short reading/listening)
	questions = append(questions, buildLegacyQuestionSeed()...)
	return questions
}

func buildLegacyQuestionSeed() []models.IELTSQuestion {
	questions := make([]models.IELTSQuestion, 0, 64)

	addQuestion := func(q models.IELTSQuestion) {
		if q.Topic == "" {
			q.Topic = q.Title
		}
		if q.QuestionGroup == "" {
			q.QuestionGroup = q.ExamSet
		}
		questions = append(questions, q)
	}

	addWritingSet := func(mockType string, sortBase int, task1 []seedQuestion, task2 []seedQuestion) {
		for idx, item := range task1 {
			addQuestion(models.IELTSQuestion{
				Section:       "writing",
				QuestionType:  "task1",
				Difficulty:    item.Difficulty,
				MockType:      mockType,
				Topic:         item.Topic,
				ExamSet:       item.ExamSet,
				QuestionGroup: item.Group,
				Title:         item.Title,
				Prompt:        item.Prompt,
				BandTarget:    stringPtr(item.BandTarget),
				SortOrder:     sortBase + idx + 1,
			})
		}
		for idx, item := range task2 {
			addQuestion(models.IELTSQuestion{
				Section:       "writing",
				QuestionType:  "task2",
				Difficulty:    item.Difficulty,
				MockType:      mockType,
				Topic:         item.Topic,
				ExamSet:       item.ExamSet,
				QuestionGroup: item.Group,
				Title:         item.Title,
				Prompt:        item.Prompt,
				BandTarget:    stringPtr(item.BandTarget),
				SortOrder:     sortBase + 100 + idx + 1,
			})
		}
	}

	addSpeakingSet := func(mockType string, sortBase int, items []seedSpeakingQuestion) {
		for idx, item := range items {
			addQuestion(models.IELTSQuestion{
				Section:       "speaking",
				QuestionType:  item.Part,
				Difficulty:    item.Difficulty,
				MockType:      mockType,
				Topic:         item.Topic,
				ExamSet:       item.ExamSet,
				QuestionGroup: item.Group,
				Title:         item.Title,
				Prompt:        item.Prompt,
				Content:       stringPtr(item.Content),
				BandTarget:    stringPtr(item.BandTarget),
				SortOrder:     sortBase + idx + 1,
			})
		}
	}

	addReadingListeningGroup := func(section string, items []seedObjectiveQuestion) {
		for _, item := range items {
			addQuestion(models.IELTSQuestion{
				Section:       section,
				QuestionType:  item.QuestionType,
				Difficulty:    item.Difficulty,
				MockType:      item.MockType,
				Topic:         item.Topic,
				ExamSet:       item.ExamSet,
				QuestionGroup: item.Group,
				Title:         item.Title,
				Prompt:        item.Prompt,
				Content:       stringPtr(item.Content),
				AudioScript:   stringPtr(item.AudioScript),
				Options:       jsonString(item.Options),
				Answer:        stringPtr(item.Answer),
				Explanation:   stringPtr(item.Explanation),
				BandTarget:    stringPtr(item.BandTarget),
				SortOrder:     item.SortOrder,
			})
		}
	}

	cambridgeTask1 := []seedQuestion{
		{
			ExamSet:    "cambridge-17-test-1",
			Group:      "cambridge-17-test-1-writing",
			Title:      "Public transport usage",
			Topic:      "Transport",
			Difficulty: "medium",
			BandTarget: "6.5",
			Prompt:     "The charts below show changes in the percentage of commuters using different forms of transport in one city between 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
		},
		{
			ExamSet:    "cambridge-17-test-2",
			Group:      "cambridge-17-test-2-writing",
			Title:      "Energy consumption by sector",
			Topic:      "Environment",
			Difficulty: "hard",
			BandTarget: "7.0",
			Prompt:     "The table and pie chart show how energy was consumed in a country in 1995 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
		},
		{
			ExamSet:    "original-writing-01",
			Group:      "original-writing-01",
			Title:      "Household water use",
			Topic:      "Cities",
			Difficulty: "easy",
			BandTarget: "6.0",
			Prompt:     "The diagram below shows how water is used in households in a modern city. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
		},
		{
			ExamSet:    "original-writing-02",
			Group:      "original-writing-02",
			Title:      "Online grocery sales",
			Topic:      "Business",
			Difficulty: "medium",
			BandTarget: "6.5",
			Prompt:     "The line graph below shows the proportion of grocery sales made online in four countries from 2012 to 2022. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
		},
		{
			ExamSet:    "predictions-2026-spring",
			Group:      "predictions-2026-spring-writing",
			Title:      "Remote work habits",
			Topic:      "Work",
			Difficulty: "medium",
			BandTarget: "6.5",
			Prompt:     "The charts below compare the number of employees working from home and from the office in three industries in 2018 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
		},
		{
			ExamSet:    "predictions-2026-autumn",
			Group:      "predictions-2026-autumn-writing",
			Title:      "Electric vehicle charging",
			Topic:      "Technology",
			Difficulty: "hard",
			BandTarget: "7.0",
			Prompt:     "The table below shows the number of public electric vehicle charging stations in six cities in 2015, 2020 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
		},
	}

	cambridgeTask2 := []seedQuestion{
		{
			ExamSet:    "cambridge-17-test-1",
			Group:      "cambridge-17-test-1-writing",
			Title:      "Public behaviour and technology",
			Topic:      "Technology",
			Difficulty: "medium",
			BandTarget: "6.5",
			Prompt:     "Some people think the increasing use of smartphones in public places is damaging social relationships. To what extent do you agree or disagree?",
		},
		{
			ExamSet:    "cambridge-17-test-2",
			Group:      "cambridge-17-test-2-writing",
			Title:      "University funding",
			Topic:      "Education",
			Difficulty: "hard",
			BandTarget: "7.0",
			Prompt:     "Governments should spend more money on university education than on vocational training. To what extent do you agree or disagree?",
		},
		{
			ExamSet:    "original-writing-03",
			Group:      "original-writing-03",
			Title:      "Urban parks",
			Topic:      "Cities",
			Difficulty: "easy",
			BandTarget: "6.0",
			Prompt:     "Some people believe that every city should invest more in parks and public open spaces, even if this means spending less on roads. Discuss both views and give your own opinion.",
		},
		{
			ExamSet:    "original-writing-04",
			Group:      "original-writing-04",
			Title:      "Online learning balance",
			Topic:      "Education",
			Difficulty: "medium",
			BandTarget: "6.5",
			Prompt:     "Online courses are becoming more common than classroom teaching. Do the advantages of this trend outweigh the disadvantages?",
		},
		{
			ExamSet:    "original-writing-05",
			Group:      "original-writing-05",
			Title:      "Healthy lifestyles",
			Topic:      "Health",
			Difficulty: "medium",
			BandTarget: "6.5",
			Prompt:     "Many people know they should live more healthily, but only a small number change their habits. Why is this the case, and what can be done to encourage healthier lifestyles?",
		},
		{
			ExamSet:    "original-writing-06",
			Group:      "original-writing-06",
			Title:      "Tourism pressure",
			Topic:      "Travel",
			Difficulty: "hard",
			BandTarget: "7.0",
			Prompt:     "International tourism brings economic benefits, but it can also create serious problems for local communities. Why does this happen, and how can tourism become more sustainable?",
		},
		{
			ExamSet:    "predictions-2026-spring",
			Group:      "predictions-2026-spring-writing",
			Title:      "AI in the workplace",
			Topic:      "Work",
			Difficulty: "hard",
			BandTarget: "7.0",
			Prompt:     "Artificial intelligence is replacing some jobs while creating others. Do the advantages of this development outweigh the disadvantages for society?",
		},
		{
			ExamSet:    "predictions-2026-autumn",
			Group:      "predictions-2026-autumn-writing",
			Title:      "Teen mental health",
			Topic:      "Society",
			Difficulty: "medium",
			BandTarget: "6.5",
			Prompt:     "Some people believe that schools should spend more time teaching students how to manage stress and mental health. To what extent do you agree or disagree?",
		},
	}

	addWritingSet("cambridge_style", 0, cambridgeTask1[:2], cambridgeTask2[:2])
	addWritingSet("original", 300, cambridgeTask1[2:4], cambridgeTask2[2:6])
	addWritingSet("predictions", 600, cambridgeTask1[4:], cambridgeTask2[6:])

	speakingQuestions := []seedSpeakingQuestion{
		{ExamSet: "cambridge-17-test-1", Group: "cambridge-17-test-1-speaking", Title: "Daily routines", Topic: "Lifestyle", Part: "part1", Difficulty: "easy", BandTarget: "6.0", Prompt: "What part of your daily routine do you enjoy the most, and why?"},
		{ExamSet: "cambridge-17-test-1", Group: "cambridge-17-test-1-speaking", Title: "A useful object", Topic: "Objects", Part: "part2", Difficulty: "medium", BandTarget: "6.5", Prompt: "Describe an object you use every day that is very important to you.", Content: "what the object is\nwhen you started using it\nhow it helps you in daily life\nand explain why it is important to you"},
		{ExamSet: "cambridge-17-test-1", Group: "cambridge-17-test-1-speaking", Title: "Technology and habits", Topic: "Technology", Part: "part3", Difficulty: "medium", BandTarget: "6.5", Prompt: "How do you think technology has changed the daily habits of young people?"},
		{ExamSet: "cambridge-17-test-2", Group: "cambridge-17-test-2-speaking", Title: "Reading habits", Topic: "Education", Part: "part1", Difficulty: "easy", BandTarget: "6.0", Prompt: "Do you enjoy reading long articles or short content online? Why?"},
		{ExamSet: "cambridge-17-test-2", Group: "cambridge-17-test-2-speaking", Title: "A memorable lesson", Topic: "Education", Part: "part2", Difficulty: "medium", BandTarget: "6.5", Prompt: "Describe a lesson you had that was especially memorable.", Content: "what the lesson was\nwho taught it\nwhat made it memorable\nand explain why you still remember it"},
		{ExamSet: "cambridge-17-test-2", Group: "cambridge-17-test-2-speaking", Title: "Future schools", Topic: "Education", Part: "part3", Difficulty: "hard", BandTarget: "7.0", Prompt: "In what ways do you think schools will be different in the next twenty years?"},
		{ExamSet: "original-speaking-01", Group: "original-speaking-01", Title: "Neighbourhood", Topic: "Cities", Part: "part1", Difficulty: "easy", BandTarget: "6.0", Prompt: "What do you like about the area where you live?"},
		{ExamSet: "original-speaking-01", Group: "original-speaking-01", Title: "A public place", Topic: "Cities", Part: "part2", Difficulty: "medium", BandTarget: "6.5", Prompt: "Describe a public place in your city that many people enjoy visiting.", Content: "where it is\nwhat people do there\nwhy it is popular\nand explain what you think of this place"},
		{ExamSet: "original-speaking-01", Group: "original-speaking-01", Title: "Urban development", Topic: "Cities", Part: "part3", Difficulty: "hard", BandTarget: "7.0", Prompt: "What are the main challenges that growing cities face today?"},
		{ExamSet: "original-speaking-02", Group: "original-speaking-02", Title: "Food choices", Topic: "Health", Part: "part1", Difficulty: "easy", BandTarget: "6.0", Prompt: "Do you prefer cooking at home or eating out? Why?"},
		{ExamSet: "original-speaking-02", Group: "original-speaking-02", Title: "A healthy change", Topic: "Health", Part: "part2", Difficulty: "medium", BandTarget: "6.5", Prompt: "Describe a healthy habit you started recently.", Content: "what the habit is\nwhy you started it\nhow difficult it was at first\nand explain how it has affected you"},
		{ExamSet: "original-speaking-02", Group: "original-speaking-02", Title: "Public health", Topic: "Health", Part: "part3", Difficulty: "hard", BandTarget: "7.0", Prompt: "Should governments take more responsibility for improving public health? Why?"},
		{ExamSet: "predictions-2026-spring", Group: "predictions-2026-spring-speaking", Title: "Digital balance", Topic: "Technology", Part: "part1", Difficulty: "easy", BandTarget: "6.5", Prompt: "How easy is it for you to stop using your phone when you need to focus?"},
		{ExamSet: "predictions-2026-spring", Group: "predictions-2026-spring-speaking", Title: "An online skill", Topic: "Technology", Part: "part2", Difficulty: "medium", BandTarget: "6.5", Prompt: "Describe a skill you learned online that has been useful for you.", Content: "what the skill is\nwhere you learned it\nhow long it took to learn\nand explain why it has been useful"},
		{ExamSet: "predictions-2026-spring", Group: "predictions-2026-spring-speaking", Title: "AI and communication", Topic: "Technology", Part: "part3", Difficulty: "hard", BandTarget: "7.0", Prompt: "How might artificial intelligence change the way people communicate in the future?"},
		{ExamSet: "predictions-2026-autumn", Group: "predictions-2026-autumn-speaking", Title: "Learning pressure", Topic: "Education", Part: "part1", Difficulty: "easy", BandTarget: "6.5", Prompt: "Do you think students today feel more pressure than students in the past?"},
		{ExamSet: "predictions-2026-autumn", Group: "predictions-2026-autumn-speaking", Title: "A useful website", Topic: "Study", Part: "part2", Difficulty: "medium", BandTarget: "6.5", Prompt: "Describe a website or app that helps you study or organise your work.", Content: "what it is\nhow often you use it\nwhat features you find useful\nand explain why you would recommend it"},
		{ExamSet: "predictions-2026-autumn", Group: "predictions-2026-autumn-speaking", Title: "Independent learning", Topic: "Study", Part: "part3", Difficulty: "hard", BandTarget: "7.0", Prompt: "Do you think independent learning will become more important in the future? Why?"},
	}
	addSpeakingSet("original", 900, speakingQuestions[6:12])
	addSpeakingSet("cambridge_style", 1200, speakingQuestions[:6])
	addSpeakingSet("predictions", 1500, speakingQuestions[12:])

	readingQuestions := []seedObjectiveQuestion{
		{
			ExamSet:      "original-reading-01",
			Group:        "original-reading-01",
			MockType:     "original",
			Title:        "Library redesign",
			Topic:        "Education",
			QuestionType: "fill_blank",
			Difficulty:   "easy",
			BandTarget:   "6.0",
			SortOrder:    2101,
			Content:      "A university library recently redesigned its ground floor. Instead of increasing the number of shelves, planners created group study booths, silent work areas and multimedia corners. Surveys later showed that students stayed longer in the building and reported feeling more productive.",
			Prompt:       "Students reported feeling more ______ after the redesign.",
			Answer:       "productive",
			Explanation:  "The final sentence says students reported feeling more productive.",
		},
		{
			ExamSet:      "predictions-2026-spring",
			Group:        "predictions-2026-spring-reading",
			MockType:     "predictions",
			Title:        "Neighbourhood repair cafes",
			Topic:        "Society",
			QuestionType: "multiple_choice",
			Difficulty:   "medium",
			BandTarget:   "6.5",
			SortOrder:    2201,
			Content:      "Neighbourhood repair cafes are volunteer-led events where people bring damaged household items and try to repair them with expert guidance. Organisers say the events do more than reduce waste: they also strengthen social ties because participants talk, teach one another and exchange tools.",
			Prompt:       "What additional benefit of repair cafes is mentioned in the passage?",
			Options:      []string{"They provide free replacement items", "They create stronger community connections", "They reduce the need for expert guidance", "They allow businesses to advertise"},
			Answer:       "They create stronger community connections",
			Explanation:  "The passage says they strengthen social ties.",
		},
		{
			ExamSet:      "predictions-2026-autumn",
			Group:        "predictions-2026-autumn-reading",
			MockType:     "predictions",
			Title:        "Short-form learning videos",
			Topic:        "Technology",
			QuestionType: "true_false",
			Difficulty:   "hard",
			BandTarget:   "7.0",
			SortOrder:    2202,
			Content:      "Educational researchers have mixed views on short-form learning videos. They can introduce topics quickly and motivate learners to begin studying, but deep understanding still depends on follow-up practice, retrieval and longer reflection.",
			Prompt:       "The passage claims short-form videos are enough on their own for deep learning.",
			Answer:       "false",
			Explanation:  "The passage says deep understanding still depends on follow-up practice and reflection.",
		},
	}
	addReadingListeningGroup("reading", readingQuestions)

	listeningQuestions := []seedObjectiveQuestion{
		{
			ExamSet:      "original-listening-01",
			Group:        "original-listening-01",
			MockType:     "original",
			Title:        "Community sports club",
			Topic:        "Health",
			QuestionType: "matching",
			Difficulty:   "medium",
			BandTarget:   "6.5",
			SortOrder:    3101,
			AudioScript:  "Coach: On Mondays we run beginner yoga, on Wednesdays we focus on strength circuits, and on Fridays we organise a longer outdoor walk for members who prefer gentle exercise.",
			Prompt:       "Match the activity to the day for 'strength circuits'.",
			Options:      []string{"A. Monday", "B. Wednesday", "C. Friday"},
			Answer:       "B. Wednesday",
			Explanation:  "The coach says Wednesdays are for strength circuits.",
		},
		{
			ExamSet:      "predictions-2026-spring",
			Group:        "predictions-2026-spring-listening",
			MockType:     "predictions",
			Title:        "Remote internship briefing",
			Topic:        "Work",
			QuestionType: "fill_blank",
			Difficulty:   "medium",
			BandTarget:   "6.5",
			SortOrder:    3201,
			AudioScript:  "Manager: During the remote internship, everyone joins the planning call at 9.15. Interns then work in pairs and send a progress update before lunch. The final reflection meeting takes place every Thursday afternoon.",
			Prompt:       "The planning call begins at ______.",
			Answer:       "9.15",
			Explanation:  "The manager says everyone joins the planning call at 9.15.",
		},
		{
			ExamSet:      "predictions-2026-autumn",
			Group:        "predictions-2026-autumn-listening",
			MockType:     "predictions",
			Title:        "City innovation festival",
			Topic:        "Technology",
			QuestionType: "multiple_choice",
			Difficulty:   "hard",
			BandTarget:   "7.0",
			SortOrder:    3202,
			AudioScript:  "Presenter: The innovation festival used to take place in the town hall, but this year it has moved to the renovated riverside warehouse. Visitors can book workshops through the festival app, although printed schedules will still be available at the entrance.",
			Prompt:       "Where is the festival taking place this year?",
			Options:      []string{"In the town hall", "At the entrance", "In the riverside warehouse", "In the festival app"},
			Answer:       "In the riverside warehouse",
			Explanation:  "The presenter says it has moved to the renovated riverside warehouse.",
		},
	}
	addReadingListeningGroup("listening", listeningQuestions)

	questions = append(questions, buildExpandedIELTSQuestionSeed()...)

	return questions
}

func ieltsQuestionSeedKey(question models.IELTSQuestion) string {
	return fmt.Sprintf(
		"%s|%s|%s|%s|%s|%d",
		question.Section,
		question.MockType,
		question.ExamSet,
		question.QuestionGroup,
		question.QuestionType,
		question.SortOrder,
	)
}

type seedQuestion struct {
	ExamSet    string
	Group      string
	Title      string
	Topic      string
	Difficulty string
	BandTarget string
	Prompt     string
}

type seedSpeakingQuestion struct {
	ExamSet    string
	Group      string
	Title      string
	Topic      string
	Part       string
	Difficulty string
	BandTarget string
	Prompt     string
	Content    string
}

type seedObjectiveQuestion struct {
	ExamSet      string
	Group        string
	MockType     string
	Title        string
	Topic        string
	QuestionType string
	Difficulty   string
	BandTarget   string
	SortOrder    int
	Content      string
	AudioScript  string
	Prompt       string
	Options      []string
	Answer       string
	Explanation  string
}

func stringPtr(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}

func jsonString(value any) *string {
	if value == nil {
		return nil
	}
	data, err := json.Marshal(value)
	if err != nil {
		fallback := fmt.Sprintf("%v", value)
		return &fallback
	}
	encoded := string(data)
	return &encoded
}
