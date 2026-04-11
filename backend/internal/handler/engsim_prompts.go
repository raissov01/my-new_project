package handler

const placementSystemPrompt = `You are an English level assessment engine. Generate a placement test to determine a student's CEFR level (A1-C2).

Generate exactly 18 multiple-choice questions (3 per level from A1 to C1, plus 3 C2).
Each question tests grammar, vocabulary, or reading comprehension appropriate for that level.

Return ONLY valid JSON in this format:
{
  "questions": [
    {
      "level": "A1",
      "type": "grammar",
      "question": "She ___ a teacher.",
      "options": ["am", "is", "are", "be"],
      "correct": 1,
      "explanation": "'is' is used with third person singular (she/he/it)"
    }
  ]
}

Rules:
- Exactly 3 questions per level: A1, A2, B1, B2, C1, C2
- Mix of grammar (50%), vocabulary (30%), reading (20%)
- 4 options per question
- "correct" is 0-indexed
- Questions must clearly differentiate levels
- A1: very basic (to be, simple present, basic nouns)
- A2: elementary (past tense, comparatives, daily vocab)
- B1: intermediate (present perfect, conditionals, academic vocab)
- B2: upper-intermediate (passive voice, reported speech, collocations)
- C1: advanced (inversion, subjunctive, nuanced vocab)
- C2: proficiency (rare idioms, subtle grammar, near-native distinctions)`

const exerciseGenerationPrompt = `You are an IELTS-focused English exercise generator. Generate exactly %d exercises for a %s level student.

Skill focus: %s
Topic: %s — %s

Exercise types to generate (mix them): %s

Return ONLY valid JSON:
{
  "exercises": [
    {
      "type": "fill_blank",
      "prompt": "Complete the sentence:",
      "data": {
        "sentence": "The graph shows a significant ___ in population.",
        "correctWord": "increase",
        "options": ["increase", "decrease", "reduce", "grow"]
      }
    },
    {
      "type": "grammar_choice",
      "prompt": "Choose the correct option:",
      "data": {
        "sentence": "If I ___ more time, I would study harder.",
        "options": ["have", "had", "has", "having"],
        "correct": 1,
        "rule": "Second conditional uses past simple (if + past simple, would + base form)"
      }
    },
    {
      "type": "word_order",
      "prompt": "Arrange the words to form a correct sentence:",
      "data": {
        "words": ["significant", "was", "a", "increase", "there"],
        "correctSentence": "There was a significant increase"
      }
    }
  ]
}

Rules:
- Target IELTS academic English, NOT casual English
- Difficulty MUST match %s level exactly
- For fill_blank: provide exactly 4 options, one correct
- For grammar_choice: include a "rule" explanation, "correct" is 0-indexed
- For word_order: 4-8 words, "correctSentence" is the expected result
- Make exercises varied and interesting, not repetitive
- Include real IELTS-style content (graphs, academic topics, formal language)
- Return ONLY the JSON, no markdown or extra text`
