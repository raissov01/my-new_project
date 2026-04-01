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
  // Dynamic import avoids Turbopack bundling issues with native deps
  let pdfModule: { PDFParse?: new (opts: { data: Buffer }) => PdfParserInstance };
  try {
    pdfModule = await import("pdf-parse");
  } catch (importErr) {
    console.error("[extract-text] Failed to import pdf-parse:", importErr);
    throw new Error("PDF_PARSER_UNAVAILABLE");
  }

  const PDFParse = pdfModule.PDFParse;
  if (!PDFParse) {
    // Fallback: the module might export differently
    const mod = pdfModule as Record<string, unknown>;
    const FallbackClass =
      (mod.default as typeof PDFParse) ?? (mod as unknown as typeof PDFParse);
    if (typeof FallbackClass !== "function") {
      throw new Error("PDF_PARSER_UNAVAILABLE");
    }
    return extractPdfWithClass(FallbackClass as new (opts: { data: Buffer }) => PdfParserInstance, buffer);
  }

  return extractPdfWithClass(PDFParse, buffer);
}

type PdfParserInstance = {
  getText: () => Promise<{ text?: string; pages?: { text?: string }[] }>;
  destroy: () => Promise<void>;
};

async function extractPdfWithClass(
  PDFParse: new (opts: { data: Buffer }) => PdfParserInstance,
  buffer: Buffer
): Promise<ExtractionResult> {
  const parser = new PDFParse({ data: buffer });

  try {
    const data = await parser.getText();
    const rawText = data.text ?? "";
    const cleaned = cleanText(rawText);
    const pageCount = Array.isArray(data.pages) ? data.pages.length : null;
    const chunks = splitIntoChunks(cleaned, "pdf", pageCount);

    return { text: cleaned, pageCount, chunks };
  } finally {
    await parser.destroy().catch(() => {});
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

  const result = await extractFn({ buffer });
  const rawText = result.value ?? "";
  const cleaned = cleanText(rawText);
  const chunks = splitIntoChunks(cleaned, "docx", null);

  return { text: cleaned, pageCount: null, chunks };
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
