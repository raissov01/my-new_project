package database

import (
	"github.com/midoriya/flashlearn-backend/internal/models"
)

// buildListeningTestBank returns 120 IELTSQuestion records organised as 3
// complete IELTS Listening tests. Each test has 4 sections and 40 questions.
func buildListeningTestBank() []models.IELTSQuestion {
	questions := make([]models.IELTSQuestion, 0, 120)
	questions = append(questions, buildListeningTest1()...)
	questions = append(questions, buildListeningTest2()...)
	questions = append(questions, buildListeningTest3()...)
	return questions
}

// ---------------------------------------------------------------------------
// helper
// ---------------------------------------------------------------------------

func listeningOpts(items []string) *string {
	return jsonString(items)
}

// ===========================================================================
// TEST 1 — cambridge_style — Band 6.5 — medium
// ===========================================================================

func buildListeningTest1() []models.IELTSQuestion {
	const (
		examSet  = "cambridge-17-test-1"
		mockType = "cambridge_style"
		band     = "6.5"
		diff     = "medium"
		sortBase = 20000
	)
	bt := stringPtr(band)

	// -----------------------------------------------------------------------
	// Section 1 — Hotel Booking (dialogue)
	// -----------------------------------------------------------------------
	s1Title := "Hotel Booking Enquiry"
	s1Script := `Agent: Good morning, Riverside Hotel, how can I help you?
Customer: Good morning. I'd like to book a room for next month, please.
Agent: Of course. Could I start with your full name?
Customer: Yes, it's Patricia Hargrove. That's H-A-R-G-R-O-V-E.
Agent: Thank you, Ms Hargrove. And what dates were you thinking of?
Customer: I'd like to arrive on the fourteenth of March and check out on the eighteenth.
Agent: So that's four nights in total. Let me check availability. We have a standard double room on the third floor for one hundred and fifteen pounds per night, or a deluxe suite on the seventh floor for one hundred and eighty-five pounds per night.
Customer: I think the standard double will be fine. Does it have a view?
Agent: The standard rooms on the third floor face the garden courtyard, so you'll have a pleasant green view. The deluxe suites overlook the river.
Customer: The garden sounds lovely. I'll go with the standard double.
Agent: Excellent. Now, do you have any dietary requirements? We include a complimentary breakfast buffet each morning.
Customer: I'm vegetarian, so it would be helpful to know if there are options.
Agent: Absolutely. Our breakfast includes a full vegetarian selection with fresh fruit, pastries, eggs, and a variety of cereals. We also have a vegan corner with plant-based milk and yoghurt.
Customer: That's perfect. Could I also arrange an airport transfer? I'll be landing at Heathrow Terminal Five at half past two in the afternoon.
Agent: We do offer a shuttle service. The cost is forty-five pounds each way, or seventy-five pounds for a return trip. The journey from Heathrow usually takes about fifty minutes, depending on traffic.
Customer: I'll book the return trip then.
Agent: Very good. Could I take a contact number in case we need to reach you?
Customer: Sure, it's oh-seven-seven-zero-zero, nine-three-one, four-five-eight.
Agent: And an email address for the confirmation?
Customer: It's patricia.hargrove at mailfast dot co dot uk.
Agent: Wonderful. So to confirm: one standard double room, third floor, garden view, four nights from March the fourteenth to the eighteenth, at one hundred and fifteen pounds per night. Return airport shuttle at seventy-five pounds. The total comes to five hundred and thirty-five pounds. Shall I charge it to a credit card now or on arrival?
Customer: I'll pay on arrival, please. Oh, one more thing — is there parking available? I might rent a car for a day trip.
Agent: Yes, we have an underground car park. It's twelve pounds per day for hotel guests. You just collect a pass from reception.
Customer: Great, thank you for all your help.
Agent: You're welcome, Ms Hargrove. We'll send your confirmation email shortly. Have a wonderful day.`

	s1Content := stringPtr("Complete the booking form below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.")
	s1Audio := stringPtr(s1Script)

	s1Group := examSet + "-listening-section-1"

	s1 := []models.IELTSQuestion{
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Hotel Booking", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "Guest surname: ___", Content: s1Content, AudioScript: s1Audio, Options: nil, Answer: stringPtr("Hargrove"), Explanation: stringPtr("The customer spells out her surname: H-A-R-G-R-O-V-E."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 1},
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Hotel Booking", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "Check-in date: ___ of March", Content: s1Content, AudioScript: s1Audio, Options: nil, Answer: stringPtr("fourteenth"), Explanation: stringPtr("She says she wants to arrive on the fourteenth of March."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 2},
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Hotel Booking", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "Total number of nights: ___", Content: s1Content, AudioScript: s1Audio, Options: nil, Answer: stringPtr("four"), Explanation: stringPtr("The agent confirms 'four nights in total'."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 3},
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Hotel Booking", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "Room price per night: £___", Content: s1Content, AudioScript: s1Audio, Options: nil, Answer: stringPtr("115"), Explanation: stringPtr("The standard double room costs one hundred and fifteen pounds per night."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 4},
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Hotel Booking", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "The standard room overlooks the ___", Content: s1Content, AudioScript: s1Audio, Options: nil, Answer: stringPtr("garden courtyard"), Explanation: stringPtr("The agent says the standard rooms face the garden courtyard."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 5},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Hotel Booking", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "What dietary requirement does the customer mention?", Content: s1Content, AudioScript: s1Audio, Options: listeningOpts([]string{"A) Vegan", "B) Vegetarian", "C) Gluten-free", "D) Halal"}), Answer: stringPtr("B"), Explanation: stringPtr("The customer says 'I'm vegetarian'."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 6},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Hotel Booking", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "How much does the return airport shuttle cost?", Content: s1Content, AudioScript: s1Audio, Options: listeningOpts([]string{"A) £45", "B) £55", "C) £75", "D) £85"}), Answer: stringPtr("C"), Explanation: stringPtr("The agent says 'seventy-five pounds for a return trip'."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 7},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Hotel Booking", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "Which terminal does the customer arrive at?", Content: s1Content, AudioScript: s1Audio, Options: listeningOpts([]string{"A) Terminal Two", "B) Terminal Three", "C) Terminal Four", "D) Terminal Five"}), Answer: stringPtr("D"), Explanation: stringPtr("She says 'Heathrow Terminal Five'."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 8},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Hotel Booking", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "When will the customer pay for the booking?", Content: s1Content, AudioScript: s1Audio, Options: listeningOpts([]string{"A) Immediately by credit card", "B) On arrival", "C) At check-out", "D) By bank transfer"}), Answer: stringPtr("B"), Explanation: stringPtr("She says 'I'll pay on arrival, please'."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 9},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Hotel Booking", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "How much is the daily parking charge for hotel guests?", Content: s1Content, AudioScript: s1Audio, Options: listeningOpts([]string{"A) £8", "B) £10", "C) £12", "D) £15"}), Answer: stringPtr("C"), Explanation: stringPtr("The agent says 'twelve pounds per day for hotel guests'."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 10},
	}

	// -----------------------------------------------------------------------
	// Section 2 — Library Tour (monologue)
	// -----------------------------------------------------------------------
	s2Title := "Greenfield University Library Tour"
	s2Script := `Good afternoon, everyone, and welcome to the Greenfield University Library. My name is Sarah, and I'll be showing you around our facilities today. We have quite a lot to cover, so please save your questions until the end.

Let's start here in the main entrance hall. As you can see, we've recently renovated this area. The information desk is straight ahead of you and is staffed from eight in the morning until nine in the evening on weekdays. On weekends, the desk opens at ten and closes at six. If you need help outside those hours, there's an online chat service available through the library website twenty-four hours a day.

Now, if you turn to your left, you'll find the Short Loan Collection. These are high-demand textbooks that lecturers have put on reserve. You can borrow them for up to three days, and there's a fine of two pounds per day if they're returned late. Normal books from the main collection can be borrowed for up to twenty-one days with one renewal.

Moving through to the ground floor, we have the Periodicals Room on the right-hand side. This houses current issues of over four hundred academic journals. Back issues from before 2010 have been digitised and are available through the electronic database, which you can access using your student login.

Up the stairs or in the lift to the first floor, you'll find our group study rooms. There are twelve rooms in total, each seating between four and eight people. You need to book them online at least twenty-four hours in advance. Each room has a large wall-mounted screen, a whiteboard, and power outlets at every seat. These rooms are very popular during exam season, so book early.

The second floor is our quiet study zone. Absolutely no talking or phone use is permitted here. There are individual study carrels with desk lamps and USB charging points. We also have twenty desktop computers available on this floor for students who don't have their own laptops.

On the third floor, we've recently opened a Digital Media Lab. This space has high-specification computers with software for video editing, graphic design, and data analysis. You'll need to complete a short online induction before you can use the equipment. The induction takes about thirty minutes and is available on the library website.

Finally, don't forget our café on the ground floor, just past the main staircase. It's a great place to take a break. They serve excellent coffee and a range of sandwiches and snacks. You are allowed to bring covered drinks into the study areas, but no food, please.

One last thing — all new students receive five hundred pages of free printing credit for the semester. After that, it's five pence per black-and-white page and twenty pence per colour page. The printers are located on every floor next to the lift.

Right, let's head upstairs and I'll show you the group study rooms first.`

	s2Content := stringPtr("Choose the correct letter A, B, or C for questions 11-15. Match the locations in questions 16-20 with the correct floor.")
	s2Audio := stringPtr(s2Script)

	s2Group := examSet + "-listening-section-2"

	s2 := []models.IELTSQuestion{
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Library Tour", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "On weekdays, the information desk closes at", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) 6 pm", "B) 8 pm", "C) 9 pm"}), Answer: stringPtr("C"), Explanation: stringPtr("Sarah says the desk is staffed until nine in the evening on weekdays."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 11},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Library Tour", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "How long can Short Loan Collection books be borrowed for?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) One day", "B) Three days", "C) Seven days"}), Answer: stringPtr("B"), Explanation: stringPtr("She says 'You can borrow them for up to three days'."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 12},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Library Tour", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "What is the late fine for Short Loan Collection books?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) £1 per day", "B) £2 per day", "C) £5 per day"}), Answer: stringPtr("B"), Explanation: stringPtr("The fine is two pounds per day."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 13},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Library Tour", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "How many group study rooms are there?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) Eight", "B) Ten", "C) Twelve"}), Answer: stringPtr("C"), Explanation: stringPtr("Sarah says 'There are twelve rooms in total'."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 14},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Library Tour", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "How much free printing credit do new students receive?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) 200 pages", "B) 300 pages", "C) 500 pages"}), Answer: stringPtr("C"), Explanation: stringPtr("All new students receive five hundred pages of free printing."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 15},
		{Section: "listening", QuestionType: "matching", Difficulty: diff, MockType: mockType, Topic: "Library Tour", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "The Periodicals Room is located on which floor?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) Ground floor", "B) First floor", "C) Second floor", "D) Third floor"}), Answer: stringPtr("A"), Explanation: stringPtr("Sarah says 'Moving through to the ground floor, we have the Periodicals Room'."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 16},
		{Section: "listening", QuestionType: "matching", Difficulty: diff, MockType: mockType, Topic: "Library Tour", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "The group study rooms are on which floor?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) Ground floor", "B) First floor", "C) Second floor", "D) Third floor"}), Answer: stringPtr("B"), Explanation: stringPtr("She says 'Up the stairs or in the lift to the first floor, you'll find our group study rooms'."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 17},
		{Section: "listening", QuestionType: "matching", Difficulty: diff, MockType: mockType, Topic: "Library Tour", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "The quiet study zone is on which floor?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) Ground floor", "B) First floor", "C) Second floor", "D) Third floor"}), Answer: stringPtr("C"), Explanation: stringPtr("She says 'The second floor is our quiet study zone'."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 18},
		{Section: "listening", QuestionType: "matching", Difficulty: diff, MockType: mockType, Topic: "Library Tour", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "The Digital Media Lab is on which floor?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) Ground floor", "B) First floor", "C) Second floor", "D) Third floor"}), Answer: stringPtr("D"), Explanation: stringPtr("She says 'On the third floor, we've recently opened a Digital Media Lab'."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 19},
		{Section: "listening", QuestionType: "matching", Difficulty: diff, MockType: mockType, Topic: "Library Tour", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "The café is located on which floor?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) Ground floor", "B) First floor", "C) Second floor", "D) Third floor"}), Answer: stringPtr("A"), Explanation: stringPtr("She mentions 'our café on the ground floor, just past the main staircase'."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 20},
	}

	// -----------------------------------------------------------------------
	// Section 3 — Research Project Discussion (dialogue)
	// -----------------------------------------------------------------------
	s3Title := "Research Project Discussion"
	s3Script := `Tutor: Good afternoon, Priya and Nathan. Thanks for coming in to discuss your joint research project. Have you decided on your topic yet?
Priya: Yes, Professor Clarke. We've been going back and forth, but we've finally settled on the impact of social media on academic performance among undergraduate students.
Nathan: We considered looking at sleep patterns initially, but there's already a lot of published work on that, so we thought social media would give us more scope for original findings.
Tutor: That's a sensible choice. Social media is certainly topical. What methodology are you planning to use?
Priya: We'd like to use a mixed-methods approach. We'll start with an online questionnaire distributed to second-year students across three faculties: Business, Engineering, and Humanities.
Nathan: We're aiming for at least one hundred and fifty responses. The questionnaire will include both Likert-scale items and a few open-ended questions about how students perceive their own social media use during study time.
Tutor: Good. And the qualitative component?
Priya: We plan to run four focus groups with six to eight participants each. We'll select participants who reported very high or very low social media use in the questionnaire, so we can explore contrasting experiences in depth.
Nathan: We'll record the sessions and transcribe them for thematic analysis. Priya's done a module on qualitative coding, so she'll lead that part.
Tutor: That sounds well thought out. Now, what about your timeline? The final report is due on the fifteenth of May.
Nathan: We've mapped it out. We want to have the questionnaire designed and approved by the ethics committee before the end of February. Then we'll distribute it during the first two weeks of March.
Priya: By the end of March we should have all the quantitative data analysed. We'll run the focus groups in the first week of April, and then we'll need about three weeks for the qualitative analysis and writing up.
Tutor: That's tight but manageable. Make sure you leave time for proofreading. I've seen too many good projects let down by careless errors in the final draft. What statistical tests are you planning for the quantitative data?
Nathan: We'll use Pearson's correlation to look at the relationship between hours of social media use and grade point average. We might also run a regression analysis if the sample size allows it.
Tutor: Be careful with causation claims. Correlation doesn't imply that social media causes lower grades. There could be confounding variables such as part-time work or commuting time.
Priya: Absolutely. We'll include those as control variables in the regression model.
Tutor: Excellent. One more thing — have you considered the ethical implications? You'll be asking students about their academic performance, which is sensitive data.
Nathan: Yes, we've already drafted a consent form and a data protection statement. All responses will be anonymised, and we'll store the data on the university's secure server.
Tutor: Very thorough. I'm impressed with your planning. Let's schedule a follow-up meeting for the tenth of March to review the questionnaire before distribution.
Priya: That works for us. Thank you, Professor Clarke.`

	s3Content := stringPtr("Answer questions 21-30 based on the discussion between the tutor and two students about their research project.")
	s3Audio := stringPtr(s3Script)

	s3Group := examSet + "-listening-section-3"

	s3 := []models.IELTSQuestion{
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Research Project Discussion", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "What topic did the students finally choose for their project?", Content: s3Content, AudioScript: s3Audio, Options: listeningOpts([]string{"A) Sleep patterns among students", "B) Impact of social media on academic performance", "C) Effects of part-time work on grades", "D) Student mental health"}), Answer: stringPtr("B"), Explanation: stringPtr("Priya says they settled on 'the impact of social media on academic performance among undergraduate students'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 21},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Research Project Discussion", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "How many questionnaire responses do they aim for?", Content: s3Content, AudioScript: s3Audio, Options: listeningOpts([]string{"A) 100", "B) 120", "C) 150", "D) 200"}), Answer: stringPtr("C"), Explanation: stringPtr("Nathan says 'We're aiming for at least one hundred and fifty responses'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 22},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Research Project Discussion", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "How many faculties will be included in the survey?", Content: s3Content, AudioScript: s3Audio, Options: listeningOpts([]string{"A) Two", "B) Three", "C) Four", "D) Five"}), Answer: stringPtr("B"), Explanation: stringPtr("Priya mentions three faculties: Business, Engineering, and Humanities."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 23},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Research Project Discussion", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "Who will lead the qualitative coding process?", Content: s3Content, AudioScript: s3Audio, Options: listeningOpts([]string{"A) Nathan", "B) Professor Clarke", "C) Priya", "D) An external researcher"}), Answer: stringPtr("C"), Explanation: stringPtr("Nathan says 'Priya's done a module on qualitative coding, so she'll lead that part'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 24},
		{Section: "listening", QuestionType: "sentence_completion", Difficulty: diff, MockType: mockType, Topic: "Research Project Discussion", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "The final report must be submitted by the ___ of May.", Content: s3Content, AudioScript: s3Audio, Options: nil, Answer: stringPtr("fifteenth"), Explanation: stringPtr("The tutor says 'The final report is due on the fifteenth of May'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 25},
		{Section: "listening", QuestionType: "sentence_completion", Difficulty: diff, MockType: mockType, Topic: "Research Project Discussion", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "The questionnaire must be approved by the ___ before distribution.", Content: s3Content, AudioScript: s3Audio, Options: nil, Answer: stringPtr("ethics committee"), Explanation: stringPtr("Nathan says the questionnaire must be 'approved by the ethics committee'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 26},
		{Section: "listening", QuestionType: "sentence_completion", Difficulty: diff, MockType: mockType, Topic: "Research Project Discussion", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "For the quantitative data, they will use ___ correlation.", Content: s3Content, AudioScript: s3Audio, Options: nil, Answer: stringPtr("Pearson's"), Explanation: stringPtr("Nathan says 'We'll use Pearson's correlation'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 27},
		{Section: "listening", QuestionType: "matching", Difficulty: diff, MockType: mockType, Topic: "Research Project Discussion", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "Match: 'Designing and getting ethics approval for the questionnaire' happens during which month?", Content: s3Content, AudioScript: s3Audio, Options: listeningOpts([]string{"A) January", "B) February", "C) March", "D) April"}), Answer: stringPtr("B"), Explanation: stringPtr("Nathan says the questionnaire should be designed and approved 'before the end of February'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 28},
		{Section: "listening", QuestionType: "matching", Difficulty: diff, MockType: mockType, Topic: "Research Project Discussion", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "Match: 'Running the focus groups' takes place during which month?", Content: s3Content, AudioScript: s3Audio, Options: listeningOpts([]string{"A) February", "B) March", "C) April", "D) May"}), Answer: stringPtr("C"), Explanation: stringPtr("Priya says 'We'll run the focus groups in the first week of April'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 29},
		{Section: "listening", QuestionType: "matching", Difficulty: diff, MockType: mockType, Topic: "Research Project Discussion", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "Match: 'Distributing the questionnaire' takes place during which month?", Content: s3Content, AudioScript: s3Audio, Options: listeningOpts([]string{"A) February", "B) March", "C) April", "D) May"}), Answer: stringPtr("B"), Explanation: stringPtr("Nathan says they'll distribute it 'during the first two weeks of March'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 30},
	}

	// -----------------------------------------------------------------------
	// Section 4 — Marine Biology Lecture (monologue)
	// -----------------------------------------------------------------------
	s4Title := "Marine Biology: Coral Reef Ecosystems"
	s4Script := `Good morning, class. Today's lecture focuses on coral reef ecosystems and the growing threats they face. Coral reefs are often called the rainforests of the sea, and for good reason — although they cover less than one percent of the ocean floor, they support approximately twenty-five percent of all known marine species.

Let me begin with the basic biology. Corals are colonial animals belonging to the phylum Cnidaria, the same group that includes jellyfish and sea anemones. Each individual coral animal is called a polyp. These polyps secrete calcium carbonate to form a hard external skeleton, and over hundreds or even thousands of years, the accumulated skeletons build up into the massive structures we recognise as reefs.

The relationship between corals and microscopic algae called zooxanthellae is absolutely fundamental to reef health. These single-celled algae live inside the coral tissue and carry out photosynthesis, providing up to ninety percent of the coral's energy needs. In return, the coral provides the algae with shelter and access to sunlight. This mutualistic relationship is what allows reefs to thrive in nutrient-poor tropical waters.

Now, the most immediate threat to coral reefs worldwide is ocean warming. When water temperatures rise just one to two degrees Celsius above the normal summer maximum for a sustained period, corals expel their zooxanthellae. This process is known as coral bleaching because without the colourful algae, the white calcium carbonate skeleton becomes visible through the transparent tissue. If normal temperatures return within a few weeks, the corals can recover. However, prolonged or repeated bleaching events lead to coral death.

The Great Barrier Reef in Australia experienced mass bleaching events in 2016, 2017, and again in 2020. Scientists estimated that roughly half of the shallow-water corals on the reef were lost between 2016 and 2021. Similar devastation has been recorded in the Caribbean, the Indian Ocean, and Southeast Asia.

Ocean acidification is another serious concern. As the ocean absorbs carbon dioxide from the atmosphere, the pH of seawater decreases. Lower pH makes it harder for corals to build their calcium carbonate skeletons and can even dissolve existing structures. Research at the University of Queensland found that calcification rates on the Great Barrier Reef declined by fourteen percent between 1990 and 2009.

Local stressors compound these global pressures. Overfishing removes herbivorous fish that keep algae in check, allowing seaweed to overgrow and smother corals. Agricultural runoff introduces excess nitrogen and phosphorus, which fuels algal blooms and reduces water clarity. Coastal development destroys mangroves and seagrass beds that act as natural filters, increasing sediment loads on nearby reefs.

Conservation strategies must therefore operate on multiple scales. Globally, reducing greenhouse gas emissions remains the single most important action. Locally, establishing well-enforced marine protected areas, regulating fishing practices, and improving wastewater treatment can significantly enhance reef resilience. Coral restoration programmes, which involve growing coral fragments in nurseries and transplanting them onto degraded reefs, have shown promise in several pilot projects, though scaling up remains a challenge.

In our next session, we'll look at specific case studies of successful reef restoration in the Philippines and the Maldives.`

	s4Content := stringPtr("Complete the lecture notes below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.")
	s4Audio := stringPtr(s4Script)

	s4Group := examSet + "-listening-section-4"

	s4 := []models.IELTSQuestion{
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Marine Biology Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "Coral reefs support approximately ___ percent of all known marine species.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("twenty-five"), Explanation: stringPtr("The lecturer says reefs 'support approximately twenty-five percent of all known marine species'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 31},
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Marine Biology Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "Each individual coral animal is called a ___.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("polyp"), Explanation: stringPtr("The lecturer states 'Each individual coral animal is called a polyp'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 32},
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Marine Biology Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "Polyps secrete ___ to form a hard external skeleton.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("calcium carbonate"), Explanation: stringPtr("The lecture says polyps 'secrete calcium carbonate to form a hard external skeleton'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 33},
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Marine Biology Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "Zooxanthellae provide up to ___ percent of the coral's energy needs.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("ninety"), Explanation: stringPtr("The lecturer says algae provide 'up to ninety percent of the coral's energy needs'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 34},
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Marine Biology Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "The process of corals expelling their algae is known as coral ___.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("bleaching"), Explanation: stringPtr("The lecturer says 'This process is known as coral bleaching'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 35},
		{Section: "listening", QuestionType: "sentence_completion", Difficulty: diff, MockType: mockType, Topic: "Marine Biology Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "Roughly ___ of the shallow-water corals on the Great Barrier Reef were lost between 2016 and 2021.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("half"), Explanation: stringPtr("Scientists estimated that 'roughly half of the shallow-water corals' were lost."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 36},
		{Section: "listening", QuestionType: "sentence_completion", Difficulty: diff, MockType: mockType, Topic: "Marine Biology Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "Calcification rates on the Great Barrier Reef declined by ___ percent between 1990 and 2009.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("fourteen"), Explanation: stringPtr("The research found 'calcification rates declined by fourteen percent'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 37},
		{Section: "listening", QuestionType: "sentence_completion", Difficulty: diff, MockType: mockType, Topic: "Marine Biology Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "Overfishing removes ___ fish that normally keep algae in check.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("herbivorous"), Explanation: stringPtr("The lecturer says 'Overfishing removes herbivorous fish that keep algae in check'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 38},
		{Section: "listening", QuestionType: "sentence_completion", Difficulty: diff, MockType: mockType, Topic: "Marine Biology Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "Reducing ___ remains the single most important global conservation action.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("greenhouse gas emissions"), Explanation: stringPtr("The lecturer says 'reducing greenhouse gas emissions remains the single most important action'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 39},
		{Section: "listening", QuestionType: "sentence_completion", Difficulty: diff, MockType: mockType, Topic: "Marine Biology Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "Coral restoration involves growing coral fragments in ___ before transplanting.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("nurseries"), Explanation: stringPtr("The lecturer mentions 'growing coral fragments in nurseries and transplanting them'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 40},
	}

	questions := make([]models.IELTSQuestion, 0, 40)
	questions = append(questions, s1...)
	questions = append(questions, s2...)
	questions = append(questions, s3...)
	questions = append(questions, s4...)
	return questions
}

// ===========================================================================
// TEST 2 — cambridge_style — Band 7.0 — hard
// ===========================================================================

func buildListeningTest2() []models.IELTSQuestion {
	const (
		examSet  = "cambridge-17-test-2"
		mockType = "cambridge_style"
		band     = "7.0"
		diff     = "hard"
		sortBase = 21000
	)
	bt := stringPtr(band)

	// -----------------------------------------------------------------------
	// Section 1 — Gym Membership (dialogue)
	// -----------------------------------------------------------------------
	s1Title := "Gym Membership Registration"
	s1Script := `Receptionist: Welcome to FitLife Sports Centre. Are you interested in joining?
Customer: Yes, I've just moved to the area and I'm looking for a gym with a swimming pool.
Receptionist: You've come to the right place. We have a twenty-five-metre indoor pool, a fully equipped weights room, two fitness studios for classes, and a sauna and steam room. Could I take your name to start?
Customer: Sure. It's Daniel Kowalski. That's K-O-W-A-L-S-K-I.
Receptionist: Thank you, Daniel. And your date of birth?
Customer: The twenty-third of September, nineteen ninety-one.
Receptionist: Great. Now, we have three membership tiers. The Basic plan covers gym access only — no pool, no classes — for thirty-two pounds a month. The Standard plan includes the gym and pool for forty-seven pounds a month. And the Premium plan gives you everything — gym, pool, all classes, plus sauna and steam room — for sixty-five pounds a month.
Customer: I definitely want the pool. What kind of classes do you offer?
Receptionist: We run over forty classes a week. The most popular ones are spinning, yoga, body combat, and aqua aerobics. We've also recently added a high-intensity interval training class on Wednesday evenings and Saturday mornings.
Customer: That sounds great. I think I'll go with the Premium plan. Is there a joining fee?
Receptionist: There is, yes. Normally it's fifty pounds, but we're running a promotion this month so it's reduced to twenty-five pounds. You'll also need to pay the first month upfront, so your total today would be ninety pounds.
Customer: That's reasonable. Can I pay by debit card?
Receptionist: Absolutely. After today, the monthly payment will be taken by direct debit on the first of each month. Now, I just need your address for our records.
Customer: It's Flat 4B, seventeen Lancaster Road, Millfield. The postcode is MF3 7PQ.
Receptionist: Perfect. And a mobile number?
Customer: Oh-seven-eight-four-five, six-two-three, nine-one-seven.
Receptionist: Lovely. We do require all new members to attend a thirty-minute induction session with one of our trainers. This is free of charge and they'll show you how to use the equipment safely. The next available slot is this Thursday at half past six in the evening, or Saturday at ten in the morning.
Customer: Thursday evening works for me.
Receptionist: Excellent. You'll be with our trainer Marcus. Just come to reception ten minutes early and bring comfortable workout clothes and trainers. Oh, and you'll need to bring a padlock if you want to use the lockers. We don't supply them.
Customer: Good to know. One last question — what are the opening hours?
Receptionist: We're open from six in the morning until ten at night on weekdays, and from eight until eight at weekends. The pool closes thirty minutes before the centre.
Customer: Perfect. Thanks for all the information.
Receptionist: You're welcome, Daniel. See you on Thursday!`

	s1Content := stringPtr("Complete the membership form below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.")
	s1Audio := stringPtr(s1Script)

	s1Group := examSet + "-listening-section-1"

	s1 := []models.IELTSQuestion{
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Gym Membership", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "Customer's surname: ___", Content: s1Content, AudioScript: s1Audio, Options: nil, Answer: stringPtr("Kowalski"), Explanation: stringPtr("The customer spells out K-O-W-A-L-S-K-I."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 1},
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Gym Membership", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "Date of birth: 23 September ___", Content: s1Content, AudioScript: s1Audio, Options: nil, Answer: stringPtr("1991"), Explanation: stringPtr("He says 'nineteen ninety-one'."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 2},
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Gym Membership", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "Membership plan selected: ___", Content: s1Content, AudioScript: s1Audio, Options: nil, Answer: stringPtr("Premium"), Explanation: stringPtr("Daniel says 'I'll go with the Premium plan'."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 3},
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Gym Membership", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "Reduced joining fee: £___", Content: s1Content, AudioScript: s1Audio, Options: nil, Answer: stringPtr("25"), Explanation: stringPtr("The receptionist says the fee is 'reduced to twenty-five pounds'."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 4},
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Gym Membership", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "Postcode: ___", Content: s1Content, AudioScript: s1Audio, Options: nil, Answer: stringPtr("MF3 7PQ"), Explanation: stringPtr("Daniel gives the postcode MF3 7PQ."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 5},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Gym Membership", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "How much does the Standard plan cost per month?", Content: s1Content, AudioScript: s1Audio, Options: listeningOpts([]string{"A) £32", "B) £47", "C) £55", "D) £65"}), Answer: stringPtr("B"), Explanation: stringPtr("The Standard plan is forty-seven pounds a month."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 6},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Gym Membership", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "When is the HIIT class held? (Select one)", Content: s1Content, AudioScript: s1Audio, Options: listeningOpts([]string{"A) Monday and Friday evenings", "B) Tuesday and Thursday mornings", "C) Wednesday evenings and Saturday mornings", "D) Sunday mornings only"}), Answer: stringPtr("C"), Explanation: stringPtr("The receptionist says HIIT is on 'Wednesday evenings and Saturday mornings'."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 7},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Gym Membership", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "When is Daniel's induction session?", Content: s1Content, AudioScript: s1Audio, Options: listeningOpts([]string{"A) Thursday at 6:00 pm", "B) Thursday at 6:30 pm", "C) Saturday at 10:00 am", "D) Saturday at 10:30 am"}), Answer: stringPtr("B"), Explanation: stringPtr("The slot is 'this Thursday at half past six in the evening' and Daniel chooses it."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 8},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Gym Membership", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "What item must Daniel bring for the lockers?", Content: s1Content, AudioScript: s1Audio, Options: listeningOpts([]string{"A) A towel", "B) A membership card", "C) A padlock", "D) A deposit"}), Answer: stringPtr("C"), Explanation: stringPtr("The receptionist says 'you'll need to bring a padlock'."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 9},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Gym Membership", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "What time does the pool close on weekdays?", Content: s1Content, AudioScript: s1Audio, Options: listeningOpts([]string{"A) 9:00 pm", "B) 9:30 pm", "C) 10:00 pm", "D) 10:30 pm"}), Answer: stringPtr("B"), Explanation: stringPtr("The centre closes at 10 pm on weekdays and the pool closes thirty minutes before, so 9:30 pm."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 10},
	}

	// -----------------------------------------------------------------------
	// Section 2 — City Walking Tour (monologue)
	// -----------------------------------------------------------------------
	s2Title := "Whitbrook City Walking Tour"
	s2Script := `Hello, everyone, and welcome to the Whitbrook Heritage Walking Tour. My name is James, and I'll be your guide for the next two hours. We'll be covering about three kilometres on foot, so I hope you're wearing comfortable shoes.

We're starting here at Cathedral Square, which has been the heart of Whitbrook since the twelfth century. The cathedral behind me was begun in 1147 and took over eighty years to complete. Notice the rose window on the west front — it's one of the finest examples of early Gothic tracery in the country. The original glass was destroyed during the Civil War and replaced in 1662 with the current design by a Flemish glazier named Pieter van Holt.

If you look to the right, you'll see the Old Market Hall. It was built in 1583 as a covered trading space for wool merchants. Whitbrook was one of the wealthiest wool towns in England during the sixteenth century, and much of the architecture you'll see today reflects that prosperity. The building now houses a craft market on Saturdays and a farmers' market on the second Wednesday of each month.

We're going to walk down Merchant Street now. Notice the narrow passageways between the buildings. These are called ginnels locally, and they date back to the medieval period when they provided shortcuts between the main streets and the river wharves.

Our next stop is the River Whit. The stone bridge we're approaching was constructed in 1734 and replaced an earlier wooden structure that had been damaged by floods three times. If you look over the side, you might spot the original foundation stones of the medieval bridge about two metres below the current waterline. The bridge has five arches, each spanning approximately eight metres.

Across the bridge, we enter the Southbank district. This area was heavily industrialised during the nineteenth century. The large brick building on the left was the Whitbrook Textile Mill, which at its peak employed over six hundred workers. It closed in 1953 and stood derelict for decades before being converted into luxury apartments in 2008. The tall chimney has been preserved as a listed structure.

Continuing along the riverside path, you'll see the Whitbrook Playhouse on your right. This theatre was originally a grain warehouse built in 1801. It was converted into a performance space in 1976 by a local drama group with funding from the Arts Council. It now seats three hundred and fifty and hosts a mix of professional touring productions and community performances. The annual Whitbrook Shakespeare Festival in July is particularly popular and has been running for over thirty years.

Our final stop will be Victoria Park, which was laid out in 1897 to mark Queen Victoria's Diamond Jubilee. The park covers fourteen acres and features a Victorian bandstand, a boating lake, and formal gardens designed by the landscape architect Harold Peto.

Right, let's make our way down Merchant Street. Please stay together and watch your step on the cobblestones.`

	s2Content := stringPtr("Choose the correct answer for questions 11-15. Match the landmarks to the correct descriptions for questions 16-20.")
	s2Audio := stringPtr(s2Script)

	s2Group := examSet + "-listening-section-2"

	s2 := []models.IELTSQuestion{
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "City Walking Tour", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "When was the cathedral's construction started?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) 1066", "B) 1147", "C) 1200"}), Answer: stringPtr("B"), Explanation: stringPtr("James says the cathedral 'was begun in 1147'."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 11},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "City Walking Tour", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "Who designed the current rose window glass?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) A local craftsman", "B) A French artist", "C) A Flemish glazier named Pieter van Holt"}), Answer: stringPtr("C"), Explanation: stringPtr("James says it was 'replaced in 1662 with the current design by a Flemish glazier named Pieter van Holt'."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 12},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "City Walking Tour", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "What was the source of Whitbrook's wealth in the sixteenth century?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) Coal mining", "B) Wool trade", "C) Fishing"}), Answer: stringPtr("B"), Explanation: stringPtr("James says 'Whitbrook was one of the wealthiest wool towns in England during the sixteenth century'."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 13},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "City Walking Tour", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "How many workers did the Whitbrook Textile Mill employ at its peak?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) 400", "B) 500", "C) 600"}), Answer: stringPtr("C"), Explanation: stringPtr("The mill 'at its peak employed over six hundred workers'."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 14},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "City Walking Tour", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "How many people can the Whitbrook Playhouse seat?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) 250", "B) 300", "C) 350"}), Answer: stringPtr("C"), Explanation: stringPtr("It 'now seats three hundred and fifty'."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 15},
		{Section: "listening", QuestionType: "matching", Difficulty: diff, MockType: mockType, Topic: "City Walking Tour", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "Match: The Old Market Hall — What is it used for now?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) Luxury apartments", "B) Craft and farmers' markets", "C) Theatre performances", "D) Museum exhibitions"}), Answer: stringPtr("B"), Explanation: stringPtr("It 'now houses a craft market on Saturdays and a farmers' market'."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 16},
		{Section: "listening", QuestionType: "matching", Difficulty: diff, MockType: mockType, Topic: "City Walking Tour", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "Match: The Whitbrook Textile Mill — What is it used for now?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) Luxury apartments", "B) Craft and farmers' markets", "C) Theatre performances", "D) Museum exhibitions"}), Answer: stringPtr("A"), Explanation: stringPtr("It was 'converted into luxury apartments in 2008'."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 17},
		{Section: "listening", QuestionType: "matching", Difficulty: diff, MockType: mockType, Topic: "City Walking Tour", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "Match: The Whitbrook Playhouse — What was its original function?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) A church", "B) A school", "C) A grain warehouse", "D) A wool trading hall"}), Answer: stringPtr("C"), Explanation: stringPtr("James says 'This theatre was originally a grain warehouse built in 1801'."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 18},
		{Section: "listening", QuestionType: "matching", Difficulty: diff, MockType: mockType, Topic: "City Walking Tour", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "Match: The stone bridge — When was it constructed?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) 1583", "B) 1662", "C) 1734", "D) 1801"}), Answer: stringPtr("C"), Explanation: stringPtr("The stone bridge 'was constructed in 1734'."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 19},
		{Section: "listening", QuestionType: "matching", Difficulty: diff, MockType: mockType, Topic: "City Walking Tour", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "Match: Victoria Park — What year was it established?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) 1801", "B) 1897", "C) 1953", "D) 1976"}), Answer: stringPtr("B"), Explanation: stringPtr("The park 'was laid out in 1897 to mark Queen Victoria's Diamond Jubilee'."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 20},
	}

	// -----------------------------------------------------------------------
	// Section 3 — Group Presentation Planning (dialogue)
	// -----------------------------------------------------------------------
	s3Title := "Group Presentation Planning"
	s3Script := `Amy: OK, so we need to finalise our plan for the group presentation. It's worth thirty percent of our final grade, so we really can't afford to mess it up.
Leo: Agreed. The presentation is on the twenty-eighth of November, which gives us just under three weeks. Dr Patel said it should be twenty minutes long, plus five minutes for questions.
Mei: And we have to cover three aspects of renewable energy policy: government subsidies, public attitudes, and international comparisons. I suggest we each take one section.
Amy: That makes sense. I'd prefer to do the international comparisons part because I've already done some reading on the German and Scandinavian models for my essay last term.
Leo: Fine with me. I'll take government subsidies. I found a really detailed report from the Department of Energy that covers subsidies for solar, wind, and biomass over the last decade.
Mei: That leaves me with public attitudes, which I'm happy about. I've got access to some recent survey data from the British Social Attitudes Survey. I think I can create some interesting charts.
Amy: Great. Now, Dr Patel also mentioned that we need at least eight academic sources in total. I think we should aim for about three each and then share our reference lists so there's no overlap.
Leo: Good idea. Should we create a shared document for that?
Mei: I've already set one up on the university cloud drive. I'll send you both the link after this meeting.
Amy: Perfect. What about visual aids? I think we should have a consistent slide design so it looks professional.
Leo: I agree. How about we use the dark blue template from the university's branding toolkit? It's clean and easy to read.
Mei: Sounds good. I'd also suggest we limit each section to about five or six slides. That way we won't have too many to get through in twenty minutes.
Amy: Absolutely. And we should include a summary slide at the end with our key conclusions. I can put that together once everyone's sections are done.
Leo: We should also practise together at least once before the actual day. How about we do a run-through on the twenty-fifth of November? That gives us three days to make any final changes.
Mei: I can book one of the seminar rooms in the library for that. They have a projector and screen, so we can practise with the actual slides.
Amy: Excellent. One concern I have is the Q and A session. Dr Patel tends to ask quite challenging questions. Should we prepare some anticipated questions and divide them up?
Leo: Definitely. I'd suggest each person prepares three or four potential questions related to their section and shares them with the group.
Mei: And maybe we should also prepare one or two questions that cut across all three sections, in case she asks something more general about the overall direction of policy.
Amy: That's smart thinking. OK, so to summarise: each person prepares their section with five to six slides, contributes three academic sources, and writes three to four anticipated questions. We meet on the twenty-fifth for a full rehearsal. Mei sends the cloud drive link. Does everyone agree?
Leo: Sounds like a solid plan.
Mei: Agreed. Let's do this.`

	s3Content := stringPtr("Answer questions 21-30 based on the conversation between three students planning a group presentation on renewable energy policy.")
	s3Audio := stringPtr(s3Script)

	s3Group := examSet + "-listening-section-3"

	s3 := []models.IELTSQuestion{
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Group Presentation Planning", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "What percentage of the final grade does the presentation account for?", Content: s3Content, AudioScript: s3Audio, Options: listeningOpts([]string{"A) 20%", "B) 25%", "C) 30%", "D) 40%"}), Answer: stringPtr("C"), Explanation: stringPtr("Amy says 'It's worth thirty percent of our final grade'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 21},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Group Presentation Planning", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "How long should the presentation be, excluding questions?", Content: s3Content, AudioScript: s3Audio, Options: listeningOpts([]string{"A) 15 minutes", "B) 20 minutes", "C) 25 minutes", "D) 30 minutes"}), Answer: stringPtr("B"), Explanation: stringPtr("Leo says 'it should be twenty minutes long, plus five minutes for questions'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 22},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Group Presentation Planning", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "Which section does Amy choose?", Content: s3Content, AudioScript: s3Audio, Options: listeningOpts([]string{"A) Government subsidies", "B) Public attitudes", "C) International comparisons", "D) Environmental impact"}), Answer: stringPtr("C"), Explanation: stringPtr("Amy says 'I'd prefer to do the international comparisons part'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 23},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Group Presentation Planning", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "Where has Mei set up the shared document?", Content: s3Content, AudioScript: s3Audio, Options: listeningOpts([]string{"A) Google Drive", "B) The university cloud drive", "C) Dropbox", "D) A USB stick"}), Answer: stringPtr("B"), Explanation: stringPtr("Mei says 'I've already set one up on the university cloud drive'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 24},
		{Section: "listening", QuestionType: "sentence_completion", Difficulty: diff, MockType: mockType, Topic: "Group Presentation Planning", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "The group needs at least ___ academic sources in total.", Content: s3Content, AudioScript: s3Audio, Options: nil, Answer: stringPtr("eight"), Explanation: stringPtr("Amy says 'we need at least eight academic sources in total'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 25},
		{Section: "listening", QuestionType: "sentence_completion", Difficulty: diff, MockType: mockType, Topic: "Group Presentation Planning", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "Leo suggests using the ___ template from the university's branding toolkit.", Content: s3Content, AudioScript: s3Audio, Options: nil, Answer: stringPtr("dark blue"), Explanation: stringPtr("Leo says 'How about we use the dark blue template'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 26},
		{Section: "listening", QuestionType: "sentence_completion", Difficulty: diff, MockType: mockType, Topic: "Group Presentation Planning", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "Each section should be limited to about ___ slides.", Content: s3Content, AudioScript: s3Audio, Options: nil, Answer: stringPtr("five or six"), Explanation: stringPtr("Mei says 'we limit each section to about five or six slides'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 27},
		{Section: "listening", QuestionType: "matching", Difficulty: diff, MockType: mockType, Topic: "Group Presentation Planning", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "Match: Leo — which topic does he cover?", Content: s3Content, AudioScript: s3Audio, Options: listeningOpts([]string{"A) Government subsidies", "B) Public attitudes", "C) International comparisons"}), Answer: stringPtr("A"), Explanation: stringPtr("Leo says 'I'll take government subsidies'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 28},
		{Section: "listening", QuestionType: "matching", Difficulty: diff, MockType: mockType, Topic: "Group Presentation Planning", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "Match: Mei — which topic does she cover?", Content: s3Content, AudioScript: s3Audio, Options: listeningOpts([]string{"A) Government subsidies", "B) Public attitudes", "C) International comparisons"}), Answer: stringPtr("B"), Explanation: stringPtr("Mei says 'That leaves me with public attitudes, which I'm happy about'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 29},
		{Section: "listening", QuestionType: "matching", Difficulty: diff, MockType: mockType, Topic: "Group Presentation Planning", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "Match: The rehearsal — what date is it scheduled for?", Content: s3Content, AudioScript: s3Audio, Options: listeningOpts([]string{"A) 22nd November", "B) 25th November", "C) 28th November"}), Answer: stringPtr("B"), Explanation: stringPtr("Leo says 'How about we do a run-through on the twenty-fifth of November'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 30},
	}

	// -----------------------------------------------------------------------
	// Section 4 — Urban Planning Lecture (monologue)
	// -----------------------------------------------------------------------
	s4Title := "Urban Planning: Sustainable Cities"
	s4Script := `Welcome back, everyone. In today's lecture I want to explore the concept of sustainable urban planning, focusing on how cities around the world are rethinking transport, energy, and public space to meet the challenges of climate change and rapid population growth.

Let's begin with transport. Private car use is responsible for a significant share of urban carbon emissions. In many European cities, it accounts for roughly thirty percent of total greenhouse gas output. Consequently, reducing car dependency has become a priority. Copenhagen is frequently cited as a model. Over the past four decades, the city has invested heavily in cycling infrastructure, and today approximately forty-nine percent of all commutes in the city are made by bicycle. This was not an overnight change. It required dedicated cycle lanes separated from motor traffic, secure parking at transit stations, and a cultural shift supported by education campaigns in schools.

Bus rapid transit, or BRT, systems offer another cost-effective solution. Bogota's TransMilenio, launched in the year 2000, carries over two million passengers daily using dedicated bus lanes and pre-paid boarding stations. The system reduced average commute times by thirty-two percent in its first five years and cut carbon emissions along its corridors by approximately forty percent.

Turning to energy, district heating networks are gaining attention. In Helsinki, the city's district heating system supplies over ninety percent of buildings in the metropolitan area with heat generated from combined heat and power plants. The system is highly efficient because waste heat from electricity generation is captured and distributed through insulated underground pipes rather than being released into the atmosphere. Helsinki has set a target to become carbon neutral by 2035, and the transition from coal-fired heat to geothermal, waste-to-energy, and heat-pump technologies is central to that plan.

Solar energy integration into the built environment is another growing trend. Building-integrated photovoltaics, known as BIPV, allow solar cells to be incorporated into roof tiles, facades, and even windows. The International Energy Agency estimates that BIPV could supply up to sixty percent of a commercial building's electricity needs in regions with adequate sunlight. Freiburg, in southern Germany, has demonstrated this potential with its Sonnenschiff development, where solar rooftops generate more energy than the buildings consume, feeding the surplus back into the grid.

Public green space is the third pillar of sustainable urbanism. Singapore's approach is particularly instructive. The city-state adopted a comprehensive greening strategy in the nineteen sixties under the leadership of Prime Minister Lee Kuan Yew. Today, despite its high population density, Singapore has over three hundred parks connected by a network of green corridors. The Supertree structures in Gardens by the Bay combine vertical gardens with solar panels and rainwater collection, illustrating how green infrastructure can serve multiple functions simultaneously.

Research published in The Lancet Planetary Health found that increasing urban tree canopy by just ten percent can reduce ambient temperatures by up to one point five degrees Celsius during heatwaves, significantly lowering heat-related mortality.

In summary, sustainable urban planning requires integrated thinking across transport, energy, and green infrastructure. No single intervention is sufficient on its own, but when combined, these strategies can dramatically improve the liveability and environmental performance of our cities.`

	s4Content := stringPtr("Complete the notes below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.")
	s4Audio := stringPtr(s4Script)

	s4Group := examSet + "-listening-section-4"

	s4 := []models.IELTSQuestion{
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Urban Planning Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "In many European cities, private car use accounts for roughly ___ percent of total greenhouse gas output.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("thirty"), Explanation: stringPtr("The lecturer says it accounts for 'roughly thirty percent'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 31},
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Urban Planning Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "Approximately ___ percent of all commutes in Copenhagen are made by bicycle.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("forty-nine"), Explanation: stringPtr("The lecturer says 'approximately forty-nine percent of all commutes'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 32},
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Urban Planning Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "Bogota's TransMilenio carries over ___ passengers daily.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("two million"), Explanation: stringPtr("The system 'carries over two million passengers daily'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 33},
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Urban Planning Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "Helsinki's district heating system supplies over ___ percent of buildings.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("ninety"), Explanation: stringPtr("The system 'supplies over ninety percent of buildings in the metropolitan area'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 34},
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Urban Planning Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "Helsinki has set a target to become carbon neutral by ___.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("2035"), Explanation: stringPtr("Helsinki's target is 'to become carbon neutral by 2035'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 35},
		{Section: "listening", QuestionType: "sentence_completion", Difficulty: diff, MockType: mockType, Topic: "Urban Planning Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "Building-integrated photovoltaics are known by the abbreviation ___.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("BIPV"), Explanation: stringPtr("The lecturer says 'Building-integrated photovoltaics, known as BIPV'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 36},
		{Section: "listening", QuestionType: "sentence_completion", Difficulty: diff, MockType: mockType, Topic: "Urban Planning Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "The BIPV could supply up to ___ percent of a commercial building's electricity needs.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("sixty"), Explanation: stringPtr("The IEA estimates BIPV 'could supply up to sixty percent'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 37},
		{Section: "listening", QuestionType: "sentence_completion", Difficulty: diff, MockType: mockType, Topic: "Urban Planning Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "Singapore adopted its comprehensive greening strategy in the ___.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("nineteen sixties"), Explanation: stringPtr("Singapore 'adopted a comprehensive greening strategy in the nineteen sixties'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 38},
		{Section: "listening", QuestionType: "sentence_completion", Difficulty: diff, MockType: mockType, Topic: "Urban Planning Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "Singapore has over ___ parks connected by green corridors.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("three hundred"), Explanation: stringPtr("Singapore 'has over three hundred parks'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 39},
		{Section: "listening", QuestionType: "sentence_completion", Difficulty: diff, MockType: mockType, Topic: "Urban Planning Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "Increasing urban tree canopy by ten percent can reduce temperatures by up to ___ degrees Celsius.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("one point five"), Explanation: stringPtr("The research found it 'can reduce ambient temperatures by up to one point five degrees Celsius'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 40},
	}

	questions := make([]models.IELTSQuestion, 0, 40)
	questions = append(questions, s1...)
	questions = append(questions, s2...)
	questions = append(questions, s3...)
	questions = append(questions, s4...)
	return questions
}

// ===========================================================================
// TEST 3 — predictions — Band 6.5 — medium
// ===========================================================================

func buildListeningTest3() []models.IELTSQuestion {
	const (
		examSet  = "cambridge-17-test-3"
		mockType = "predictions"
		band     = "6.5"
		diff     = "medium"
		sortBase = 22000
	)
	bt := stringPtr(band)

	// -----------------------------------------------------------------------
	// Section 1 — Car Rental (dialogue)
	// -----------------------------------------------------------------------
	s1Title := "Car Rental Booking"
	s1Script := `Agent: Good afternoon, SunDrive Car Rentals, this is Laura speaking. How can I help?
Customer: Hi, I'd like to rent a car for a trip next week. I'll be picking it up in Bristol.
Agent: Certainly. When would you like to collect it?
Customer: On Monday the sixth of April, first thing in the morning if possible.
Agent: Our Bristol branch opens at half past seven. Would that suit you?
Customer: That's perfect. And I'd like to return it on Friday the tenth, late afternoon.
Agent: So that's five days. And where would you like to return it?
Customer: Can I drop it off at your Edinburgh branch?
Agent: Yes, we do offer one-way rentals. There's an additional charge of thirty-five pounds for a different return location. Now, could I take your name?
Customer: It's Thomas Beverley. That's B-E-V-E-R-L-E-Y.
Agent: Thank you, Mr Beverley. And may I have your driving licence number?
Customer: Yes, it's BEVER 709185 TH9AB.
Agent: Perfect. Now, what type of vehicle are you looking for? We have compact cars starting at thirty-nine pounds per day, mid-size saloons at fifty-two pounds per day, and SUVs at seventy-eight pounds per day.
Customer: I'll be driving through the Lake District with quite a bit of luggage, so I think a mid-size saloon would be best.
Agent: Good choice. The mid-size saloon is the Ford Mondeo or similar. It has a large boot and is comfortable for long drives. Your five days at fifty-two pounds per day comes to two hundred and sixty pounds, plus the one-way fee of thirty-five pounds, so two hundred and ninety-five pounds in total.
Customer: That's fine. Is insurance included?
Agent: Basic insurance with an excess of eight hundred pounds is included. If you'd like to reduce the excess to zero, our Premium Cover is fourteen pounds per day extra.
Customer: I think I'll take the Premium Cover just to be safe. What does that bring the total to?
Agent: That adds seventy pounds, so your new total is three hundred and sixty-five pounds.
Customer: Great. I'll go with that. Can I add a satellite navigation system as well?
Agent: Of course. Sat nav is five pounds per day, so that's an additional twenty-five pounds. Your final total is three hundred and ninety pounds.
Customer: Perfect. I'll pay when I collect the car. What documents do I need to bring?
Agent: You'll need your driving licence, a credit card in your name for the deposit, and a form of photo identification such as a passport. The deposit is two hundred pounds, which will be refunded when you return the vehicle undamaged.
Customer: Understood. And what's your fuel policy?
Agent: We operate a full-to-full policy. The car will be full when you collect it, and we ask you to return it full. If it's not full, we charge a refuelling fee of two pounds fifty per litre, which is above the pump price, so it's worth filling up before you drop it off.
Customer: Good to know. Thanks very much, Laura.
Agent: You're welcome, Mr Beverley. We'll see you on Monday morning in Bristol.`

	s1Content := stringPtr("Complete the car rental booking form. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.")
	s1Audio := stringPtr(s1Script)

	s1Group := examSet + "-listening-section-1"

	s1 := []models.IELTSQuestion{
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Car Rental", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "Customer surname: ___", Content: s1Content, AudioScript: s1Audio, Options: nil, Answer: stringPtr("Beverley"), Explanation: stringPtr("The customer spells B-E-V-E-R-L-E-Y."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 1},
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Car Rental", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "Pick-up date: ___ of April", Content: s1Content, AudioScript: s1Audio, Options: nil, Answer: stringPtr("sixth"), Explanation: stringPtr("He says 'Monday the sixth of April'."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 2},
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Car Rental", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "Drop-off location: ___", Content: s1Content, AudioScript: s1Audio, Options: nil, Answer: stringPtr("Edinburgh"), Explanation: stringPtr("He says 'Can I drop it off at your Edinburgh branch'."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 3},
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Car Rental", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "Vehicle type selected: ___", Content: s1Content, AudioScript: s1Audio, Options: nil, Answer: stringPtr("mid-size saloon"), Explanation: stringPtr("He says 'a mid-size saloon would be best'."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 4},
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Car Rental", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "Final total cost: £___", Content: s1Content, AudioScript: s1Audio, Options: nil, Answer: stringPtr("390"), Explanation: stringPtr("The agent confirms the final total is three hundred and ninety pounds."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 5},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Car Rental", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "What is the one-way rental surcharge?", Content: s1Content, AudioScript: s1Audio, Options: listeningOpts([]string{"A) £25", "B) £30", "C) £35", "D) £40"}), Answer: stringPtr("C"), Explanation: stringPtr("The agent says 'an additional charge of thirty-five pounds'."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 6},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Car Rental", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "What is the basic insurance excess?", Content: s1Content, AudioScript: s1Audio, Options: listeningOpts([]string{"A) £500", "B) £600", "C) £800", "D) £1000"}), Answer: stringPtr("C"), Explanation: stringPtr("Basic insurance has 'an excess of eight hundred pounds'."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 7},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Car Rental", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "What is the deposit amount?", Content: s1Content, AudioScript: s1Audio, Options: listeningOpts([]string{"A) £100", "B) £150", "C) £200", "D) £250"}), Answer: stringPtr("C"), Explanation: stringPtr("The deposit is 'two hundred pounds'."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 8},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Car Rental", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "What is the refuelling fee per litre if the tank is not full on return?", Content: s1Content, AudioScript: s1Audio, Options: listeningOpts([]string{"A) £1.50", "B) £2.00", "C) £2.50", "D) £3.00"}), Answer: stringPtr("C"), Explanation: stringPtr("The agent says 'a refuelling fee of two pounds fifty per litre'."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 9},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Car Rental", ExamSet: examSet, QuestionGroup: s1Group, Title: s1Title, Prompt: "What fuel policy does the company use?", Content: s1Content, AudioScript: s1Audio, Options: listeningOpts([]string{"A) Full-to-empty", "B) Full-to-full", "C) Same-to-same", "D) Pre-purchase"}), Answer: stringPtr("B"), Explanation: stringPtr("The agent says 'We operate a full-to-full policy'."), BandTarget: bt, PassageNumber: 1, SortOrder: sortBase + 10},
	}

	// -----------------------------------------------------------------------
	// Section 2 — Museum Exhibition Guide (monologue)
	// -----------------------------------------------------------------------
	s2Title := "Westfield Museum: Ancient Civilisations Exhibition"
	s2Script := `Good morning and welcome to the Westfield Museum. I'm Helen, and I'll be introducing our brand-new exhibition called Voices of the Ancient World, which opens to the public tomorrow but you're getting an exclusive preview today.

The exhibition is spread across six galleries on the first floor and traces the development of writing, art, and architecture from four major ancient civilisations: Mesopotamia, Egypt, the Indus Valley, and China. We've spent three years planning this exhibition and worked with over twenty partner museums and universities around the world to assemble the collection.

Let's start in Gallery One, which is dedicated to Mesopotamia. Here you'll find a collection of cuneiform tablets dating from approximately 3200 BCE. These are among the earliest known examples of written language. The centrepiece of this gallery is a clay tablet from the city of Uruk that records grain transactions — essentially an ancient receipt book. We've installed interactive touchscreens that allow visitors to try writing cuneiform using a digital stylus.

Gallery Two covers ancient Egypt. The highlight here is a painted wooden sarcophagus from the Twenty-First Dynasty, roughly 1000 BCE. It's on loan from the Cairo Museum and this is the first time it has been displayed outside Egypt. We also have a collection of papyrus scrolls, several gold amulets, and a scale model of the Temple of Karnak that took our design team six months to build.

Moving on to Gallery Three, we explore the Indus Valley civilisation. This is perhaps the least well-known of the four, yet it was remarkably advanced. The centrepiece here is a bronze figurine known as the Dancing Girl of Mohenjo-daro, dated to approximately 2500 BCE. We have a replica — the original is in the National Museum of Pakistan — but our replica was created using three-dimensional scanning technology and is accurate to within half a millimetre.

Gallery Four is devoted to ancient China. The star exhibit is a set of Shang Dynasty oracle bones from around 1200 BCE. These are turtle shells and animal bones inscribed with questions for the spirits. Visitors can use our augmented reality app to see translations of the inscriptions appear on their phone screens.

Gallery Five is our comparison gallery. Here we place objects from all four civilisations side by side to highlight similarities and differences in how they approached timekeeping, agriculture, and governance. One particularly fascinating display compares irrigation techniques across the four regions.

Finally, Gallery Six is our interactive workshop space. Every weekend during the exhibition, we're running hands-on activities for families, including pottery painting inspired by ancient designs, papyrus-making demonstrations, and a code-breaking challenge based on hieroglyphics. These sessions are free but must be booked in advance through our website as spaces are limited to fifteen per session.

The exhibition runs until the thirty-first of August. Adult tickets are twelve pounds, concessions are eight pounds, and children under twelve enter free. We also offer a family ticket for two adults and up to three children at twenty-eight pounds. I'd strongly recommend the audio guide, which is available in six languages for an extra three pounds.

Now, shall we head into Gallery One?`

	s2Content := stringPtr("Choose the correct answer for questions 11-15. Match the galleries to the correct exhibits for questions 16-20.")
	s2Audio := stringPtr(s2Script)

	s2Group := examSet + "-listening-section-2"

	s2 := []models.IELTSQuestion{
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Museum Exhibition Guide", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "How long did it take to plan the exhibition?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) One year", "B) Two years", "C) Three years"}), Answer: stringPtr("C"), Explanation: stringPtr("Helen says 'We've spent three years planning this exhibition'."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 11},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Museum Exhibition Guide", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "How many civilisations does the exhibition cover?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) Three", "B) Four", "C) Five"}), Answer: stringPtr("B"), Explanation: stringPtr("It covers 'four major ancient civilisations'."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 12},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Museum Exhibition Guide", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "How much is the adult ticket?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) £8", "B) £10", "C) £12"}), Answer: stringPtr("C"), Explanation: stringPtr("Helen says 'Adult tickets are twelve pounds'."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 13},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Museum Exhibition Guide", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "How many people can attend each workshop session?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) 10", "B) 15", "C) 20"}), Answer: stringPtr("B"), Explanation: stringPtr("Spaces are 'limited to fifteen per session'."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 14},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Museum Exhibition Guide", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "In how many languages is the audio guide available?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) Four", "B) Six", "C) Eight"}), Answer: stringPtr("B"), Explanation: stringPtr("The audio guide is 'available in six languages'."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 15},
		{Section: "listening", QuestionType: "matching", Difficulty: diff, MockType: mockType, Topic: "Museum Exhibition Guide", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "Match: Cuneiform tablets — which gallery?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) Gallery One", "B) Gallery Two", "C) Gallery Three", "D) Gallery Four", "E) Gallery Five"}), Answer: stringPtr("A"), Explanation: stringPtr("Gallery One is Mesopotamia, which has the cuneiform tablets."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 16},
		{Section: "listening", QuestionType: "matching", Difficulty: diff, MockType: mockType, Topic: "Museum Exhibition Guide", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "Match: Painted sarcophagus — which gallery?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) Gallery One", "B) Gallery Two", "C) Gallery Three", "D) Gallery Four", "E) Gallery Five"}), Answer: stringPtr("B"), Explanation: stringPtr("Gallery Two is Egypt, featuring the painted wooden sarcophagus."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 17},
		{Section: "listening", QuestionType: "matching", Difficulty: diff, MockType: mockType, Topic: "Museum Exhibition Guide", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "Match: Dancing Girl replica — which gallery?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) Gallery One", "B) Gallery Two", "C) Gallery Three", "D) Gallery Four", "E) Gallery Five"}), Answer: stringPtr("C"), Explanation: stringPtr("Gallery Three covers the Indus Valley and features the Dancing Girl of Mohenjo-daro."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 18},
		{Section: "listening", QuestionType: "matching", Difficulty: diff, MockType: mockType, Topic: "Museum Exhibition Guide", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "Match: Oracle bones — which gallery?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) Gallery One", "B) Gallery Two", "C) Gallery Three", "D) Gallery Four", "E) Gallery Five"}), Answer: stringPtr("D"), Explanation: stringPtr("Gallery Four is ancient China, featuring the Shang Dynasty oracle bones."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 19},
		{Section: "listening", QuestionType: "matching", Difficulty: diff, MockType: mockType, Topic: "Museum Exhibition Guide", ExamSet: examSet, QuestionGroup: s2Group, Title: s2Title, Prompt: "Match: Comparison of irrigation techniques — which gallery?", Content: s2Content, AudioScript: s2Audio, Options: listeningOpts([]string{"A) Gallery One", "B) Gallery Two", "C) Gallery Three", "D) Gallery Four", "E) Gallery Five"}), Answer: stringPtr("E"), Explanation: stringPtr("Gallery Five is the comparison gallery with irrigation technique displays."), BandTarget: bt, PassageNumber: 2, SortOrder: sortBase + 20},
	}

	// -----------------------------------------------------------------------
	// Section 3 — Thesis Supervision Meeting (dialogue)
	// -----------------------------------------------------------------------
	s3Title := "Thesis Supervision Meeting"
	s3Script := `Supervisor: Come in, Rosa. Take a seat. So, how has the thesis been going since our last meeting?
Rosa: Thank you, Dr Whitfield. Things have been progressing well, actually. I've finished the literature review chapter and I've made a good start on the methodology.
Supervisor: That's encouraging. I did read through the literature review you sent me last week. Overall, it's well structured, but I think you need to engage more critically with some of the sources. For example, you summarise Henderson's framework quite thoroughly, but you don't really evaluate its limitations.
Rosa: That's a fair point. I was worried about making the chapter too long. It's already at nine thousand words and the guideline is eight to ten thousand.
Supervisor: Length isn't the issue — depth is. You can probably tighten some of the descriptive sections to make room for more analysis. Try cutting the historical background by about five hundred words. That section is interesting but not essential to your argument.
Rosa: OK, I'll work on that. Moving on to the methodology — I've decided to use semi-structured interviews rather than a questionnaire. I think they'll give me richer data for a qualitative study.
Supervisor: I agree. How many participants are you planning to recruit?
Rosa: I'm aiming for between twelve and fifteen. They'll all be secondary school teachers with at least five years of experience in bilingual education programmes.
Supervisor: That's a reasonable sample for a qualitative study. Have you thought about how you'll select them?
Rosa: Yes, I'm going to use purposive sampling. I've already contacted three schools in the Birmingham area that run established bilingual programmes. The head teachers have agreed to circulate my call for participants.
Supervisor: Good. And your interview schedule — have you drafted that yet?
Rosa: I have a first draft with ten main questions. Each question has two or three follow-up prompts depending on the participant's initial response.
Supervisor: I'd like to see that draft. Could you email it to me by Friday? I want to check that the questions align well with your research objectives.
Rosa: Of course. I'll send it over tomorrow.
Supervisor: Now, what about your timeline? When is the full draft due?
Rosa: The university deadline for the complete thesis is the thirtieth of June. I want to have a full draft ready by the end of May so I have a month for revisions.
Supervisor: That's sensible. Let me suggest some milestones. Try to finish the revised literature review by the fifteenth of April. Complete your data collection by the end of April. Then you'll have the whole of May for analysis and writing up the findings and discussion chapters.
Rosa: That sounds manageable. The only thing I'm worried about is transcription. Twelve to fifteen interviews of around forty-five minutes each will produce a lot of audio.
Supervisor: Have you considered using transcription software? Tools like Otter or Descript can produce a rough transcript quite quickly, and then you just need to clean it up. It's not perfect, but it can save you a huge amount of time.
Rosa: I hadn't thought of that. I'll look into it. One more thing — I've been reading about reflexivity in qualitative research. Since I was a bilingual teacher myself before starting the PhD, I'm conscious that my own experiences might influence how I interpret the data.
Supervisor: That's an important awareness. I'd suggest keeping a reflective journal throughout your data collection and analysis. Note down your assumptions and any moments where your personal experience might be shaping your interpretation. You can then discuss this in the methodology chapter as part of your quality assurance strategy.
Rosa: That's really helpful advice. Thank you, Dr Whitfield.
Supervisor: You're welcome, Rosa. Let's meet again in two weeks to review the interview schedule and the revised literature review.`

	s3Content := stringPtr("Answer questions 21-30 based on the discussion between a PhD student and her supervisor about the thesis.")
	s3Audio := stringPtr(s3Script)

	s3Group := examSet + "-listening-section-3"

	s3 := []models.IELTSQuestion{
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Thesis Supervision Meeting", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "What does the supervisor think is missing from the literature review?", Content: s3Content, AudioScript: s3Audio, Options: listeningOpts([]string{"A) More sources", "B) More critical evaluation", "C) Better formatting", "D) More historical background"}), Answer: stringPtr("B"), Explanation: stringPtr("The supervisor says Rosa needs to 'engage more critically with some of the sources'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 21},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Thesis Supervision Meeting", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "What data collection method has Rosa chosen?", Content: s3Content, AudioScript: s3Audio, Options: listeningOpts([]string{"A) Questionnaires", "B) Observation", "C) Semi-structured interviews", "D) Focus groups"}), Answer: stringPtr("C"), Explanation: stringPtr("Rosa says 'I've decided to use semi-structured interviews'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 22},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Thesis Supervision Meeting", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "How many participants does Rosa plan to recruit?", Content: s3Content, AudioScript: s3Audio, Options: listeningOpts([]string{"A) 8-10", "B) 10-12", "C) 12-15", "D) 15-20"}), Answer: stringPtr("C"), Explanation: stringPtr("Rosa says 'I'm aiming for between twelve and fifteen'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 23},
		{Section: "listening", QuestionType: "multiple_choice", Difficulty: diff, MockType: mockType, Topic: "Thesis Supervision Meeting", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "What sampling method will Rosa use?", Content: s3Content, AudioScript: s3Audio, Options: listeningOpts([]string{"A) Random sampling", "B) Stratified sampling", "C) Purposive sampling", "D) Snowball sampling"}), Answer: stringPtr("C"), Explanation: stringPtr("Rosa says 'I'm going to use purposive sampling'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 24},
		{Section: "listening", QuestionType: "sentence_completion", Difficulty: diff, MockType: mockType, Topic: "Thesis Supervision Meeting", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "The university deadline for the complete thesis is the ___ of June.", Content: s3Content, AudioScript: s3Audio, Options: nil, Answer: stringPtr("thirtieth"), Explanation: stringPtr("Rosa says the deadline is 'the thirtieth of June'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 25},
		{Section: "listening", QuestionType: "sentence_completion", Difficulty: diff, MockType: mockType, Topic: "Thesis Supervision Meeting", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "The supervisor suggests Rosa should finish the revised literature review by the ___ of April.", Content: s3Content, AudioScript: s3Audio, Options: nil, Answer: stringPtr("fifteenth"), Explanation: stringPtr("The supervisor says 'finish the revised literature review by the fifteenth of April'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 26},
		{Section: "listening", QuestionType: "sentence_completion", Difficulty: diff, MockType: mockType, Topic: "Thesis Supervision Meeting", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "The supervisor recommends keeping a ___ throughout data collection and analysis.", Content: s3Content, AudioScript: s3Audio, Options: nil, Answer: stringPtr("reflective journal"), Explanation: stringPtr("The supervisor says 'I'd suggest keeping a reflective journal'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 27},
		{Section: "listening", QuestionType: "matching", Difficulty: diff, MockType: mockType, Topic: "Thesis Supervision Meeting", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "Match: 'Data collection should be completed' — by when?", Content: s3Content, AudioScript: s3Audio, Options: listeningOpts([]string{"A) End of March", "B) 15th of April", "C) End of April", "D) End of May"}), Answer: stringPtr("C"), Explanation: stringPtr("The supervisor says 'Complete your data collection by the end of April'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 28},
		{Section: "listening", QuestionType: "matching", Difficulty: diff, MockType: mockType, Topic: "Thesis Supervision Meeting", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "Match: 'Analysis and writing the findings' — which period?", Content: s3Content, AudioScript: s3Audio, Options: listeningOpts([]string{"A) April", "B) May", "C) June", "D) July"}), Answer: stringPtr("B"), Explanation: stringPtr("The supervisor says 'you'll have the whole of May for analysis and writing up the findings'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 29},
		{Section: "listening", QuestionType: "matching", Difficulty: diff, MockType: mockType, Topic: "Thesis Supervision Meeting", ExamSet: examSet, QuestionGroup: s3Group, Title: s3Title, Prompt: "Match: 'Having a full draft ready' — by when?", Content: s3Content, AudioScript: s3Audio, Options: listeningOpts([]string{"A) End of April", "B) End of May", "C) 15th of June", "D) End of June"}), Answer: stringPtr("B"), Explanation: stringPtr("Rosa says 'I want to have a full draft ready by the end of May'."), BandTarget: bt, PassageNumber: 3, SortOrder: sortBase + 30},
	}

	// -----------------------------------------------------------------------
	// Section 4 — Climate Change Lecture (monologue)
	// -----------------------------------------------------------------------
	s4Title := "Climate Change: Impacts and Adaptation"
	s4Script := `Good afternoon. In this final lecture of the series, I want to bring together what we've learned about climate change by examining its observed impacts and the adaptation strategies that communities around the world are adopting.

Let's start with the headline figures. According to the Intergovernmental Panel on Climate Change, global average surface temperature has increased by approximately one point one degrees Celsius since the pre-industrial era. This may sound modest, but the consequences have been far-reaching. Arctic sea ice extent has declined by roughly thirteen percent per decade since satellite measurements began in 1979. Globally, sea levels have risen by about twenty centimetres over the past century, and the rate of rise is accelerating.

The agricultural sector is among the most vulnerable. Crop yields for staple grains such as wheat, maize, and rice are projected to decline by between five and fifteen percent for every degree of warming above pre-industrial levels. In sub-Saharan Africa, where agriculture employs approximately sixty percent of the workforce, even small yield reductions can have devastating consequences for food security. A study in the journal Nature Food estimated that climate change has already reduced agricultural productivity on the continent by thirty-four percent compared to what it would have been without warming.

Water resources present another critical challenge. The Himalayas, often called the Third Pole, contain the largest store of ice outside the Arctic and Antarctic. Glacial meltwater feeds ten major river systems, including the Ganges, the Indus, and the Yangtze, which together provide freshwater for nearly two billion people. Research published in Science in 2019 found that Himalayan glaciers are melting at twice the rate they were before the year 2000. In the short term, this accelerated melting increases river flow and flood risk. In the longer term, as glaciers shrink, dry-season water supplies will decline significantly.

Coastal communities face the dual threat of sea-level rise and intensifying storm surges. The Netherlands has long been a global leader in coastal defence, with its system of dykes, storm surge barriers, and managed retreat zones protecting a country where roughly a quarter of the land lies below sea level. The Delta Works programme, completed in 1997, is one of the largest engineering projects in history and has been widely studied as a model for other low-lying nations.

Bangladesh, by contrast, has adopted a combination of engineered and nature-based solutions. The country has invested in raising homesteads on earthen mounds, constructing cyclone shelters that can accommodate several thousand people each, and restoring mangrove forests along the coast. Mangroves act as a natural buffer against storm surges and can reduce wave energy by up to seventy-five percent. A study in the journal Global Environmental Change found that villages protected by mangrove belts experienced forty percent fewer deaths during Cyclone Sidr in 2007 compared to unprotected communities.

In urban areas, heat adaptation is becoming a priority. Paris launched its Cool Streets programme after the deadly heatwave of 2003, which caused nearly fifteen thousand excess deaths in France. The programme includes expanding urban tree cover, installing public drinking fountains, and opening cool rooms in public buildings during extreme heat events.

To conclude, while the impacts of climate change are already being felt across every continent, the examples I've discussed today show that effective adaptation is possible. The key is to combine scientific understanding with local knowledge, invest in both infrastructure and ecosystems, and plan for the long term.`

	s4Content := stringPtr("Complete the lecture notes below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.")
	s4Audio := stringPtr(s4Script)

	s4Group := examSet + "-listening-section-4"

	s4 := []models.IELTSQuestion{
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Climate Change Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "Global average surface temperature has increased by approximately ___ degrees Celsius since the pre-industrial era.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("one point one"), Explanation: stringPtr("The lecturer says 'approximately one point one degrees Celsius'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 31},
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Climate Change Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "Arctic sea ice extent has declined by roughly ___ percent per decade.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("thirteen"), Explanation: stringPtr("The lecturer says 'declined by roughly thirteen percent per decade'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 32},
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Climate Change Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "Sea levels have risen by about ___ over the past century.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("twenty centimetres"), Explanation: stringPtr("The lecturer says 'sea levels have risen by about twenty centimetres'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 33},
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Climate Change Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "In sub-Saharan Africa, agriculture employs approximately ___ percent of the workforce.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("sixty"), Explanation: stringPtr("Agriculture 'employs approximately sixty percent of the workforce'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 34},
		{Section: "listening", QuestionType: "fill_blank", Difficulty: diff, MockType: mockType, Topic: "Climate Change Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "Climate change has reduced agricultural productivity in Africa by ___ percent.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("thirty-four"), Explanation: stringPtr("Productivity was 'reduced by thirty-four percent'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 35},
		{Section: "listening", QuestionType: "sentence_completion", Difficulty: diff, MockType: mockType, Topic: "Climate Change Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "Glacial meltwater from the Himalayas provides freshwater for nearly ___ people.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("two billion"), Explanation: stringPtr("The rivers 'provide freshwater for nearly two billion people'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 36},
		{Section: "listening", QuestionType: "sentence_completion", Difficulty: diff, MockType: mockType, Topic: "Climate Change Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "Mangroves can reduce wave energy by up to ___ percent.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("seventy-five"), Explanation: stringPtr("Mangroves 'can reduce wave energy by up to seventy-five percent'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 37},
		{Section: "listening", QuestionType: "sentence_completion", Difficulty: diff, MockType: mockType, Topic: "Climate Change Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "The Delta Works programme in the Netherlands was completed in ___.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("1997"), Explanation: stringPtr("The Delta Works programme was 'completed in 1997'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 38},
		{Section: "listening", QuestionType: "sentence_completion", Difficulty: diff, MockType: mockType, Topic: "Climate Change Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "The deadly heatwave in France in 2003 caused nearly ___ excess deaths.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("fifteen thousand"), Explanation: stringPtr("The heatwave 'caused nearly fifteen thousand excess deaths in France'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 39},
		{Section: "listening", QuestionType: "sentence_completion", Difficulty: diff, MockType: mockType, Topic: "Climate Change Lecture", ExamSet: examSet, QuestionGroup: s4Group, Title: s4Title, Prompt: "Villages protected by mangrove belts experienced ___ percent fewer deaths during Cyclone Sidr.", Content: s4Content, AudioScript: s4Audio, Options: nil, Answer: stringPtr("forty"), Explanation: stringPtr("Villages 'experienced forty percent fewer deaths during Cyclone Sidr'."), BandTarget: bt, PassageNumber: 4, SortOrder: sortBase + 40},
	}

	questions := make([]models.IELTSQuestion, 0, 40)
	questions = append(questions, s1...)
	questions = append(questions, s2...)
	questions = append(questions, s3...)
	questions = append(questions, s4...)
	return questions
}
