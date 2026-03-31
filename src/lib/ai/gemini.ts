import { getAIConfig } from "./config";
import type { TextChunk } from "./extract-text";

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

export class AIProviderError extends Error {
  constructor(
    public code:
      | "AI_CONFIG_MISSING_API_KEY"
      | "GEMINI_API_HTTP_ERROR"
      | "GEMINI_EMPTY_RESPONSE"
      | "GEMINI_NO_CARDS_GENERATED"
      | "GEMINI_INVALID_JSON"
      | "GEMINI_INVALID_FORMAT"
      | "GEMINI_PROMPT_BLOCKED"
      | "GEMINI_RATE_LIMITED"
      | "GEMINI_TIMEOUT",
    message: string,
    public status = 500,
    public detail?: string
  ) {
    super(message);
  }
}

const LANGUAGE_NAMES: Record<GenerationLanguage, string> = {
  kk: "Kazakh",
  ru: "Russian",
  en: "English",
};

const MODE_INSTRUCTIONS: Record<GenerationMode, string> = {
  mixed: `Use a mix of formats: definitions, questions-and-answers, vocabulary, and concept explanations.
Automatically detect the best format for each piece of content.`,
  definition: `Focus on term -> definition cards.
Identify key terms, concepts, formulas, and provide clear, concise definitions.`,
  qa: `Focus on question -> answer cards.
Create questions that test understanding of concepts, facts, and processes.
Questions should start with "What", "Why", "How", "Explain", etc.`,
  vocabulary: `Focus on word/term -> meaning/translation cards.
Extract vocabulary, technical terms, abbreviations, and their meanings.`,
};

function buildPrompt(options: GenerateOptions) {
  const langName = LANGUAGE_NAMES[options.language];
  const modeInstr = MODE_INSTRUCTIONS[options.mode];

  return `You are an expert educational content analyzer. Your task is to generate high-quality flashcards from the following study material.

## Requirements
- Generate exactly ${options.cardCount} flashcards.
- Output language: ${langName}. All card text MUST be in ${langName}.
- ${modeInstr}

## Card quality rules
- Each card must be self-contained and understandable without external context.
- "front" is the question/term side.
- "back" is the answer/definition side.
- Prefer meaningful study pairs where the model correctly infers which part is the term and which part is the definition.
- Avoid duplicate or near-duplicate cards.
- Avoid filler content.
- Assign difficulty: "easy", "medium", or "hard".
- Assign a short category label (1-3 words).
- Include the source reference from the chunk metadata.

## Output format
Return ONLY a valid JSON array. No markdown, no prose, no code fences.
`;
}

function buildChunkText(chunks: TextChunk[]) {
  const joined = chunks
    .map((chunk, index) => `--- Chunk ${index + 1} (${chunk.source}) ---\n${chunk.text}`)
    .join("\n\n");

  return joined.length > 30_000 ? `${joined.slice(0, 30_000)}\n...[truncated]` : joined;
}

function extractTextResponse(data: unknown) {
  if (!data || typeof data !== "object") return "";

  const candidate = (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
    .candidates?.[0];
  return candidate?.content?.parts?.[0]?.text ?? "";
}

function parseGeneratedCards(raw: string): GeneratedCard[] {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("[Gemini] Failed to parse JSON:", cleaned.slice(0, 200));
    throw new AIProviderError(
      "GEMINI_INVALID_JSON",
      "Gemini returned invalid JSON.",
      502,
      cleaned.slice(0, 200)
    );
  }

  if (!Array.isArray(parsed)) {
    throw new AIProviderError(
      "GEMINI_INVALID_FORMAT",
      "Gemini returned a non-array payload.",
      502
    );
  }

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

export async function generateFlashcardsWithAI(
  options: GenerateOptions
): Promise<GeneratedCard[]> {
  const config = getAIConfig();
  const prompt = `${buildPrompt(options)}\n\n## Source material:\n${buildChunkText(options.chunks)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": config.geminiApiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            topP: 0.9,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
            responseSchema: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                required: ["front", "back", "category", "difficulty", "source"],
                properties: {
                  front: { type: "STRING" },
                  back: { type: "STRING" },
                  category: { type: "STRING" },
                  difficulty: {
                    type: "STRING",
                    enum: ["easy", "medium", "hard"],
                  },
                  source: { type: "STRING" },
                },
              },
            },
          },
        }),
        signal: controller.signal,
      }
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AIProviderError(
        "GEMINI_TIMEOUT",
        "Gemini request timed out.",
        504
      );
    }
    throw new AIProviderError(
      "GEMINI_API_HTTP_ERROR",
      "Failed to reach Gemini API.",
      502,
      error instanceof Error ? error.message : "Unknown fetch failure"
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.error("[Gemini] API error:", response.status, errorBody);

    if (response.status === 429) {
      throw new AIProviderError(
        "GEMINI_RATE_LIMITED",
        "Gemini rate limit exceeded.",
        429,
        errorBody.slice(0, 300)
      );
    }

    throw new AIProviderError(
      "GEMINI_API_HTTP_ERROR",
      `Gemini API returned ${response.status}.`,
      502,
      errorBody.slice(0, 300)
    );
  }

  const data = await response.json();
  const blockedReason = (data as { promptFeedback?: { blockReason?: string } })
    ?.promptFeedback?.blockReason;

  if (blockedReason) {
    throw new AIProviderError(
      "GEMINI_PROMPT_BLOCKED",
      "Gemini blocked the prompt.",
      422,
      blockedReason
    );
  }

  const textContent = extractTextResponse(data);
  if (!textContent) {
    console.error("[Gemini] Empty response:", JSON.stringify(data).slice(0, 500));
    throw new AIProviderError(
      "GEMINI_EMPTY_RESPONSE",
      "Gemini returned an empty response.",
      502,
      JSON.stringify(data).slice(0, 300)
    );
  }

  const cards = parseGeneratedCards(textContent);
  if (cards.length === 0) {
    throw new AIProviderError(
      "GEMINI_NO_CARDS_GENERATED",
      "Gemini returned no usable cards.",
      422
    );
  }

  return cards;
}
