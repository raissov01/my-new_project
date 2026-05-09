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
  const [violationBanner, setViolationBanner] = useState<string | null>(null);
  const [expandedReview, setExpandedReview] = useState<Record<number, boolean>>({});
  const [reviewFilter, setReviewFilter] = useState<"all" | "wrong" | "flagged">("all");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Autosave UX: lastSavedAt is the wall-clock ms of the most recent successful
  // save, lastSaveFailed surfaces a warning, savedTick forces a re-render every
  // second so the relative "Xs ago" label stays current.
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [lastSaveFailed, setLastSaveFailed] = useState(false);
  // nowMs ticks once per second while the exam is live so the autosave label
  // recomputes its "Xs ago" relative time without us calling Date.now() in
  // render (which the React purity rule flags).
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  // Submit guard modal (manual finish path only — auto-submit on timer expiry
  // bypasses the prompt).
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  // When the network call to complete the attempt fails, the timer is dead but
  // the user still has their answers in memory. We surface a retry banner
  // inside the exam view instead of silently dropping back to configure.
  const [submitFailed, setSubmitFailed] = useState(false);
  // Strict-mode auto-termination should not throw the user back to the empty
  // configure screen — show a modal that points to the saved attempt instead.
  const [terminatedModal, setTerminatedModal] = useState(false);
  // Pause is only allowed when strictMode is off — pausing during a strict
  // attempt would defeat the purpose of timed-exam practice. The timer
  // effect gates on this; the autosave loop keeps running so a paused
  // attempt that's left open still gets persisted periodically.
  const [isPaused, setIsPaused] = useState(false);
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
      setSubmitFailed(false);

      try {
        const completed = await completeNUETSimulator(attemptId, {
          answers: answersRef.current,
          marked: Array.from(markedRef.current),
          timeTakenSecs: durationMinutes * 60 - timeLeft,
        });
        setResult(completed);
        setStage("results");
      } catch (err) {
        // Stay on the exam view but surface the error inline so the user can
        // retry without losing their answers. The timer interval restarts
        // automatically when stage flips back to "exam".
        setError(err instanceof Error ? err.message : "Failed to complete simulator");
        setSubmitFailed(true);
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
          setTerminatedModal(true);
          clearIntervals();
        }
      }).catch(() => {
        // keep local banner even if logging failed
      });
    },
    onTerminate: () => {
      setError(t("nuet.simulator.terminated"));
      setTerminatedModal(true);
      clearIntervals();
    },
  });

  useEffect(() => {
    if (stage !== "exam" || isPaused) {
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
  }, [finishAttempt, stage, t, isPaused]);

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
          setLastSavedAt(Date.now());
          setLastSaveFailed(false);
        })
        .catch(() => {
          setLastSaveFailed(true);
        });
    }, 30_000);

    return () => {
      if (autosaveRef.current) {
        clearInterval(autosaveRef.current);
        autosaveRef.current = null;
      }
    };
  }, [attemptId, durationMinutes, stage]);

  // Tick once per second so the "saved Xs ago" label stays current. Captures
  // the wall clock here (in an effect) instead of inside render.
  useEffect(() => {
    if (stage !== "exam") return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [stage]);

  // Keyboard shortcuts during the exam:
  //   A-H        select that option (whichever options the question exposes)
  //   ←  →       prev / next question
  //   F          toggle flag on the active question
  //   Cmd/Ctrl+Enter   open the submit confirm modal
  //   Space      pause/resume (non-strict only)
  // We bail out when the focus is in a text input so we don't intercept
  // typing, and when any modal is open so dialog buttons stay reachable.
  useEffect(() => {
    if (stage !== "exam" || isPaused) return;
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
      }
      if (
        submitConfirmOpen ||
        terminatedModal ||
        examMode.showExitConfirm ||
        mobileNavOpen
      ) {
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        requestFinish();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setCurrentIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setCurrentIndex((i) => Math.min(questions.length - 1, i + 1));
        return;
      }
      if (event.key === " " && !strictMode) {
        event.preventDefault();
        setIsPaused((p) => !p);
        return;
      }
      if (!activeQuestion) return;
      const upper = event.key.toUpperCase();
      if (upper === "F") {
        event.preventDefault();
        toggleMarked(activeQuestion.id);
        return;
      }
      const optionCount = visibleOptions(activeQuestion.options).length;
      const letterIndex = ANSWER_LETTERS.indexOf(upper as (typeof ANSWER_LETTERS)[number]);
      if (letterIndex >= 0 && letterIndex < optionCount) {
        event.preventDefault();
        const letter = ANSWER_LETTERS[letterIndex];
        setAnswers((current) => ({ ...current, [activeQuestion.id]: letter }));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    stage,
    isPaused,
    submitConfirmOpen,
    terminatedModal,
    mobileNavOpen,
    examMode.showExitConfirm,
    strictMode,
    activeQuestion,
    questions.length,
  ]);

  // Audio warning at 5 minutes and 1 minute remaining. Uses the Web Audio API
  // directly so we don't ship an extra audio asset for a single beep. Two
  // refs guard against re-firing if the timer crosses the threshold twice
  // (e.g. after a submit retry that re-mounts the timer effect).
  const warned5MinRef = useRef(false);
  const warned1MinRef = useRef(false);
  useEffect(() => {
    if (stage !== "exam") {
      warned5MinRef.current = false;
      warned1MinRef.current = false;
      return;
    }
    const playBeep = (frequency: number, duration: number) => {
      try {
        const AudioCtx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = frequency;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
        osc.onended = () => void ctx.close();
      } catch {
        // AudioContext can be blocked by autoplay policy; silently ignore.
      }
    };
    if (!warned5MinRef.current && timeLeft <= 300 && timeLeft > 60) {
      warned5MinRef.current = true;
      playBeep(880, 0.4);
    }
    if (!warned1MinRef.current && timeLeft <= 60 && timeLeft > 0) {
      warned1MinRef.current = true;
      playBeep(1320, 0.6);
    }
  }, [stage, timeLeft]);

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
    setLastSavedAt(null);
    setLastSaveFailed(false);
    setSubmitFailed(false);
    setSubmitConfirmOpen(false);
    setTerminatedModal(false);
    setIsPaused(false);
    setReviewFilter("all");
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

  // Manual submit path: open the confirm modal so the user sees how many
  // questions are unanswered. Auto-submit on time-expiry calls finishAttempt
  // directly and bypasses this prompt — they're out of time anyway.
  function requestFinish() {
    setSubmitConfirmOpen(true);
  }

  // Indices of questions that don't have an answer letter set.
  const unansweredIndices = useMemo(
    () =>
      questions
        .map((q, idx) => (answers[q.id] ? null : idx))
        .filter((v): v is number => v !== null),
    [questions, answers]
  );

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

        <SectionBreakdownCard
          evaluations={result.evaluations ?? []}
          mathLabel={t("nuet.sectionMath")}
          ctLabel={t("nuet.sectionCT")}
          headingLabel={t("nuet.simulator.sectionBreakdown")}
          correctLabel={t("nuet.history.correct")}
        />

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{t("nuet.simulator.reviewTitle")}</h3>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {([
                { key: "all", label: t("nuet.simulator.reviewFilterAll") },
                { key: "wrong", label: t("nuet.simulator.reviewFilterWrong") },
                { key: "flagged", label: t("nuet.simulator.reviewFilterFlagged") },
              ] as const).map((f) => {
                const count =
                  f.key === "all"
                    ? result.evaluations?.length ?? 0
                    : f.key === "wrong"
                      ? (result.evaluations ?? []).filter((e) => !e.correct).length
                      : (result.evaluations ?? []).filter(
                          (e) => e.questionId && marked.has(e.questionId)
                        ).length;
                const active = reviewFilter === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setReviewFilter(f.key)}
                    className={`rounded-full border px-3 py-1 font-medium transition ${
                      active
                        ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                        : "border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-secondary)] hover:border-[var(--primary)]"
                    }`}
                  >
                    {f.label}
                    <span className="ml-1.5 font-mono text-[10px] text-[var(--text-muted)]">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {(result.evaluations ?? [])
              .filter((item) => {
                if (reviewFilter === "wrong") return !item.correct;
                if (reviewFilter === "flagged") {
                  return item.questionId ? marked.has(item.questionId) : false;
                }
                return true;
              })
              .map((item) => {
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

        {!strictMode ? (
          <button
            type="button"
            onClick={() => setIsPaused((p) => !p)}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              isPaused
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-primary)] hover:border-[var(--primary)]"
            }`}
          >
            {isPaused ? t("nuet.simulator.resume") : t("nuet.simulator.pause")}
          </button>
        ) : null}

        {violationBanner ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            {violationBanner}
          </div>
        ) : null}
        <AutosaveBadge
          lastSavedAt={lastSavedAt}
          failed={lastSaveFailed}
          nowMs={nowMs}
          savedJustNow={t("nuet.simulator.savedJustNow")}
          savedAgo={t("nuet.simulator.savedAgo")}
          saveFailed={t("nuet.simulator.saveFailed")}
        />
        {submitFailed && error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <p className="font-semibold">{t("nuet.simulator.submitErrorTitle")}</p>
            <p className="mt-1">{error}</p>
            <button
              type="button"
              onClick={() => void finishAttempt()}
              className="mt-2 inline-flex items-center gap-1 rounded-full border border-rose-300 bg-white px-3 py-1 font-semibold text-rose-700 hover:bg-rose-100"
            >
              {t("nuet.simulator.retrySubmit")}
            </button>
          </div>
        ) : null}

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

      <section className="relative mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 pb-24 sm:p-6 sm:pb-24 lg:mt-0 lg:pb-6">
        {isPaused ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-2xl bg-[var(--bg-surface)]/95 backdrop-blur-sm">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
              {t("nuet.simulator.pausedLabel")}
            </p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {t("nuet.simulator.pausedTitle")}
            </p>
            <p className="max-w-md text-center text-sm text-[var(--text-secondary)]">
              {t("nuet.simulator.pausedBody")}
            </p>
            <Button onClick={() => setIsPaused(false)}>{t("nuet.simulator.resume")}</Button>
          </div>
        ) : null}
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
                  <Button onClick={requestFinish} isLoading={stage === "submitting"}>
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

      {submitConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {t("nuet.simulator.submitConfirmTitle")}
            </h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {t("nuet.simulator.submitConfirmBody")}
            </p>
            {unansweredIndices.length > 0 ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <p className="font-semibold">
                  {t("nuet.simulator.submitUnanswered").replace(
                    "{n}",
                    String(unansweredIndices.length)
                  )}
                </p>
                <p className="mt-1 break-words">
                  {unansweredIndices.slice(0, 25).map((i) => `#${i + 1}`).join(", ")}
                  {unansweredIndices.length > 25 ? "…" : ""}
                </p>
              </div>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button variant="ghost" onClick={() => setSubmitConfirmOpen(false)}>
                {t("nuet.simulator.cancel")}
              </Button>
              {unansweredIndices.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    const next = unansweredIndices[0];
                    if (next != null) jumpTo(next);
                    setSubmitConfirmOpen(false);
                  }}
                  className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-soft)]"
                >
                  {t("nuet.simulator.goToFirstUnanswered")}
                </button>
              ) : null}
              <Button
                onClick={() => {
                  setSubmitConfirmOpen(false);
                  void finishAttempt();
                }}
              >
                {t("nuet.simulator.submitAnyway")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {terminatedModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-[var(--bg-surface)] p-6">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-1 h-6 w-6 shrink-0 text-rose-600" />
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {t("nuet.simulator.terminatedTitle")}
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {t("nuet.simulator.terminatedBody")}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setTerminatedModal(false);
                  void handleBack();
                }}
              >
                {t("nuet.simulator.terminatedStay")}
              </Button>
              <Link
                href="/nuet/history"
                className="inline-flex items-center rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                {t("nuet.simulator.terminatedAction")}
              </Link>
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
              onClick={requestFinish}
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

function AutosaveBadge({
  lastSavedAt,
  failed,
  nowMs,
  savedJustNow,
  savedAgo,
  saveFailed,
}: {
  lastSavedAt: number | null;
  failed: boolean;
  nowMs: number;
  savedJustNow: string;
  savedAgo: string;
  saveFailed: string;
}) {
  if (failed) {
    return <p className="text-xs font-medium text-amber-600">{saveFailed}</p>;
  }
  if (lastSavedAt == null) {
    return null;
  }
  const seconds = Math.max(0, Math.floor((nowMs - lastSavedAt) / 1000));
  const label =
    seconds < 5 ? savedJustNow : savedAgo.replace("{n}", String(seconds));
  return <p className="text-xs text-[var(--text-muted)]">{label}</p>;
}

function SectionBreakdownCard({
  evaluations,
  mathLabel,
  ctLabel,
  headingLabel,
  correctLabel,
}: {
  evaluations: Array<{ section: "math" | "critical_thinking"; correct: boolean }>;
  mathLabel: string;
  ctLabel: string;
  headingLabel: string;
  correctLabel: string;
}) {
  if (evaluations.length === 0) return null;
  const counts = {
    math: { total: 0, correct: 0 },
    critical_thinking: { total: 0, correct: 0 },
  };
  for (const ev of evaluations) {
    const bucket = counts[ev.section];
    if (!bucket) continue;
    bucket.total += 1;
    if (ev.correct) bucket.correct += 1;
  }
  const rows: Array<{ label: string; total: number; correct: number }> = [];
  if (counts.math.total > 0) {
    rows.push({ label: mathLabel, total: counts.math.total, correct: counts.math.correct });
  }
  if (counts.critical_thinking.total > 0) {
    rows.push({
      label: ctLabel,
      total: counts.critical_thinking.total,
      correct: counts.critical_thinking.correct,
    });
  }
  if (rows.length === 0) return null;
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">{headingLabel}</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map((row) => {
          const pct = row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0;
          const tone =
            pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-500";
          return (
            <div
              key={row.label}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] p-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-[var(--text-primary)]">{row.label}</span>
                <span className="font-mono text-xs text-[var(--text-secondary)]">
                  {row.correct}/{row.total} {correctLabel} · {pct}%
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-soft)]">
                <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
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
