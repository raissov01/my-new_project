import type { TextChunk } from "./extract-text";

export type ExtractedVocabularyCard = {
  front: string;
  back: string;
  source?: string;
};

const MAX_FRONT_LENGTH = 160;
const MAX_BACK_LENGTH = 400;

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanEdgePunctuation(value: string) {
  return normalizeWhitespace(value).replace(/^[-–—:;,.()\[\]\s]+|[-–—:;,.()\[\]\s]+$/g, "");
}

function isProbablyNoise(value: string) {
  if (!value) return true;
  if (value.length < 2) return true;
  if (/^[\d\s\-–—.:;_/\\|]+$/.test(value)) return true;
  if (/^(page|section|chapter)\b/i.test(value)) return true;
  return false;
}

function isValidPair(front: string, back: string) {
  const cleanedFront = cleanEdgePunctuation(front);
  const cleanedBack = cleanEdgePunctuation(back);

  if (!cleanedFront || !cleanedBack) return false;
  if (isProbablyNoise(cleanedFront) || isProbablyNoise(cleanedBack)) return false;
  if (cleanedFront.length > MAX_FRONT_LENGTH || cleanedBack.length > MAX_BACK_LENGTH) return false;
  if (cleanedFront.toLowerCase() === cleanedBack.toLowerCase()) return false;
  return true;
}

function makeCard(front: string, back: string, source?: string): ExtractedVocabularyCard | null {
  const cleanedFront = cleanEdgePunctuation(front);
  const cleanedBack = cleanEdgePunctuation(back);

  if (!isValidPair(cleanedFront, cleanedBack)) {
    return null;
  }

  return {
    front: cleanedFront,
    back: cleanedBack,
    ...(source ? { source } : {}),
  };
}

function splitTableRow(line: string) {
  if (line.includes("\t")) {
    return line.split("\t").map((part) => cleanEdgePunctuation(part));
  }

  if (/\s{3,}/.test(line)) {
    return line.split(/\s{3,}/).map((part) => cleanEdgePunctuation(part));
  }

  return null;
}

function extractFromStructuredRow(line: string, source?: string) {
  const columns = splitTableRow(line);
  if (!columns || columns.length < 2) return null;

  const [front, back] = columns;
  return makeCard(front, back, source);
}

function extractFromDelimitedLine(line: string, source?: string) {
  const patterns = [
    /^(.{1,160}?)\s*[—–]\s+(.{2,400})$/,
    /^(.{1,160}?)\s+->\s+(.{2,400})$/,
    /^(.{1,160}?)\s+=>\s+(.{2,400})$/,
    /^(.{1,160}?)\s*:\s+(.{2,400})$/,
    /^(.{1,160}?)\s+-\s+(.{2,400})$/,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (!match) continue;

    return makeCard(match[1], match[2], source);
  }

  return null;
}

export function dedupeVocabularyCards(cards: ExtractedVocabularyCard[]) {
  const unique = new Map<string, ExtractedVocabularyCard>();

  for (const card of cards) {
    const key = `${normalizeWhitespace(card.front).toLowerCase()}::${normalizeWhitespace(card.back).toLowerCase()}`;
    if (!unique.has(key)) {
      unique.set(key, {
        front: normalizeWhitespace(card.front),
        back: normalizeWhitespace(card.back),
        ...(card.source ? { source: card.source } : {}),
      });
    }
  }

  return Array.from(unique.values());
}

export function extractExplicitVocabularyPairs(
  text: string,
  sourceLabel = "Document"
) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const results: ExtractedVocabularyCard[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const source = `${sourceLabel}, line ${index + 1}`;

    const structured = extractFromStructuredRow(line, source);
    if (structured) {
      results.push(structured);
      continue;
    }

    const delimited = extractFromDelimitedLine(line, source);
    if (delimited) {
      results.push(delimited);
    }
  }

  return dedupeVocabularyCards(results);
}

export function buildVocabularyChunks(text: string, maxChars = 1600): TextChunk[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const chunks: TextChunk[] = [];
  let current: string[] = [];
  let currentLength = 0;
  let startLine = 1;

  const pushChunk = (endLine: number) => {
    if (current.length === 0) return;
    chunks.push({
      text: current.join("\n"),
      source: `Lines ${startLine}-${endLine}`,
    });
    current = [];
    currentLength = 0;
    startLine = endLine + 1;
  };

  lines.forEach((line, index) => {
    const nextLength = currentLength + line.length + 1;
    if (current.length > 0 && nextLength > maxChars) {
      pushChunk(index);
    }
    current.push(line);
    currentLength += line.length + 1;
  });

  pushChunk(lines.length);

  return chunks;
}

export function splitChunkForRetry(chunk: TextChunk, maxChars = 900): TextChunk[] {
  const lines = chunk.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1 || chunk.text.length <= maxChars) {
    return [chunk];
  }

  const parts: TextChunk[] = [];
  let current: string[] = [];
  let currentLength = 0;
  let partIndex = 1;

  const pushPart = () => {
    if (current.length === 0) return;
    parts.push({
      text: current.join("\n"),
      source: `${chunk.source} part ${partIndex}`,
    });
    partIndex += 1;
    current = [];
    currentLength = 0;
  };

  for (const line of lines) {
    const nextLength = currentLength + line.length + 1;
    if (current.length > 0 && nextLength > maxChars) {
      pushPart();
    }
    current.push(line);
    currentLength += line.length + 1;
  }

  pushPart();
  return parts.length > 0 ? parts : [chunk];
}
