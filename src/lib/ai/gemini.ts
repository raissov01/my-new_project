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

const FALLBACK_GEMINI_MODEL = "gemini-2.5-flash";

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
      | "GEMINI_TIMEOUT"
      | "OPENAI_API_HTTP_ERROR"
      | "OPENAI_EMPTY_RESPONSE"
      | "OPENAI_NO_CARDS_GENERATED"
      | "OPENAI_INVALID_JSON"
      | "OPENAI_INVALID_FORMAT"
      | "OPENAI_RATE_LIMITED"
      | "OPENAI_TIMEOUT",
    message: string,
    public status = 500,
    public detail?: string
  ) {
    super(message);
  }
}

function shouldRetryWithFallbackModel(
  configuredModel: string,
  responseStatus: number,
  errorBody: string
) {
  if (configuredModel === FALLBACK_GEMINI_MODEL) {
    return false;
  }

  if (responseStatus !== 400 && responseStatus !== 404) {
    return false;
  }

  const body = errorBody.toLowerCase();
  return (
    body.includes("not found") ||
    body.includes("deprecated") ||
    body.includes("unsupported") ||
    body.includes("is not found") ||
    body.includes("models/")
  );
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

  const candidate = (data as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  }).candidates?.[0];

  return (
    candidate?.content?.parts
      ?.map((part) => (typeof part.text === "string" ? part.text : ""))
      .join("")
      .trim() ?? ""
  );
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
      difficulty: validDifficulties.has(String(card.difficulty).toLowerCase())
        ? (String(card.difficulty).toLowerCase() as GeneratedCard["difficulty"])
        : "medium",
      source: String(card.source ?? "").trim(),
    }))
    .filter((card) => card.front.length > 0 && card.back.length > 0);
}

async function requestGemini(
  prompt: string,
  geminiApiKey: string,
  model: string
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": geminiApiKey,
          "Content-Type": "application/json",
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

  return response;
}

async function requestOpenAI(
  prompt: string,
  openaiApiKey: string,
  model: string
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    return await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are an expert educational content analyzer. Return only valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "flashcards",
            strict: true,
            schema: {
              type: "array",
              items: {
                type: "object",
                required: ["front", "back", "category", "difficulty", "source"],
                additionalProperties: false,
                properties: {
                  front: { type: "string" },
                  back: { type: "string" },
                  category: { type: "string" },
                  difficulty: {
                    type: "string",
                    enum: ["easy", "medium", "hard"],
                  },
                  source: { type: "string" },
                },
              },
            },
          },
        },
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AIProviderError(
        "OPENAI_TIMEOUT",
        "OpenAI request timed out.",
        504
      );
    }

    throw new AIProviderError(
      "OPENAI_API_HTTP_ERROR",
      "Failed to reach OpenAI API.",
      502,
      error instanceof Error ? error.message : "Unknown fetch failure"
    );
  } finally {
    clearTimeout(timeout);
  }
}

function extractOpenAITextResponse(data: unknown) {
  if (!data || typeof data !== "object") return "";

  const firstChoice = (data as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
        refusal?: string | null;
      };
    }>;
  }).choices?.[0];

  if (!firstChoice?.message) return "";

  if (typeof firstChoice.message.content === "string") {
    return firstChoice.message.content.trim();
  }

  if (Array.isArray(firstChoice.message.content)) {
    return firstChoice.message.content
      .map((part) => (typeof part.text === "string" ? part.text : ""))
      .join("")
      .trim();
  }

  return "";
}

export async function generateFlashcardsWithAI(
  options: GenerateOptions
): Promise<GeneratedCard[]> {
  const config = getAIConfig();
  const prompt = `${buildPrompt(options)}\n\n## Source material:\n${buildChunkText(options.chunks)}`;

  if (process.env.NODE_ENV !== "production") {
    console.log("[AI] Starting generation:", {
      provider: config.provider,
      model: config.model,
      chunkCount: options.chunks.length,
      mode: options.mode,
      language: options.language,
      cardCount: options.cardCount,
    });
  }

  if (config.provider === "openai") {
    const response = await requestOpenAI(prompt, config.apiKey, config.model);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error("[OpenAI] API error:", response.status, errorBody);

      if (response.status === 429) {
        throw new AIProviderError(
          "OPENAI_RATE_LIMITED",
          "OpenAI rate limit exceeded.",
          429,
          errorBody.slice(0, 300)
        );
      }

      throw new AIProviderError(
        "OPENAI_API_HTTP_ERROR",
        `OpenAI API returned ${response.status}.`,
        502,
        errorBody.slice(0, 300)
      );
    }

    const data = await response.json();
    const textContent = extractOpenAITextResponse(data);

    if (!textContent) {
      console.error("[OpenAI] Empty response:", JSON.stringify(data).slice(0, 500));
      throw new AIProviderError(
        "OPENAI_EMPTY_RESPONSE",
        "OpenAI returned an empty response.",
        502,
        JSON.stringify(data).slice(0, 300)
      );
    }

    let cards: GeneratedCard[];
    try {
      cards = parseGeneratedCards(textContent);
    } catch (error) {
      if (error instanceof AIProviderError && error.code === "GEMINI_INVALID_JSON") {
        throw new AIProviderError(
          "OPENAI_INVALID_JSON",
          error.message,
          error.status,
          error.detail
        );
      }

      if (error instanceof AIProviderError && error.code === "GEMINI_INVALID_FORMAT") {
        throw new AIProviderError(
          "OPENAI_INVALID_FORMAT",
          error.message,
          error.status,
          error.detail
        );
      }

      throw error;
    }

    if (cards.length === 0) {
      throw new AIProviderError(
        "OPENAI_NO_CARDS_GENERATED",
        "OpenAI returned no usable cards.",
        422
      );
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("[OpenAI] Parsed cards:", {
        count: cards.length,
        model: config.model,
      });
    }

    return cards;
  }

  let response = await requestGemini(prompt, config.apiKey, config.model);

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    if (shouldRetryWithFallbackModel(config.model, response.status, errorBody)) {
      console.warn("[Gemini] Retrying with fallback model:", {
        configuredModel: config.model,
        fallbackModel: FALLBACK_GEMINI_MODEL,
        status: response.status,
      });
      response = await requestGemini(prompt, config.apiKey, FALLBACK_GEMINI_MODEL);
    } else {
      console.error("[Gemini] API error:", response.status, errorBody);
    }
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

  if (process.env.NODE_ENV !== "production") {
    console.log("[Gemini] Parsed cards:", {
      count: cards.length,
      model: config.model,
    });
  }

  return cards;
}
