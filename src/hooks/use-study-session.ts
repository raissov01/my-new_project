"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import type { Flashcard } from "@/types/database";

export type StudyMode = "flashcard" | "quiz" | "write";

/** Per-card result tracked during a session. */
export type CardSessionResult = {
  flashcardId: string;
  term: string;
  definition: string;
  correct: boolean;
};

export interface StudySession {
  cards: Flashcard[];
  currentIndex: number;
  score: number;
  answered: number;
  currentStreak: number;
  bestStreak: number;
  completed: Set<string>;
  difficult: Set<string>;
  /** Per-card results for the current session (keyed by card ID). */
  cardResults: Map<string, CardSessionResult>;
  isFinished: boolean;
  total: number;
  progress: number;
  currentCard: Flashcard;
  generation: number;
  shuffled: boolean;
  studyingDifficult: boolean;
  goNext: () => void;
  goPrev: () => void;
  goTo: (index: number) => void;
  markCorrect: () => void;
  markIncorrect: () => void;
  toggleDifficult: () => void;
  toggleShuffle: () => void;
  studyDifficultOnly: () => void;
  studyAll: () => void;
  reset: () => void;
}

function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function useStudySession(flashcards: Flashcard[]): StudySession {
  const [shuffled, setShuffled] = useState(true);
  const [difficult, setDifficult] = useState<Set<string>>(new Set());
  const [studyingDifficult, setStudyingDifficult] = useState(false);
  const [generation, setGeneration] = useState(0);

  const cards = useMemo(() => {
    let pool = flashcards;
    if (studyingDifficult) {
      pool = flashcards.filter((c) => difficult.has(c.id));
    }
    return shuffled ? shuffle(pool) : [...pool];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashcards, shuffled, studyingDifficult, difficult, generation]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [cardResults, setCardResults] = useState<
    Map<string, CardSessionResult>
  >(new Map());

  const completedRef = useRef(completed);
  completedRef.current = completed;

  const total = cards.length;
  const isFinished = total > 0 && answered >= total;
  const progress = total > 0 ? Math.round((answered / total) * 100) : 0;
  const currentCard = cards[Math.min(currentIndex, Math.max(total - 1, 0))];

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, total - 1));
  }, [total]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const goTo = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const markCorrect = useCallback(() => {
    const card = cards[currentIndex];
    if (!card || completedRef.current.has(card.id)) return;
    setScore((prev) => prev + 1);
    setAnswered((prev) => prev + 1);
    setCurrentStreak((prev) => {
      const next = prev + 1;
      setBestStreak((best) => Math.max(best, next));
      return next;
    });
    setCompleted((prev) => new Set(prev).add(card.id));
    setCardResults((prev) => {
      const next = new Map(prev);
      next.set(card.id, {
        flashcardId: card.id,
        term: card.term,
        definition: card.definition,
        correct: true,
      });
      return next;
    });
  }, [cards, currentIndex]);

  const markIncorrect = useCallback(() => {
    const card = cards[currentIndex];
    if (!card || completedRef.current.has(card.id)) return;
    setAnswered((prev) => prev + 1);
    setCurrentStreak(0);
    setCompleted((prev) => new Set(prev).add(card.id));
    setCardResults((prev) => {
      const next = new Map(prev);
      next.set(card.id, {
        flashcardId: card.id,
        term: card.term,
        definition: card.definition,
        correct: false,
      });
      return next;
    });
  }, [cards, currentIndex]);

  const toggleDifficult = useCallback(() => {
    const cardId = cards[currentIndex]?.id;
    if (!cardId) return;
    setDifficult((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }, [cards, currentIndex]);

  const resetProgress = useCallback(() => {
    setCurrentIndex(0);
    setScore(0);
    setAnswered(0);
    setCurrentStreak(0);
    setBestStreak(0);
    setCompleted(new Set());
    setCardResults(new Map());
    setGeneration((prev) => prev + 1);
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffled((prev) => !prev);
    resetProgress();
  }, [resetProgress]);

  const studyDifficultOnly = useCallback(() => {
    setStudyingDifficult(true);
    resetProgress();
  }, [resetProgress]);

  const studyAll = useCallback(() => {
    setStudyingDifficult(false);
    resetProgress();
  }, [resetProgress]);

  const reset = resetProgress;

  return {
    cards,
    currentIndex,
    score,
    answered,
    currentStreak,
    bestStreak,
    completed,
    difficult,
    cardResults,
    isFinished,
    total,
    progress,
    currentCard,
    generation,
    shuffled,
    studyingDifficult,
    goNext,
    goPrev,
    goTo,
    markCorrect,
    markIncorrect,
    toggleDifficult,
    toggleShuffle,
    studyDifficultOnly,
    studyAll,
    reset,
  };
}

// ── Quiz helpers ─────────────────────────────────────────────────────────────

export interface QuizChoice {
  text: string;
  key: string;
  isCorrect: boolean;
}

export function generateChoices(
  correctCard: Flashcard,
  allCards: Flashcard[]
): QuizChoice[] {
  const seen = new Set<string>([correctCard.definition]);
  const wrong: QuizChoice[] = [];

  const shuffledOthers = shuffle(
    allCards.filter((c) => c.id !== correctCard.id)
  );

  for (const card of shuffledOthers) {
    if (wrong.length >= 3) break;
    if (seen.has(card.definition)) continue;
    seen.add(card.definition);
    wrong.push({
      text: card.definition,
      key: card.id,
      isCorrect: false,
    });
  }

  const correct: QuizChoice = {
    text: correctCard.definition,
    key: correctCard.id,
    isCorrect: true,
  };

  return shuffle([correct, ...wrong]);
}

// ── Write helpers ────────────────────────────────────────────────────────────

export function checkAnswer(
  userAnswer: string,
  correctAnswer: string
): boolean {
  const normalize = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[.,!?;:]+$/g, "")
      .replace(/\s+/g, " ");

  return normalize(userAnswer) === normalize(correctAnswer);
}
