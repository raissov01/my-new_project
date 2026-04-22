package handler

import "fmt"

// PlacementQuestion is a single placement test question (internal format).
type PlacementQuestion struct {
	ID          int      `json:"id"`
	Level       string   `json:"level"`
	Section     string   `json:"section"` // "vocabulary" or "grammar"
	Question    string   `json:"question"`
	Options     []string `json:"options"`
	Correct     int      `json:"correct"` // 0-indexed
	Explanation string   `json:"explanation"`
}

// PlacementOption is an answer choice with a stable string ID.
type PlacementOption struct {
	ID   string `json:"id"`
	Text string `json:"text"`
}

// EnrichedPlacementQuestion is sent to the frontend. Options carry
// stable string IDs so correctOptionId stays valid even after shuffling.
type EnrichedPlacementQuestion struct {
	ID              string            `json:"id"`
	Level           string            `json:"level"`
	Category        string            `json:"category"` // "vocabulary" | "grammar"
	Prompt          string            `json:"prompt"`
	Options         []PlacementOption `json:"options"`
	CorrectOptionID string            `json:"correctOptionId"`
	Explanation     string            `json:"explanation,omitempty"`
}

// getEnrichedPlacementQuestions converts the static bank to the enriched format.
func getEnrichedPlacementQuestions() []EnrichedPlacementQuestion {
	out := make([]EnrichedPlacementQuestion, len(staticPlacementQuestions))
	for i, q := range staticPlacementQuestions {
		opts := make([]PlacementOption, len(q.Options))
		var correctID string
		for j, text := range q.Options {
			id := fmt.Sprintf("q%d-opt%d", q.ID, j)
			opts[j] = PlacementOption{ID: id, Text: text}
			if j == q.Correct {
				correctID = id
			}
		}
		out[i] = EnrichedPlacementQuestion{
			ID:              fmt.Sprintf("%d", q.ID),
			Level:           q.Level,
			Category:        q.Section,
			Prompt:          q.Question,
			Options:         opts,
			CorrectOptionID: correctID,
			Explanation:     q.Explanation,
		}
	}
	return out
}

// staticPlacementQuestions contains 60 curated, real English proficiency questions.
// 30 vocabulary + 30 grammar, 5 of each per level (A1-C2).
var staticPlacementQuestions = []PlacementQuestion{
	// ═══════════════════════════════════════════════════════════
	// A1 — VOCABULARY (5)
	// ═══════════════════════════════════════════════════════════
	{ID: 1, Level: "A1", Section: "vocabulary", Question: "What is the opposite of 'hot'?", Options: []string{"cold", "warm", "big", "fast"}, Correct: 0, Explanation: "'Cold' is the opposite of 'hot'."},
	{ID: 2, Level: "A1", Section: "vocabulary", Question: "Which word means 'a place where you sleep'?", Options: []string{"kitchen", "bedroom", "garden", "office"}, Correct: 1, Explanation: "A 'bedroom' is a room for sleeping."},
	{ID: 3, Level: "A1", Section: "vocabulary", Question: "What do you use to write?", Options: []string{"a chair", "a pen", "a plate", "a shoe"}, Correct: 1, Explanation: "A 'pen' is used for writing."},
	{ID: 4, Level: "A1", Section: "vocabulary", Question: "Which is a colour?", Options: []string{"happy", "table", "blue", "run"}, Correct: 2, Explanation: "'Blue' is a colour."},
	{ID: 5, Level: "A1", Section: "vocabulary", Question: "What is 'breakfast'?", Options: []string{"a meal in the morning", "a type of sport", "a piece of furniture", "a kind of animal"}, Correct: 0, Explanation: "Breakfast is the first meal of the day, eaten in the morning."},

	// A1 — GRAMMAR (5)
	{ID: 6, Level: "A1", Section: "grammar", Question: "She ___ a student.", Options: []string{"am", "is", "are", "be"}, Correct: 1, Explanation: "'Is' is used with he/she/it in present simple of 'to be'."},
	{ID: 7, Level: "A1", Section: "grammar", Question: "They ___ from Japan.", Options: []string{"is", "am", "are", "be"}, Correct: 2, Explanation: "'Are' is used with 'they' in present simple of 'to be'."},
	{ID: 8, Level: "A1", Section: "grammar", Question: "I have ___ apple.", Options: []string{"a", "an", "the", "—"}, Correct: 1, Explanation: "'An' is used before words starting with a vowel sound."},
	{ID: 9, Level: "A1", Section: "grammar", Question: "___ you like coffee?", Options: []string{"Does", "Do", "Is", "Are"}, Correct: 1, Explanation: "'Do' is used with 'you' to form questions in present simple."},
	{ID: 10, Level: "A1", Section: "grammar", Question: "She ___ to school every day.", Options: []string{"go", "goes", "going", "gone"}, Correct: 1, Explanation: "Third person singular (she) takes 'goes' in present simple."},

	// ═══════════════════════════════════════════════════════════
	// A2 — VOCABULARY (5)
	// ═══════════════════════════════════════════════════════════
	{ID: 11, Level: "A2", Section: "vocabulary", Question: "If you feel 'exhausted', you feel very ___.", Options: []string{"hungry", "tired", "angry", "excited"}, Correct: 1, Explanation: "'Exhausted' means extremely tired."},
	{ID: 12, Level: "A2", Section: "vocabulary", Question: "A 'colleague' is someone you ___.", Options: []string{"live with", "study with", "work with", "play with"}, Correct: 2, Explanation: "A 'colleague' is a person you work with."},
	{ID: 13, Level: "A2", Section: "vocabulary", Question: "To 'postpone' something means to ___.", Options: []string{"cancel it", "delay it", "forget it", "finish it"}, Correct: 1, Explanation: "'Postpone' means to delay or move to a later time."},
	{ID: 14, Level: "A2", Section: "vocabulary", Question: "Which word describes the weather when water falls from clouds?", Options: []string{"sunny", "windy", "rainy", "cloudy"}, Correct: 2, Explanation: "'Rainy' describes weather when rain falls."},
	{ID: 15, Level: "A2", Section: "vocabulary", Question: "A 'receipt' is something you get when you ___.", Options: []string{"cook food", "buy something", "take a bus", "read a book"}, Correct: 1, Explanation: "A 'receipt' is proof of purchase."},

	// A2 — GRAMMAR (5)
	{ID: 16, Level: "A2", Section: "grammar", Question: "I ___ to the cinema yesterday.", Options: []string{"go", "went", "gone", "going"}, Correct: 1, Explanation: "'Went' is the past simple of 'go'."},
	{ID: 17, Level: "A2", Section: "grammar", Question: "She is ___ than her sister.", Options: []string{"tall", "taller", "tallest", "more tall"}, Correct: 1, Explanation: "Comparative form of short adjectives: add '-er'."},
	{ID: 18, Level: "A2", Section: "grammar", Question: "There ___ any milk in the fridge.", Options: []string{"isn't", "aren't", "don't", "doesn't"}, Correct: 0, Explanation: "'Isn't' is used with uncountable nouns like 'milk'."},
	{ID: 19, Level: "A2", Section: "grammar", Question: "I ___ TV when the phone rang.", Options: []string{"watch", "watched", "was watching", "have watched"}, Correct: 2, Explanation: "Past continuous ('was watching') for interrupted actions."},
	{ID: 20, Level: "A2", Section: "grammar", Question: "We ___ to Paris next summer.", Options: []string{"going", "will go", "go", "goes"}, Correct: 1, Explanation: "'Will go' expresses a future plan/decision."},

	// ═══════════════════════════════════════════════════════════
	// B1 — VOCABULARY (5)
	// ═══════════════════════════════════════════════════════════
	{ID: 21, Level: "B1", Section: "vocabulary", Question: "To 'commute' means to ___.", Options: []string{"travel regularly between home and work", "change your mind about something", "communicate by phone", "study at university"}, Correct: 0, Explanation: "'Commute' means to travel regularly to and from work."},
	{ID: 22, Level: "B1", Section: "vocabulary", Question: "'Approximately' means ___.", Options: []string{"exactly", "roughly", "definitely", "rarely"}, Correct: 1, Explanation: "'Approximately' means roughly or about, not exactly."},
	{ID: 23, Level: "B1", Section: "vocabulary", Question: "If a product is 'affordable', it ___.", Options: []string{"is very expensive", "is not too expensive", "is free", "is rare"}, Correct: 1, Explanation: "'Affordable' means reasonably priced, not too expensive."},
	{ID: 24, Level: "B1", Section: "vocabulary", Question: "A 'drawback' is ___.", Options: []string{"an advantage", "a disadvantage", "a surprise", "a solution"}, Correct: 1, Explanation: "A 'drawback' means a disadvantage or negative aspect."},
	{ID: 25, Level: "B1", Section: "vocabulary", Question: "To 'emphasise' something means to ___.", Options: []string{"ignore it", "hide it", "stress it", "reduce it"}, Correct: 2, Explanation: "'Emphasise' means to give special importance or stress to something."},

	// B1 — GRAMMAR (5)
	{ID: 26, Level: "B1", Section: "grammar", Question: "I have ___ finished my homework.", Options: []string{"yet", "already", "still", "since"}, Correct: 1, Explanation: "'Already' is used in affirmative present perfect sentences."},
	{ID: 27, Level: "B1", Section: "grammar", Question: "If I ___ enough money, I would buy a car.", Options: []string{"have", "had", "has", "having"}, Correct: 1, Explanation: "Second conditional: If + past simple, would + infinitive."},
	{ID: 28, Level: "B1", Section: "grammar", Question: "The book ___ by millions of people.", Options: []string{"has read", "has been read", "have read", "have been read"}, Correct: 1, Explanation: "Present perfect passive: has/have + been + past participle."},
	{ID: 29, Level: "B1", Section: "grammar", Question: "She asked me where I ___.", Options: []string{"live", "lived", "living", "am live"}, Correct: 1, Explanation: "Reported speech: present simple changes to past simple."},
	{ID: 30, Level: "B1", Section: "grammar", Question: "I wish I ___ speak French.", Options: []string{"can", "could", "will", "may"}, Correct: 1, Explanation: "'Wish + could' expresses a desire for an ability you don't have."},

	// ═══════════════════════════════════════════════════════════
	// B2 — VOCABULARY (5)
	// ═══════════════════════════════════════════════════════════
	{ID: 31, Level: "B2", Section: "vocabulary", Question: "A 'substantial' amount means ___.", Options: []string{"a tiny amount", "a large amount", "an unknown amount", "an equal amount"}, Correct: 1, Explanation: "'Substantial' means considerable or large in size/amount."},
	{ID: 32, Level: "B2", Section: "vocabulary", Question: "To 'allocate' resources means to ___.", Options: []string{"waste them", "distribute them for a purpose", "collect them", "destroy them"}, Correct: 1, Explanation: "'Allocate' means to distribute or assign for a specific purpose."},
	{ID: 33, Level: "B2", Section: "vocabulary", Question: "'Unprecedented' means ___.", Options: []string{"expected", "never happened before", "very common", "well-known"}, Correct: 1, Explanation: "'Unprecedented' means never done or experienced before."},
	{ID: 34, Level: "B2", Section: "vocabulary", Question: "A 'comprehensive' study is one that is ___.", Options: []string{"very short", "complete and thorough", "poorly written", "out of date"}, Correct: 1, Explanation: "'Comprehensive' means complete, including all elements."},
	{ID: 35, Level: "B2", Section: "vocabulary", Question: "To 'deteriorate' means to ___.", Options: []string{"improve gradually", "get worse over time", "stay the same", "disappear suddenly"}, Correct: 1, Explanation: "'Deteriorate' means to become progressively worse."},

	// B2 — GRAMMAR (5)
	{ID: 36, Level: "B2", Section: "grammar", Question: "Not only ___ the exam, but she also got the highest score.", Options: []string{"she passed", "did she pass", "she did pass", "passed she"}, Correct: 1, Explanation: "'Not only' at the start requires inversion: did + subject + verb."},
	{ID: 37, Level: "B2", Section: "grammar", Question: "Had I known about the delay, I ___ earlier.", Options: []string{"would leave", "would have left", "will leave", "had left"}, Correct: 1, Explanation: "Third conditional (inverted): Had + subject, would have + past participle."},
	{ID: 38, Level: "B2", Section: "grammar", Question: "The report ___ by the time the meeting starts.", Options: []string{"will finish", "will be finished", "will have been finished", "is finished"}, Correct: 2, Explanation: "Future perfect passive: will have been + past participle."},
	{ID: 39, Level: "B2", Section: "grammar", Question: "It's high time we ___ something about climate change.", Options: []string{"do", "did", "have done", "will do"}, Correct: 1, Explanation: "'It's high time' is followed by past simple to express urgency."},
	{ID: 40, Level: "B2", Section: "grammar", Question: "He denied ___ the window.", Options: []string{"to break", "breaking", "break", "broke"}, Correct: 1, Explanation: "'Deny' is followed by the gerund (-ing form)."},

	// ═══════════════════════════════════════════════════════════
	// C1 — VOCABULARY (5)
	// ═══════════════════════════════════════════════════════════
	{ID: 41, Level: "C1", Section: "vocabulary", Question: "To 'exacerbate' a problem means to ___.", Options: []string{"solve it", "make it worse", "understand it", "prevent it"}, Correct: 1, Explanation: "'Exacerbate' means to make a problem or situation worse."},
	{ID: 42, Level: "C1", Section: "vocabulary", Question: "'Ubiquitous' means ___.", Options: []string{"very rare", "extremely dangerous", "found everywhere", "highly controversial"}, Correct: 2, Explanation: "'Ubiquitous' means present, appearing, or found everywhere."},
	{ID: 43, Level: "C1", Section: "vocabulary", Question: "A 'paradigm shift' refers to ___.", Options: []string{"a minor adjustment", "a fundamental change in approach", "a return to tradition", "a temporary solution"}, Correct: 1, Explanation: "A 'paradigm shift' is a fundamental change in approach or underlying assumptions."},
	{ID: 44, Level: "C1", Section: "vocabulary", Question: "'Pragmatic' means ___.", Options: []string{"idealistic", "dealing with things practically", "overly cautious", "extremely theoretical"}, Correct: 1, Explanation: "'Pragmatic' means dealing with things in a practical, realistic way."},
	{ID: 45, Level: "C1", Section: "vocabulary", Question: "To 'corroborate' evidence means to ___.", Options: []string{"destroy it", "confirm it with additional evidence", "hide it", "question it"}, Correct: 1, Explanation: "'Corroborate' means to confirm or support with additional evidence."},

	// C1 — GRAMMAR (5)
	{ID: 46, Level: "C1", Section: "grammar", Question: "Seldom ___ such a remarkable performance.", Options: []string{"I have seen", "have I seen", "I saw", "did I seen"}, Correct: 1, Explanation: "Negative adverbs (seldom, rarely, never) at the start require inversion."},
	{ID: 47, Level: "C1", Section: "grammar", Question: "___ the circumstances, I think we should postpone the event.", Options: []string{"Given", "Giving", "Having given", "To give"}, Correct: 0, Explanation: "'Given' (= considering) is used as a preposition meaning 'in view of'."},
	{ID: 48, Level: "C1", Section: "grammar", Question: "The proposal, ___ merits are undeniable, was rejected.", Options: []string{"which", "whose", "that", "whom"}, Correct: 1, Explanation: "'Whose' shows possession in relative clauses (the proposal's merits)."},
	{ID: 49, Level: "C1", Section: "grammar", Question: "She ___ have been more helpful; she answered all my questions.", Options: []string{"can't", "mustn't", "couldn't", "shouldn't"}, Correct: 2, Explanation: "'Couldn't have been more helpful' = she was as helpful as possible."},
	{ID: 50, Level: "C1", Section: "grammar", Question: "Were it not ___ his support, the project would have failed.", Options: []string{"to", "for", "with", "by"}, Correct: 1, Explanation: "'Were it not for' is a formal conditional meaning 'if it weren't for'."},

	// ═══════════════════════════════════════════════════════════
	// C2 — VOCABULARY (5)
	// ═══════════════════════════════════════════════════════════
	{ID: 51, Level: "C2", Section: "vocabulary", Question: "'Perfunctory' means done ___.", Options: []string{"with great enthusiasm", "as a routine duty without real interest", "with extreme precision", "with deep emotional involvement"}, Correct: 1, Explanation: "'Perfunctory' means carried out with minimal effort or reflection."},
	{ID: 52, Level: "C2", Section: "vocabulary", Question: "An 'onerous' task is one that is ___.", Options: []string{"enjoyable and easy", "involving heavy obligation or effort", "completely optional", "quick to complete"}, Correct: 1, Explanation: "'Onerous' means involving a great deal of effort or difficulty."},
	{ID: 53, Level: "C2", Section: "vocabulary", Question: "'Sycophantic' behaviour involves ___.", Options: []string{"honest criticism", "excessive flattery to gain advantage", "quiet observation", "open rebellion"}, Correct: 1, Explanation: "'Sycophantic' means using flattery to gain favour from someone important."},
	{ID: 54, Level: "C2", Section: "vocabulary", Question: "A 'panacea' is ___.", Options: []string{"a serious disease", "a solution for all problems", "a type of ceremony", "a geographical feature"}, Correct: 1, Explanation: "A 'panacea' is a solution or remedy for all difficulties or diseases."},
	{ID: 55, Level: "C2", Section: "vocabulary", Question: "To 'obviate' a problem means to ___.", Options: []string{"create it", "remove or prevent it", "ignore it", "worsen it"}, Correct: 1, Explanation: "'Obviate' means to remove a need or difficulty; prevent."},

	// C2 — GRAMMAR (5)
	{ID: 56, Level: "C2", Section: "grammar", Question: "So ___ was the damage that the building had to be demolished.", Options: []string{"extensive", "extending", "extent", "extendedly"}, Correct: 0, Explanation: "'So + adjective' with inversion for emphasis: 'So extensive was...'"},
	{ID: 57, Level: "C2", Section: "grammar", Question: "Under no circumstances ___ to leave the building during the drill.", Options: []string{"anyone is permitted", "is anyone permitted", "anyone permitted", "permitted anyone is"}, Correct: 1, Explanation: "Negative fronting requires subject-auxiliary inversion."},
	{ID: 58, Level: "C2", Section: "grammar", Question: "The theory, ___ controversial at the time, has since been widely accepted.", Options: []string{"however", "albeit", "despite", "whereas"}, Correct: 1, Explanation: "'Albeit' means 'although' and is used before adjectives or phrases."},
	{ID: 59, Level: "C2", Section: "grammar", Question: "Only after the results were published ___ the extent of the problem.", Options: []string{"the public realised", "did the public realise", "the public had realised", "realised the public"}, Correct: 1, Explanation: "'Only after...' at the start requires inversion in the main clause."},
	{ID: 60, Level: "C2", Section: "grammar", Question: "He spoke as though he ___ an expert, but he knew very little.", Options: []string{"is", "was", "were", "has been"}, Correct: 2, Explanation: "'As though/as if' + were (subjunctive) for unreal situations."},
}
