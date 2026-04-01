import { getAIConfig, type AIConfig } from "./config";
import type { TextChunk } from "./extract-text";
import {
  dedupeVocabularyCards,
  splitChunkForRetry,
} from "./vocabulary-extractor";

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
const OPENAI_MODEL_COMPAT_FALLBACKS: Record<string, string> = {
  "gpt-5.4-mini": "gpt-5-mini",
  "gpt-5.4": "gpt-5",
};
const OPENAI_CHUNK_TIMEOUT_MS = 25_000;
const GEMINI_CHUNK_TIMEOUT_MS = 30_000;
const MAX_RETRY_DEPTH = 2;

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

type ChunkExecutionResult = {
  cards: GeneratedCard[];
  modelUsed: string;
  durationMs: number;
};

type ChunkRecoveryOptions = {
  chunk: TextChunk;
  options: GenerateOptions;
  config: AIConfig;
  preferredModel: string;
  depth: number;
  escalated: boolean;
  stats: {
    successfulChunks: number;
    failedChunks: number;
  };
  errors: string[];
};

const STRICT_PROMPT = `You are a strict information extraction system.
Extract only explicit vocabulary pairs from the provided text.
Do not invent anything.
Do not explain anything.
Use only the provided text.
Recognize formats like:
- word — translation
- word: definition
- 2-column vocabulary tables
Return only valid JSON:
[
  { "front": "", "back": "" }
]`;

const GENERATION_PROMPT = `You are a smart flashcard generation system.

Your task is to read the provided document text and generate useful flashcards from its content.

IMPORTANT:
- This mode is GENERATION mode, so you may create definitions, explanations, translations, or answers based on the document content
- Use only the document as the source of truth
- Do not invent unrelated information
- Keep cards accurate, concise, and useful for study
- Adapt to the type of content automatically

RULES:
- If the document contains isolated words or terms, generate clear meanings, definitions, or translations
- If the document contains concepts, generate term/definition flashcards
- If the document contains questions or prompts, generate question/answer flashcards
- Choose the most suitable flashcard structure automatically
- Do not return mixed messy formats
- Keep each card clean and easy to study

Return only valid JSON in one consistent format:
[
  {
    "front": "",
    "back": ""
  }
]`;

function getLanguageInstruction(language: GenerationLanguage) {
  switch (language) {
    case "kk":
      return "Prefer Kazakh wording when the document supports it.";
    case "ru":
      return "Prefer Russian wording when the document supports it.";
    case "en":
      return "Prefer English wording when the document supports it.";
    default:
      return "";
  }
}

function getModeInstruction(mode: GenerationMode) {
  switch (mode) {
    case "vocabulary":
      return "Only extract explicit word/term pairs from the text.";
    case "definition":
      return "Prefer concise term-definition cards.";
    case "qa":
      return "Prefer clean question-answer cards when the content supports that structure.";
    case "mixed":
    default:
      return "Choose the most useful study card structure automatically.";
  }
}

function buildPrompt(chunk: TextChunk, options: GenerateOptions) {
  const basePrompt = options.mode === "vocabulary" ? STRICT_PROMPT : GENERATION_PROMPT;
  const limitInstruction = `Generate up to ${options.cardCount} cards from this chunk if the content supports it.`;
  const modeInstruction = getModeInstruction(options.mode);
  const languageInstruction = getLanguageInstruction(options.language);

  return `${basePrompt}

${modeInstruction}
${languageInstruction}
${limitInstruction}

Text:
${chunk.text}`;
}

function parseGeneratedCards(raw: string, provider: "openai" | "gemini"): GeneratedCard[] {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new AIProviderError(
      provider === "openai" ? "OPENAI_INVALID_JSON" : "GEMINI_INVALID_JSON",
      `${provider} returned invalid JSON.`,
      502,
      cleaned.slice(0, 400)
    );
  }

  const normalized = Array.isArray(parsed)
    ? parsed
    : parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as { cards?: unknown }).cards)
      ? (parsed as { cards: unknown[] }).cards
      : null;

  if (!normalized) {
    throw new AIProviderError(
      provider === "openai" ? "OPENAI_INVALID_FORMAT" : "GEMINI_INVALID_FORMAT",
      `${provider} returned a payload without a cards array.`,
      502
    );
  }

  return normalized
    .filter(
      (card): card is Record<string, unknown> =>
        card !== null && typeof card === "object"
    )
    .map((card) => ({
      front: String(card.front ?? "").trim(),
      back: String(card.back ?? "").trim(),
      category: "General",
      difficulty: "medium" as const,
      source: "",
    }))
    .filter((card) => card.front.length > 0 && card.back.length > 0);
}

function extractGeminiTextResponse(data: unknown) {
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

function extractOpenAITextResponse(data: unknown) {
  if (!data || typeof data !== "object") return "";

  const firstChoice = (data as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
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

function getChunkRetrySize(length: number, depth: number) {
  if (depth === 0) {
    return Math.max(700, Math.floor(length / 2));
  }

  return Math.max(450, Math.floor(length / 2));
}

function shouldSplitChunk(error: unknown, chunk: TextChunk, depth: number) {
  if (depth >= MAX_RETRY_DEPTH) return false;
  if (chunk.text.length < 700) return false;

  if (!(error instanceof AIProviderError)) {
    return true;
  }

  return (
    error.code.endsWith("_TIMEOUT") ||
    error.code.endsWith("_EMPTY_RESPONSE") ||
    error.code.endsWith("_INVALID_JSON") ||
    error.code.endsWith("_API_HTTP_ERROR")
  );
}

function shouldEscalateChunk(
  error: unknown,
  config: AIConfig,
  preferredModel: string,
  escalated: boolean
) {
  if (config.provider !== "openai") return false;
  if (escalated) return false;
  if (!config.escalationModel) return false;
  if (preferredModel !== config.model) return false;

  if (!(error instanceof AIProviderError)) {
    return true;
  }

  return (
    error.code === "OPENAI_TIMEOUT" ||
    error.code === "OPENAI_EMPTY_RESPONSE" ||
    error.code === "OPENAI_INVALID_JSON" ||
    error.code === "OPENAI_API_HTTP_ERROR"
  );
}

function formatChunkError(error: unknown) {
  if (error instanceof AIProviderError) {
    return `${error.code}: ${error.detail ?? error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown chunk failure";
}

function isModelCompatibilityError(status: number, bodyText: string) {
  if (status !== 400 && status !== 404) {
    return false;
  }

  const body = bodyText.toLowerCase();
  return (
    body.includes("model") &&
    (body.includes("does not exist") ||
      body.includes("not found") ||
      body.includes("unsupported") ||
      body.includes("unavailable"))
  );
}

async function requestGeminiChunk(
  prompt: string,
  apiKey: string,
  model: string
): Promise<ChunkExecutionResult> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_CHUNK_TIMEOUT_MS);

  try {
    let response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            topP: 0.1,
            maxOutputTokens: 3072,
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

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      if (isModelCompatibilityError(response.status, body) && model !== FALLBACK_GEMINI_MODEL) {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${FALLBACK_GEMINI_MODEL}:generateContent`,
          {
            method: "POST",
            headers: {
              "x-goog-api-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0,
                topP: 0.1,
                maxOutputTokens: 3072,
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
        model = FALLBACK_GEMINI_MODEL;
      } else if (response.status === 429) {
        throw new AIProviderError("GEMINI_RATE_LIMITED", "Gemini rate limit exceeded.", 429, body);
      } else {
        throw new AIProviderError(
          "GEMINI_API_HTTP_ERROR",
          `Gemini API returned ${response.status}.`,
          502,
          body.slice(0, 400)
        );
      }
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new AIProviderError(
        "GEMINI_API_HTTP_ERROR",
        `Gemini API returned ${response.status}.`,
        502,
        body.slice(0, 400)
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

    const rawOutput = extractGeminiTextResponse(data);
    if (process.env.NODE_ENV !== "production") {
      console.log("[AI][Gemini] Raw chunk output:", {
        model,
        durationMs: Date.now() - startedAt,
        preview: rawOutput.slice(0, 500),
      });
    }

    if (!rawOutput) {
      throw new AIProviderError(
        "GEMINI_EMPTY_RESPONSE",
        "Gemini returned an empty response.",
        502,
        JSON.stringify(data).slice(0, 300)
      );
    }

    const cards = parseGeneratedCards(rawOutput, "gemini");
    return {
      cards: cards.map((card) => ({ ...card, source: "" })),
      modelUsed: model,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AIProviderError("GEMINI_TIMEOUT", "Gemini request timed out.", 504);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function requestOpenAIChunk(
  prompt: string,
  apiKey: string,
  model: string
): Promise<ChunkExecutionResult> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_CHUNK_TIMEOUT_MS);

  try {
    let activeModel = model;

    const send = async (targetModel: string) =>
      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [
            {
              role: "system",
              content: STRICT_PROMPT,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0,
          max_completion_tokens: 2500,
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

    let response = await send(activeModel);
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const compatibilityFallback = OPENAI_MODEL_COMPAT_FALLBACKS[activeModel];
      if (compatibilityFallback && isModelCompatibilityError(response.status, body)) {
        activeModel = compatibilityFallback;
        response = await send(activeModel);
      } else if (response.status === 429) {
        throw new AIProviderError("OPENAI_RATE_LIMITED", "OpenAI rate limit exceeded.", 429, body);
      } else {
        throw new AIProviderError(
          "OPENAI_API_HTTP_ERROR",
          `OpenAI API returned ${response.status}.`,
          502,
          body.slice(0, 400)
        );
      }
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new AIProviderError(
        "OPENAI_API_HTTP_ERROR",
        `OpenAI API returned ${response.status}.`,
        502,
        body.slice(0, 400)
      );
    }

    const data = await response.json();
    const rawOutput = extractOpenAITextResponse(data);

    if (process.env.NODE_ENV !== "production") {
      console.log("[AI][OpenAI] Raw chunk output:", {
        model: activeModel,
        durationMs: Date.now() - startedAt,
        preview: rawOutput.slice(0, 500),
      });
    }

    if (!rawOutput) {
      throw new AIProviderError(
        "OPENAI_EMPTY_RESPONSE",
        "OpenAI returned an empty response.",
        502,
        JSON.stringify(data).slice(0, 300)
      );
    }

    const cards = parseGeneratedCards(rawOutput, "openai");
    return {
      cards: cards.map((card) => ({ ...card, source: "" })),
      modelUsed: activeModel,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AIProviderError("OPENAI_TIMEOUT", "OpenAI request timed out.", 504);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function executeChunk(
  chunk: TextChunk,
  prompt: string,
  config: AIConfig,
  preferredModel: string
): Promise<ChunkExecutionResult> {
  if (config.provider === "openai") {
    return requestOpenAIChunk(prompt, config.apiKey, preferredModel);
  }

  return requestGeminiChunk(prompt, config.apiKey, preferredModel);
}

async function processChunkWithRecovery({
  chunk,
  options,
  config,
  preferredModel,
  depth,
  escalated,
  stats,
  errors,
}: ChunkRecoveryOptions): Promise<GeneratedCard[]> {
  const prompt = buildPrompt(chunk, options);

  try {
    const result = await executeChunk(chunk, prompt, config, preferredModel);
    stats.successfulChunks += 1;

    if (process.env.NODE_ENV !== "production") {
      console.log("[AI] Chunk success:", {
        chunk: chunk.source,
        textLength: chunk.text.length,
        modelUsed: result.modelUsed,
        durationMs: result.durationMs,
        cards: result.cards.length,
        depth,
      });
    }

    return result.cards.map((card) => ({
      ...card,
      source: chunk.source,
    }));
  } catch (error) {
    if (shouldSplitChunk(error, chunk, depth)) {
      const smallerChunks = splitChunkForRetry(chunk, getChunkRetrySize(chunk.text.length, depth));
      if (smallerChunks.length > 1) {
        if (process.env.NODE_ENV !== "production") {
          console.log("[AI] Splitting failed chunk:", {
            chunk: chunk.source,
            originalLength: chunk.text.length,
            splitInto: smallerChunks.length,
            preferredModel,
            depth,
            reason: formatChunkError(error),
          });
        }

        const nestedCards: GeneratedCard[] = [];
        for (const smallerChunk of smallerChunks) {
          nestedCards.push(
            ...(await processChunkWithRecovery({
              chunk: smallerChunk,
              options,
              config,
              preferredModel,
              depth: depth + 1,
              escalated,
              stats,
              errors,
            }))
          );
        }

        if (nestedCards.length > 0) {
          return nestedCards;
        }
      }
    }

    if (shouldEscalateChunk(error, config, preferredModel, escalated)) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[AI] Escalating chunk model:", {
          chunk: chunk.source,
          fromModel: preferredModel,
          toModel: config.escalationModel,
          depth,
          reason: formatChunkError(error),
        });
      }

      return processChunkWithRecovery({
        chunk,
        options,
        config,
        preferredModel: config.escalationModel!,
        depth,
        escalated: true,
        stats,
        errors,
      });
    }

    const message = formatChunkError(error);
    stats.failedChunks += 1;
    errors.push(`${chunk.source}: ${message}`);

    console.error("[AI] Chunk extraction failed:", {
      provider: config.provider,
      chunk: chunk.source,
      textLength: chunk.text.length,
      modelTried: preferredModel,
      depth,
      message,
    });

    return [];
  }
}

export async function generateFlashcardsWithAI(
  options: GenerateOptions
): Promise<GeneratedCard[]> {
  const config = getAIConfig();
  const stats = {
    successfulChunks: 0,
    failedChunks: 0,
  };
  const chunkErrors: string[] = [];

  if (process.env.NODE_ENV !== "production") {
    console.log("[AI] Starting chunked extraction:", {
      provider: config.provider,
      model: config.model,
      escalationModel: config.escalationModel ?? null,
      chunkCount: options.chunks.length,
      chunkSizes: options.chunks.map((chunk) => chunk.text.length),
      totalTextLength: options.chunks.reduce((sum, chunk) => sum + chunk.text.length, 0),
    });
  }

  const collectedCards: GeneratedCard[] = [];

  for (const chunk of options.chunks) {
    const currentUniqueCount = dedupeVocabularyCards(
      collectedCards.map((card) => ({
        front: card.front,
        back: card.back,
        source: card.source,
      }))
    ).length;

    if (currentUniqueCount >= options.cardCount) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[AI] Early stop after reaching requested card budget:", {
          requestedCardCount: options.cardCount,
          currentUniqueCount,
          remainingChunks: options.chunks.length - options.chunks.indexOf(chunk),
        });
      }
      break;
    }

    collectedCards.push(
      ...(await processChunkWithRecovery({
        chunk,
        options,
        config,
        preferredModel: config.model,
        depth: 0,
        escalated: false,
        stats,
        errors: chunkErrors,
      }))
    );
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
    console.log("[AI] Chunk extraction summary:", {
      provider: config.provider,
      defaultModel: config.model,
      escalationModel: config.escalationModel ?? null,
      successfulChunkCount: stats.successfulChunks,
      failedChunkCount: stats.failedChunks,
      finalCardCount: finalCards.length,
      failedChunks: chunkErrors,
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
