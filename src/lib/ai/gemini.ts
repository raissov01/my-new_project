import { getAIConfig } from "./config";
import type { TextChunk } from "./extract-text";
import { dedupeVocabularyCards } from "./vocabulary-extractor";

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
  mixed: "Extract any explicit term-meaning or word-translation pair exactly as written.",
  definition: "Focus on explicit term -> definition pairs only.",
  qa: "Only keep question -> answer pairs if both are explicitly written in the source.",
  vocabulary: "Focus on word/term -> meaning/translation pairs only.",
};

function buildPrompt(options: GenerateOptions, chunk: TextChunk, chunkCardCount: number) {
  const langName = LANGUAGE_NAMES[options.language];
  const modeInstr = MODE_INSTRUCTIONS[options.mode];

  return `You are a strict information extraction system.

Your task is to parse a vocabulary or glossary document and convert it into flashcards.

IMPORTANT RULES:
- DO NOT generate or invent anything
- DO NOT add examples
- DO NOT explain anything
- USE ONLY the information explicitly written in the text
- If a word-definition pair is not clearly present -> SKIP it
- Do not merge multiple entries
- Do not guess meanings
- Generate up to ${chunkCardCount} flashcards from this chunk, but fewer is allowed if the chunk contains fewer clear pairs
- Output language: ${langName}. Keep the extracted content in ${langName} when the source supports it
- ${modeInstr}
- Chunk source label: ${chunk.source}

A flashcard must contain:
- front: the word or term
- back: its exact translation, meaning, or definition from the document

Return ONLY valid JSON.
Preferred format:
{
  "cards": [
    {
      "front": "",
      "back": ""
    }
  ]
}

If your system does not support an object wrapper, a plain JSON array is also acceptable.

Text:
${chunk.text}
`;
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

  const normalized = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { cards?: unknown }).cards)
      ? (parsed as { cards: unknown[] }).cards
      : null;

  if (!normalized) {
    throw new AIProviderError(
      "GEMINI_INVALID_FORMAT",
      "Model returned a payload without a cards array.",
      502
    );
  }

  const validDifficulties = new Set(["easy", "medium", "hard"]);

  return normalized
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

function normalizeProviderCards(cards: GeneratedCard[], fallbackSource: string) {
  return cards.map((card) => ({
    front: card.front.trim(),
    back: card.back.trim(),
    category: card.category || "General",
    difficulty: card.difficulty || "medium",
    source: card.source || fallbackSource,
  }));
}

function mapOpenAIParseError(error: unknown) {
  if (error instanceof AIProviderError && error.code === "GEMINI_INVALID_JSON") {
    return new AIProviderError(
      "OPENAI_INVALID_JSON",
      error.message,
      error.status,
      error.detail
    );
  }

  if (error instanceof AIProviderError && error.code === "GEMINI_INVALID_FORMAT") {
    return new AIProviderError(
      "OPENAI_INVALID_FORMAT",
      error.message,
      error.status,
      error.detail
    );
  }

  return error;
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
                required: ["front", "back"],
                properties: {
                  front: { type: "STRING" },
                  back: { type: "STRING" },
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
              type: "object",
              required: ["cards"],
              additionalProperties: false,
              properties: {
                cards: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["front", "back"],
                    additionalProperties: false,
                    properties: {
                      front: { type: "string" },
                      back: { type: "string" },
                    },
                  },
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

  const chunkTarget = Math.max(
    2,
    Math.min(8, Math.ceil(options.cardCount / Math.max(options.chunks.length, 1)) + 1)
  );
  const collectedCards: GeneratedCard[] = [];
  const chunkErrors: string[] = [];

  for (const [index, chunk] of options.chunks.entries()) {
    const prompt = buildPrompt(options, chunk, chunkTarget);

    try {
      if (config.provider === "openai") {
        const response = await requestOpenAI(prompt, config.apiKey, config.model);

        if (!response.ok) {
          const errorBody = await response.text().catch(() => "");
          console.error("[OpenAI] API error:", {
            chunk: chunk.source,
            status: response.status,
            body: errorBody.slice(0, 600),
          });

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

        if (process.env.NODE_ENV !== "production") {
          console.log("[OpenAI] Raw model output:", {
            chunk: chunk.source,
            preview: textContent.slice(0, 500),
            index,
          });
        }

        if (!textContent) {
          throw new AIProviderError(
            "OPENAI_EMPTY_RESPONSE",
            "OpenAI returned an empty response.",
            502,
            JSON.stringify(data).slice(0, 300)
          );
        }

        const cards = normalizeProviderCards(
          parseGeneratedCards(textContent),
          chunk.source
        );

        if (process.env.NODE_ENV !== "production") {
          console.log("[OpenAI] Parsed chunk result:", {
            chunk: chunk.source,
            count: cards.length,
            index,
          });
        }

        collectedCards.push(...cards);
        continue;
      }

      let response = await requestGemini(prompt, config.apiKey, config.model);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        if (shouldRetryWithFallbackModel(config.model, response.status, errorBody)) {
          console.warn("[Gemini] Retrying with fallback model:", {
            configuredModel: config.model,
            fallbackModel: FALLBACK_GEMINI_MODEL,
            status: response.status,
            chunk: chunk.source,
          });
          response = await requestGemini(prompt, config.apiKey, FALLBACK_GEMINI_MODEL);
        } else {
          console.error("[Gemini] API error:", {
            chunk: chunk.source,
            status: response.status,
            body: errorBody.slice(0, 600),
          });
        }
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
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

      if (process.env.NODE_ENV !== "production") {
        console.log("[Gemini] Raw model output:", {
          chunk: chunk.source,
          preview: textContent.slice(0, 500),
          index,
        });
      }

      if (!textContent) {
        throw new AIProviderError(
          "GEMINI_EMPTY_RESPONSE",
          "Gemini returned an empty response.",
          502,
          JSON.stringify(data).slice(0, 300)
        );
      }

      const cards = normalizeProviderCards(
        parseGeneratedCards(textContent),
        chunk.source
      );

      if (process.env.NODE_ENV !== "production") {
        console.log("[Gemini] Parsed chunk result:", {
          chunk: chunk.source,
          count: cards.length,
          index,
        });
      }

      collectedCards.push(...cards);
    } catch (error) {
      const mapped = config.provider === "openai" ? mapOpenAIParseError(error) : error;
      const message =
        mapped instanceof AIProviderError
          ? `${mapped.code}: ${mapped.detail ?? mapped.message}`
          : mapped instanceof Error
            ? mapped.message
            : "Unknown chunk failure";

      console.error("[AI] Chunk extraction failed:", {
        provider: config.provider,
        chunk: chunk.source,
        index,
        message,
      });
      chunkErrors.push(`${chunk.source}: ${message}`);
    }
  }

  const finalCards = dedupeVocabularyCards(
    collectedCards.map((card) => ({
      front: card.front,
      back: card.back,
      source: card.source,
    }))
  )
    .slice(0, options.cardCount)
    .map((card) => ({
      front: card.front,
      back: card.back,
      category: "General",
      difficulty: "medium" as const,
      source: card.source ?? "Document",
    }));

  if (process.env.NODE_ENV !== "production") {
    console.log("[AI] Final merged cards:", {
      provider: config.provider,
      model: config.model,
      count: finalCards.length,
      chunkErrors,
    });
  }

  if (finalCards.length === 0) {
    throw new AIProviderError(
      config.provider === "openai"
        ? "OPENAI_NO_CARDS_GENERATED"
        : "GEMINI_NO_CARDS_GENERATED",
      "No usable cards were extracted from the document.",
      422,
      chunkErrors[0] ?? "No explicit vocabulary pairs were found."
    );
  }

  return finalCards;
}
