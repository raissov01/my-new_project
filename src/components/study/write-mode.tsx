"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { ChevronRight, Flag } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "./progress-bar";
import { ResultsScreen } from "./results-screen";
import { ExplanationCard } from "./explanation-card";
import { StudyFeedback } from "./study-feedback";
import { checkAnswer } from "@/hooks/use-study-session";
import { useSound } from "@/hooks/use-sound";
import type { StudySession } from "@/hooks/use-study-session";

interface WriteModeProps {
  session: StudySession;
  showProgress?: boolean;
}

type Verdict = "correct" | "incorrect" | null;

export function WriteMode({ session, showProgress = true }: WriteModeProps) {
  const { t } = useLocale();
  const {
    currentCard,
    currentIndex,
    total,
    score,
    answered,
    currentStreak,
    progress,
    isFinished,
    goNext,
    markCorrect,
    markIncorrect,
    reset,
    generation,
    difficult,
    toggleDifficult,
  } = session;

  const { playCorrect, playIncorrect } = useSound();
  const cardStateKey = useMemo(
    () => `${currentIndex}-${generation}`,
    [currentIndex, generation]
  );
  const [cardState, setCardState] = useState<{
    key: string;
    answer: string;
    verdict: Verdict;
  }>({
    key: cardStateKey,
    answer: "",
    verdict: null,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const answer = cardState.key === cardStateKey ? cardState.answer : "";
  const verdict = cardState.key === cardStateKey ? cardState.verdict : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (verdict !== null || !answer.trim()) return;

    if (checkAnswer(answer, currentCard.definition)) {
      setCardState({ key: cardStateKey, answer, verdict: "correct" });
      markCorrect();
      playCorrect();
    } else {
      setCardState({ key: cardStateKey, answer, verdict: "incorrect" });
      markIncorrect();
      playIncorrect();
    }
  }

  const handleNext = useCallback(() => {
    if (currentIndex < total - 1) {
      goNext();
    }
  }, [currentIndex, total, goNext]);

  // Keyboard: Enter/ArrowRight to advance after answering, D for difficult
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "d" || e.key === "D") {
        if (document.activeElement !== inputRef.current) {
          toggleDifficult();
        }
      } else if (verdict !== null) {
        if (e.key === "Enter" || e.key === "ArrowRight") {
          e.preventDefault();
          handleNext();
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [verdict, handleNext, toggleDifficult]);

  if (isFinished) {
    return (
      <ResultsScreen
        score={score}
        total={total}
        difficultCount={difficult.size}
        cardResults={session.cardResults}
        onReset={reset}
        onStudyDifficult={session.studyDifficultOnly}
      />
    );
  }

  if (!currentCard) return null;

  const isDifficult = difficult.has(currentCard.id);

  return (
    <div className="space-y-5 sm:space-y-8">
      {showProgress && (
        <ProgressBar
          current={Math.min(answered + 1, total)}
          answered={answered}
          total={total}
          percent={progress}
        />
      )}

      {/* Term display */}
      <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-7 text-center shadow-sm sm:rounded-3xl sm:px-8 sm:py-10">
        {isDifficult && (
          <Flag className="absolute right-3 top-3 h-4 w-4 text-amber-500 sm:right-4 sm:top-4" />
        )}
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          {t("study.writeDefinition")}
        </p>
        <p className="mt-3 text-xl font-semibold leading-tight text-[var(--text-primary)] sm:mt-4 sm:text-2xl md:text-3xl">
          {currentCard.term}
        </p>
      </div>

      {/* Answer input */}
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <input
          ref={inputRef}
          key={cardStateKey}
          type="text"
          placeholder={t("study.typeAnswer")}
          value={answer}
          onChange={(e) =>
            setCardState({
              key: cardStateKey,
              answer: e.target.value,
              verdict: null,
            })
          }
          disabled={verdict !== null}
          autoFocus
          autoComplete="off"
          className={`w-full rounded-xl border px-4 py-3.5 text-base shadow-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-70 sm:rounded-2xl sm:px-5 sm:py-4 ${
            verdict === "correct"
              ? "border-green-300 bg-green-50 focus:ring-green-500"
              : verdict === "incorrect"
                ? "border-red-300 bg-red-50 focus:ring-red-500"
                : "border-gray-300 focus:ring-indigo-500"
          }`}
        />

        {verdict === null && (
          <Button type="submit" className="w-full py-3 tap-target" disabled={!answer.trim()}>
            {t("study.checkAnswer")}
          </Button>
        )}
      </form>

      {/* Explanation */}
      {verdict !== null && (
        <div className="space-y-3 sm:space-y-4">
          <StudyFeedback
            correct={verdict === "correct"}
            currentStreak={currentStreak}
            answered={answered}
            total={total}
            xpEarned={verdict === "correct" ? 10 : 4}
          />
          <ExplanationCard
            term={currentCard.term}
            definition={currentCard.definition}
            correct={verdict === "correct"}
            userAnswer={verdict === "incorrect" ? answer : undefined}
          />
        </div>
      )}

      {/* Bottom controls */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-1 sm:gap-4">
        <button
          onClick={toggleDifficult}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm transition-colors tap-target ${
            isDifficult
              ? "font-medium text-amber-600"
              : "text-gray-400 hover:text-amber-500"
          }`}
        >
          <Flag className="h-3.5 w-3.5" />
          {isDifficult ? t("study.difficultMarked") : t("study.difficultMark")}
          <kbd className="kbd-hint ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono text-gray-400">
            D
          </kbd>
        </button>

        {verdict !== null && currentIndex < total - 1 && (
          <Button onClick={handleNext} size="sm" className="min-w-32 tap-target">
            {t("study.next")}
            <ChevronRight className="ml-1 h-4 w-4" />
            <kbd className="kbd-hint ml-1.5 rounded bg-indigo-500 px-1.5 py-0.5 text-[10px] font-mono text-indigo-200">
              Enter
            </kbd>
          </Button>
        )}
      </div>
    </div>
  );
}
