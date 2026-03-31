"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { CheckCircle2, XCircle, ChevronRight, Flag } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "./progress-bar";
import { ResultsScreen } from "./results-screen";
import { ExplanationCard } from "./explanation-card";
import { StudyFeedback } from "./study-feedback";
import { generateChoices, type QuizChoice } from "@/hooks/use-study-session";
import { useSound } from "@/hooks/use-sound";
import type { StudySession } from "@/hooks/use-study-session";

interface QuizModeProps {
  session: StudySession;
  showProgress?: boolean;
  challengeResult?:
    | {
        type: "set";
        setId: string;
        completionTime: number;
        rankingHref: string;
      }
    | {
        type: "class";
        challengeId: string;
        completionTime: number;
        rankingHref: string;
      }
    | null;
  onCompleted?: () => void;
  onReset?: () => void;
}

export function QuizMode({
  session,
  showProgress = true,
  challengeResult = null,
  onCompleted,
  onReset,
}: QuizModeProps) {
  const { t } = useLocale();
  const {
    cards,
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
    completed,
    generation,
    difficult,
    toggleDifficult,
  } = session;

  const { playCorrect, playIncorrect } = useSound();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  const choices: QuizChoice[] = useMemo(
    () => (currentCard ? generateChoices(currentCard, cards) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentIndex, generation]
  );

  useEffect(() => {
    setSelectedKey(null);
    setHasAnswered(false);
  }, [currentIndex, generation]);

  useEffect(() => {
    if (completed.has(currentCard?.id)) {
      setHasAnswered(true);
    }
  }, [currentCard?.id, completed]);

  const handleSelect = useCallback(
    (choice: QuizChoice) => {
      if (hasAnswered) return;

      setSelectedKey(choice.key);
      setHasAnswered(true);

      if (choice.isCorrect) {
        markCorrect();
        playCorrect();
      } else {
        markIncorrect();
        playIncorrect();
      }

      if (answered + 1 >= total) {
        onCompleted?.();
      }
    },
    [answered, hasAnswered, markCorrect, markIncorrect, onCompleted, playCorrect, playIncorrect, total]
  );

  const handleNext = useCallback(() => {
    if (currentIndex < total - 1) {
      goNext();
    }
  }, [currentIndex, total, goNext]);

  // Keyboard: 1-4 to select, Enter/ArrowRight to advance, D for difficult
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= choices.length && !hasAnswered) {
        e.preventDefault();
        handleSelect(choices[num - 1]);
      } else if (
        (e.key === "Enter" || e.key === "ArrowRight") &&
        hasAnswered
      ) {
        e.preventDefault();
        handleNext();
      } else if (e.key === "d" || e.key === "D") {
        toggleDifficult();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [choices, hasAnswered, handleSelect, handleNext, toggleDifficult]);

  if (isFinished) {
    return (
      <ResultsScreen
        score={score}
        total={total}
        difficultCount={difficult.size}
        cardResults={session.cardResults}
        onReset={onReset ?? reset}
        onStudyDifficult={session.studyDifficultOnly}
        challengeResult={challengeResult}
      />
    );
  }

  if (!currentCard) return null;

  const isDifficult = difficult.has(currentCard.id);
  const selectedChoice = choices.find((choice) => choice.key === selectedKey);

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

      {/* Question */}
      <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-7 text-center shadow-sm sm:rounded-3xl sm:px-8 sm:py-10">
        {isDifficult && (
          <Flag className="absolute right-3 top-3 h-4 w-4 text-amber-500 sm:right-4 sm:top-4" />
        )}
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          {t("study.whatIsDefinition")}
        </p>
        <p className="mt-3 text-xl font-semibold leading-tight text-[var(--text-primary)] sm:mt-4 sm:text-2xl md:text-3xl">
          {currentCard.term}
        </p>
      </div>

      {hasAnswered && selectedChoice && (
        <div className="space-y-3 sm:space-y-4">
          <StudyFeedback
            correct={selectedChoice.isCorrect}
            currentStreak={currentStreak}
            answered={answered}
            total={total}
            xpEarned={selectedChoice.isCorrect ? 10 : 4}
          />
          <ExplanationCard
            term={currentCard.term}
            definition={currentCard.definition}
            correct={selectedChoice.isCorrect}
            userAnswer={
              !selectedChoice.isCorrect ? selectedChoice.text : undefined
            }
          />
        </div>
      )}

      {/* Choices */}
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        {choices.map((choice, index) => {
          const isSelected = choice.key === selectedKey;

          let style: string;
          if (!hasAnswered) {
            style =
              "border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer active:scale-[0.98]";
          } else if (choice.isCorrect) {
            style = "border-green-300 bg-green-50";
          } else if (isSelected && !choice.isCorrect) {
            style = "border-red-300 bg-red-50";
          } else {
            style = "border-gray-200 bg-white opacity-50";
          }

          return (
            <button
              key={choice.key}
              onClick={() => handleSelect(choice)}
              disabled={hasAnswered}
              className={`flex min-h-[3.5rem] items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm leading-6 transition-colors sm:min-h-16 sm:rounded-2xl sm:px-5 sm:py-4 ${style}`}
            >
              <kbd className="kbd-hint flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gray-100 text-xs font-mono text-gray-500">
                {index + 1}
              </kbd>
              {hasAnswered && choice.isCorrect && (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
              )}
              {hasAnswered && isSelected && !choice.isCorrect && (
                <XCircle className="h-5 w-5 shrink-0 text-red-600" />
              )}
              <span className="text-gray-900">{choice.text}</span>
            </button>
          );
        })}
      </div>

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

        {hasAnswered && currentIndex < total - 1 && (
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
