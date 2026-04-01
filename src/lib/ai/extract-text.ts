import { createRequire } from "module";
import { tmpdir } from "os";
import { join } from "path";
import { mkdtemp, readdir, readFile, rm, writeFile } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { getAIConfigSafe } from "./config";

const requireCjs = createRequire(import.meta.url);
const execFileAsync = promisify(execFile);
const OCR_TEXT_MIN_LENGTH = 60;
const FALLBACK_TEXT_MIN_LENGTH = 200;

export type ExtractionMethod =
  | "pdf-parse"
  | "pdfjs"
  | "pdftotext"
  | "ocr"
  | "mammoth";

export type TextChunk = {
  text: string;
  source: string;
};

export type ExtractionAttempt = {
  method: ExtractionMethod;
  success: boolean;
  textLength: number;
  detail?: string;
};

export type ExtractionResult = {
  text: string;
  pageCount: number | null;
  chunks: TextChunk[];
  method: ExtractionMethod;
  methodsTried: ExtractionAttempt[];
  ocrAttempted: boolean;
};

export class TextExtractionError extends Error {
  constructor(
    public code: string,
    public detail: string,
    public methodsTried: ExtractionAttempt[] = [],
    public ocrAttempted = false
  ) {
    super(detail);
    this.name = "TextExtractionError";
  }
}

export async function extractText(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ExtractionResult> {
  const config = getAIConfigSafe();
  const maxFileSize = config?.maxUploadBytes ?? 20 * 1024 * 1024;

  if (buffer.length > maxFileSize) {
    throw new TextExtractionError(
      "FILE_TOO_LARGE",
      `File exceeds max upload size of ${maxFileSize} bytes.`
    );
  }

  const isPdf =
    mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
  const isDocx =
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.toLowerCase().endsWith(".docx");

  if (isPdf) {
    return extractFromPdf(buffer, fileName);
  }

  if (isDocx) {
    return extractFromDocx(buffer);
  }

  throw new TextExtractionError(
    "UNSUPPORTED_FILE_TYPE",
    `Unsupported file type "${mimeType || fileName}".`
  );
}

async function extractFromPdf(
  buffer: Buffer,
  fileName: string
): Promise<ExtractionResult> {
  const attempts: ExtractionAttempt[] = [];
  let bestText = "";
  let bestPageCount: number | null = null;

  const pdfParseResult = await tryPdfParse(buffer);
  attempts.push(pdfParseResult.attempt);
  if (pdfParseResult.text.length > bestText.length) {
    bestText = pdfParseResult.text;
    bestPageCount = pdfParseResult.pageCount;
  }

  if (isUsableText(pdfParseResult.text, FALLBACK_TEXT_MIN_LENGTH)) {
    return buildExtractionResult(
      pdfParseResult.text,
      pdfParseResult.pageCount,
      "pdf-parse",
      attempts,
      false
    );
  }

  const pdfjsResult = await tryPdfJs(buffer);
  attempts.push(pdfjsResult.attempt);
  if (pdfjsResult.text.length > bestText.length) {
    bestText = pdfjsResult.text;
    bestPageCount = pdfjsResult.pageCount;
  }

  if (isUsableText(pdfjsResult.text, FALLBACK_TEXT_MIN_LENGTH)) {
    return buildExtractionResult(
      pdfjsResult.text,
      pdfjsResult.pageCount,
      "pdfjs",
      attempts,
      false
    );
  }

  const pdftotextResult = await tryPdfToText(buffer, fileName);
  attempts.push(pdftotextResult.attempt);
  if (pdftotextResult.text.length > bestText.length) {
    bestText = pdftotextResult.text;
    bestPageCount = pdftotextResult.pageCount;
  }

  if (isUsableText(pdftotextResult.text, FALLBACK_TEXT_MIN_LENGTH)) {
    return buildExtractionResult(
      pdftotextResult.text,
      pdftotextResult.pageCount,
      "pdftotext",
      attempts,
      false
    );
  }

  const ocrResult = await tryPdfOcr(buffer, fileName);
  attempts.push(ocrResult.attempt);
  if (ocrResult.text.length > bestText.length) {
    bestText = ocrResult.text;
    bestPageCount = ocrResult.pageCount;
  }

  if (isUsableText(ocrResult.text, OCR_TEXT_MIN_LENGTH)) {
    return buildExtractionResult(
      ocrResult.text,
      ocrResult.pageCount,
      "ocr",
      attempts,
      true
    );
  }

  if (isUsableText(bestText, OCR_TEXT_MIN_LENGTH)) {
    return buildExtractionResult(
      bestText,
      bestPageCount,
      bestText === pdfjsResult.text ? "pdfjs" : "pdf-parse",
      attempts,
      true
    );
  }

  throw new TextExtractionError(
    "PDF_EXTRACTION_FAILED",
    "This PDF appears to be scanned or unreadable. OCR attempted.",
    attempts,
    true
  );
}

async function extractFromDocx(buffer: Buffer): Promise<ExtractionResult> {
  let mammothModule: {
    extractRawText?: (opts: { buffer: Buffer }) => Promise<{ value: string }>;
  };

  try {
    mammothModule = await import("mammoth");
  } catch (importErr) {
    console.error("[extract-text] Failed to import mammoth:", importErr);
    throw new TextExtractionError(
      "DOCX_PARSER_UNAVAILABLE",
      "DOCX parser could not be loaded."
    );
  }

  const extractFn =
    mammothModule.extractRawText ??
    (mammothModule as { default?: typeof mammothModule }).default?.extractRawText;

  if (typeof extractFn !== "function") {
    throw new TextExtractionError(
      "DOCX_PARSER_UNAVAILABLE",
      "DOCX parser is not available."
    );
  }

  try {
    const result = await extractFn({ buffer });
    const cleaned = cleanText(result.value ?? "");

    if (!isUsableText(cleaned, 20)) {
      throw new TextExtractionError(
        "DOCX_EXTRACTION_FAILED",
        "DOCX document does not contain enough readable text."
      );
    }

    return buildExtractionResult(
      cleaned,
      null,
      "mammoth",
      [{ method: "mammoth", success: true, textLength: cleaned.length }],
      false
    );
  } catch (error) {
    if (error instanceof TextExtractionError) {
      throw error;
    }

    console.error("[extract-text] DOCX extraction failed:", error);
    throw new TextExtractionError(
      "DOCX_EXTRACTION_FAILED",
      error instanceof Error ? error.message : "Unknown DOCX parser failure"
    );
  }
}

async function tryPdfParse(buffer: Buffer) {
  let pdfParse: unknown;

  try {
    pdfParse = requireCjs("pdf-parse");
  } catch (importErr) {
    console.error("[extract-text] Failed to import pdf-parse:", importErr);
    return {
      text: "",
      pageCount: null,
      attempt: {
        method: "pdf-parse" as const,
        success: false,
        textLength: 0,
        detail: "pdf-parse import failed",
      },
    };
  }

  if (typeof pdfParse !== "function") {
    return {
      text: "",
      pageCount: null,
      attempt: {
        method: "pdf-parse" as const,
        success: false,
        textLength: 0,
        detail: "pdf-parse export is not callable",
      },
    };
  }

  try {
    const data = await (
      pdfParse as (pdfBuffer: Buffer) => Promise<{
        text?: string;
        numpages?: number;
      }>
    )(buffer);
    const cleaned = cleanText(data.text ?? "");
    const pageCount =
      typeof data.numpages === "number" && Number.isFinite(data.numpages)
        ? data.numpages
        : null;

    return {
      text: cleaned,
      pageCount,
      attempt: {
        method: "pdf-parse" as const,
        success: cleaned.length > 0,
        textLength: cleaned.length,
        detail: cleaned.length > 0 ? undefined : "No text extracted",
      },
    };
  } catch (error) {
    console.error("[extract-text] pdf-parse failed:", error);
    return {
      text: "",
      pageCount: null,
      attempt: {
        method: "pdf-parse" as const,
        success: false,
        textLength: 0,
        detail: error instanceof Error ? error.message : "Unknown pdf-parse failure",
      },
    };
  }
}

async function tryPdfJs(buffer: Buffer) {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    const pdfDocument = await loadingTask.promise;
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .filter(Boolean)
        .join(" ");
      if (pageText.trim()) {
        pages.push(pageText);
      }
    }

    const cleaned = cleanText(pages.join("\n\n"));

    return {
      text: cleaned,
      pageCount: pdfDocument.numPages,
      attempt: {
        method: "pdfjs" as const,
        success: cleaned.length > 0,
        textLength: cleaned.length,
        detail: cleaned.length > 0 ? undefined : "No text extracted with pdfjs",
      },
    };
  } catch (error) {
    console.error("[extract-text] pdfjs extraction failed:", error);
    return {
      text: "",
      pageCount: null,
      attempt: {
        method: "pdfjs" as const,
        success: false,
        textLength: 0,
        detail: error instanceof Error ? error.message : "Unknown pdfjs failure",
      },
    };
  }
}

async function tryPdfToText(buffer: Buffer, fileName: string) {
  const tempDir = await mkdtemp(join(tmpdir(), "studywithraissov-pdftotext-"));
  const inputPdfPath = join(tempDir, sanitizeFileName(fileName));
  const outputTxtPath = join(tempDir, "out.txt");

  try {
    await writeFile(inputPdfPath, buffer);
    const info = await getPdfInfo(inputPdfPath);

    await execFileAsync("pdftotext", [
      "-layout",
      "-enc",
      "UTF-8",
      inputPdfPath,
      outputTxtPath,
    ]);

    const rawText = await readFile(outputTxtPath, "utf8");
    const cleaned = cleanText(rawText);

    return {
      text: cleaned,
      pageCount: info.pageCount,
      attempt: {
        method: "pdftotext" as const,
        success: cleaned.length > 0,
        textLength: cleaned.length,
        detail: cleaned.length > 0 ? undefined : "pdftotext returned empty text",
      },
    };
  } catch (error) {
    console.error("[extract-text] pdftotext extraction failed:", error);
    return {
      text: "",
      pageCount: null,
      attempt: {
        method: "pdftotext" as const,
        success: false,
        textLength: 0,
        detail: error instanceof Error ? error.message : "Unknown pdftotext failure",
      },
    };
  } finally {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error("[extract-text] pdftotext temp cleanup failed:", cleanupError);
    }
  }
}

async function tryPdfOcr(buffer: Buffer, fileName: string) {
  const tempDir = await mkdtemp(join(tmpdir(), "studywithraissov-ocr-"));
  const inputPdfPath = join(tempDir, sanitizeFileName(fileName));
  const outputPrefix = join(tempDir, "page");
  let worker:
    | {
        recognize: (
          image: string
        ) => Promise<{ data: { text?: string | null } }>;
        terminate: () => Promise<void>;
      }
    | undefined;

  try {
    await writeFile(inputPdfPath, buffer);
    await execFileAsync("pdftoppm", ["-png", inputPdfPath, outputPrefix]);

    const files = (await readdir(tempDir))
      .filter((entry) => /^page-\d+\.png$/i.test(entry))
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

    if (files.length === 0) {
      return {
        text: "",
        pageCount: null,
        attempt: {
          method: "ocr" as const,
          success: false,
          textLength: 0,
          detail: "pdftoppm did not create images",
        },
      };
    }

    const tesseractModule = requireCjs("tesseract.js") as {
      createWorker?: (
        langs?: string,
        oem?: number,
        options?: Record<string, unknown>
      ) => Promise<{
        recognize: (
          image: string
        ) => Promise<{ data: { text?: string | null } }>;
        terminate: () => Promise<void>;
      }>;
    };

    if (typeof tesseractModule.createWorker !== "function") {
      return {
        text: "",
        pageCount: files.length,
        attempt: {
          method: "ocr" as const,
          success: false,
          textLength: 0,
          detail: "tesseract.js createWorker unavailable",
        },
      };
    }

    worker = await tesseractModule.createWorker("eng", 1, {
      logger:
        process.env.NODE_ENV !== "production"
          ? (message: unknown) => console.log("[extract-text][ocr]", message)
          : undefined,
    });

    const pages: string[] = [];
    for (const file of files) {
      const imagePath = join(tempDir, file);
      const { data } = await worker.recognize(imagePath);
      const pageText = cleanText(data.text ?? "");
      if (pageText) {
        pages.push(pageText);
      }
    }

    const cleaned = cleanText(pages.join("\n\n"));

    return {
      text: cleaned,
      pageCount: files.length,
      attempt: {
        method: "ocr" as const,
        success: cleaned.length > 0,
        textLength: cleaned.length,
        detail: cleaned.length > 0 ? undefined : "OCR returned empty text",
      },
    };
  } catch (error) {
    console.error("[extract-text] OCR extraction failed:", error);
    return {
      text: "",
      pageCount: null,
      attempt: {
        method: "ocr" as const,
        success: false,
        textLength: 0,
        detail: error instanceof Error ? error.message : "Unknown OCR failure",
      },
    };
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (terminateError) {
        console.error("[extract-text] OCR worker terminate failed:", terminateError);
      }
    }

    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error("[extract-text] OCR temp cleanup failed:", cleanupError);
    }
  }
}

async function getPdfInfo(filePath: string) {
  try {
    const { stdout } = await execFileAsync("pdfinfo", [filePath]);
    const pageMatch = stdout.match(/^Pages:\s+(\d+)/m);
    return {
      pageCount: pageMatch ? Number(pageMatch[1]) : null,
    };
  } catch (error) {
    console.error("[extract-text] pdfinfo failed:", error);
    return { pageCount: null };
  }
}

function buildExtractionResult(
  text: string,
  pageCount: number | null,
  method: ExtractionMethod,
  methodsTried: ExtractionAttempt[],
  ocrAttempted: boolean
): ExtractionResult {
  const cleaned = cleanText(text);
  return {
    text: cleaned,
    pageCount,
    chunks: splitIntoChunks(cleaned, method === "mammoth" ? "docx" : "pdf", pageCount),
    method,
    methodsTried,
    ocrAttempted,
  };
}

function isUsableText(text: string, minLength: number) {
  return cleanText(text).length >= minLength;
}

function sanitizeFileName(fileName: string) {
  const normalized = fileName.replace(/[^a-zA-Z0-9._-]+/g, "-");
  return normalized.toLowerCase().endsWith(".pdf") ? normalized : `${normalized}.pdf`;
}

function cleanText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/(\p{L})-\n(?=\p{L})/gu, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^\s*\d{1,4}\s*$/gm, "")
    .replace(/^[-_=]{3,}\s*$/gm, "")
    .replace(/[^\S\n]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, lines) => line.length > 0 || lines[index - 1] !== "")
    .join("\n")
    .trim();
}

function splitIntoChunks(
  text: string,
  format: "pdf" | "docx",
  pageCount: number | null
): TextChunk[] {
  const chunks: TextChunk[] = [];
  const paragraphs = text.split(/\n{2,}/).filter((paragraph) => paragraph.trim().length > 20);
  const totalParagraphs = paragraphs.length;
  const chunkSize = Math.min(8, Math.max(2, Math.ceil(totalParagraphs / 16)));

  for (let index = 0; index < totalParagraphs; index += chunkSize) {
    const group = paragraphs.slice(index, index + chunkSize);
    const chunkText = group.join("\n\n").trim();
    if (chunkText.length < 30) continue;

    let source = `Section ${Math.floor(index / chunkSize) + 1}`;
    if (format === "pdf" && pageCount && totalParagraphs > 0) {
      const estimatedPage = Math.max(
        1,
        Math.ceil(((index + 1) / totalParagraphs) * pageCount)
      );
      source = `Page ~${estimatedPage}, section ${Math.floor(index / chunkSize) + 1}`;
    }

    chunks.push({ text: chunkText, source });
  }

  if (chunks.length === 0 && text.trim().length > 20) {
    chunks.push({ text: text.trim(), source: "Full document" });
  }

  return chunks;
}
