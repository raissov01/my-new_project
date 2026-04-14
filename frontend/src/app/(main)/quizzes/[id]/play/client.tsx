"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Flame, LogOut, Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createTranslator, type Locale } from "@/lib/shared/i18n";
import type { QuizDetail, QuizQuestionDTO } from "@/server/services/quizzes";

type OptionLetter = "a" | "b" | "c" | "d";

type DisplayOption = {
  letter: OptionLetter;
  text: string;
};

type RecordedAnswer = {
  questionId: string;
  selectedOption: OptionLetter | null;
  timeSpent: number;
};

type Phase = "asking" | "revealed" | "submitting";

const ACCENT_BY_LETTER: Record<OptionLetter, string> = {
  a: "from-indigo-500/25 to-indigo-500/5 border-indigo-400/30",
  b: "from-rose-500/25 to-rose-500/5 border-rose-400/30",
  c: "from-amber-500/25 to-amber-500/5 border-amber-400/30",
  d: "from-emerald-500/25 to-emerald-500/5 border-emerald-400/30",
};

function getOptionText(question: QuizQuestionDTO, letter: OptionLetter): string {
  switch (letter) {
    case "a":
      return question.optionA;
    case "b":
      return question.optionB;
    case "c":
      return question.optionC;
    case "d":
      return question.optionD;
  }
}

function buildDisplayOptions(
  question: QuizQuestionDTO,
  shuffle: boolean
): DisplayOption[] {
  const base: DisplayOption[] = (["a", "b", "c", "d"] as OptionLetter[]).map(
    (letter) => ({ letter, text: getOptionText(question, letter) })
  );
  if (!shuffle) return base;
  const copy = [...base];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface PlayQuizClientProps {
  quiz: QuizDetail;
  locale: Locale;
}

export function PlayQuizClient({ quiz, locale }: PlayQuizClientProps) {
  const t = useMemo(() => createTranslator(locale), [locale]);
  const router = useRouter();

  const totalQuestions = quiz.questions.length;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("asking");
  const [selectedLetter, setSelectedLetter] = useState<OptionLetter | null>(null);
  const [timeLeft, setTimeLeft] = useState(quiz.timePerQuestion);
  const [streak, setStreak] = useState(0);
  const [showExit, setShowExit] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const answersRef = useRef<RecordedAnswer[]>([]);
  const questionStartRef = useRef<number>(0);
  const quizStartRef = useRef<number>(0);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const question = quiz.questions[currentIdx];
  const displayOptions = useMemo(
    () => buildDisplayOptions(question, quiz.shuffleOptions),
    [question, quiz.shuffleOptions]
  );

  const clearAdvanceTimer = () => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  };

  const submitAttempt = useCallback(async () => {
    setPhase("submitting");
    setSubmitError(null);
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
  }, [quiz.id, router, t]);

  const advance = useCallback(() => {
    clearAdvanceTimer();
    if (currentIdx + 1 >= totalQuestions) {
      void submitAttempt();
      return;
    }
    setCurrentIdx((i) => i + 1);
    setSelectedLetter(null);
    setPhase("asking");
    setTimeLeft(quiz.timePerQuestion);
    questionStartRef.current = Date.now();
  }, [currentIdx, quiz.timePerQuestion, submitAttempt, totalQuestions]);

  const recordAnswer = useCallback(
    (letter: OptionLetter | null) => {
      if (phase !== "asking") return;
      const timeSpent = Math.max(
        0,
        Math.round((Date.now() - questionStartRef.current) / 1000)
      );
      answersRef.current.push({
        questionId: question.id,
        selectedOption: letter,
        timeSpent,
      });

      const isCorrect = letter !== null && letter === question.correctOption;
      if (isCorrect) {
        setStreak((s) => s + 1);
      } else {
        setStreak(0);
      }

      setSelectedLetter(letter);
      setPhase("revealed");

      advanceTimerRef.current = setTimeout(() => {
        advance();
      }, 1500);
    },
    [advance, phase, question.correctOption, question.id]
  );

  // Countdown timer; auto-skips by calling recordAnswer when it hits 0.
  // Uses a ref so the timer always sees the latest recordAnswer closure.
  const recordAnswerRef = useRef(recordAnswer);
  useEffect(() => {
    recordAnswerRef.current = recordAnswer;
  });
  useEffect(() => {
    if (phase !== "asking") return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          queueMicrotask(() => recordAnswerRef.current(null));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, currentIdx]);

  // Cleanup advance timer on unmount
  useEffect(() => {
    return () => clearAdvanceTimer();
  }, []);

  // Initialize timestamps and block body scroll while in focus mode
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
  const correctLetter = question.correctOption as OptionLetter | null | undefined;

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
              <span className="inline-flex items-center gap-1.5 text-[var(--text-primary)]">
                <Timer className="h-3.5 w-3.5" />
                {timeLeft}
                {t("quiz.secondsShort")}
              </span>
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
            onClick={() => setShowExit(true)}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            aria-label={t("quiz.play.exit")}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{t("quiz.play.exit")}</span>
          </button>
        </div>
        <div className="h-1 bg-[var(--bg-soft)]">
          <div
            className="h-full bg-[var(--accent)] transition-[width] duration-1000 ease-linear"
            style={{ width: `${timerProgress * 100}%` }}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-start px-4 py-6 sm:px-6 sm:py-10">
        {streak > 1 ? (
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3.5 py-1.5 text-sm font-semibold text-amber-300">
            <Flame className="h-4 w-4" />
            {t("quiz.play.streakLabel").replace("{n}", String(streak))}
          </div>
        ) : null}

        <div key={currentIdx} className="w-full max-w-3xl animate-fade-in-up">
          <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-[var(--surface-shadow-strong)] sm:p-10">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {t("quiz.question")} {currentIdx + 1}
            </p>
            <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.03em] text-[var(--text-primary)] sm:text-3xl md:text-4xl">
              {question.questionText}
            </h1>
          </div>

          <div className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4">
            {displayOptions.map((opt) => {
              const isSelected = selectedLetter === opt.letter;
              const isCorrectOption = correctLetter === opt.letter;
              const revealed = phase !== "asking";
              let stateClasses =
                "border-[var(--border)] bg-gradient-to-br " + ACCENT_BY_LETTER[opt.letter] + " hover:-translate-y-0.5";
              let badgeClasses =
                "border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-primary)]";
              let icon: React.ReactNode = null;
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
                  onClick={() => recordAnswer(opt.letter)}
                  disabled={revealed}
                  className={`group flex min-h-[76px] items-center gap-4 rounded-[var(--radius-xl)] border-2 px-5 py-4 text-left transition-all duration-200 disabled:cursor-default ${stateClasses}`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-base font-bold uppercase transition-colors ${badgeClasses}`}
                  >
                    {opt.letter}
                  </span>
                  <span className="flex-1 text-base font-medium text-[var(--text-primary)] sm:text-lg">
                    {opt.text}
                  </span>
                  {icon}
                </button>
              );
            })}
          </div>

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
