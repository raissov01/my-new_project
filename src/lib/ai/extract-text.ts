import { createRequire } from "module";
import { getAIConfigSafe } from "./config";

export type ExtractionResult = {
  text: string;
  pageCount: number | null;
  chunks: TextChunk[];
};

export type TextChunk = {
  text: string;
  source: string;
};

const requireCjs = createRequire(import.meta.url);

/**
 * Extract text from a PDF or DOCX file buffer.
 * Uses dynamic imports to avoid module-level crashes in Next.js Turbopack.
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ExtractionResult> {
  const config = getAIConfigSafe();
  const maxFileSize = config?.maxUploadBytes ?? 20 * 1024 * 1024;

  if (buffer.length > maxFileSize) {
    throw new Error("FILE_TOO_LARGE");
  }

  const isPdf =
    mimeType === "application/pdf" ||
    fileName.toLowerCase().endsWith(".pdf");

  const isDocx =
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.toLowerCase().endsWith(".docx");

  if (isPdf) {
    return extractFromPdf(buffer);
  }

  if (isDocx) {
    return extractFromDocx(buffer);
  }

  throw new Error("UNSUPPORTED_FILE_TYPE");
}

async function extractFromPdf(buffer: Buffer): Promise<ExtractionResult> {
  let pdfParse: unknown;
  try {
    pdfParse = requireCjs("pdf-parse");
  } catch (importErr) {
    console.error("[extract-text] Failed to import pdf-parse:", importErr);
    throw new Error("PDF_PARSER_UNAVAILABLE");
  }

  if (typeof pdfParse !== "function") {
    throw new Error("PDF_PARSER_UNAVAILABLE");
  }

  try {
    const data = await (
      pdfParse as (buffer: Buffer) => Promise<{
        text?: string;
        numpages?: number;
      }>
    )(buffer);

    const rawText = data.text ?? "";
    const cleaned = cleanText(rawText);
    const pageCount =
      typeof data.numpages === "number" && Number.isFinite(data.numpages)
        ? data.numpages
        : null;
    const chunks = splitIntoChunks(cleaned, "pdf", pageCount);

    return { text: cleaned, pageCount, chunks };
  } catch (error) {
    console.error("[extract-text] PDF extraction failed:", error);
    const detail = error instanceof Error ? error.message : "Unknown PDF parser failure";
    throw new Error(`PDF_EXTRACTION_FAILED: ${detail}`);
  }
}

async function extractFromDocx(buffer: Buffer): Promise<ExtractionResult> {
  let mammothModule: { extractRawText?: (opts: { buffer: Buffer }) => Promise<{ value: string }> };
  try {
    mammothModule = await import("mammoth");
  } catch (importErr) {
    console.error("[extract-text] Failed to import mammoth:", importErr);
    throw new Error("DOCX_PARSER_UNAVAILABLE");
  }

  const extractFn =
    mammothModule.extractRawText ??
    (mammothModule as { default?: typeof mammothModule }).default?.extractRawText;

  if (typeof extractFn !== "function") {
    throw new Error("DOCX_PARSER_UNAVAILABLE");
  }

  try {
    const result = await extractFn({ buffer });
    const rawText = result.value ?? "";
    const cleaned = cleanText(rawText);
    const chunks = splitIntoChunks(cleaned, "docx", null);

    return { text: cleaned, pageCount: null, chunks };
  } catch (error) {
    console.error("[extract-text] DOCX extraction failed:", error);
    const detail = error instanceof Error ? error.message : "Unknown DOCX parser failure";
    throw new Error(`DOCX_EXTRACTION_FAILED: ${detail}`);
  }
}

/**
 * Clean extracted text: remove excessive whitespace, page numbers, noise.
 */
function cleanText(text: string): string {
  return (
    text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/^\s*\d{1,4}\s*$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/^[-_=]{3,}\s*$/gm, "")
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      .trim()
  );
}

/**
 * Split text into logical chunks for AI processing.
 */
function splitIntoChunks(
  text: string,
  format: "pdf" | "docx",
  pageCount: number | null
): TextChunk[] {
  const chunks: TextChunk[] = [];
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 30);
  const totalParagraphs = paragraphs.length;
  const chunkSize = Math.min(5, Math.max(2, Math.ceil(totalParagraphs / 20)));

  for (let i = 0; i < totalParagraphs; i += chunkSize) {
    const group = paragraphs.slice(i, i + chunkSize);
    const chunkText = group.join("\n\n");

    if (chunkText.trim().length < 40) continue;

    let source: string;
    if (format === "pdf" && pageCount) {
      const estimatedPage = Math.max(1, Math.ceil(((i + 1) / totalParagraphs) * pageCount));
      source = `Page ~${estimatedPage}, section ${Math.floor(i / chunkSize) + 1}`;
    } else {
      source = `Section ${Math.floor(i / chunkSize) + 1}`;
    }

    chunks.push({ text: chunkText, source });
  }

  if (chunks.length === 0 && text.trim().length > 30) {
    chunks.push({ text: text.trim(), source: "Full document" });
  }

  return chunks;
}
