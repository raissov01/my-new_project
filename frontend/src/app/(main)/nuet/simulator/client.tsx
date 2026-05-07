"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MathText } from "@/components/nuet/math-text";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Flag,
  LayoutGrid,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  X,
} from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useScreenWakeLock } from "@/hooks/use-wake-lock";
import { Button } from "@/components/ui/button";
import { useExamMode } from "@/features/ielts/use-exam-mode";
import {
  abandonNUETAttempt,
  autosaveNUETSimulator,
  completeNUETSimulator,
  logNUETSimulatorViolation,
  startNUETSimulator,
  type NUETAttemptActionResult,
  type NUETSimulatorQuestion,
} from "./actions";
import type { NUETSimulatorResume } from "@/server/integrations/go-backend/nuet";

type Stage = "configure" | "starting" | "resume_prompt" | "exam" | "submitting" | "results";
type SectionChoice = "full" | "math" | "ct";

const ANSWER_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

export function NUETSimulatorClient({
  initialResume,
}: {
  initialResume?: NUETSimulatorResume | null;
}) {
  const { t } = useLocale();
  const [stage, setStage] = useState<Stage>(
    initialResume ? "resume_prompt" : "configure"
  );
  const [section, setSection] = useState<SectionChoice>("full");
  const [strictMode, setStrictMode] = useState(initialResume?.strictMode ?? true);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<NUETSimulatorQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [result, setResult] = useState<NUETAttemptActionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autosaveLabel, setAutosaveLabel] = useState("");
  const [violationBanner, setViolationBanner] = useState<string | null>(null);
  const [expandedReview, setExpandedReview] = useState<Record<number, boolean>>({});
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  useScreenWakeLock(stage === "exam");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autosaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answersRef = useRef<Record<string, string>>({});
  const markedRef = useRef<Set<string>>(new Set());
  const timeLeftRef = useRef(0);
  const submittingRef = useRef(false);

  const activeQuestion = questions[currentIndex] ?? null;
  const answeredCount = useMemo(() => Object.values(answers).filter(Boolean).length, [answers]);
  const flaggedCount = marked.size;

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    markedRef.current = marked;
  }, [marked]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  const clearIntervals = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autosaveRef.current) {
      clearInterval(autosaveRef.current);
      autosaveRef.current = null;
    }
  }, []);

  const finishAttempt = useCallback(
    async (reason?: string) => {
      if (!attemptId || submittingRef.current) return;
      submittingRef.current = true;
      clearIntervals();
      setStage("submitting");
      setError(reason ?? null);

      try {
        const completed = await completeNUETSimulator(attemptId, {
          answers: answersRef.current,
          marked: Array.from(markedRef.current),
          timeTakenSecs: durationMinutes * 60 - timeLeft,
        });
        setResult(completed);
        setStage("results");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to complete simulator");
        setStage("exam");
      } finally {
        submittingRef.current = false;
      }
    },
    [attemptId, clearIntervals, durationMinutes, timeLeft]
  );

  const examMode = useExamMode({
    enabled: stage === "exam" && strictMode,
    attemptId: attemptId ?? undefined,
    policy: {
      fullscreenRequired: strictMode,
      autoTerminateAt: 5,
    },
    onViolation: ({ type, count }) => {
      setViolationBanner(
        t("nuet.simulator.violationBanner")
          .replace("{type}", type.replaceAll("_", " "))
          .replace("{count}", String(count))
      );

      if (!attemptId) return;
      void logNUETSimulatorViolation(attemptId, {
        type,
        details: `NUET strict mode detected ${type}`,
      }).then((response) => {
        if (response.status === "abandoned") {
          setError(t("nuet.simulator.terminated"));
          setStage("configure");
          clearIntervals();
        }
      }).catch(() => {
        // keep local banner even if logging failed
      });
    },
    onTerminate: () => {
      setError(t("nuet.simulator.terminated"));
      setStage("configure");
      clearIntervals();
    },
  });

  useEffect(() => {
    if (stage !== "exam") {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.setTimeout(() => {
            void finishAttempt(t("nuet.simulator.autoSubmitted"));
          }, 0);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [finishAttempt, stage, t]);

  useEffect(() => {
    if (stage !== "exam" || !attemptId) {
      if (autosaveRef.current) {
        clearInterval(autosaveRef.current);
        autosaveRef.current = null;
      }
      return;
    }

    autosaveRef.current = setInterval(() => {
      void autosaveNUETSimulator(attemptId, {
        answers: answersRef.current,
        marked: Array.from(markedRef.current),
        timeTakenSecs: durationMinutes * 60 - timeLeftRef.current,
      })
        .then(() => {
          setAutosaveLabel(t("nuet.simulator.saved"));
          window.setTimeout(() => setAutosaveLabel(""), 1500);
        })
        .catch(() => {
          setAutosaveLabel(t("nuet.simulator.saveFailed"));
        });
    }, 30_000);

    return () => {
      if (autosaveRef.current) {
        clearInterval(autosaveRef.current);
        autosaveRef.current = null;
      }
    };
  }, [attemptId, durationMinutes, stage, t]);

  async function handleStart() {
    setStage("starting");
    setError(null);
    setViolationBanner(null);
    setExpandedReview({});
    try {
      const response = await startNUETSimulator({
        section,
        strict: strictMode,
      });
      if (!response.ok) {
        throw new Error(response.error);
      }
      setAttemptId(response.data.attempt.id);
      setQuestions(response.data.questions);
      setAnswers({});
      setMarked(new Set());
      setCurrentIndex(0);
      setDurationMinutes(response.data.durationMinutes);
      setTimeLeft(response.data.durationMinutes * 60);
      setResult(null);
      if (strictMode) {
        await examMode.requestFullscreen();
      }
      setStage("exam");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start simulator");
      setStage("configure");
    }
  }

  async function handleResume() {
    if (!initialResume) return;
    setError(null);
    setViolationBanner(null);
    setExpandedReview({});

    const elapsed = Math.max(0, initialResume.timeTakenSecs);
    const totalSecs = initialResume.durationMinutes * 60;
    const remaining = Math.max(1, totalSecs - elapsed);
    const restoredMarked = new Set(initialResume.marked ?? []);

    setAttemptId(initialResume.attempt.id);
    setQuestions(initialResume.questions);
    setAnswers(initialResume.responses ?? {});
    setMarked(restoredMarked);
    setCurrentIndex(0);
    setDurationMinutes(initialResume.durationMinutes);
    setTimeLeft(remaining);
    setResult(null);
    setStrictMode(initialResume.strictMode);

    if (initialResume.strictMode) {
      try {
        await examMode.requestFullscreen();
      } catch {
        // Fullscreen request can fail; the strict-mode policy will still
        // monitor for violations once the exam stage is active.
      }
    }
    setStage("exam");
  }

  async function handleAbandonResume() {
    if (!initialResume) {
      setStage("configure");
      return;
    }
    try {
      await abandonNUETAttempt(initialResume.attempt.id);
    } catch {
      // ignore — we still drop the user back to configure so they can start fresh
    }
    setStage("configure");
  }

  async function handleBack() {
    clearIntervals();
    if (attemptId && stage === "exam") {
      try {
        await abandonNUETAttempt(attemptId);
      } catch {
        // ignore
      }
    }
    setAttemptId(null);
    setQuestions([]);
    setAnswers({});
    setMarked(new Set());
    setCurrentIndex(0);
    setTimeLeft(0);
    setResult(null);
    setAutosaveLabel("");
    setViolationBanner(null);
    setStage("configure");
  }

  function toggleMarked(questionId: string) {
    setMarked((current) => {
      const next = new Set(current);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }

  function jumpTo(index: number) {
    setCurrentIndex(index);
  }

  if (stage === "resume_prompt" && initialResume) {
    const elapsed = Math.max(0, initialResume.timeTakenSecs);
    const totalSecs = initialResume.durationMinutes * 60;
    const remainingSecs = Math.max(0, totalSecs - elapsed);
    const remainingMin = Math.ceil(remainingSecs / 60);
    const answeredCount = Object.values(initialResume.responses ?? {}).filter(
      Boolean
    ).length;
    const startedAt = new Date(initialResume.attempt.startedAt);
    return (
      <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
          {t("nuet.simulator.resumeLabel")}
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
          {t("nuet.simulator.resumeTitle")}
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {t("nuet.simulator.resumeBody")}
        </p>

        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
            <dt className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
              {t("nuet.simulator.resumeStarted")}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
              {startedAt.toLocaleString()}
            </dd>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
            <dt className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
              {t("nuet.simulator.resumeAnswered")}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
              {answeredCount} / {initialResume.questions.length}
            </dd>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
            <dt className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
              {t("nuet.simulator.resumeRemaining")}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
              {remainingMin} min
            </dd>
          </div>
        </dl>

        {error ? (
          <p className="mt-4 flex items-start gap-2 text-sm text-rose-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => void handleResume()} className="px-6">
            {t("nuet.simulator.resumeContinue")}
          </Button>
          <button
            type="button"
            onClick={() => void handleAbandonResume()}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-rose-400 hover:text-rose-600"
          >
            {t("nuet.simulator.resumeAbandon")}
          </button>
        </div>
      </section>
    );
  }

  if (stage === "configure" || stage === "starting") {
    return (
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
            {t("nuet.simulator.welcomeLabel")}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
            {t("nuet.simulator.welcomeTitle")}
          </h2>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            {t("nuet.simulator.welcomeBody")}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {([
              { key: "full", label: t("nuet.simulator.full") },
              { key: "math", label: t("nuet.sectionMath") },
              { key: "ct", label: t("nuet.sectionCT") },
            ] as const).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setSection(item.key)}
                className={`rounded-xl border p-4 text-left transition ${
                  section === item.key
                    ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                    : "border-[var(--border)] bg-[var(--bg-base)] hover:border-[var(--primary)]"
                }`}
              >
                <p className="text-sm font-semibold text-[var(--text-primary)]">{item.label}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {item.key === "full" ? "120 min · 60 questions" : "60 min · 30 questions"}
                </p>
              </button>
            ))}
          </div>
        </section>

        <aside className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{t("nuet.simulator.strictMode")}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{t("nuet.simulator.strictModeBody")}</p>
              </div>
              <button
                type="button"
                onClick={() => setStrictMode((current) => !current)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                  strictMode ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                }`}
                aria-pressed={strictMode}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                    strictMode ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <ul className="mt-5 space-y-2 text-sm text-[var(--text-secondary)]">
            <li>{t("nuet.simulator.ruleFullscreen")}</li>
            <li>{t("nuet.simulator.ruleTabSwitch")}</li>
            <li>{t("nuet.simulator.rulePaste")}</li>
            <li>{t("nuet.simulator.ruleViolations")}</li>
          </ul>

          {error ? (
            <p className="mt-4 flex items-start gap-2 text-sm text-rose-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          ) : null}

          <div className="mt-6">
            <Button onClick={() => void handleStart()} isLoading={stage === "starting"} className="w-full">
              {t("nuet.simulator.start")}
            </Button>
          </div>
        </aside>
      </div>
    );
  }

  if (stage === "results" && result) {
    const passed = result.scoreTotal >= 120;
    return (
      <div className="mt-6 space-y-6">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{t("nuet.simulator.resultLabel")}</p>
              <h2 className={`mt-2 text-4xl font-bold ${passed ? "text-emerald-600" : "text-amber-600"}`}>
                {result.scoreTotal} / 240
              </h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {passed ? t("nuet.simulator.grantReached") : t("nuet.simulator.keepPushing")}
              </p>
            </div>
            <Trophy className={`h-12 w-12 ${passed ? "text-emerald-500" : "text-amber-500"}`} />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <ResultTile label={t("nuet.sectionMath")} value={`${result.scoreMath}/120`} />
            <ResultTile label={t("nuet.sectionCT")} value={`${result.scoreCt}/120`} />
            <ResultTile label={t("nuet.history.correct")} value={String(result.correctMath + result.correctCt)} />
          </div>

          <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] p-4">
            <div className="space-y-4">
              <ScoreBar
                label={t("nuet.sectionMath")}
                value={result.scoreMath}
                max={120}
                color="var(--success)"
              />
              <ScoreBar
                label={t("nuet.sectionCT")}
                value={result.scoreCt}
                max={120}
                color="var(--yellow)"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => void handleBack()}>{t("nuet.simulator.retry")}</Button>
            <Link
              href="/nuet/history"
              className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-soft)]"
            >
              {t("nuet.simulator.viewHistory")}
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{t("nuet.simulator.reviewTitle")}</h3>
          <div className="mt-4 space-y-3">
            {result.evaluations?.map((item) => {
              const open = expandedReview[item.question] ?? false;
              return (
                <div key={item.question} className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] p-4">
                  <button
                    type="button"
                    onClick={() => setExpandedReview((current) => ({ ...current, [item.question]: !open }))}
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        <span>#{item.question} </span>
                        {item.prompt ? <MathText text={item.prompt} /> : null}
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        {item.correct ? t("nuet.simulator.correct") : t("nuet.simulator.incorrect")} · {t("nuet.simulator.correctAnswer")} {item.expected}
                      </p>
                    </div>
                    {item.correct ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
                    )}
                  </button>
                  {open ? (
                    <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3 text-sm text-[var(--text-secondary)]">
                      <p>{t("nuet.simulator.yourAnswer")} {item.received || "—"}</p>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                          {t("nuet.review.solutionTitle")}
                        </p>
                        {item.explanation && item.explanation.trim() ? (
                          <div className="mt-1">
                            <MathText text={item.explanation} as="div" />
                          </div>
                        ) : (
                          <p className="mt-1 italic text-[var(--text-muted)]">
                            {t("nuet.review.noExplanation")}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:mt-6 lg:grid lg:grid-cols-[280px_1fr] lg:gap-5">
      {/* Mobile sticky header */}
      <div className="sticky top-0 z-30 -mx-4 flex items-center gap-2 border-b border-[var(--border)] bg-[var(--bg-base)] px-4 py-2 sm:-mx-6 sm:px-6 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label={t("nuet.simulator.openNav")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)]"
        >
          <LayoutGrid className="h-4 w-4" />
          {currentIndex + 1}/{questions.length}
        </button>
        <div className="ml-auto flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)]">
          <Clock3 className="h-4 w-4" />
          {formatTime(timeLeft)}
        </div>
      </div>

      <aside
        className={`space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 ${
          mobileNavOpen
            ? "fixed inset-0 z-40 m-0 h-full overflow-y-auto rounded-none lg:relative lg:inset-auto lg:m-0 lg:h-auto lg:overflow-visible lg:rounded-2xl"
            : "hidden lg:block"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => void handleBack()}
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("nuet.simulator.exit")}
          </button>
          <div className="flex items-center gap-2">
            <div className="rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)]">
              <Clock3 className="mr-1 inline h-4 w-4" />
              {formatTime(timeLeft)}
            </div>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label={t("nuet.simulator.closeNav")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-muted)] lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <MetricPill label={t("nuet.simulator.answered")} value={`${answeredCount}/${questions.length}`} />
          <MetricPill label={t("nuet.simulator.flagged")} value={String(flaggedCount)} />
          <MetricPill label={t("ielts.dashboard.violations")} value={String(examMode.violationCount)} />
        </div>

        {violationBanner ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            {violationBanner}
          </div>
        ) : null}
        {autosaveLabel ? <p className="text-xs text-[var(--text-muted)]">{autosaveLabel}</p> : null}

        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-5">
          {questions.map((question, index) => {
            const answered = Boolean(answers[question.id]);
            const flagged = marked.has(question.id);
            return (
              <button
                key={question.id}
                type="button"
                onClick={() => {
                  jumpTo(index);
                  setMobileNavOpen(false);
                }}
                className={`aspect-square rounded-lg border text-xs font-semibold transition ${
                  currentIndex === index
                    ? "border-[var(--primary)] ring-2 ring-[var(--primary-soft)]"
                    : flagged
                      ? "border-rose-300 bg-rose-50 text-rose-700"
                      : answered
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-primary)]"
                }`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </aside>

      <section className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 pb-24 sm:p-6 sm:pb-24 lg:mt-0 lg:pb-6">
        {activeQuestion ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                  {activeQuestion.section === "math" ? t("nuet.sectionMath") : t("nuet.sectionCT")}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                  #{currentIndex + 1}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => toggleMarked(activeQuestion.id)}
                className={`hidden items-center gap-2 rounded-full border px-3 py-2 text-sm sm:inline-flex ${
                  marked.has(activeQuestion.id)
                    ? "border-rose-300 bg-rose-50 text-rose-700"
                    : "border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-primary)]"
                }`}
              >
                <Flag className="h-4 w-4" />
                {t("nuet.simulator.mark")}
              </button>
            </div>

            <QuestionPrompt prompt={activeQuestion.prompt} />

            <div className="mt-6 space-y-3">
              {visibleOptions(activeQuestion.options).map((option, optionIndex) => {
                const letter = ANSWER_LETTERS[optionIndex];
                const active = answers[activeQuestion.id] === letter;
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => setAnswers((current) => ({ ...current, [activeQuestion.id]: letter }))}
                    className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${
                      active
                        ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                        : "border-[var(--border)] bg-[var(--bg-base)] hover:border-[var(--primary)]"
                    }`}
                  >
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-semibold">
                      {letter}
                    </span>
                    <span className="text-sm text-[var(--text-primary)]">
                      <MathText text={option} />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 hidden flex-wrap items-center justify-between gap-3 lg:flex">
              <Button
                variant="ghost"
                onClick={() => setCurrentIndex((current) => Math.max(0, current - 1))}
                disabled={currentIndex === 0}
              >
                <ArrowLeft className="h-4 w-4" />
                {t("nuet.simulator.prev")}
              </Button>

              <div className="flex flex-wrap gap-3">
                <Button variant="ghost" onClick={() => toggleMarked(activeQuestion.id)}>
                  <Flag className="h-4 w-4" />
                  {marked.has(activeQuestion.id) ? t("nuet.simulator.unmark") : t("nuet.simulator.mark")}
                </Button>
                {currentIndex === questions.length - 1 ? (
                  <Button onClick={() => void finishAttempt()} isLoading={stage === "submitting"}>
                    {t("nuet.simulator.submit")}
                  </Button>
                ) : (
                  <Button onClick={() => setCurrentIndex((current) => Math.min(questions.length - 1, current + 1))}>
                    {t("nuet.simulator.next")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex min-h-[300px] items-center justify-center text-sm text-[var(--text-secondary)]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("nuet.simulator.loadingQuestions")}
          </div>
        )}
      </section>

      {examMode.warningMessage ? (
        <div className="lg:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p>{examMode.warningMessage}</p>
              <button type="button" onClick={examMode.clearWarning} className="mt-2 text-xs underline">
                {t("nuet.simulator.dismiss")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {examMode.showExitConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-5 w-5 text-[var(--primary)]" />
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{t("nuet.simulator.leaveTitle")}</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{t("nuet.simulator.leaveBody")}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={examMode.cancelExit}>
                {t("nuet.simulator.stay")}
              </Button>
              <Button
                onClick={() => {
                  void examMode.confirmExit();
                  void handleBack();
                }}
              >
                {t("nuet.simulator.leave")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Mobile bottom action bar */}
      {activeQuestion ? (
        <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 gap-2 border-t border-[var(--border)] bg-[var(--bg-base)] p-2 lg:hidden">
          <button
            type="button"
            onClick={() => setCurrentIndex((current) => Math.max(0, current - 1))}
            disabled={currentIndex === 0}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("nuet.simulator.prev")}
          </button>
          <button
            type="button"
            onClick={() => toggleMarked(activeQuestion.id)}
            className={`inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2.5 text-sm font-medium ${
              marked.has(activeQuestion.id)
                ? "border-rose-300 bg-rose-50 text-rose-700"
                : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
            }`}
          >
            <Flag className="h-4 w-4" />
            {marked.has(activeQuestion.id) ? t("nuet.simulator.unmark") : t("nuet.simulator.mark")}
          </button>
          {currentIndex === questions.length - 1 ? (
            <button
              type="button"
              onClick={() => void finishAttempt()}
              disabled={stage === "submitting"}
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {stage === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : t("nuet.simulator.submit")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentIndex((current) => Math.min(questions.length - 1, current + 1))}
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-2.5 text-sm font-semibold text-white"
            >
              {t("nuet.simulator.next")}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
}

function QuestionPrompt({ prompt }: { prompt: string }) {
  const { text, figure } = splitPromptAndFigure(prompt);
  return (
    <div className="mt-5">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] p-4 text-base leading-8 text-[var(--text-primary)]">
        <MathText text={text} />
      </div>
      {figure ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <FigureContent figure={figure} />
        </div>
      ) : null}
    </div>
  );
}

function FigureContent({ figure }: { figure: string }) {
  if (isAbsoluteParabolaFigure(figure)) {
    return (
      <div className="flex justify-start">
        <CoordinateGraph />
      </div>
    );
  }
  return (
    <p>
      <span className="font-semibold">Figure:</span> {figure}
    </p>
  );
}

function CoordinateGraph() {
  return (
    <svg
      viewBox="0 0 340 260"
      role="img"
      aria-label="Coordinate graph through (-3,0), (0,9), and (3,0)"
      className="h-72 w-full max-w-sm rounded-lg bg-white"
    >
      <defs>
        <marker id="nuet-x-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" fill="#111827" />
        </marker>
        <marker id="nuet-y-arrow" markerWidth="8" markerHeight="8" refX="4" refY="1" orient="auto">
          <path d="M0 8 L4 0 L8 8 Z" fill="#111827" />
        </marker>
      </defs>
      <line x1="52" y1="178" x2="300" y2="178" stroke="#111827" strokeWidth="2.4" markerEnd="url(#nuet-x-arrow)" />
      <line x1="172" y1="226" x2="172" y2="34" stroke="#111827" strokeWidth="2.4" markerEnd="url(#nuet-y-arrow)" />
      <path d="M74 36 C83 83 95 135 112 178" fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" />
      <path d="M112 178 C128 86 216 86 232 178" fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" />
      <path d="M232 178 C249 135 261 83 270 36" fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" />
      <text x="297" y="199" fontSize="17" fontStyle="italic" fill="#111827">x</text>
      <text x="184" y="40" fontSize="17" fontStyle="italic" fill="#111827">y</text>
      <text x="70" y="203" fontSize="16" fill="#111827">(-3,0)</text>
      <text x="185" y="78" fontSize="16" fill="#111827">(0,9)</text>
      <text x="214" y="203" fontSize="16" fill="#111827">(3,0)</text>
    </svg>
  );
}

function isAbsoluteParabolaFigure(figure: string) {
  return figure.includes("(-3,0)") && figure.includes("(0,9)") && figure.includes("(3,0)");
}

function visibleOptions(options: string[]) {
  return options.map((option) => option.trim()).filter(Boolean);
}

function splitPromptAndFigure(prompt: string) {
  const match = prompt.match(/\n?\[Figure:\s*([\s\S]*?)\]\s*$/);
  if (!match) {
    return { text: prompt, figure: "" };
  }
  return {
    text: prompt.slice(0, match.index).trim(),
    figure: match[1].trim(),
  };
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function ResultTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function ScoreBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const ratio = max > 0 ? value / max : 0;
  const percent = Math.max(0, Math.min(100, ratio * 100));

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-[var(--text-primary)]">{label}</span>
        <span className="font-mono text-[var(--text-secondary)]">
          {value}/{max}
        </span>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-[var(--bg-soft)]">
        <div className="h-full rounded-full" style={{ width: `${percent}%`, background: color }} />
      </div>
    </div>
  );
}
