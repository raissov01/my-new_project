import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { DEV_MODE } from "@/lib/dev-mode";
import { extractText, TextExtractionError } from "@/lib/ai/extract-text";
import {
  AIProviderError,
  generateFlashcardsWithAI,
  normalizeGenerationMode,
  type GenerationMode,
  type GenerationModeInput,
  type GenerationLanguage,
} from "@/lib/ai/gemini";
import { getAIConfigSafe } from "@/lib/ai/config";
import {
  buildVocabularyChunks,
  dedupeVocabularyCards,
  extractExplicitVocabularyPairs,
} from "@/lib/ai/vocabulary-extractor";

const VALID_MODES = new Set<GenerationModeInput>([
  "generation",
  "definition",
  "vocabulary",
  "extraction",
  "mixed",
  "qa",
]);
const VALID_LANGUAGES = new Set<GenerationLanguage>(["kk", "ru", "en"]);
const VALID_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_FLASHCARDS_PER_IMPORT = 1000;

export const runtime = "nodejs";

function countPotentialVocabularyLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        /\t/.test(line) ||
        /\s{3,}/.test(line) ||
        /[—–:]/.test(line) ||
        /\s-\s/.test(line) ||
        /\s->\s/.test(line) ||
        /\s=>\s/.test(line)
    ).length;
}

function scoreChunkForAI(text: string, heuristicCount: number) {
  const potentialLines = countPotentialVocabularyLines(text);
  const densityBoost = Math.min(8, Math.ceil(text.length / 500));

  return {
    potentialLines,
    score:
      heuristicCount === 0
        ? potentialLines + densityBoost
        : potentialLines - heuristicCount * 2 + densityBoost,
  };
}

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
    const modeInput = String(formData.get("mode") ?? "generation");
    const language = String(formData.get("language") ?? "kk");
    const requestedCardCount = Number(formData.get("cardCount") ?? 15);
    const cardCount = Math.min(MAX_FLASHCARDS_PER_IMPORT, Math.max(5, requestedCardCount));

    if (process.env.NODE_ENV !== "production") {
      console.log("[AI Generate] Incoming request:", {
        fileName: file instanceof File ? file.name : null,
        fileType: file instanceof File ? file.type : null,
        mode: modeInput,
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

    if (!VALID_MODES.has(modeInput as GenerationModeInput)) {
      return NextResponse.json(
        { error: "INVALID_MODE", detail: `Unsupported generation mode: ${modeInput}` },
        { status: 400 }
      );
    }

    const mode = normalizeGenerationMode(modeInput as GenerationModeInput);
    const strictExtraction = modeInput === "extraction";

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
      const extractionError =
        err instanceof TextExtractionError
          ? err
          : new TextExtractionError(
              "EXTRACTION_FAILED",
              err instanceof Error ? err.message : "Document text extraction failed."
            );
      console.error("[AI Generate] Text extraction failed:", {
        code: extractionError.code,
        detail: extractionError.detail,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        ocrAttempted: extractionError.ocrAttempted,
        methodsTried: extractionError.methodsTried,
      });
      return NextResponse.json(
        {
          error: extractionError.code,
          detail: extractionError.detail,
          meta: {
            fileName: file.name,
            ocrAttempted: extractionError.ocrAttempted,
            methodsTried: extractionError.methodsTried,
          },
        },
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
        method: extraction.method,
        methodsTried: extraction.methodsTried,
        ocrAttempted: extraction.ocrAttempted,
        preview: extraction.text.slice(0, 500),
        provider: aiConfig?.provider ?? "heuristic-only",
        model: aiConfig?.model ?? null,
      });
    }

    const extractionChunks = buildVocabularyChunks(extraction.text);
    const heuristicCards =
      strictExtraction || mode === "vocabulary"
        ? extractExplicitVocabularyPairs(extraction.text, file.name)
        : [];
    const heuristicCardsByChunk =
      strictExtraction || mode === "vocabulary"
        ? extractionChunks.map((chunk) =>
            extractExplicitVocabularyPairs(chunk.text, chunk.source)
          )
        : extractionChunks.map(() => []);
    const heuristicLimitedCards = heuristicCards.slice(0, cardCount);
    const remainingCardBudget = Math.max(0, cardCount - heuristicLimitedCards.length);
    const rankedAiCandidates =
      strictExtraction || mode === "vocabulary"
        ? extractionChunks
            .map((chunk, index) => {
              const chunkHeuristicCount = heuristicCardsByChunk[index].length;
              const { potentialLines, score } = scoreChunkForAI(chunk.text, chunkHeuristicCount);

              const isCandidate =
                (chunkHeuristicCount === 0 && potentialLines > 0) ||
                (potentialLines >= 6 && chunkHeuristicCount < Math.ceil(potentialLines / 3));

              return {
                chunk,
                chunkHeuristicCount,
                potentialLines,
                score,
                isCandidate,
              };
            })
            .filter((entry) => entry.isCandidate)
            .sort(
              (left, right) =>
                right.score - left.score || left.chunk.text.length - right.chunk.text.length
            )
        : extractionChunks.map((chunk) => ({
            chunk,
            chunkHeuristicCount: 0,
            potentialLines: countPotentialVocabularyLines(chunk.text),
            score: chunk.text.length,
            isCandidate: true,
          }));
    const maxAiChunkCount =
      strictExtraction
        ? 0
        : remainingCardBudget > 0
        ? Math.min(
            rankedAiCandidates.length,
            mode === "vocabulary"
              ? Math.max(18, Math.ceil(remainingCardBudget / 20))
              : Math.max(24, Math.ceil(remainingCardBudget / 12))
          )
        : 0;
    const aiCandidateChunks = rankedAiCandidates
      .slice(0, maxAiChunkCount)
      .map((entry) => entry.chunk);
    const warnings: string[] = [];

    if (process.env.NODE_ENV !== "production") {
      console.log("[AI Generate] Heuristic extraction:", {
          requestedMode: modeInput,
          mode,
          strictExtraction,
        heuristicCount: heuristicCards.length,
        heuristicLimitedCount: heuristicLimitedCards.length,
        remainingCardBudget,
        chunkCount: extractionChunks.length,
        aiCandidateChunkCount: rankedAiCandidates.length,
        selectedAiChunkCount: aiCandidateChunks.length,
        skippedChunkCount: extractionChunks.length - rankedAiCandidates.length,
        deferredAiChunkCount: Math.max(0, rankedAiCandidates.length - aiCandidateChunks.length),
        chunkSizes: extractionChunks.map((chunk) => chunk.text.length),
        averageChunkSize:
          extractionChunks.length > 0
            ? Math.round(
                extractionChunks.reduce((sum, chunk) => sum + chunk.text.length, 0) /
                  extractionChunks.length
              )
            : 0,
      });
    }

    let cards = heuristicLimitedCards;

    // Run AI only on chunks where heuristics likely missed structured pairs.
    if (aiConfig && aiCandidateChunks.length > 0 && remainingCardBudget > 0) {
      try {
        const aiCards = await generateFlashcardsWithAI({
          chunks: aiCandidateChunks,
          mode: mode as GenerationMode,
          language: language as GenerationLanguage,
          cardCount: remainingCardBudget,
        });

        const mergedCards =
          mode === "vocabulary"
            ? dedupeVocabularyCards([
                ...heuristicLimitedCards,
                ...aiCards.map((card) => ({
                  front: card.front,
                  back: card.back,
                  source: card.source,
                })),
              ])
            : dedupeVocabularyCards(
                aiCards.map((card) => ({
                  front: card.front,
                  back: card.back,
                  source: card.source,
                }))
              );

        cards = mergedCards.slice(0, cardCount);
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
    } else if ((strictExtraction || mode === "vocabulary") && remainingCardBudget <= 0) {
      warnings.push("Heuristic extraction already satisfied the requested card count.");
    } else if ((strictExtraction || mode === "vocabulary") && heuristicCards.length > 0) {
      warnings.push("Heuristic extraction covered the document; AI fallback was skipped.");
    }

    cards = dedupeVocabularyCards(cards).slice(0, cardCount);

    if (cards.length === 0) {
      return NextResponse.json(
        {
          error: strictExtraction ? "NO_EXPLICIT_VOCAB_PAIRS" : "GENERATION_NO_CARDS",
          detail:
            warnings[0] ??
            (strictExtraction
              ? "No explicit pairs were found. Try Generation mode."
              : "No useful cards could be generated from this document."),
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
        aiChunkCount: aiCandidateChunks.length,
        aiCandidateChunkCount: rankedAiCandidates.length,
        textLength: extraction.text.length,
        extractionMethod: extraction.method,
        methodsTried: extraction.methodsTried,
        ocrAttempted: extraction.ocrAttempted,
        provider: aiConfig?.provider ?? "heuristic-only",
        model: aiConfig?.model ?? null,
        heuristicCount: heuristicCards.length,
        mode,
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
