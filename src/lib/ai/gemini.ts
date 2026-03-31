import type { TextChunk } from "./extract-text";

// ── Types ────────────────────────────────────────────────────────────────────

export type GeneratedCard = {
  front: string;
  back: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  source: string;
};

export type GenerationMode = "mixed" | "definition" | "qa" | "vocabulary";
export type GenerationLanguage = "kk" | "ru" | "en";

export type GenerateOptions = {
  chunks: TextChunk[];
  mode: GenerationMode;
  language: GenerationLanguage;
  cardCount: number;
};

// ── Prompt engineering ───────────────────────────────────────────────────────

const LANGUAGE_NAMES: Record<GenerationLanguage, string> = {
  kk: "Kazakh",
  ru: "Russian",
  en: "English",
};

const MODE_INSTRUCTIONS: Record<GenerationMode, string> = {
  mixed: `Use a mix of formats: definitions, questions-and-answers, vocabulary, and concept explanations.
Automatically detect the best format for each piece of content.`,
  definition: `Focus on term → definition cards.
Identify key terms, concepts, formulas, and provide clear, concise definitions.`,
  qa: `Focus on question → answer cards.
Create questions that test understanding of concepts, facts, and processes.
Questions should start with "What", "Why", "How", "Explain", etc.`,
  vocabulary: `Focus on word/term → meaning/translation cards.
Extract vocabulary, technical terms, abbreviations, and their meanings.`,
};

function buildPrompt(options: GenerateOptions): string {
  const langName = LANGUAGE_NAMES[options.language];
  const modeInstr = MODE_INSTRUCTIONS[options.mode];

  return `You are an expert educational content analyzer. Your task is to generate high-quality flashcards from the following study material.

## Requirements
- Generate exactly ${options.cardCount} flashcards.
- Output language: ${langName}. All card text MUST be in ${langName}.
- ${modeInstr}

## Card quality rules
- Each card must be self-contained and understandable without external context.
- "front" is the question/term side (concise, clear prompt).
- "back" is the answer/definition side (complete but concise, max 2-3 sentences).
- Avoid duplicate or near-duplicate cards.
- Avoid trivially obvious or filler content.
- Prioritize content that has high study/memorization value.
- For definitions: use clear, textbook-style language.
- For Q&A: make questions specific, not vague.
- Assign difficulty: "easy" (basic recall), "medium" (understanding), "hard" (application/analysis).
- Assign a short category label (1-3 words) based on the topic.
- Include the source reference from the chunk metadata.

## Output format
Return ONLY a valid JSON array. No markdown, no explanation, no prefix/suffix text.
Each element must have exactly these fields:
{
  "front": "string",
  "back": "string",
  "category": "string",
  "difficulty": "easy" | "medium" | "hard",
  "source": "string"
}

## Source material:
`;
}

// ── Gemini API call ──────────────────────────────────────────────────────────

const GEMINI_MODEL = "gemini-2.0-flash";

export async function generateFlashcardsWithAI(
  options: GenerateOptions
): Promise<GeneratedCard[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  // Build the content from chunks
  const chunkTexts = options.chunks
    .map((chunk, i) => `--- Chunk ${i + 1} (${chunk.source}) ---\n${chunk.text}`)
    .join("\n\n");

  // Limit total text to ~30k chars to stay within token limits
  const truncatedText =
    chunkTexts.length > 30000 ? chunkTexts.slice(0, 30000) + "\n...[truncated]" : chunkTexts;

  const prompt = buildPrompt(options) + truncatedText;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          topP: 0.9,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.error("[Gemini] API error:", response.status, errorBody);
    throw new Error(`GEMINI_API_ERROR:${response.status}`);
  }

  const data = await response.json();

  // Extract text from Gemini response
  const textContent =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!textContent) {
    console.error("[Gemini] Empty response:", JSON.stringify(data).slice(0, 500));
    throw new Error("GEMINI_EMPTY_RESPONSE");
  }

  // Parse the JSON array from the response
  const cards = parseGeneratedCards(textContent);

  if (cards.length === 0) {
    throw new Error("GEMINI_NO_CARDS_GENERATED");
  }

  return cards;
}

/**
 * Parse and validate the AI-generated JSON array of cards.
 * Handles cases where the AI wraps the JSON in markdown code fences.
 */
function parseGeneratedCards(raw: string): GeneratedCard[] {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("[Gemini] Failed to parse JSON:", cleaned.slice(0, 200));
    throw new Error("GEMINI_INVALID_JSON");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("GEMINI_INVALID_FORMAT");
  }

  // Validate and sanitize each card
  const validDifficulties = new Set(["easy", "medium", "hard"]);

  return parsed
    .filter(
      (card): card is Record<string, unknown> =>
        card !== null && typeof card === "object"
    )
    .map((card) => ({
      front: String(card.front ?? "").trim(),
      back: String(card.back ?? "").trim(),
      category: String(card.category ?? "General").trim(),
      difficulty: validDifficulties.has(String(card.difficulty))
        ? (String(card.difficulty) as GeneratedCard["difficulty"])
        : "medium",
      source: String(card.source ?? "").trim(),
    }))
    .filter((card) => card.front.length > 0 && card.back.length > 0);
}
