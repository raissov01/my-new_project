// Pure answer-checking functions — no React, fully testable.

export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"«»]/g, "")
    .replace(/\s+/g, " ");
}

export function checkTranslate(
  input: string,
  acceptedAnswers: string[],
): boolean {
  const norm = normalizeAnswer(input);
  return acceptedAnswers.some((a) => normalizeAnswer(a) === norm);
}

export function checkSentenceOrder(
  placedOrder: number[],
  correctOrder: number[],
): boolean {
  if (placedOrder.length !== correctOrder.length) return false;
  return placedOrder.every((v, i) => v === correctOrder[i]);
}

export function checkWordBuilder(
  word: string,
  correctWord: string,
): boolean {
  return word.toLowerCase() === correctWord.toLowerCase();
}

export function checkErrorSpotCorrection(
  input: string,
  correction: string,
): boolean {
  return normalizeAnswer(input) === normalizeAnswer(correction);
}
