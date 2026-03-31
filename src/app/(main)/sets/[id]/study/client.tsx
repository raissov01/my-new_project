"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Layers,
  ListChecks,
  PenLine,
  AlertCircle,
  Flag,
  ArrowLeft,
} from "lucide-react";
import { FlashcardViewer, PomodoroTimer, ProgressBar, QuizMode, WriteMode } from "@/components/study";
import { PomodoroSummary } from "@/components/study/pomodoro-summary";
import { useLocale } from "@/components/providers/locale-provider";
import { useStudySession, type StudyMode } from "@/hooks/use-study-session";
import { usePomodoro } from "@/hooks/use-pomodoro";
import { Button } from "@/components/ui/button";
import type { SmartStudySummary } from "@/lib/spaced-repetition";
import type { PomodoroSettings } from "@/lib/pomodoro";
import type { Flashcard } from "@/types/database";

const STUDY_MODES = [
  { key: "flashcard" as const, icon: Layers, minCards: 1, labelKey: "study.flashcards" },
  { key: "quiz" as const, icon: ListChecks, minCards: 4, labelKey: "study.quiz" },
  { key: "write" as const, icon: PenLine, minCards: 1, labelKey: "study.write" },
];

interface StudyClientProps {
  flashcards: Flashcard[];
  smartFlashcards: Flashcard[];
  smartSummary: SmartStudySummary;
  initialSmartMode: boolean;
  smartToggleEnabled: boolean;
  initialPomodoroSettings: PomodoroSettings;
  setId: string;
  initialMode: StudyMode;
}

export function StudyClient({
  flashcards,
  smartFlashcards,
  smartSummary,
  initialSmartMode,
  smartToggleEnabled,
  initialPomodoroSettings,
  setId,
  initialMode,
}: StudyClientProps) {
  const { t } = useLocale();
  const [mode, setMode] = useState<StudyMode>(initialMode);
  const [smartEnabled, setSmartEnabled] = useState(
    initialSmartMode && smartToggleEnabled && smartFlashcards.length > 0
  );
  const activeFlashcards = useMemo(
    () =>
      smartEnabled && smartFlashcards.length > 0 ? smartFlashcards : flashcards,
    [flashcards, smartEnabled, smartFlashcards]
  );
  const session = useStudySession(activeFlashcards);
  const resetSession = session.reset;
  const didMountRef = useRef(false);

  const [showPomodoroSummary, setShowPomodoroSummary] = useState(false);
  const handleWorkComplete = useCallback(() => {
    setShowPomodoroSummary(true);
  }, []);
  const pomodoro = usePomodoro(initialPomodoroSettings, handleWorkComplete);

  const modes = useMemo(
    () =>
      STUDY_MODES.map((modeConfig) => ({
        ...modeConfig,
        label: t(modeConfig.labelKey),
      })),
    [t]
  );
  const currentModeConfig = useMemo(
    () => modes.find((m) => m.key === mode) ?? modes[0],
    [mode, modes]
  );
  const effectiveMinCards = currentModeConfig.minCards;
  const hasEnoughCards = session.cards.length >= effectiveMinCards;
  const progressCurrent =
    mode === "flashcard"
      ? Math.min(session.currentIndex + 1, Math.max(session.total, 1))
      : Math.min(session.answered + 1, Math.max(session.total, 1));
  const progressPercent =
    mode === "flashcard"
      ? session.total > 0
        ? Math.round(((session.currentIndex + 1) / session.total) * 100)
        : 0
      : session.progress;

  const smartSummaryBadges = useMemo(
    () => [
      {
        key: "due",
        value: smartSummary.dueCount,
        label: t("study.smartDue"),
        className:
          "rounded-full bg-indigo-500/10 px-2.5 py-1 text-indigo-700 dark:text-indigo-300",
      },
      {
        key: "weak",
        value: smartSummary.weakCount,
        label: t("study.smartWeak"),
        className:
          "rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300",
      },
      {
        key: "new",
        value: smartSummary.newCount,
        label: t("study.smartNew"),
        className:
          "rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300",
      },
    ],
    [smartSummary.dueCount, smartSummary.newCount, smartSummary.weakCount, t]
  );

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    resetSession();
  }, [resetSession, smartEnabled]);

  const handleModeChange = useCallback((newMode: StudyMode) => {
    if (newMode !== mode) {
      setMode(newMode);
      resetSession();
    }
  }, [mode, resetSession]);

  const handleEnableSmart = useCallback(() => {
    setSmartEnabled(true);
  }, []);

  const handleDisableSmart = useCallback(() => {
    setSmartEnabled(false);
  }, []);

  return (
    <div className="space-y-5 sm:space-y-8">
      {!session.isFinished && hasEnoughCards && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-sm sm:rounded-[1.75rem] sm:p-5">
          <div className="grid gap-4 sm:gap-5 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
            <div className="space-y-3 sm:space-y-4">
              <ProgressBar
                current={progressCurrent}
                answered={session.answered}
                total={session.total}
                percent={progressPercent}
              />

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-1 sm:w-auto sm:p-1.5">
                  {modes.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => handleModeChange(key)}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors duration-150 sm:flex-none sm:gap-2 sm:px-3 ${
                        mode === key
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-xs sm:text-sm">{label}</span>
                    </button>
                  ))}
                </div>

                {smartToggleEnabled && (
                  <div className="flex w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-1 sm:w-auto">
                    <button
                      type="button"
                      onClick={handleDisableSmart}
                      className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors sm:flex-none ${
                        !smartEnabled
                          ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm"
                          : "text-[var(--text-muted)]"
                      }`}
                    >
                      {t("study.normalMode")}
                    </button>
                    <button
                      type="button"
                      onClick={handleEnableSmart}
                      disabled={smartFlashcards.length === 0}
                      className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors sm:flex-none ${
                        smartEnabled
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-[var(--text-muted)]"
                      }`}
                    >
                      {t("study.smartMode")}
                    </button>
                  </div>
                )}
              </div>

              {smartToggleEnabled && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {smartSummaryBadges.map((badge) => (
                    <span key={badge.key} className={badge.className}>
                      {badge.value} {badge.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <PomodoroTimer pomodoro={pomodoro} />
          </div>
        </div>
      )}

      {/* Pomodoro summary after work session completes */}
      {showPomodoroSummary && (
        <PomodoroSummary
          preset={pomodoro.preset}
          workMinutes={pomodoro.workMinutes}
          breakMinutes={pomodoro.breakMinutes}
          elapsedWorkSeconds={pomodoro.elapsedWorkSeconds}
          cardsReviewed={session.answered}
          correctAnswers={session.score}
          studyMode={mode}
          setId={setId}
          onClose={() => setShowPomodoroSummary(false)}
        />
      )}

      <div className="flex min-h-6 items-center justify-center">
        {session.difficult.size > 0 && (
          <>
            {session.studyingDifficult ? (
              <button
                onClick={session.studyAll}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t("study.backToAllCards")}
              </button>
            ) : (
              <button
                onClick={session.studyDifficultOnly}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-500/15"
              >
                <Flag className="h-3.5 w-3.5" />
                {t("study.studyDifficult")} {session.difficult.size}
              </button>
            )}
          </>
        )}

        {session.studyingDifficult && (
          <span className="text-xs text-gray-400">
            {t("study.showingDifficultOnly")}
          </span>
        )}
      </div>

      {/* Active mode or minimum-cards notice */}
      {!hasEnoughCards ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-6 py-8 text-center">
          <AlertCircle className="h-8 w-8 text-yellow-500" />
          <p className="text-sm text-yellow-800">
            {t("study.quizNeedsCards", { count: effectiveMinCards })}
          </p>
          <p className="text-sm text-yellow-600">
            {t("study.tryOtherMode")}
          </p>
          {session.studyingDifficult && (
            <Button
              variant="outline"
              size="sm"
              onClick={session.studyAll}
              className="mt-2"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              {t("study.backToAllCards")}
            </Button>
          )}
        </div>
      ) : (
        <>
          {mode === "flashcard" && <FlashcardViewer session={session} showProgress={false} />}
          {mode === "quiz" && <QuizMode session={session} showProgress={false} />}
          {mode === "write" && <WriteMode session={session} showProgress={false} />}
        </>
      )}

    </div>
  );
}
