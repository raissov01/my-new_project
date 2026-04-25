import type { Exercise } from "@/features/learn/api";
import type { LessonItem, CEFR } from "@/types/lesson";

const DEFAULT_LEVEL: CEFR = "A1";

export function normalizeExercise(ex: Exercise, index: number): LessonItem {
  const id = `ex-${index}`;
  const level: CEFR = DEFAULT_LEVEL;

  switch (ex.type) {
    case "fill_blank": {
      const opts = (ex.data.options ?? []).map((text, i) => ({
        id: `${id}-opt-${i}`,
        text,
      }));
      const correctIdx = opts.findIndex(
        (o) => o.text.trim().toLowerCase() === (ex.data.correctWord ?? "").trim().toLowerCase(),
      );
      return {
        type: "fill_blank",
        id,
        level,
        prompt: ex.data.sentence
          ? `${ex.prompt}\n${ex.data.sentence}`
          : ex.prompt,
        options: opts,
        correctOptionId: correctIdx >= 0 ? (opts[correctIdx]?.id ?? "") : (opts[0]?.id ?? ""),
      };
    }

    case "grammar_choice": {
      const opts = (ex.data.options ?? []).map((text, i) => ({
        id: `${id}-opt-${i}`,
        text,
      }));
      return {
        type: "fill_blank",
        id,
        level,
        prompt: ex.data.sentence
          ? `${ex.prompt}\n${ex.data.sentence}`
          : ex.prompt,
        options: opts,
        correctOptionId: opts[ex.data.correct ?? 0]?.id ?? "",
        explanation: ex.data.rule,
      };
    }

    case "word_order": {
      const tokens = ex.data.words ?? [];
      const correctWords = (ex.data.correctSentence ?? "").split(" ");
      const correctOrder = correctWords.map((w) => tokens.indexOf(w));
      return {
        type: "sentence_reorder",
        id,
        level,
        prompt: ex.prompt,
        tokens,
        correctOrder,
      };
    }

    case "matching": {
      return {
        type: "match_pairs",
        id,
        level,
        prompt: ex.prompt,
        pairs: (ex.data.pairs ?? []).map((p) => ({
          left: p.term,
          right: p.definition,
        })),
      };
    }

    case "error_correction": {
      const sentence = ex.data.sentence ?? "";
      const errorWord = ex.data.errorWord ?? "";
      const tokens = sentence.split(/\s+/);
      const foundIdx = tokens.findIndex((t) => t.toLowerCase().includes(errorWord.toLowerCase()));
      const errorTokenIndex = foundIdx >= 0 ? foundIdx : 0;
      return {
        type: "error_spot",
        id,
        level,
        prompt: ex.prompt,
        sentence,
        tokens,
        errorTokenIndex,
        correction: ex.data.correction ?? "",
        explanation: ex.data.rule,
      };
    }

    case "translation": {
      const src = (ex.data.sourceLang ?? "").toLowerCase();
      const isKk =
        src.includes("kaz") ||
        src.includes("kk") ||
        src === "kazakh" ||
        src === "қазақша";
      return {
        type: "translate",
        id,
        level,
        prompt: ex.prompt,
        direction: isKk ? "kk_to_en" : "en_to_kk",
        source: ex.data.sourceText ?? "",
        acceptedAnswers: ex.data.acceptedAnswers ?? [],
        hint: ex.data.hint,
      };
    }
  }
}

export function normalizeExercises(exercises: Exercise[]): LessonItem[] {
  return exercises.map((ex, i) => normalizeExercise(ex, i));
}
