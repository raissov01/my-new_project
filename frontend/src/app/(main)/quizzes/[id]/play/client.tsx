"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Flame,
  LogOut,
  Timer,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTranslator, type Locale } from "@/lib/shared/i18n";
import { useQuizSounds } from "@/features/quizzes/use-sounds";
import { AnswerAnimation } from "@/features/quizzes/components/answer-animation";
import { usePowerUps, type PowerUpKey } from "@/features/quizzes/use-power-ups";
import { PowerUpBar } from "@/features/quizzes/components/power-up-bar";
import type {
  QuizDetail,
  QuizQuestionDTO,
  QuizQuestionType,
} from "@/server/services/quizzes";

type OptionLetter = "a" | "b" | "c" | "d";
type TrueFalseLetter = "t" | "f";

type DisplayOption = {
  letter: OptionLetter;
  text: string;
};

// RecordedAnswer is what we send to the backend. Only one of the value
// fields is populated per row, depending on the question type.
type RecordedAnswer = {
  questionId: string;
  selectedOption: OptionLetter | TrueFalseLetter | null;
  textAnswer: string | null;
  orderAnswer: string[] | null;
  timeSpent: number;
};

type Phase = "asking" | "revealed" | "submitting";

const POSITION_LABELS = ["A", "B", "C", "D"] as const;

const ACCENT_BY_POSITION = [
  "from-indigo-500/25 to-indigo-500/5 border-indigo-400/30",
  "from-rose-500/25 to-rose-500/5 border-rose-400/30",
  "from-amber-500/25 to-amber-500/5 border-amber-400/30",
  "from-emerald-500/25 to-emerald-500/5 border-emerald-400/30",
] as const;

function normalizeBlank(value: string): string {
  return value.trim().toLowerCase();
}

function buildBaseOptions(question: QuizQuestionDTO): DisplayOption[] {
  return (["a", "b", "c", "d"] as OptionLetter[]).map((letter) => ({
    letter,
    text:
      letter === "a"
        ? question.optionA ?? ""
        : letter === "b"
          ? question.optionB ?? ""
          : letter === "c"
            ? question.optionC ?? ""
            : question.optionD ?? "",
  }));
}

function shuffleOptions(base: DisplayOption[]): DisplayOption[] {
  // Fisher-Yates; re-shuffle on the rare identity permutation so the
  // canonical order is never shown when shuffle is enabled.
  const copy = [...base];
  do {
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
  } while (copy.every((opt, idx) => opt.letter === base[idx].letter));
  return copy;
}

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

interface PlayQuizClientProps {
  quiz: QuizDetail;
  locale: Locale;
  // "play" — default graded attempt, timer enabled, submits to /attempts.
  // "practice" — no timer, no submission; on completion route to returnHref.
  mode?: "play" | "practice";
  // Where to send the student when practice completes. Ignored in play mode.
  returnHref?: string;
}

export function PlayQuizClient({
  quiz,
  locale,
  mode = "play",
  returnHref,
}: PlayQuizClientProps) {
  const isPractice = mode === "practice";
  const sounds = useQuizSounds();
  // Power-ups are disabled in practice mode (it's a focused review, not a
  // gamified run) and when the quiz owner has turned them off.
  const powerUpsEnabled = !isPractice && (quiz.powerUpsEnabled ?? true);
  const powerUps = usePowerUps(powerUpsEnabled);
  // Client-only coin counter so Double Points has something to multiply.
  // Kept separate from the backend's authoritative % score so grading
  // stays pure on the server.
  const [coins, setCoins] = useState(0);
  // Counter ticks up on every answer so the AnswerAnimation overlay gets a
  // fresh `key` and remounts even if the same phase fires twice in a row.
  const [animationTick, setAnimationTick] = useState(0);
  const t = useMemo(() => createTranslator(locale), [locale]);
  const router = useRouter();

  const totalQuestions = quiz.questions.length;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("asking");
  const [timeLeft, setTimeLeft] = useState(quiz.timePerQuestion);
  const [streak, setStreak] = useState(0);
  const [showExit, setShowExit] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Per-type transient answer state. Only one is meaningful at a time; the
  // renderer picks which to surface based on question.questionType.
  const [selectedLetter, setSelectedLetter] = useState<
    OptionLetter | TrueFalseLetter | null
  >(null);
  const [blankInput, setBlankInput] = useState("");
  const [reorderDraft, setReorderDraft] = useState<string[]>([]);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);

  const answersRef = useRef<RecordedAnswer[]>([]);
  const questionStartRef = useRef<number>(0);
  const quizStartRef = useRef<number>(0);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const question = quiz.questions[currentIdx];
  const questionType: QuizQuestionType = question.questionType ?? "mcq";

  // MCQ display order: SSR renders the base order so hydration matches,
  // then useEffect below replaces it with a randomized order on mount and
  // on each question transition. Only meaningful for mcq questions.
  const [displayOptions, setDisplayOptions] = useState<DisplayOption[]>(() =>
    buildBaseOptions(question)
  );

  // Client-only shuffle: Math.random() during render produces an SSR/client
  // hydration mismatch, so we seed the base order on first render and replace
  // it here on mount and each question transition. The setDisplayOptions call
  // is the intentional violation of the set-state-in-effect rule — shuffling
  // during render is precisely the bug this fix exists for.
  useEffect(() => {
    const q = quiz.questions[currentIdx];
    if ((q.questionType ?? "mcq") === "mcq") {
      const base = buildBaseOptions(q);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayOptions(quiz.shuffleOptions ? shuffleOptions(base) : base);
    }
    if ((q.questionType ?? "mcq") === "reorder") {
      const items = q.reorderItems ?? [];
      setReorderDraft(quiz.shuffleOptions ? shuffleArray(items) : [...items]);
    } else {
      setReorderDraft([]);
    }
    setBlankInput("");
  }, [currentIdx, quiz.questions, quiz.shuffleOptions]);

  const clearAdvanceTimer = () => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  };

  const submitAttempt = useCallback(async () => {
    setPhase("submitting");
    setSubmitError(null);
    sounds.play("complete");
    try {
      const response = await fetch(
        `/api/quizzes/${encodeURIComponent(quiz.id)}/attempts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startedAt: new Date(quizStartRef.current).toISOString(),
            answers: answersRef.current,
          }),
        }
      );
      const data = (await response.json().catch(() => null)) as
        | { id?: string; error?: string }
        | null;

      if (!response.ok || !data?.id) {
        setSubmitError(data?.error ?? t("quiz.play.submitFailed"));
        setPhase("revealed");
        return;
      }
      router.push(
        `/quizzes/${encodeURIComponent(quiz.id)}/results?attempt=${encodeURIComponent(data.id)}`
      );
    } catch {
      setSubmitError(t("quiz.play.submitFailed"));
      setPhase("revealed");
    }
  }, [quiz.id, router, t, sounds]);

  const advance = useCallback(() => {
    clearAdvanceTimer();
    if (currentIdx + 1 >= totalQuestions) {
      if (isPractice) {
        router.push(returnHref ?? `/quizzes/${encodeURIComponent(quiz.id)}`);
        return;
      }
      void submitAttempt();
      return;
    }
    setCurrentIdx((i) => i + 1);
    setSelectedLetter(null);
    setLastCorrect(null);
    setPhase("asking");
    setTimeLeft(quiz.timePerQuestion);
    powerUps.resetPerQuestion();
    questionStartRef.current = Date.now();
  }, [
    currentIdx,
    quiz.id,
    quiz.timePerQuestion,
    submitAttempt,
    totalQuestions,
    isPractice,
    router,
    returnHref,
    powerUps,
  ]);

  // recordAnswer is the single chokepoint for every question type. Callers
  // build the record shape appropriate for their type; this function handles
  // grading, streak, phase transition, and the auto-advance timer.
  const recordAnswer = useCallback(
    (record: Omit<RecordedAnswer, "questionId" | "timeSpent">, isCorrect: boolean) => {
      if (phase !== "asking") return;
      const timeSpent = Math.max(
        0,
        Math.round((Date.now() - questionStartRef.current) / 1000)
      );
      answersRef.current.push({
        questionId: question.id,
        selectedOption: record.selectedOption,
        textAnswer: record.textAnswer,
        orderAnswer: record.orderAnswer,
        timeSpent,
      });

      // Consume per-answer power-up effects (Double Points gain, Streak
      // Saver preservation). Returns the coin gain for this answer and
      // whether a wrong answer should keep the streak intact.
      const { coinsEarned, streakSaved } = powerUps.consumeOnAnswer(isCorrect);
      if (coinsEarned > 0) {
        setCoins((c) => c + coinsEarned);
      }

      if (isCorrect) {
        setStreak((s) => {
          const next = s + 1;
          // Fire the streak flourish at 5, 10, 15… so early correct
          // answers get the ordinary chime, not the bigger cue.
          if (next > 1 && next % 5 === 0) {
            sounds.play("streak");
          } else {
            sounds.play("correct");
          }
          // Grant a new power-up every 3-streak.
          powerUps.grant(next);
          return next;
        });
      } else if (streakSaved) {
        // Streak Saver ate the loss — keep the streak and play the
        // success chime to underline that the save happened.
        sounds.play("streak");
      } else {
        setStreak(0);
        sounds.play("wrong");
      }
      setAnimationTick((n) => n + 1);
      // For UI purposes (green overlay + reveal colors), treat a saved
      // wrong answer as "still wrong" but the streak reset is skipped.
      setLastCorrect(isCorrect);
      setPhase("revealed");

      advanceTimerRef.current = setTimeout(() => {
        advance();
      }, 1800);
    },
    [advance, phase, question.id, sounds, powerUps]
  );

  const recordMcq = useCallback(
    (letter: OptionLetter | null) => {
      const isCorrect = letter !== null && letter === question.correctOption;
      setSelectedLetter(letter);
      recordAnswer(
        { selectedOption: letter, textAnswer: null, orderAnswer: null },
        isCorrect
      );
    },
    [question.correctOption, recordAnswer]
  );

  const recordTrueFalse = useCallback(
    (letter: TrueFalseLetter | null) => {
      const isCorrect = letter !== null && letter === question.correctOption;
      setSelectedLetter(letter);
      recordAnswer(
        { selectedOption: letter, textAnswer: null, orderAnswer: null },
        isCorrect
      );
    },
    [question.correctOption, recordAnswer]
  );

  const recordBlank = useCallback(
    (value: string | null) => {
      const submitted = value === null ? null : value.trim();
      const isCorrect =
        submitted !== null &&
        submitted !== "" &&
        question.blankAnswer != null &&
        normalizeBlank(submitted) === normalizeBlank(question.blankAnswer);
      recordAnswer(
        { selectedOption: null, textAnswer: submitted, orderAnswer: null },
        isCorrect
      );
    },
    [question.blankAnswer, recordAnswer]
  );

  const recordReorder = useCallback(
    (items: string[] | null) => {
      const canonical = question.reorderItems ?? [];
      const isCorrect =
        items !== null && items.length > 0 && arraysEqual(items, canonical);
      recordAnswer(
        { selectedOption: null, textAnswer: null, orderAnswer: items },
        isCorrect
      );
    },
    [question.reorderItems, recordAnswer]
  );

  // Timeout handler: fires a "null" answer of the right shape for the
  // current question type so the backend still gets a row per question.
  const handleTimeout = useCallback(() => {
    switch (questionType) {
      case "mcq":
        recordMcq(null);
        return;
      case "true_false":
        recordTrueFalse(null);
        return;
      case "fill_blank":
        recordBlank(null);
        return;
      case "reorder":
        recordReorder(null);
        return;
    }
  }, [questionType, recordMcq, recordTrueFalse, recordBlank, recordReorder]);

  // Countdown timer; auto-skips via handleTimeout when it hits 0.
  // Practice mode disables the timer entirely so students can dwell on
  // questions they previously got wrong.
  const handleTimeoutRef = useRef(handleTimeout);
  useEffect(() => {
    handleTimeoutRef.current = handleTimeout;
  });
  const timeFrozen = powerUps.effects.timeFrozen;
  useEffect(() => {
    if (phase !== "asking" || isPractice || timeFrozen) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          queueMicrotask(() => handleTimeoutRef.current());
          return 0;
        }
        // Tick on the final five seconds (5 → 1) so the student hears a
        // ramp before timeout fires. No tick at 0 because that frame is
        // the timeout itself.
        const next = prev - 1;
        if (next <= 5 && next > 0) {
          sounds.play("tick");
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, currentIdx, isPractice, timeFrozen, sounds]);

  useEffect(() => {
    return () => clearAdvanceTimer();
  }, []);

  useEffect(() => {
    quizStartRef.current = Date.now();
    questionStartRef.current = Date.now();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const progress = (currentIdx + 1) / totalQuestions;
  const timerProgress = Math.max(0, timeLeft / quiz.timePerQuestion);
  const revealed = phase !== "asking";

  const questionNumberLabel = t("quiz.play.questionOf")
    .replace("{n}", String(currentIdx + 1))
    .replace("{total}", String(totalQuestions));

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-[var(--bg-base)]">
      <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg-base)]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
              <span>{questionNumberLabel}</span>
              {isPractice ? (
                <span className="inline-flex items-center gap-1.5 text-[var(--primary)]">
                  {t("quiz.practice.label")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2.5">
                  {powerUpsEnabled && coins > 0 ? (
                    <span className="inline-flex items-center gap-1 text-amber-300">
                      ★ {coins}
                    </span>
                  ) : null}
                  <span
                    className={`inline-flex items-center gap-1.5 ${
                      timeFrozen ? "text-sky-300" : "text-[var(--text-primary)]"
                    }`}
                  >
                    <Timer className="h-3.5 w-3.5" />
                    {timeLeft}
                    {t("quiz.secondsShort")}
                  </span>
                </span>
              )}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--bg-soft)]">
              <div
                className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300 ease-out"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={sounds.toggle}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            aria-label={sounds.enabled ? t("quiz.play.soundOff") : t("quiz.play.soundOn")}
            title={sounds.enabled ? t("quiz.play.soundOff") : t("quiz.play.soundOn")}
          >
            {sounds.enabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowExit(true)}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            aria-label={t("quiz.play.exit")}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{t("quiz.play.exit")}</span>
          </button>
        </div>
        {isPractice ? null : (
          <div className="h-1 bg-[var(--bg-soft)]">
            <div
              className="h-full bg-[var(--accent)] transition-[width] duration-1000 ease-linear"
              style={{ width: `${timerProgress * 100}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-start px-3 py-5 sm:px-6 sm:py-10">
        {streak > 1 ? (
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3.5 py-1.5 text-sm font-semibold text-amber-300">
            <Flame className="h-4 w-4" />
            {t("quiz.play.streakLabel").replace("{n}", String(streak))}
          </div>
        ) : null}

        <div
          key={currentIdx}
          className="relative w-full max-w-3xl animate-fade-in-up"
        >
          {quiz.showAnswerAnimations && revealed && lastCorrect !== null ? (
            <AnswerAnimation
              key={animationTick}
              phase={lastCorrect ? "correct" : "wrong"}
              encourageText={t("quiz.play.encouragement")}
            />
          ) : null}
          <div className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--surface-shadow-strong)] sm:rounded-[2rem] sm:p-8 md:p-10">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {t("quiz.question")} {currentIdx + 1}
            </p>
            {question.imageUrl ? (
              <div className="mt-3 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-base)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={question.imageUrl}
                  alt=""
                  className="mx-auto max-h-[280px] w-auto object-contain"
                />
              </div>
            ) : null}
            <h1 className="mt-3 break-words text-xl font-semibold leading-tight tracking-[-0.02em] text-[var(--text-primary)] sm:text-2xl md:text-3xl lg:text-4xl">
              {question.questionText}
            </h1>
          </div>

          {questionType === "mcq" ? (
            <McqBody
              displayOptions={displayOptions}
              selectedLetter={selectedLetter as OptionLetter | null}
              correctLetter={question.correctOption as OptionLetter | null | undefined}
              hiddenLetters={powerUps.effects.hiddenLetters}
              revealed={revealed}
              onPick={recordMcq}
            />
          ) : questionType === "true_false" ? (
            <TrueFalseBody
              t={t}
              selected={selectedLetter as TrueFalseLetter | null}
              correct={question.correctOption as TrueFalseLetter | null | undefined}
              revealed={revealed}
              onPick={recordTrueFalse}
            />
          ) : questionType === "fill_blank" ? (
            <FillBlankBody
              t={t}
              value={blankInput}
              onChange={setBlankInput}
              correctAnswer={question.blankAnswer ?? null}
              revealed={revealed}
              lastCorrect={lastCorrect}
              onSubmit={() => recordBlank(blankInput)}
            />
          ) : (
            <ReorderBody
              t={t}
              items={reorderDraft}
              onReorder={setReorderDraft}
              canonical={question.reorderItems ?? []}
              revealed={revealed}
              onSubmit={() => recordReorder(reorderDraft)}
            />
          )}

          {revealed && question.explanation ? (
            <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm italic text-[var(--text-secondary)]">
              {question.explanation}
            </div>
          ) : null}

          {powerUpsEnabled ? (
            <PowerUpBar
              inventory={powerUps.inventory}
              activeEffects={powerUps.effects}
              disabled={revealed}
              onActivate={(key: PowerUpKey) => {
                powerUps.activate(
                  key,
                  (question.correctOption as string | null | undefined) ?? null
                );
              }}
            />
          ) : null}

          {phase === "submitting" ? (
            <div className="mt-6 text-center text-sm text-[var(--text-secondary)]">
              {t("quiz.play.submitting")}
            </div>
          ) : null}

          {submitError ? (
            <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-4 text-sm text-[var(--danger)]">
              <p className="font-medium">{submitError}</p>
              <button
                type="button"
                onClick={() => void submitAttempt()}
                className="mt-2 inline-flex h-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--danger)] px-4 text-xs font-semibold text-white"
              >
                {t("quiz.play.retrySubmit")}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {showExit ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[1.6rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow-strong)]">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {t("quiz.play.exitConfirmTitle")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {t("quiz.play.exitConfirmBody")}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowExit(false)}
              >
                {t("quiz.play.exitConfirmCancel")}
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => {
                  clearAdvanceTimer();
                  router.push(`/quizzes/${encodeURIComponent(quiz.id)}`);
                }}
              >
                {t("quiz.play.exitConfirmYes")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function McqBody({
  displayOptions,
  selectedLetter,
  correctLetter,
  hiddenLetters,
  revealed,
  onPick,
}: {
  displayOptions: DisplayOption[];
  selectedLetter: OptionLetter | null;
  correctLetter: OptionLetter | null | undefined;
  hiddenLetters: string[];
  revealed: boolean;
  onPick: (letter: OptionLetter) => void;
}) {
  const hidden = new Set(hiddenLetters);
  return (
    <div className="mt-4 grid gap-2.5 sm:mt-6 sm:grid-cols-2 sm:gap-4">
      {displayOptions.map((opt, index) => {
        const positionLabel = POSITION_LABELS[index];
        const isSelected = selectedLetter === opt.letter;
        const isCorrectOption = correctLetter === opt.letter;
        const isHidden = hidden.has(opt.letter);
        let stateClasses =
          "border-[var(--border)] bg-gradient-to-br " +
          ACCENT_BY_POSITION[index] +
          " hover:-translate-y-0.5";
        let badgeClasses =
          "border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-primary)]";
        let icon: React.ReactNode = null;
        if (isHidden && !revealed) {
          // 50/50 removed this option — grey it out and make it unclickable.
          stateClasses =
            "border-[var(--border)] bg-[var(--bg-surface)] opacity-30 grayscale";
        }
        if (revealed) {
          if (isCorrectOption) {
            stateClasses =
              "border-emerald-400/60 bg-emerald-500/15 animate-success-glow";
            badgeClasses = "border-emerald-400/60 bg-emerald-500 text-white";
            icon = <Check className="h-5 w-5 text-emerald-300" />;
          } else if (isSelected) {
            stateClasses =
              "border-rose-400/60 bg-rose-500/15 animate-shake";
            badgeClasses = "border-rose-400/60 bg-rose-500 text-white";
            icon = <X className="h-5 w-5 text-rose-300" />;
          } else {
            stateClasses =
              "border-[var(--border)] bg-[var(--bg-surface)] opacity-50";
          }
        }
        return (
          <button
            key={opt.letter}
            type="button"
            onClick={() => onPick(opt.letter)}
            disabled={revealed || isHidden}
            className={`group flex min-h-[68px] items-center gap-3 rounded-[var(--radius-xl)] border-2 px-3 py-3 text-left transition-all duration-200 disabled:cursor-default sm:min-h-[76px] sm:gap-4 sm:px-5 sm:py-4 ${stateClasses}`}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-base font-bold uppercase transition-colors sm:h-11 sm:w-11 ${badgeClasses}`}
            >
              {positionLabel}
            </span>
            <span className="min-w-0 flex-1 break-words text-sm font-medium text-[var(--text-primary)] sm:text-base md:text-lg">
              {opt.text}
            </span>
            {icon ? <span className="shrink-0">{icon}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

function TrueFalseBody({
  t,
  selected,
  correct,
  revealed,
  onPick,
}: {
  t: (key: string) => string;
  selected: TrueFalseLetter | null;
  correct: TrueFalseLetter | null | undefined;
  revealed: boolean;
  onPick: (letter: TrueFalseLetter) => void;
}) {
  const choices: Array<{ key: TrueFalseLetter; labelKey: string }> = [
    { key: "t", labelKey: "quiz.true" },
    { key: "f", labelKey: "quiz.false" },
  ];
  return (
    <div className="mt-4 grid gap-2.5 sm:mt-6 sm:grid-cols-2 sm:gap-4">
      {choices.map((c) => {
        const isSelected = selected === c.key;
        const isCorrect = correct === c.key;
        let stateClasses =
          "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:-translate-y-0.5";
        let icon: React.ReactNode = null;
        if (revealed) {
          if (isCorrect) {
            stateClasses =
              "border-emerald-400/60 bg-emerald-500/15 animate-success-glow text-emerald-200";
            icon = <Check className="h-6 w-6 text-emerald-300" />;
          } else if (isSelected) {
            stateClasses =
              "border-rose-400/60 bg-rose-500/15 animate-shake text-rose-200";
            icon = <X className="h-6 w-6 text-rose-300" />;
          } else {
            stateClasses =
              "border-[var(--border)] bg-[var(--bg-surface)] opacity-50";
          }
        }
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onPick(c.key)}
            disabled={revealed}
            className={`flex min-h-[88px] items-center justify-center gap-3 rounded-[var(--radius-xl)] border-2 px-4 py-6 text-2xl font-bold uppercase transition-all duration-200 disabled:cursor-default sm:text-3xl ${stateClasses}`}
          >
            {t(c.labelKey)}
            {icon ? <span className="shrink-0">{icon}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

function FillBlankBody({
  t,
  value,
  onChange,
  correctAnswer,
  revealed,
  lastCorrect,
  onSubmit,
}: {
  t: (key: string) => string;
  value: string;
  onChange: (v: string) => void;
  correctAnswer: string | null;
  revealed: boolean;
  lastCorrect: boolean | null;
  onSubmit: () => void;
}) {
  return (
    <div className="mt-4 space-y-3 sm:mt-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!revealed && value.trim()) onSubmit();
        }}
      >
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("quiz.play.blankPlaceholder")}
          disabled={revealed}
          autoFocus
          className="h-14 text-lg"
        />
        <div className="mt-3 flex justify-end">
          <Button
            type="submit"
            disabled={revealed || !value.trim()}
            isLoading={false}
          >
            {t("quiz.play.submitAnswer")}
          </Button>
        </div>
      </form>

      {revealed ? (
        <div
          className={`rounded-[var(--radius-md)] border-2 px-4 py-3 text-sm ${
            lastCorrect
              ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200"
              : "border-rose-400/60 bg-rose-500/10 text-rose-200"
          }`}
        >
          <p className="font-semibold">
            {lastCorrect ? t("quiz.play.correct") : t("quiz.play.wrong")}
          </p>
          {!lastCorrect && correctAnswer ? (
            <p className="mt-1">
              {t("quiz.play.correctAnswerLabel")}{" "}
              <span className="font-semibold">{correctAnswer}</span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ReorderBody({
  t,
  items,
  onReorder,
  canonical,
  revealed,
  onSubmit,
}: {
  t: (key: string) => string;
  items: string[];
  onReorder: (next: string[]) => void;
  canonical: string[];
  revealed: boolean;
  onSubmit: () => void;
}) {
  const move = (idx: number, direction: -1 | 1) => {
    if (revealed) return;
    const target = idx + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    onReorder(next);
  };

  return (
    <div className="mt-4 space-y-3 sm:mt-6">
      <p className="text-sm text-[var(--text-muted)]">{t("quiz.play.reorderHint")}</p>
      <div className="space-y-2">
        {items.map((item, idx) => {
          const expected = canonical[idx];
          const correctSpot = revealed && item === expected;
          const wrongSpot = revealed && item !== expected;
          let rowClasses =
            "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)]";
          if (correctSpot) {
            rowClasses = "border-emerald-400/60 bg-emerald-500/10 text-emerald-100";
          } else if (wrongSpot) {
            rowClasses = "border-rose-400/60 bg-rose-500/10 text-rose-100";
          }
          return (
            <div
              key={`${idx}-${item}`}
              className={`flex items-center gap-2 rounded-[var(--radius-md)] border-2 px-3 py-3 transition-colors ${rowClasses}`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--bg-soft)] text-xs font-semibold text-[var(--text-secondary)]">
                {idx + 1}
              </span>
              <span className="min-w-0 flex-1 break-words text-sm font-medium sm:text-base">
                {item}
              </span>
              <button
                type="button"
                onClick={() => move(idx, -1)}
                disabled={revealed || idx === 0}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)] disabled:opacity-30"
                aria-label={t("quiz.moveUp")}
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => move(idx, 1)}
                disabled={revealed || idx === items.length - 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)] disabled:opacity-30"
                aria-label={t("quiz.moveDown")}
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={onSubmit}
          disabled={revealed || items.length === 0}
        >
          {t("quiz.play.submitAnswer")}
        </Button>
      </div>
    </div>
  );
}
