package database

import (
	"github.com/midoriya/flashlearn-backend/internal/models"
)

// buildFeedbackPrompts returns IELTSMaterial entries with AI feedback prompt content.
// These are not file-based — they use the Content field to store the prompt text
// that guides students on how to self-evaluate and get AI feedback.
func buildFeedbackPrompts() []models.IELTSMaterial {
	s := 9000
	next := func() int { v := s; s++; return v }

	return []models.IELTSMaterial{

		// ── WRITING FEEDBACK PROMPTS ──────────────────────────────────────

		{
			Title:       "Writing Task 1 — AI Feedback Guide",
			Description: "AI evaluation prompt for Academic Writing Task 1. Covers graphs, charts, tables, maps, and process diagrams.",
			Category:    "writing",
			Type:        "feedback_prompt",
			Difficulty:  "all",
			Content: `HOW TO GET AI FEEDBACK ON YOUR TASK 1

1. SUBMIT YOUR RESPONSE
Paste your full Task 1 response (minimum 150 words) along with the task description or image description.

2. WHAT THE AI EXAMINER CHECKS

Task Achievement (25%):
- Did you write an overview? (Missing overview = Band 5 ceiling)
- Did you select and report KEY features, not every data point?
- Did you compare and contrast data logically?
- Is your response at least 150 words?

Coherence & Cohesion (25%):
- Is there a clear paragraph structure? (Introduction + Overview + Body paragraphs)
- Are cohesive devices used naturally, not mechanically?
- Does each paragraph have a clear central topic?

Lexical Resource (25%):
- Did you paraphrase the task wording in the introduction?
- Are you using data language? ("rose sharply", "remained stable", "fluctuated")
- No repetition of the same word more than twice

Grammatical Range & Accuracy (25%):
- Mix of simple and complex sentences
- Correct tense usage (past for completed data, present for current)
- No subject-verb agreement errors

3. SELF-CHECK BEFORE SUBMITTING
- Is my overview in a separate paragraph?
- Did I describe trends, not just list numbers?
- Did I group data logically (not describe bar by bar)?
- Am I at or above 150 words?

4. BAND SCORE INTERPRETATION
5.0-5.5: Significant gaps — overview missing or weak, limited vocabulary
6.0-6.5: Adequate — covers the task but mechanical, some errors
7.0-7.5: Good — well-developed overview, natural language, few errors
8.0+: Exceptional — sophisticated data description, flawless grouping`,
			SortOrder: next(),
		},
		{
			Title:       "Writing Task 2 — AI Feedback Guide",
			Description: "AI evaluation prompt for Writing Task 2. Covers opinion, discussion, problem-solution, and advantages-disadvantages essays.",
			Category:    "writing",
			Type:        "feedback_prompt",
			Difficulty:  "all",
			Content: `HOW TO GET AI FEEDBACK ON YOUR TASK 2

1. SUBMIT YOUR RESPONSE
Paste your full Task 2 essay (minimum 250 words) along with the essay question.

2. WHAT THE AI EXAMINER CHECKS

Task Response (25%):
- Is your thesis clear in sentence 2 of the introduction?
- Do you fully address ALL parts of the question?
- Maximum 2 body paragraphs — depth over breadth
- Does your conclusion avoid introducing new ideas?
- Are you at least 250 words? (Under 250 = Band 5 ceiling)

Coherence & Cohesion (25%):
- Body paragraph formula: Point -> Explain -> Example -> Result (PEER)
- Logical progression of ideas
- Natural use of cohesive devices (not "Firstly, Secondly, Thirdly" pattern)
- Clear topic sentence for each body paragraph

Lexical Resource (25%):
- Academic vocabulary used correctly
- Collocations: "plays a pivotal role", "have far-reaching consequences"
- No repetition — use synonyms and paraphrasing
- No memorised phrases (detected = Lexical Resource capped at 6.0)

Grammatical Range & Accuracy (25%):
- Mix of complex structures: conditionals, relative clauses, passive voice
- No subject-verb agreement errors (most common Band 6 blocker)
- Correct article usage (a/the/zero article)
- No run-on sentences or comma splices

3. ESSAY TYPES AND STRUCTURE
Opinion: Introduction (thesis) + 2 Body Paragraphs (your reasons) + Conclusion
Discussion: Introduction + Side A + Side B + Your Opinion + Conclusion
Problem-Solution: Introduction + Problems + Solutions + Conclusion
Advantages-Disadvantages: Introduction + Advantages + Disadvantages + Opinion + Conclusion

4. VOCABULARY UPGRADE CHEAT SHEET
good -> beneficial, advantageous
bad -> detrimental, adverse
big -> substantial, considerable
many -> a significant number of
show -> demonstrate, illustrate
think -> argue, contend, maintain
because -> due to, owing to, as a result of`,
			SortOrder: next(),
		},

		// ── SPEAKING FEEDBACK PROMPTS ─────────────────────────────────────

		{
			Title:       "Speaking Part 1 — AI Feedback Guide",
			Description: "AI evaluation prompt for Speaking Part 1 (Introduction and Interview). Covers personal topics and short answers.",
			Category:    "speaking",
			Type:        "feedback_prompt",
			Difficulty:  "all",
			Content: `HOW TO GET AI FEEDBACK ON YOUR SPEAKING PART 1

1. SUBMIT YOUR RESPONSE
Type or paste your answers to Part 1 questions. Include the question and your answer.

2. WHAT THE AI EXAMINER CHECKS

Fluency & Coherence (25%):
- Direct answer first, then 1-2 sentences of development
- 3-5 sentences per answer minimum (under 3 = Fluency capped at 5.5)
- Natural connectors: "actually", "to be honest", "to be fair"
- Do NOT over-elaborate — keep to the topic

Lexical Resource (25%):
- Topic-specific vocabulary
- Avoid: "very", "a lot", "nice", "good", "bad" without variety
- Use natural collocations: "strongly influenced by", "deeply concerned about"

Grammatical Range & Accuracy (25%):
- Mix of tenses as needed (present simple for habits, past for experiences)
- Complex structures where natural (relative clauses, conditionals)
- Self-correction is rewarded: "...actually, what I mean is..."

Pronunciation (25%):
- AI cannot assess pronunciation directly from text
- Practice tip: Record yourself and compare with native speakers

3. ANSWER FORMULA
Question -> Direct Answer -> Reason/Detail -> Example (optional)

Example:
Q: "Do you like reading?"
A: "Yes, I'm quite an avid reader, actually. I find that reading helps me unwind after a long day at work. Recently, I've been really into historical fiction — I just finished a novel about World War II that was absolutely gripping."

4. COMMON MISTAKES
- One-word answers ("Yes." / "No.")
- Going off-topic into a long story
- Using memorised phrases that sound unnatural
- Not extending answers at all`,
			SortOrder: next(),
		},
		{
			Title:       "Speaking Part 2 — AI Feedback Guide",
			Description: "AI evaluation prompt for Speaking Part 2 (Long Turn / Cue Card). Covers 1-2 minute monologues.",
			Category:    "speaking",
			Type:        "feedback_prompt",
			Difficulty:  "all",
			Content: `HOW TO GET AI FEEDBACK ON YOUR SPEAKING PART 2

1. SUBMIT YOUR RESPONSE
Paste your cue card topic and your full 1-2 minute response.

2. WHAT THE AI EXAMINER CHECKS

Fluency & Coherence (25%):
- Did you speak for 1.5-2 minutes? (Under 1 minute = major penalty)
- Did you cover ALL bullet points on the cue card? (Missing one = Task Relevance penalty)
- Used transitional phrases: "Moving on to...", "What I found most interesting was..."
- Ended with a personal reflection to signal natural conclusion

Lexical Resource (25%):
- Topic-appropriate vocabulary
- Appropriate idioms: "a double-edged sword", "food for thought"
- Collocations: "plays a crucial role in", "made a lasting impression on me"
- Descriptive language: adjectives, adverbs, specific nouns

Grammatical Range & Accuracy (25%):
- Narrative tenses for stories (past simple, past continuous, past perfect)
- Complex structures: "What struck me most was...", "Had I known earlier..."
- Self-correction shows flexibility

Pronunciation (25%):
- Record yourself for self-assessment
- Focus on: word stress, sentence intonation, connected speech

3. PREPARATION STRATEGY (1-minute prep time)
Write 4 anchor words on your notepad:
- Context: Where/When/Who
- Action: What happened
- Detail: Specific memorable detail
- Reflection: How you felt / What you learned

4. STRUCTURE TEMPLATE
"I'd like to talk about [topic]..."
-> Set the scene (who, when, where)
-> Describe the main event/thing
-> Add specific details and feelings
-> Conclude with reflection: "Looking back, I think..."`,
			SortOrder: next(),
		},
		{
			Title:       "Speaking Part 3 — AI Feedback Guide",
			Description: "AI evaluation prompt for Speaking Part 3 (Discussion). Covers abstract and analytical questions.",
			Category:    "speaking",
			Type:        "feedback_prompt",
			Difficulty:  "all",
			Content: `HOW TO GET AI FEEDBACK ON YOUR SPEAKING PART 3

1. SUBMIT YOUR RESPONSE
Paste the discussion question and your full analytical response.

2. WHAT THE AI EXAMINER CHECKS

Fluency & Coherence (25%):
- Extended analytical responses (not yes/no)
- Opinions backed by reasoning + example + counter-acknowledgement (Band 7+)
- Logical argument flow
- Use discourse markers: "On one hand... on the other..."

Lexical Resource (25%):
- Abstract vocabulary: "tends to", "generally speaking", "it could be argued that"
- Topic-specific academic terms
- Hedging language: "from a broader perspective", "to a certain extent"
- Avoid informal expressions in analytical context

Grammatical Range & Accuracy (25%):
- Complex structures: conditionals, passive voice, reported speech
- Modal verbs for speculation: "might", "could", "would"
- Cleft sentences: "What I believe is that...", "It's the younger generation that..."

Pronunciation (25%):
- Stress on key content words for emphasis
- Intonation variation to show engagement with the topic

3. RESPONSE FORMULA FOR BAND 7+
State opinion -> Give reason -> Provide example -> Acknowledge counter-argument -> Conclude

Example:
Q: "Do you think technology has made people less social?"
A: "That's quite a debatable topic, and I'd say it really depends on the context. On one hand, social media platforms have actually connected people across vast distances — my cousin in London, for instance, stays in daily contact with family back home through video calls, which wouldn't have been possible twenty years ago. Having said that, I do acknowledge that excessive screen time can sometimes replace face-to-face interactions, particularly among teenagers. So overall, I'd argue that technology itself isn't the problem — it's more about how we choose to use it."

4. COMMON PART 3 MISTAKES
- Answering with personal anecdotes instead of general analysis
- Not developing ideas beyond one sentence
- Repeating the same point in different words
- Failing to acknowledge opposing viewpoints`,
			SortOrder: next(),
		},

		// ── READING FEEDBACK PROMPT ───────────────────────────────────────

		{
			Title:       "Reading — AI Feedback Guide",
			Description: "AI evaluation prompt for IELTS Reading practice. Covers all question types and strategies.",
			Category:    "reading",
			Type:        "feedback_prompt",
			Difficulty:  "all",
			Content: `HOW TO GET AI FEEDBACK ON YOUR READING PRACTICE

1. SUBMIT YOUR ANSWERS
Paste the passage (or passage number from Cambridge IELTS), your answers, and the correct answers.

2. WHAT THE AI EVALUATES

Accuracy Analysis:
- Which questions did you get wrong?
- What question TYPE did you struggle with most?
- What was the likely cause of each error?

Error Pattern Detection:
- True/False/Not Given confusion (most common error)
- Matching headings — did you read topic sentences?
- Fill-in-the-blank — did you check word limits?
- Multiple choice — did you fall for distractors?

3. QUESTION TYPE STRATEGIES

True/False/Not Given:
- TRUE: The passage says exactly this
- FALSE: The passage says the OPPOSITE
- NOT GIVEN: The passage doesn't mention this AT ALL
- Key trap: Don't use your own knowledge — only what the passage states

Matching Headings:
- Read the FIRST and LAST sentence of each paragraph
- Cross out obvious matches first
- Headings are about the MAIN IDEA, not a detail

Sentence Completion:
- Find the section using keywords
- Check word limit (1 word? 2 words? No more than 3?)
- Answer must be grammatically correct in context

Multiple Choice:
- Read all options before choosing
- Eliminate obviously wrong answers
- Watch for answers that are TRUE but don't answer the question

4. TIMING STRATEGY
Passage 1: 15 minutes (easiest)
Passage 2: 20 minutes (medium)
Passage 3: 25 minutes (hardest)
Total: 60 minutes for 40 questions

5. SELF-ASSESSMENT
After checking answers, classify each error:
- Vocabulary gap (didn't understand a key word)
- Paraphrase miss (didn't recognize the rephrased version)
- Time pressure (rushed and made careless mistake)
- Question type misunderstanding (didn't know the strategy)`,
			SortOrder: next(),
		},

		// ── LISTENING FEEDBACK PROMPT ─────────────────────────────────────

		{
			Title:       "Listening — AI Feedback Guide",
			Description: "AI evaluation prompt for IELTS Listening practice. Covers all 4 sections and common traps.",
			Category:    "listening",
			Type:        "feedback_prompt",
			Difficulty:  "all",
			Content: `HOW TO GET AI FEEDBACK ON YOUR LISTENING PRACTICE

1. SUBMIT YOUR ANSWERS
Paste your answers and the correct answers. Include which Cambridge IELTS test you used.

2. WHAT THE AI EVALUATES

Accuracy Analysis:
- Score breakdown by section (Section 1-4)
- Error patterns: spelling mistakes vs comprehension errors
- Section 4 performance (hardest — academic monologue)

Common Error Detection:
- Spelling errors that cost marks
- Plural/singular mistakes
- Hearing the right answer but writing the wrong form
- Missing answers due to timing

3. SECTION-BY-SECTION STRATEGY

Section 1 (Easiest — conversation):
- Read questions during the 30-second preview
- Write answers immediately — don't wait
- Watch for corrections: "Oh wait, actually it's..."

Section 2 (Monologue — social context):
- Predict answer types before listening
- Follow the map/plan if one is given
- Don't get stuck — move on if you miss one

Section 3 (Discussion — academic):
- Multiple speakers — identify who says what
- Watch for agreement/disagreement between speakers
- Distractors: one speaker suggests X, another corrects to Y

Section 4 (Hardest — academic lecture):
- No pause in the middle — maintain concentration
- Use keyword prediction from questions
- Focus on stressed words and signposting language

4. SPELLING RULES THAT COST MARKS
- British/American spelling: both accepted (colour/color)
- Proper nouns: must be capitalized
- Numbers: can write digits or words
- Hyphenated words: count as one word

5. SELF-ASSESSMENT CHECKLIST
After checking, classify each error:
- Didn't hear it (volume/accent issue)
- Heard it but wrote wrong spelling
- Got confused by distractor (speaker changed answer)
- Ran out of time / lost place
- Vocabulary gap (unknown word)`,
			SortOrder: next(),
		},

		// ── OVERALL SCORE FEEDBACK PROMPT ─────────────────────────────────

		{
			Title:       "Overall Band Score — Self-Assessment Guide",
			Description: "Comprehensive guide for calculating and understanding your overall IELTS band score with improvement roadmap.",
			Category:    "general",
			Type:        "feedback_prompt",
			Difficulty:  "all",
			Content: `OVERALL IELTS BAND SCORE — SELF-ASSESSMENT

1. HOW THE OVERALL SCORE IS CALCULATED
Your overall band = average of 4 sections, rounded to nearest 0.5

Example: L:7.0 R:6.5 W:6.0 S:6.5 = 26/4 = 6.5 Overall

Rounding rules:
- .25 rounds UP to .5 (e.g., 6.25 -> 6.5)
- .75 rounds UP to next band (e.g., 6.75 -> 7.0)
- .125 rounds DOWN (e.g., 6.125 -> 6.0)

2. SCORE INTERPRETATION

Band 5.0-5.5 (Modest user):
- Can handle basic communication
- Frequent errors that impede understanding
- Focus: grammar foundations + vocabulary building

Band 6.0-6.5 (Competent user):
- Generally effective communication
- Some errors but meaning is clear
- Focus: accuracy + academic vocabulary + coherence

Band 7.0-7.5 (Good user):
- Handles complex language well
- Occasional errors, good control
- Focus: sophistication + natural expression + consistency

Band 8.0+ (Expert user):
- Near-native proficiency
- Rare errors, full flexibility
- Focus: maintaining consistency under exam pressure

3. IMPROVEMENT PRIORITIES BY TARGET

Target 6.0 (from 5.0-5.5):
- Fix basic grammar: subject-verb agreement, articles, tenses
- Build core IELTS vocabulary (1000 words)
- Practice writing with templates to build structure
- Speaking: extend answers to 3+ sentences in Part 1

Target 6.5 (from 6.0):
- Focus on Task Achievement in Writing
- Add one complex grammar structure per paragraph
- Reading: improve paraphrase recognition
- Listening: Section 3 and 4 practice

Target 7.0 (from 6.5):
- Writing: strong overview + PEER body paragraphs
- Speaking: develop Part 3 analytical skills
- Vocabulary: collocations, not isolated words
- Reduce error frequency (aim for error-free sentences)

Target 7.5+ (from 7.0):
- Writing: sophisticated cohesion + flexible vocabulary
- Speaking: abstract discussion + natural idioms
- All skills: consistency across all criteria
- Time management: finishing with review time

4. REALISTIC STUDY TIMELINE
+0.5 band improvement: 4-6 weeks focused study
+1.0 band improvement: 8-12 weeks focused study
+1.5 band improvement: 4-6 months
From 5.0 to 7.0: 6-12 months typical

5. WHAT TO SUBMIT FOR AI FEEDBACK
- Your practice test scores (L/R/W/S)
- Your target overall score
- Your weak areas
- How much time you have before the exam
The AI will create a personalized improvement plan.`,
			SortOrder: next(),
		},
	}
}
