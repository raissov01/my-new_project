import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MIN_TEXT_LENGTH = 50;

type AIResponse = {
  cards: Array<Record<string, unknown>>;
  meta?: Record<string, unknown>;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]+/g, " ").trim();
}

function estimateChunkCount(text: string) {
  return Math.max(1, Math.ceil(text.length / 6000));
}

async function extractTextFromPdf(file: File) {
  // Import the parser implementation directly. The package root includes
  // a debug-only side effect that can misfire under bundling in production.
  const pdfModule = await import("pdf-parse/lib/pdf-parse.js");
  const pdf = "default" in pdfModule ? pdfModule.default : pdfModule;
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await pdf(buffer);

  return {
    text: normalizeWhitespace(result.text ?? ""),
    pageCount: typeof result.numpages === "number" ? result.numpages : null,
  };
}

async function extractTextFromDocx(file: File) {
  const mammoth = await import("mammoth");
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await mammoth.extractRawText({ buffer });

  return {
    text: normalizeWhitespace(result.value ?? ""),
    pageCount: null,
  };
}

function badRequest(error: string, detail?: string, status = 400) {
  return NextResponse.json(
    { error, ...(detail ? { detail } : {}) },
    { status }
  );
}

export async function POST(request: Request) {
  try {
  const user = await getCurrentUser();
  if (!user) {
    return badRequest("NOT_AUTHENTICATED", "Login required.", 401);
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const mode = String(formData.get("mode") ?? "generation").trim() || "generation";
  const language = String(formData.get("language") ?? "kk").trim() || "kk";
  const cardCountRaw = Number.parseInt(String(formData.get("cardCount") ?? "15"), 10);
  const cardCount = Number.isFinite(cardCountRaw) ? cardCountRaw : 15;

  if (!(file instanceof File)) {
    return badRequest("NO_FILE", "No upload received.");
  }

  const lowerName = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");
  const isDocx =
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx");

  if (!isPdf && !isDocx) {
    return badRequest("UNSUPPORTED_FILE_TYPE", "Only PDF and DOCX files are supported.");
  }

  if (file.size > MAX_FILE_BYTES) {
    return badRequest("FILE_TOO_LARGE", "Maximum file size is 20 MB.");
  }

  let extracted: { text: string; pageCount: number | null };
  try {
    extracted = isPdf
      ? await extractTextFromPdf(file)
      : await extractTextFromDocx(file);
  } catch (error) {
    console.error("[ai/generate] Text extraction failed:", error);
    const message = error instanceof Error ? error.message : "Unexpected extraction failure";

    // Check for module-not-found errors (standalone build missing packages)
    const isModuleError =
      message.includes("Cannot find module") ||
      message.includes("MODULE_NOT_FOUND") ||
      message.includes("is not a function");

    if (isModuleError) {
      return badRequest(
        isPdf ? "PDF_PARSER_UNAVAILABLE" : "DOCX_PARSER_UNAVAILABLE",
        "File parser is not available in this environment. Please contact the administrator.",
        503
      );
    }

    return badRequest(
      isPdf ? "PDF_EXTRACTION_FAILED" : "DOCX_EXTRACTION_FAILED",
      message,
      500
    );
  }

  if (extracted.text.length < MIN_TEXT_LENGTH) {
    return badRequest("INSUFFICIENT_TEXT", "Not enough readable text was found in the file.");
  }

  try {
    const response = await fetchBackendJson<AIResponse>({
      path: "/api/v1/ai/generate",
      userId: user.id,
      method: "POST",
      body: JSON.stringify({
        text: extracted.text,
        mode,
        language,
        cardCount,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      timeoutMs: 600_000,
    });

    return NextResponse.json({
      ...response,
      meta: {
        ...(response.meta ?? {}),
        fileName: file.name,
        pageCount: extracted.pageCount,
        chunkCount: estimateChunkCount(extracted.text),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected AI request failure";
    return badRequest("GENERATION_FAILED", message, 500);
  }
  } catch (outerError) {
    // Global safety net — ensures the route NEVER crashes without sending a response
    console.error("[ai/generate] Unhandled error:", outerError);
    const message = outerError instanceof Error ? outerError.message : "Internal server error";
    return badRequest("GENERATION_FAILED", message, 500);
  }
}
