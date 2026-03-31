import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { DEV_MODE } from "@/lib/dev-mode";
import { extractText } from "@/lib/ai/extract-text";
import {
  generateFlashcardsWithAI,
  type GenerationMode,
  type GenerationLanguage,
} from "@/lib/ai/gemini";

const VALID_MODES = new Set<GenerationMode>(["mixed", "definition", "qa", "vocabulary"]);
const VALID_LANGUAGES = new Set<GenerationLanguage>(["kk", "ru", "en"]);
const VALID_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function POST(request: NextRequest) {
  // Auth check
  if (!DEV_MODE) {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const mode = String(formData.get("mode") ?? "mixed");
    const language = String(formData.get("language") ?? "kk");
    const cardCount = Math.min(50, Math.max(5, Number(formData.get("cardCount") ?? 15)));

    // Validate file
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "NO_FILE" }, { status: 400 });
    }

    if (!VALID_MIME_TYPES.has(file.type) && !file.name.match(/\.(pdf|docx)$/i)) {
      return NextResponse.json({ error: "UNSUPPORTED_FILE_TYPE" }, { status: 400 });
    }

    if (!VALID_MODES.has(mode as GenerationMode)) {
      return NextResponse.json({ error: "INVALID_MODE" }, { status: 400 });
    }

    if (!VALID_LANGUAGES.has(language as GenerationLanguage)) {
      return NextResponse.json({ error: "INVALID_LANGUAGE" }, { status: 400 });
    }

    // Step 1: Extract text from document
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extraction;
    try {
      extraction = await extractText(buffer, file.type, file.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : "EXTRACTION_FAILED";
      console.error("[AI Generate] Text extraction failed:", message);
      return NextResponse.json({ error: message }, { status: 422 });
    }

    if (!extraction.text || extraction.text.trim().length < 50) {
      return NextResponse.json({ error: "INSUFFICIENT_TEXT" }, { status: 422 });
    }

    // Step 2: Generate flashcards with AI
    const cards = await generateFlashcardsWithAI({
      chunks: extraction.chunks,
      mode: mode as GenerationMode,
      language: language as GenerationLanguage,
      cardCount,
    });

    return NextResponse.json({
      cards,
      meta: {
        fileName: file.name,
        pageCount: extraction.pageCount,
        chunkCount: extraction.chunks.length,
        textLength: extraction.text.length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    console.error("[AI Generate] Unhandled error:", message);

    if (message.startsWith("GEMINI_")) {
      return NextResponse.json({ error: message }, { status: 502 });
    }

    return NextResponse.json({ error: "GENERATION_FAILED" }, { status: 500 });
  }
}
