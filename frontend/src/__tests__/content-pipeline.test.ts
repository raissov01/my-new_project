import { describe, it, expect } from "vitest";

// ── Listening clip helpers ──────────────────────────────────────────────────

function fmtDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function calcXP(durationSeconds: number, level: string): number {
  const perMin = ["C1", "C2"].includes(level) ? 25 : ["B1", "B2"].includes(level) ? 15 : 8;
  return Math.round((durationSeconds / 60) * perMin);
}

describe("listening clip helpers", () => {
  it("fmtDuration: exact minutes", () => expect(fmtDuration(120)).toBe("2m"));
  it("fmtDuration: with seconds", () => expect(fmtDuration(135)).toBe("2m 15s"));
  it("fmtDuration: zero seconds", () => expect(fmtDuration(0)).toBe("0m"));

  it("XP: A1 2-minute clip = 16 XP", () => expect(calcXP(120, "A1")).toBe(16));
  it("XP: B1 4-minute clip = 60 XP", () => expect(calcXP(240, "B1")).toBe(60));
  it("XP: C1 6-minute clip = 150 XP", () => expect(calcXP(360, "C1")).toBe(150));
  it("XP: C2 same as C1 multiplier", () => expect(calcXP(60, "C2")).toBe(25));
  it("XP: B2 same as B1 multiplier", () => expect(calcXP(60, "B2")).toBe(15));
  it("XP: A2 same as A1 multiplier", () => expect(calcXP(60, "A2")).toBe(8));
});

// ── Blank picking logic ─────────────────────────────────────────────────────

interface VocabItem { word: string; definition: string; example: string }

function pickBlanks(transcript: string, vocab: VocabItem[]): string[] {
  const vocabWords = vocab.map((v) => v.word.toLowerCase());
  const words = transcript.split(/\s+/).map((w) => w.replace(/[^a-zA-Z']/g, "").toLowerCase());
  const candidates = [...new Set(words)].filter(
    (w) => w.length > 4 && vocabWords.includes(w)
  );
  return candidates.slice(0, Math.min(6, candidates.length));
}

describe("transcript blank picking", () => {
  const transcript = "The significant challenge requires collaborative effort from teachers and students.";
  const vocab: VocabItem[] = [
    { word: "significant", definition: "important", example: "" },
    { word: "challenge", definition: "difficult task", example: "" },
    { word: "collaborative", definition: "working together", example: "" },
    { word: "effort", definition: "hard work", example: "" },
  ];

  it("picks only vocab words present in transcript", () => {
    const blanks = pickBlanks(transcript, vocab);
    expect(blanks.every((b) => transcript.toLowerCase().includes(b))).toBe(true);
  });

  it("excludes short words", () => {
    const blanks = pickBlanks(transcript, vocab);
    expect(blanks.every((b) => b.length > 4)).toBe(true);
  });

  it("max 6 blanks returned", () => {
    const longVocab: VocabItem[] = Array.from({ length: 10 }, (_, i) => ({
      word: `excellent${i}`, definition: "", example: "",
    }));
    const longTranscript = longVocab.map((v) => v.word).join(" ");
    expect(pickBlanks(longTranscript, longVocab).length).toBeLessThanOrEqual(6);
  });

  it("returns empty array for no matches", () => {
    expect(pickBlanks("Hello world", vocab)).toHaveLength(0);
  });
});

// ── AI Scenario validation ──────────────────────────────────────────────────

const VALID_LEVELS = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);
const VALID_CATEGORIES = new Set(["travel", "work", "daily", "social", "academic"]);

function validateScenario(sc: {
  slug: string;
  level: string;
  category: string;
  personaPrompt: string;
  studentGoal: string;
}) {
  const errors: string[] = [];
  if (!sc.slug || !/^[a-z_]+$/.test(sc.slug)) errors.push("invalid slug");
  if (!VALID_LEVELS.has(sc.level)) errors.push("invalid level");
  if (!VALID_CATEGORIES.has(sc.category)) errors.push("invalid category");
  if (sc.personaPrompt.length < 50) errors.push("persona prompt too short");
  if (!sc.studentGoal) errors.push("missing studentGoal");
  return errors;
}

describe("AI scenario validation", () => {
  it("valid scenario passes", () => {
    expect(validateScenario({
      slug: "airport_checkin",
      level: "A2",
      category: "travel",
      personaPrompt: "You are Sophie, a check-in agent at Heathrow Airport. The student wants to check in for their flight.",
      studentGoal: "Check in for your flight and get a boarding pass.",
    })).toHaveLength(0);
  });

  it("invalid level fails", () => {
    expect(validateScenario({ slug: "x", level: "D1", category: "travel", personaPrompt: "x".repeat(60), studentGoal: "y" })).toContain("invalid level");
  });

  it("invalid slug fails", () => {
    expect(validateScenario({ slug: "My Scenario!", level: "B1", category: "work", personaPrompt: "x".repeat(60), studentGoal: "y" })).toContain("invalid slug");
  });

  it("short persona prompt fails", () => {
    expect(validateScenario({ slug: "test", level: "A1", category: "daily", personaPrompt: "short", studentGoal: "do something" })).toContain("persona prompt too short");
  });
});

// ── Grade scores validation ─────────────────────────────────────────────────

interface GradeScores { fluency: number; grammar: number; vocabulary: number; task: number; tips: string[] }

function averageScore(scores: GradeScores): number {
  return Math.round((scores.fluency + scores.grammar + scores.vocabulary + scores.task) / 4);
}

function gradeLabel(avg: number): string {
  if (avg >= 9) return "Excellent";
  if (avg >= 7) return "Good";
  if (avg >= 5) return "Satisfactory";
  return "Needs improvement";
}

describe("grade score helpers", () => {
  it("averages correctly", () => {
    expect(averageScore({ fluency: 8, grammar: 6, vocabulary: 7, task: 9, tips: [] })).toBe(8);
  });
  it("rounds correctly", () => {
    expect(averageScore({ fluency: 7, grammar: 6, vocabulary: 6, task: 6, tips: [] })).toBe(6);
  });
  it("grade labels", () => {
    expect(gradeLabel(9)).toBe("Excellent");
    expect(gradeLabel(7)).toBe("Good");
    expect(gradeLabel(5)).toBe("Satisfactory");
    expect(gradeLabel(3)).toBe("Needs improvement");
  });
  it("all 10s = excellent 10", () => {
    expect(averageScore({ fluency: 10, grammar: 10, vocabulary: 10, task: 10, tips: [] })).toBe(10);
    expect(gradeLabel(10)).toBe("Excellent");
  });
});

// ── Daily news level tabs ───────────────────────────────────────────────────

type NewsLevel = "A2" | "B1" | "C1";

function getNewsText(news: { versionA2: string; versionB1: string; versionC1: string }, level: NewsLevel): string {
  if (level === "A2") return news.versionA2;
  if (level === "B1") return news.versionB1;
  return news.versionC1;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

describe("daily news helpers", () => {
  const news = {
    versionA2: "Today we look at technology. This is important.",
    versionB1: "Today's news focuses on technology. Experts are discussing the implications of this development and what it means for people.",
    versionC1: "Today's edition examines the evolving situation regarding technology. This development raises significant questions about the long-term trajectory of global trends in this area, and warrants careful consideration from policymakers and citizens alike.",
  };

  it("getNewsText returns correct version", () => {
    expect(getNewsText(news, "A2")).toBe(news.versionA2);
    expect(getNewsText(news, "B1")).toBe(news.versionB1);
    expect(getNewsText(news, "C1")).toBe(news.versionC1);
  });

  it("A2 version is shortest", () => {
    expect(wordCount(news.versionA2)).toBeLessThan(wordCount(news.versionB1));
  });

  it("B1 version is shorter than C1", () => {
    expect(wordCount(news.versionB1)).toBeLessThan(wordCount(news.versionC1));
  });
});

// ── Question bank format validation ────────────────────────────────────────

interface GeneratedQuestion {
  level: string;
  category: string;
  format: string;
  prompt: string;
  correctAnswer: string;
  distractors?: string[];
  reviewed: boolean;
}

function validateQuestion(q: GeneratedQuestion): string[] {
  const errors: string[] = [];
  if (!VALID_LEVELS.has(q.level)) errors.push("invalid level");
  if (!q.prompt || q.prompt.length < 10) errors.push("prompt too short");
  if (!q.correctAnswer) errors.push("missing correctAnswer");
  if (q.format === "multiple_choice" && (!q.distractors || q.distractors.length < 3)) {
    errors.push("multiple_choice needs 3 distractors");
  }
  if (q.reviewed !== false) errors.push("new questions must have reviewed=false");
  return errors;
}

describe("generated question validation", () => {
  it("valid fill_blank passes", () => {
    expect(validateQuestion({
      level: "B1", category: "vocabulary", format: "fill_blank",
      prompt: "She decided to ___ her old job.", correctAnswer: "quit",
      reviewed: false,
    })).toHaveLength(0);
  });

  it("multiple_choice needs 3 distractors", () => {
    expect(validateQuestion({
      level: "A2", category: "grammar", format: "multiple_choice",
      prompt: "Which is correct: ___ going.", correctAnswer: "I am",
      distractors: ["I is"],
      reviewed: false,
    })).toContain("multiple_choice needs 3 distractors");
  });

  it("reviewed must be false for new questions", () => {
    expect(validateQuestion({
      level: "B2", category: "vocabulary", format: "fill_blank",
      prompt: "Long enough prompt here.", correctAnswer: "answer",
      reviewed: true,
    })).toContain("new questions must have reviewed=false");
  });
});
