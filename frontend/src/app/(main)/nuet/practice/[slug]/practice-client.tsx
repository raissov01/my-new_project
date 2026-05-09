"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, ChevronRight, Eraser, PenLine, RotateCcw, ThumbsUp, XCircle } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { MathText } from "@/components/nuet/math-text";
import { Button } from "@/components/ui/button";
import type { NUETQuestion, NUETTopic } from "@/server/integrations/go-backend/nuet";
import { dismissNUETQuestion, submitNUETPracticeAttempt } from "../../simulator/actions";

type Stage = "ready" | "submitting" | "results";

export function NUETPracticeClient({
  topic,
  questions,
}: {
  topic: NUETTopic;
  questions: NUETQuestion[];
}) {
  const { t } = useLocale();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<Awaited<ReturnType<typeof submitNUETPracticeAttempt>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("ready");
  const [scratchpadOpen, setScratchpadOpen] = useState(false);
  // Question IDs the user has dismissed during this run. They stay visible
  // for the duration of the run (so the click feedback isn't disorienting),
  // but the backend already excludes them from future drill fetches.
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const currentQuestion = questions[currentIndex];
  const selectedChoice = currentQuestion ? answers[currentQuestion.id] ?? "" : "";
  const isChecked = currentQuestion ? checked[currentQuestion.id] ?? false : false;
  const correctCount = useMemo(
    () =>
      Object.entries(answers).filter(([questionId, choice]) => {
        const question = questions.find((item) => item.id === questionId);
        return question?.answer === choice;
      }).length,
    [answers, questions]
  );
  const checkedCount = Object.keys(checked).length;
  const lastQuestion = currentIndex === questions.length - 1;

  async function handleFinalSubmit() {
    setStage("submitting");
    setError(null);

    try {
      const completed = await submitNUETPracticeAttempt({
        topicSlug: topic.slug,
        answers: questions
          .filter((question) => answers[question.id])
          .map((question) => ({
            questionId: question.id,
            choice: answers[question.id] as "A" | "B" | "C" | "D" | "E",
          })),
      });
      setResult(completed);
      setStage("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit practice");
      setStage("ready");
    }
  }

  function handleCheck() {
    if (!currentQuestion || !selectedChoice) {
      return;
    }
    setChecked((current) => ({ ...current, [currentQuestion.id]: true }));
  }

  function handleDismiss() {
    if (!currentQuestion) return;
    if (dismissedIds.has(currentQuestion.id)) return;
    setDismissedIds((current) => {
      const next = new Set(current);
      next.add(currentQuestion.id);
      return next;
    });
    void dismissNUETQuestion(currentQuestion.id).catch(() => {
      // Roll the local state back if the call failed so the user can try
      // again — toast omitted to keep the runner uninterrupted.
      setDismissedIds((current) => {
        const next = new Set(current);
        next.delete(currentQuestion.id);
        return next;
      });
    });
  }

  function handleNext() {
    if (lastQuestion) {
      void handleFinalSubmit();
      return;
    }
    setCurrentIndex((current) => current + 1);
  }

  function resetPractice() {
    setCurrentIndex(0);
    setAnswers({});
    setChecked({});
    setResult(null);
    setError(null);
    setStage("ready");
  }

  // Keyboard shortcuts during the practice run:
  //   A-E    select that option (disabled once Check is pressed)
  //   Enter  Check (when an option is picked) / Next (when already checked)
  // Skip when focus is in a text input — the practice run currently has none,
  // but this makes the handler future-proof.
  useEffect(() => {
    if (stage !== "ready" || !currentQuestion) return;
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Enter") {
        event.preventDefault();
        if (isChecked) {
          handleNext();
        } else if (selectedChoice) {
          handleCheck();
        }
        return;
      }
      if (isChecked) return;
      const upper = event.key.toUpperCase();
      const index = upper.charCodeAt(0) - 65;
      if (index >= 0 && index < currentQuestion.options.length) {
        event.preventDefault();
        const letter = String.fromCharCode(65 + index);
        setAnswers((current) => ({ ...current, [currentQuestion.id]: letter }));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // handleCheck/handleNext are stable enough for this scope; we re-bind on
    // state changes that affect their behavior (currentQuestion, isChecked,
    // selectedChoice).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, currentQuestion, isChecked, selectedChoice, lastQuestion]);

  if (questions.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-secondary)]">
        <p className="font-medium text-[var(--text-primary)]">{t("nuet.practice.empty")}</p>
        <p className="mt-2 text-[var(--text-secondary)]">{t("nuet.practice.emptyHint")}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/nuet/simulator"
            className="inline-flex items-center rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            {t("nuet.practice.emptyTryMock")}
          </Link>
          <Link
            href="/nuet/pdf-tests"
            className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-soft)]"
          >
            {t("nuet.practice.emptyCta")}
          </Link>
        </div>
      </div>
    );
  }

  if (stage === "results" && result) {
    const total = result.evaluations?.length ?? questions.length;
    return (
      <div className="mt-6 space-y-6">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{t("nuet.practice.resultLabel")}</p>
              <h2 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                {result.correctMath + result.correctCt} / {total}
              </h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {t("nuet.practice.scoreLine").replace("{score}", String(result.scoreTotal))}
              </p>
            </div>
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={resetPractice}>
              <RotateCcw className="h-4 w-4" />
              {t("nuet.practice.tryAgain")}
            </Button>
            <Link
              href="/nuet/history"
              className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-soft)]"
            >
              {t("nuet.practice.viewHistory")}
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{t("nuet.practice.reviewTitle")}</h3>
          <div className="mt-4 space-y-3">
            {(() => {
              // Build a questionId → evaluation map first. The previous code
              // looked up evaluations by index, which silently mismatched
              // when the backend skipped a question or returned them in a
              // different order — students saw the wrong correctness badge
              // on each row.
              const evalById = new Map(
                (result.evaluations ?? [])
                  .filter((ev) => ev.questionId)
                  .map((ev) => [ev.questionId as string, ev])
              );
              return questions.map((question, index) => {
                const evaluation = evalById.get(question.id);
                const selected = answers[question.id];
              return (
                <div
                  key={question.id}
                  className={`rounded-xl border p-4 ${
                    evaluation?.correct ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
                  }`}
                >
                  <div className="text-sm font-semibold text-[var(--text-primary)]">
                    <span>{index + 1}. </span>
                    <MathText text={question.prompt} />
                  </div>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {t("nuet.practice.yourAnswer")} {selected || "—"} · {t("nuet.practice.correctAnswer")} {evaluation?.expected || "—"}
                  </p>
                  {question.explanation ? (
                    <div className="mt-2 text-sm text-[var(--text-secondary)]">
                      <MathText text={question.explanation} as="div" />
                    </div>
                  ) : null}
                </div>
              );
              });
            })()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{t("nuet.practice.runnerLabel")}</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{t("nuet.practice.runnerDesc")}</p>
          </div>
          <div className="rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">
            {t("nuet.practice.progress")
              .replace("{current}", String(currentIndex + 1))
              .replace("{total}", String(questions.length))}
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StatPill label={t("nuet.practice.checked")} value={`${checkedCount}/${questions.length}`} />
          <StatPill label={t("nuet.practice.correct")} value={`${correctCount}/${questions.length}`} />
          <StatPill label={t("nuet.practice.section")} value={topic.section === "math" ? t("nuet.sectionMath") : t("nuet.sectionCT")} />
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setScratchpadOpen((v) => !v)}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            scratchpadOpen
              ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
              : "border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-secondary)] hover:border-[var(--primary)]"
          }`}
        >
          <PenLine className="h-3.5 w-3.5" />
          {scratchpadOpen ? t("nuet.practice.scratchHide") : t("nuet.practice.scratchShow")}
        </button>
      </div>
      {scratchpadOpen ? <Scratchpad clearLabel={t("nuet.practice.scratchClear")} /> : null}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
        <div className="text-base font-semibold text-[var(--text-primary)]">
          <span>{currentIndex + 1}. </span>
          <MathText text={currentQuestion.prompt} />
        </div>
        <div className="mt-4 grid gap-2">
          {currentQuestion.options.map((option, optionIndex) => {
            const letter = String.fromCharCode(65 + optionIndex);
            const active = selectedChoice === letter;
            const showCorrect = isChecked && currentQuestion.answer === letter;
            const showWrong = isChecked && selectedChoice === letter && currentQuestion.answer !== letter;
            return (
              <button
                key={letter}
                type="button"
                disabled={isChecked}
                onClick={() => setAnswers((current) => ({ ...current, [currentQuestion.id]: letter }))}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${
                  showCorrect
                    ? "border-emerald-500 bg-emerald-50"
                    : showWrong
                      ? "border-rose-500 bg-rose-50"
                      : active
                        ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                        : "border-[var(--border)] bg-[var(--bg-base)] hover:border-[var(--primary)]"
                } ${isChecked ? "cursor-default" : ""}`}
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

        {isChecked ? (
          <div className={`mt-5 rounded-xl border p-4 ${selectedChoice === currentQuestion.answer ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
            <div className="flex items-start gap-3">
              {selectedChoice === currentQuestion.answer ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              )}
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {selectedChoice === currentQuestion.answer ? t("nuet.practice.correctState") : t("nuet.practice.incorrectState")}
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {t("nuet.practice.correctAnswer")} {currentQuestion.answer}
                </p>
                {currentQuestion.explanation ? (
                  <div className="mt-2 text-sm text-[var(--text-secondary)]">
                    <MathText text={currentQuestion.explanation} as="div" />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
        <p className="text-sm text-[var(--text-secondary)]">
          {isChecked ? t("nuet.practice.readyForNext") : t("nuet.practice.pickOne")}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {currentQuestion && !dismissedIds.has(currentQuestion.id) ? (
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-emerald-300 hover:text-emerald-700"
              title={t("nuet.practice.dismissTooltip")}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              {t("nuet.practice.dismiss")}
            </button>
          ) : currentQuestion && dismissedIds.has(currentQuestion.id) ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("nuet.practice.dismissed")}
            </span>
          ) : null}
          {isChecked ? (
            <Button onClick={handleNext} isLoading={stage === "submitting"}>
              {lastQuestion ? t("nuet.practice.finish") : t("nuet.practice.next")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleCheck} disabled={!selectedChoice}>
              {t("nuet.practice.check")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Scratchpad({ clearLabel }: { clearLabel: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Match the canvas backing store to the displayed size on mount and on
  // resize so strokes don't blur. We keep CSS height fixed (240px) so the
  // pad doesn't reflow page layout when the user scrolls.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * window.devicePixelRatio);
      canvas.height = Math.floor(rect.height * window.devicePixelRatio);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#1f2937";
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  function getPoint(event: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in event) {
      const touch = event.touches[0] ?? event.changedTouches[0];
      if (!touch) return null;
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function handleStart(event: React.MouseEvent | React.TouchEvent) {
    event.preventDefault();
    const point = getPoint(event);
    if (!point) return;
    drawingRef.current = true;
    lastPointRef.current = point;
  }

  function handleMove(event: React.MouseEvent | React.TouchEvent) {
    if (!drawingRef.current) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const point = getPoint(event);
    if (!point) return;
    const last = lastPointRef.current;
    if (last) {
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
    lastPointRef.current = point;
  }

  function handleEnd() {
    drawingRef.current = false;
    lastPointRef.current = null;
  }

  function handleClear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
      <canvas
        ref={canvasRef}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        className="block h-60 w-full cursor-crosshair touch-none rounded-xl border border-dashed border-[var(--border)] bg-white"
      />
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:border-rose-300 hover:text-rose-600"
        >
          <Eraser className="h-3.5 w-3.5" />
          {clearLabel}
        </button>
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
