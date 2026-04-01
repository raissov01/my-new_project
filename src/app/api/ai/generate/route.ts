import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { DEV_MODE } from "@/lib/dev-mode";
import { extractText } from "@/lib/ai/extract-text";
import {
  AIProviderError,
  generateFlashcardsWithAI,
  type GenerationMode,
  type GenerationLanguage,
} from "@/lib/ai/gemini";
import { getAIConfigSafe } from "@/lib/ai/config";
import {
  buildVocabularyChunks,
  dedupeVocabularyCards,
  extractExplicitVocabularyPairs,
} from "@/lib/ai/vocabulary-extractor";

const VALID_MODES = new Set<GenerationMode>(["mixed", "definition", "qa", "vocabulary"]);
const VALID_LANGUAGES = new Set<GenerationLanguage>(["kk", "ru", "en"]);
const VALID_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (!DEV_MODE) {
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
      }
    }

    const aiConfig = getAIConfigSafe();
    const formData = await request.formData();
    const file = formData.get("file");
    const mode = String(formData.get("mode") ?? "mixed");
    const language = String(formData.get("language") ?? "kk");
    const requestedCardCount = Number(formData.get("cardCount") ?? 15);
    const cardCount = Math.min(50, Math.max(5, requestedCardCount));

    if (process.env.NODE_ENV !== "production") {
      console.log("[AI Generate] Incoming request:", {
        fileName: file instanceof File ? file.name : null,
        fileType: file instanceof File ? file.type : null,
        mode,
        language,
        requestedCardCount,
        cardCount,
        provider: aiConfig?.provider ?? "heuristic-only",
        model: aiConfig?.model ?? null,
      });
    }

    // Validate file
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "NO_FILE", detail: "The request did not include a file." },
        { status: 400 }
      );
    }

    if (!VALID_MIME_TYPES.has(file.type) && !file.name.match(/\.(pdf|docx)$/i)) {
      return NextResponse.json(
        {
          error: "UNSUPPORTED_FILE_TYPE",
          detail: `Received type "${file.type || "unknown"}" for file "${file.name}".`,
        },
        { status: 400 }
      );
    }

    if (!VALID_MODES.has(mode as GenerationMode)) {
      return NextResponse.json(
        { error: "INVALID_MODE", detail: `Unsupported generation mode: ${mode}` },
        { status: 400 }
      );
    }

    if (!VALID_LANGUAGES.has(language as GenerationLanguage)) {
      return NextResponse.json(
        { error: "INVALID_LANGUAGE", detail: `Unsupported language: ${language}` },
        { status: 400 }
      );
    }

    if (!Number.isFinite(requestedCardCount)) {
      return NextResponse.json(
        { error: "INVALID_CARD_COUNT", detail: "cardCount must be numeric." },
        { status: 400 }
      );
    }

    const maxUploadBytes = aiConfig?.maxUploadBytes ?? 20 * 1024 * 1024;

    if (file.size > maxUploadBytes) {
      return NextResponse.json(
        {
          error: "FILE_TOO_LARGE",
          detail: `File size ${file.size} exceeds ${maxUploadBytes} bytes.`,
        },
        { status: 400 }
      );
    }

    // Step 1: Extract text from document
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extraction;
    try {
      extraction = await extractText(buffer, file.type, file.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : "EXTRACTION_FAILED";
      console.error("[AI Generate] Text extraction failed:", {
        message,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
      });
      return NextResponse.json(
        { error: message, detail: "Document text extraction failed." },
        { status: 422 }
      );
    }

    if (!extraction.text || extraction.text.trim().length < 50) {
      return NextResponse.json(
        {
          error: "INSUFFICIENT_TEXT",
          detail: `Only ${extraction.text?.trim().length ?? 0} characters were extracted.`,
        },
        { status: 422 }
      );
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("[AI Generate] Extraction complete:", {
        fileName: file.name,
        chunkCount: extraction.chunks.length,
        pageCount: extraction.pageCount,
        textLength: extraction.text.length,
        preview: extraction.text.slice(0, 500),
        provider: aiConfig?.provider ?? "heuristic-only",
        model: aiConfig?.model ?? null,
      });
    }

    const heuristicCards = extractExplicitVocabularyPairs(extraction.text, file.name);
    const extractionChunks = buildVocabularyChunks(extraction.text);
    const warnings: string[] = [];

    if (process.env.NODE_ENV !== "production") {
      console.log("[AI Generate] Heuristic extraction:", {
        heuristicCount: heuristicCards.length,
        chunkCount: extractionChunks.length,
      });
    }

    let cards = heuristicCards;

    if (cards.length < cardCount && aiConfig && extractionChunks.length > 0) {
      try {
        const aiCards = await generateFlashcardsWithAI({
          chunks: extractionChunks,
          mode: mode as GenerationMode,
          language: language as GenerationLanguage,
          cardCount,
        });

        cards = dedupeVocabularyCards([
          ...heuristicCards,
          ...aiCards.map((card) => ({
            front: card.front,
            back: card.back,
            source: card.source,
          })),
        ]);
      } catch (error) {
        const detail =
          error instanceof AIProviderError
            ? `${error.code}: ${error.detail ?? error.message}`
            : error instanceof Error
              ? error.message
              : "Unknown AI extraction failure";
        warnings.push(detail);
        console.error("[AI Generate] AI chunk extraction failed:", detail);
      }
    } else if (!aiConfig) {
      warnings.push("AI provider key missing, heuristic extraction only.");
    }

    cards = dedupeVocabularyCards(cards).slice(0, cardCount);

    if (cards.length === 0) {
      return NextResponse.json(
        {
          error: "NO_EXPLICIT_VOCAB_PAIRS",
          detail:
            warnings[0] ??
            "No explicit word-definition or word-translation pairs were found in the document.",
        },
        { status: 422 }
      );
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("[AI Generate] Generation complete:", {
        fileName: file.name,
        cards: cards.length,
        warnings,
      });
    }

    return NextResponse.json({
      cards: cards.map((card) => ({
        front: card.front,
        back: card.back,
        source: card.source ?? file.name,
      })),
      warnings,
      meta: {
        fileName: file.name,
        pageCount: extraction.pageCount,
        chunkCount: extractionChunks.length,
        textLength: extraction.text.length,
        provider: aiConfig?.provider ?? "heuristic-only",
        model: aiConfig?.model ?? null,
        heuristicCount: heuristicCards.length,
      },
    });
  } catch (err) {
    if (err instanceof AIProviderError) {
      console.error("[AI Generate] AI provider error:", {
        code: err.code,
        message: err.message,
        detail: err.detail,
        status: err.status,
      });
      return NextResponse.json(
        { error: err.code, detail: err.detail ?? err.message },
        { status: err.status }
      );
    }

    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    console.error("[AI Generate] Unhandled error:", err);
    return NextResponse.json({ error: "GENERATION_FAILED", detail: message }, { status: 500 });
  }
}
