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
import { getAIConfig } from "@/lib/ai/config";

const VALID_MODES = new Set<GenerationMode>(["mixed", "definition", "qa", "vocabulary"]);
const VALID_LANGUAGES = new Set<GenerationLanguage>(["kk", "ru", "en"]);
const VALID_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Auth check
  if (!DEV_MODE) {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
  }

  try {
    const aiConfig = getAIConfig();
    const formData = await request.formData();
    const file = formData.get("file");
    const mode = String(formData.get("mode") ?? "mixed");
    const language = String(formData.get("language") ?? "kk");
    const requestedCardCount = Number(formData.get("cardCount") ?? 15);
    const cardCount = Math.min(50, Math.max(5, requestedCardCount));

    if (process.env.NODE_ENV !== "production") {
      console.log("[AI Generate] Incoming request:", {
        mode,
        language,
        requestedCardCount,
        cardCount,
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

    if (file.size > aiConfig.maxUploadBytes) {
      return NextResponse.json(
        {
          error: "FILE_TOO_LARGE",
          detail: `File size ${file.size} exceeds ${aiConfig.maxUploadBytes} bytes.`,
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
        model: aiConfig.geminiModel,
      });
    }

    // Step 2: Generate flashcards with AI
    const cards = await generateFlashcardsWithAI({
      chunks: extraction.chunks,
      mode: mode as GenerationMode,
      language: language as GenerationLanguage,
      cardCount,
    });

    if (process.env.NODE_ENV !== "production") {
      console.log("[AI Generate] Generation complete:", {
        fileName: file.name,
        cards: cards.length,
      });
    }

    return NextResponse.json({
      cards,
      meta: {
        fileName: file.name,
        pageCount: extraction.pageCount,
        chunkCount: extraction.chunks.length,
        textLength: extraction.text.length,
        model: aiConfig.geminiModel,
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

    if (message === "AI_CONFIG_MISSING_API_KEY") {
      return NextResponse.json(
        {
          error: "AI_CONFIG_MISSING_API_KEY",
          detail: "GEMINI_API_KEY is not configured on the server.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "GENERATION_FAILED", detail: message },
      { status: 500 }
    );
  }
}
