// Shared block schema for NUET lesson JSON. Authored in
// backend/internal/database/nuet_lessons/nuet_lessons.json and rendered
// by the frontend book reader. Adding a new block type means: (1) add it
// here, (2) add a renderer branch in lesson-blocks.tsx, (3) ship.

export type LessonBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string; level?: 2 | 3 }
  | { type: "formula"; tex: string; caption?: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "definition"; term: string; text: string }
  | { type: "callout"; tone: "tip" | "warning" | "note"; text: string }
  | {
      type: "example";
      title?: string;
      prompt: string;
      steps: string[];
      answer: string;
    }
  | {
      type: "exercise";
      prompt: string;
      options?: string[];
      answer: string;
      explanation?: string;
    }
  | { type: "table"; headers: string[]; rows: string[][] };

export type LessonChapter = {
  id: string;
  title: string;
  blocks: LessonBlock[];
};

export type LessonContent = {
  title: string;
  summary: string;
  minutes: number;
  chapters: LessonChapter[];
};

// Defensive parser: the backend stores `content` as JSONB so it arrives
// as either a parsed object or a raw JSON string depending on the GORM
// codec path. Normalise both into LessonContent and fall back to an
// empty book on parse failure rather than throwing the whole page.
export function parseLessonContent(raw: unknown): LessonContent {
  if (!raw) {
    return { title: "", summary: "", minutes: 0, chapters: [] };
  }
  if (typeof raw === "string") {
    try {
      return parseLessonContent(JSON.parse(raw));
    } catch {
      return { title: "", summary: "", minutes: 0, chapters: [] };
    }
  }
  if (typeof raw !== "object") {
    return { title: "", summary: "", minutes: 0, chapters: [] };
  }
  const obj = raw as Partial<LessonContent>;
  return {
    title: typeof obj.title === "string" ? obj.title : "",
    summary: typeof obj.summary === "string" ? obj.summary : "",
    minutes: typeof obj.minutes === "number" ? obj.minutes : 0,
    chapters: Array.isArray(obj.chapters) ? (obj.chapters as LessonChapter[]) : [],
  };
}
