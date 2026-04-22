import { describe, it, expect } from "vitest";
import {
  normalizeAnswer,
  checkTranslate,
  checkSentenceOrder,
  checkWordBuilder,
  checkErrorSpotCorrection,
} from "@/lib/lesson/check";
import { normalizeExercise } from "@/lib/lesson/normalize";
import type { Exercise } from "@/features/learn/api";

// ── normalizeAnswer ───────────────────────────────────────────────────────────

describe("normalizeAnswer", () => {
  it("lowercases input", () => {
    expect(normalizeAnswer("RABBIT")).toBe("rabbit");
  });
  it("trims whitespace", () => {
    expect(normalizeAnswer("  hello  ")).toBe("hello");
  });
  it("strips trailing punctuation", () => {
    expect(normalizeAnswer("rabbit.")).toBe("rabbit");
    expect(normalizeAnswer("hello!")).toBe("hello");
    expect(normalizeAnswer("yes,")).toBe("yes");
  });
  it("collapses multiple spaces", () => {
    expect(normalizeAnswer("I  am  here")).toBe("i am here");
  });
});

// ── Translate ─────────────────────────────────────────────────────────────────

describe("checkTranslate", () => {
  it("accepts exact match", () => {
    expect(checkTranslate("rabbit", ["rabbit", "bunny"])).toBe(true);
  });
  it("accepts second accepted answer", () => {
    expect(checkTranslate("bunny", ["rabbit", "bunny"])).toBe(true);
  });
  it("rejects wrong answer", () => {
    expect(checkTranslate("rabit", ["rabbit", "bunny"])).toBe(false);
  });
  it("is case-insensitive", () => {
    expect(checkTranslate("Rabbit", ["rabbit"])).toBe(true);
    expect(checkTranslate("ҚОЯН", ["қоян", "коян"])).toBe(true);
  });
  it("strips trailing punctuation", () => {
    expect(checkTranslate("rabbit.", ["rabbit"])).toBe(true);
  });
  it("rejects empty input", () => {
    expect(checkTranslate("", ["rabbit"])).toBe(false);
  });
  it("rejects whitespace-only input", () => {
    expect(checkTranslate("   ", ["rabbit"])).toBe(false);
  });
});

// ── SentenceReorder ───────────────────────────────────────────────────────────

describe("checkSentenceOrder", () => {
  it("returns true for correct order", () => {
    expect(checkSentenceOrder([1, 4, 2, 3, 0], [1, 4, 2, 3, 0])).toBe(true);
  });
  it("returns false for wrong order", () => {
    expect(checkSentenceOrder([0, 1, 2], [1, 0, 2])).toBe(false);
  });
  it("returns false for different length", () => {
    expect(checkSentenceOrder([0, 1], [0, 1, 2])).toBe(false);
  });
  it("returns true for single-token sentence", () => {
    expect(checkSentenceOrder([0], [0])).toBe(true);
  });
});

// ── WordBuilder ───────────────────────────────────────────────────────────────

describe("checkWordBuilder", () => {
  it("accepts correct word", () => {
    expect(checkWordBuilder("dog", "dog")).toBe(true);
  });
  it("is case-insensitive", () => {
    expect(checkWordBuilder("DOG", "dog")).toBe(true);
    expect(checkWordBuilder("Dog", "dog")).toBe(true);
  });
  it("rejects wrong word", () => {
    expect(checkWordBuilder("cat", "dog")).toBe(false);
  });
  it("rejects partially correct word", () => {
    expect(checkWordBuilder("do", "dog")).toBe(false);
  });
});

// ── ErrorSpot correction ──────────────────────────────────────────────────────

describe("checkErrorSpotCorrection", () => {
  it("accepts correct correction", () => {
    expect(checkErrorSpotCorrection("doesn't", "doesn't")).toBe(true);
  });
  it("is case-insensitive", () => {
    expect(checkErrorSpotCorrection("DOESN'T", "doesn't")).toBe(true);
  });
  it("strips punctuation", () => {
    expect(checkErrorSpotCorrection("doesn't.", "doesn't")).toBe(true);
  });
  it("rejects wrong correction", () => {
    expect(checkErrorSpotCorrection("don't", "doesn't")).toBe(false);
  });
});

// ── normalizeExercise (bridge layer) ──────────────────────────────────────────

describe("normalizeExercise", () => {
  it("fill_blank → FillBlankItem with stable option IDs", () => {
    const ex: Exercise = {
      type: "fill_blank",
      prompt: "I ___ a cat.",
      data: { sentence: "I ___ a cat.", options: ["have", "has", "is", "are"], correctWord: "have" },
    };
    const item = normalizeExercise(ex, 0);
    expect(item.type).toBe("fill_blank");
    if (item.type === "fill_blank") {
      expect(item.options).toHaveLength(4);
      expect(item.options[0].id).toMatch(/^ex-0-opt-0$/);
      expect(item.correctOptionId).toBe("ex-0-opt-0");
    }
  });

  it("word_order → sentence_reorder", () => {
    const ex: Exercise = {
      type: "word_order",
      prompt: "Reorder",
      data: { words: ["I", "go", "school"], correctSentence: "I go school" },
    };
    const item = normalizeExercise(ex, 1);
    expect(item.type).toBe("sentence_reorder");
    if (item.type === "sentence_reorder") {
      expect(item.tokens).toEqual(["I", "go", "school"]);
      expect(item.correctOrder).toEqual([0, 1, 2]);
    }
  });

  it("matching → match_pairs with left/right keys", () => {
    const ex: Exercise = {
      type: "matching",
      prompt: "Match",
      data: { pairs: [{ term: "cat", definition: "мысық" }] },
    };
    const item = normalizeExercise(ex, 2);
    expect(item.type).toBe("match_pairs");
    if (item.type === "match_pairs") {
      expect(item.pairs[0]).toEqual({ left: "cat", right: "мысық" });
    }
  });

  it("error_correction → error_spot", () => {
    const ex: Exercise = {
      type: "error_correction",
      prompt: "Fix",
      data: { sentence: "She don't like it.", errorWord: "don't", correction: "doesn't" },
    };
    const item = normalizeExercise(ex, 3);
    expect(item.type).toBe("error_spot");
    if (item.type === "error_spot") {
      expect(item.correction).toBe("doesn't");
      expect(item.errorTokenIndex).toBeGreaterThanOrEqual(0);
    }
  });

  it("translation (English source) → translate en_to_kk", () => {
    const ex: Exercise = {
      type: "translation",
      prompt: "Translate",
      data: { sourceText: "cat", sourceLang: "English", acceptedAnswers: ["мысық"] },
    };
    const item = normalizeExercise(ex, 4);
    expect(item.type).toBe("translate");
    if (item.type === "translate") {
      expect(item.direction).toBe("en_to_kk");
      expect(item.source).toBe("cat");
      expect(item.acceptedAnswers).toContain("мысық");
    }
  });

  it("translation (Kazakh source) → translate kk_to_en", () => {
    const ex: Exercise = {
      type: "translation",
      prompt: "Translate",
      data: { sourceText: "мысық", sourceLang: "Kazakh", acceptedAnswers: ["cat"] },
    };
    const item = normalizeExercise(ex, 5);
    expect(item.type).toBe("translate");
    if (item.type === "translate") {
      expect(item.direction).toBe("kk_to_en");
    }
  });
});
