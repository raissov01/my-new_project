export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export const CEFR_LEVELS: readonly CEFRLevel[] = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
] as const;

// Score-to-CEFR mapping based on percentage correct.
// Thresholds are designed so that 40% (below median) maps to A2, not B1+.
// Verified by unit tests in cefr.test.ts.
export function calculateCEFR(correct: number, total: number): CEFRLevel {
  if (total === 0) return "A1";
  const pct = (correct / total) * 100;
  if (pct < 20) return "A1";
  if (pct < 45) return "A2";
  if (pct < 50) return "B1";
  if (pct < 70) return "B2";
  if (pct < 85) return "C1";
  return "C2";
}
