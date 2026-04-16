"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Flag } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "./progress-bar";
import type { StudySession } from "@/features/study/hooks/use-study-session";

interface FlashcardViewerProps {
  session: StudySession;
  showProgress?: boolean;
}

export function FlashcardViewer({
  session,
  showProgress = true,
}: FlashcardViewerProps) {
  const { t } = useLocale();
  const {
    currentCard,
    currentIndex,
    total,
    goNext,
    goPrev,
    reset,
    generation,
    difficult,
    toggleDifficult,
  } = session;
  const currentFlipKey = `${currentIndex}:${generation}`;
  const [flippedKey, setFlippedKey] = useState<string | null>(null);

  // Swipe support
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const isDifficult = currentCard ? difficult.has(currentCard.id) : false;
  const isFlipped = flippedKey === currentFlipKey;

  const handleFlip = useCallback(() => {
    setFlippedKey((prev) => (prev === currentFlipKey ? null : currentFlipKey));
  }, [currentFlipKey]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); handleFlip(); }
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "d" || e.key === "D") toggleDifficult();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleFlip, goNext, goPrev, toggleDifficult]);

  // Swipe handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Only trigger on horizontal swipes > 50px where horizontal > vertical
    if (absDeltaX > 50 && absDeltaX > absDeltaY * 1.5) {
      if (deltaX < 0) goNext();
      else goPrev();
    }

    touchStartX.current = null;
    touchStartY.current = null;
  }, [goNext, goPrev]);

  const progress = total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0;

  if (!currentCard) return null;

  return (
    <div className="space-y-6 animate-fade-in-up sm:space-y-8">
      {showProgress && (
        <ProgressBar current={currentIndex + 1} total={total} percent={progress} />
      )}

      {/* Flip card */}
      <div
        className="perspective-1000 mx-auto w-full max-w-2xl cursor-pointer select-none"
        onClick={handleFlip}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={`relative h-56 w-full transform-3d transition-transform duration-[400ms] ease-in-out sm:h-72 md:h-80 ${
            isFlipped ? "rotate-y-180" : ""
          }`}
        >
          {/* Front — Term */}
          <div className="backface-hidden absolute inset-0 flex flex-col items-center justify-center overflow-y-auto rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-[var(--bg-elevated)] to-[var(--bg-surface)] p-6 shadow-lg sm:rounded-3xl sm:p-10">
            {isDifficult && (
              <div className="absolute right-3 top-3 z-10 rounded-full bg-amber-500/10 p-1.5 sm:right-4 sm:top-4">
                <Flag className="h-3.5 w-3.5 text-amber-500" />
              </div>
            )}
            <p className="shrink-0 text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              {t("study.term")}
            </p>
            <p className="mt-3 text-center text-xl font-bold leading-tight text-[var(--text-primary)] sm:mt-5 sm:text-2xl md:text-3xl">
              {currentCard.term}
            </p>
            <p className="mt-4 shrink-0 text-xs text-[var(--text-muted)] sm:mt-6">
              {t("study.tapToReveal")}
            </p>
          </div>

          {/* Back — Definition */}
          <div className="backface-hidden rotate-y-180 absolute inset-0 flex flex-col items-center justify-center overflow-y-auto rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 p-6 shadow-lg text-white sm:rounded-3xl sm:p-10">
            {isDifficult && (
              <div className="absolute right-3 top-3 z-10 rounded-full bg-white/20 p-1.5 sm:right-4 sm:top-4">
                <Flag className="h-3.5 w-3.5 text-white" />
              </div>
            )}
            <p className="shrink-0 text-xs font-bold uppercase tracking-[0.2em] text-indigo-200">
              {t("study.definition")}
            </p>
            <p className="mt-3 text-center text-xl font-bold leading-tight sm:mt-5 sm:text-2xl md:text-3xl">
              {currentCard.definition}
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-3 sm:gap-4">
        <Button variant="secondary" size="md" onClick={handleFlip} className="min-w-40 tap-target">
          {t("study.flip")}
        </Button>
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <Button variant="outline" size="md" onClick={goPrev} disabled={currentIndex === 0} className="tap-target">
            <ChevronLeft className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">{t("study.previous")}</span>
            <span className="sm:hidden">{t("study.previous")}</span>
          </Button>
          <Button variant="outline" size="md" onClick={goNext} disabled={currentIndex === total - 1} className="tap-target">
            <span className="hidden sm:inline">{t("study.next")}</span>
            <span className="sm:hidden">{t("study.next")}</span>
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-1 sm:gap-5">
        <button
          onClick={(e) => { e.stopPropagation(); toggleDifficult(); }}
          className={`click-scale inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm transition-all tap-target ${
            isDifficult
              ? "bg-amber-500/10 font-medium text-amber-600 dark:text-amber-400"
              : "text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-amber-500"
          }`}
        >
          <Flag className="h-3.5 w-3.5" />
          {isDifficult ? t("study.difficultMarked") : t("study.difficultMark")}
          <kbd className="kbd-hint ml-1 rounded-md bg-[var(--border)] px-1.5 py-0.5 text-[10px] font-mono">D</kbd>
        </button>
        <button
          onClick={reset}
          className="click-scale inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-[var(--text-muted)] transition-all hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] tap-target"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t("study.restart")}
        </button>
      </div>
    </div>
  );
}
