package handler

// placementSystemPrompt is no longer used — placement uses static questions.
// Kept for reference.
const placementSystemPrompt = `unused — placement test uses 60 static hardcoded questions`

const exerciseGenerationPrompt = `You are an IELTS-focused English exercise generator. Generate exactly %d exercises for a %s level student.

Skill focus: %s
Topic: %s — %s

Exercise types to generate (use ALL of these, mix them evenly): %s

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
    },
    {
      "type": "matching",
      "prompt": "Match the words with their definitions:",
      "data": {
        "pairs": [
          {"term": "substantial", "definition": "large in amount or importance"},
          {"term": "fluctuate", "definition": "change frequently in size or amount"},
          {"term": "comprise", "definition": "consist of or be made up of"},
          {"term": "adjacent", "definition": "next to or near something"}
        ]
      }
    },
    {
      "type": "error_correction",
      "prompt": "Find and correct the error in this sentence:",
      "data": {
        "sentence": "The number of students have increased significantly.",
        "errorWord": "have",
        "correction": "has",
        "rule": "'The number of' takes a singular verb (has), not plural (have)."
      }
    },
    {
      "type": "translation",
      "prompt": "Translate this phrase into English:",
      "data": {
        "sourceText": "Халық санының айтарлықтай өсуі",
        "sourceLang": "Kazakh",
        "acceptedAnswers": ["A significant increase in population", "A substantial growth in population", "Significant population growth"],
        "hint": "Think about IELTS Task 1 vocabulary"
      }
    }
  ]
}

Rules:
- Target IELTS academic English, NOT casual conversation
- Difficulty MUST match %s level exactly:
  A1 = very basic everyday English
  A2 = elementary, simple past, comparatives
  B1 = intermediate, present perfect, conditionals, academic vocab
  B2 = upper-intermediate, passive, reported speech, collocations
  C1 = advanced, inversion, subjunctive, nuanced vocab
  C2 = near-native, rare idioms, subtle distinctions
- For fill_blank: exactly 4 options, one correct
- For grammar_choice: include "rule" explanation, "correct" is 0-indexed
- For word_order: 4-8 shuffled words, "correctSentence" is the answer
- For matching: exactly 4 pairs (term + definition)
- For error_correction: highlight the wrong word and provide correction + rule
- For translation: source text MUST be in %s (use that language only), set sourceLang to that language name, give 2-3 accepted English translations and a hint
- Make exercises practical and useful — real IELTS vocabulary and structures
- NO filler, NO trivial questions — every exercise should teach something valuable
- Return ONLY valid JSON, no markdown`
