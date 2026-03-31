import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export type ExtractionResult = {
  text: string;
  pageCount: number | null;
  chunks: TextChunk[];
};

export type TextChunk = {
  text: string;
  source: string; // e.g. "Page 2, paragraph 3"
};

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

/**
 * Extract text from a PDF or DOCX file buffer.
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ExtractionResult> {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error("FILE_TOO_LARGE");
  }

  if (
    mimeType === "application/pdf" ||
    fileName.toLowerCase().endsWith(".pdf")
  ) {
    return extractFromPdf(buffer);
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.toLowerCase().endsWith(".docx")
  ) {
    return extractFromDocx(buffer);
  }

  throw new Error("UNSUPPORTED_FILE_TYPE");
}

async function extractFromPdf(buffer: Buffer): Promise<ExtractionResult> {
  const parser = new PDFParse({ data: buffer });

  try {
    const data = await parser.getText();
    const rawText = data.text ?? "";
    const cleaned = cleanText(rawText);
    const pageCount = data.pages?.length ?? null;
    const chunks = splitIntoChunks(cleaned, "pdf", pageCount);

    return {
      text: cleaned,
      pageCount,
      chunks,
    };
  } finally {
    await parser.destroy();
  }
}

async function extractFromDocx(buffer: Buffer): Promise<ExtractionResult> {
  const result = await mammoth.extractRawText({ buffer });
  const rawText = result.value ?? "";
  const cleaned = cleanText(rawText);
  const chunks = splitIntoChunks(cleaned, "docx", null);

  return {
    text: cleaned,
    pageCount: null,
    chunks,
  };
}

/**
 * Clean extracted text: remove excessive whitespace, repeated headers/footers,
 * page numbers, and other noise.
 */
function cleanText(text: string): string {
  return (
    text
      // Normalize line endings
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      // Remove page numbers (standalone digits on a line)
      .replace(/^\s*\d{1,4}\s*$/gm, "")
      // Collapse 3+ newlines into 2
      .replace(/\n{3,}/g, "\n\n")
      // Remove lines that are just dashes, underscores, or equals
      .replace(/^[-_=]{3,}\s*$/gm, "")
      // Trim each line
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      // Final trim
      .trim()
  );
}

/**
 * Split text into logical chunks based on paragraphs, headings, and
 * structural patterns. Each chunk includes a source reference.
 */
function splitIntoChunks(
  text: string,
  format: "pdf" | "docx",
  pageCount: number | null
): TextChunk[] {
  const chunks: TextChunk[] = [];
  // Split by double newlines (paragraph boundaries)
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 30);

  const totalParagraphs = paragraphs.length;
  // Group into chunks of ~3-5 paragraphs for better context
  const chunkSize = Math.min(5, Math.max(2, Math.ceil(totalParagraphs / 20)));

  for (let i = 0; i < totalParagraphs; i += chunkSize) {
    const group = paragraphs.slice(i, i + chunkSize);
    const chunkText = group.join("\n\n");

    if (chunkText.trim().length < 40) continue;

    let source: string;
    if (format === "pdf" && pageCount) {
      // Estimate page number based on position
      const estimatedPage = Math.max(
        1,
        Math.ceil(((i + 1) / totalParagraphs) * pageCount)
      );
      source = `Page ~${estimatedPage}, section ${Math.floor(i / chunkSize) + 1}`;
    } else {
      source = `Section ${Math.floor(i / chunkSize) + 1}`;
    }

    chunks.push({ text: chunkText, source });
  }

  // If no chunks were created (very short document), use the whole text
  if (chunks.length === 0 && text.trim().length > 30) {
    chunks.push({ text: text.trim(), source: "Full document" });
  }

  return chunks;
}
