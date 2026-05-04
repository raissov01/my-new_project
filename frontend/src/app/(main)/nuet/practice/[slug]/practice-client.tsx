"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NUETQuestion, NUETTopic } from "@/server/integrations/go-backend/nuet";
import { completeNUETAttempt, startNUETAttempt } from "../../simulator/actions";

type Stage = "ready" | "submitting" | "results";

export function NUETPracticeClient({
  topic,
  questions,
}: {
  topic: NUETTopic;
  questions: NUETQuestion[];
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Awaited<ReturnType<typeof completeNUETAttempt>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("ready");

  const answeredCount = useMemo(
    () => Object.values(answers).filter(Boolean).length,
    [answers]
  );

  async function handleSubmit() {
    setStage("submitting");
    setError(null);

    try {
      const attempt = await startNUETAttempt({
        attemptType: "topic_practice",
        topicId: topic.id,
        section: topic.section,
      });

      const completed = await completeNUETAttempt(attempt.id, {
        answers,
        timeTakenSecs: 0,
      });
      setResult(completed);
      setStage("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit practice");
      setStage("ready");
    }
  }

  function resetPractice() {
    setAnswers({});
    setResult(null);
    setError(null);
    setStage("ready");
  }

  if (questions.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-secondary)]">
        <p>No questions have been seeded for this topic yet.</p>
        <Link href="/nuet/simulator" className="mt-4 inline-flex text-[var(--primary)] hover:underline">
          Open the full mock simulator instead
        </Link>
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
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Practice result</p>
              <h2 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                {result.correctMath + result.correctCt} / {total} correct
              </h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Topic score: {result.scoreTotal}
              </p>
            </div>
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={resetPractice}>
              <RotateCcw className="h-4 w-4" />
              Try again
            </Button>
            <Link
              href={`/nuet/topics/${topic.slug}`}
              className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-soft)]"
            >
              Review explanation
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Question review</h3>
          <div className="mt-4 space-y-3">
            {questions.map((question, index) => {
              const evaluation = result.evaluations?.[index];
              const selected = answers[question.id];
              return (
                <div
                  key={question.id}
                  className={`rounded-xl border p-4 ${
                    evaluation?.correct
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-rose-200 bg-rose-50"
                  }`}
                >
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {index + 1}. {question.prompt}
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Your answer: {selected || "—"} · Correct answer: {evaluation?.expected || "—"}
                  </p>
                  {question.explanation ? (
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">{question.explanation}</p>
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
    <div className="mt-6 space-y-5">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Starter practice</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Answer all questions, then submit to get instant feedback for this topic.
            </p>
          </div>
          <div className="rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">
            {answeredCount} / {questions.length} answered
          </div>
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

      <div className="space-y-4">
        {questions.map((question, index) => (
          <section key={question.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
            <p className="text-base font-semibold text-[var(--text-primary)]">
              {index + 1}. {question.prompt}
            </p>
            <div className="mt-4 grid gap-2">
              {question.options.map((option, optionIndex) => {
                const letter = String.fromCharCode(65 + optionIndex);
                const active = answers[question.id] === letter;
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => setAnswers((current) => ({ ...current, [question.id]: letter }))}
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${
                      active
                        ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                        : "border-[var(--border)] bg-[var(--bg-base)] hover:border-[var(--primary)]"
                    }`}
                  >
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-semibold">
                      {letter}
                    </span>
                    <span className="text-sm text-[var(--text-primary)]">{option}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
        <p className="text-sm text-[var(--text-secondary)]">
          You can submit now or finish the remaining questions first.
        </p>
        <Button onClick={() => void handleSubmit()} isLoading={stage === "submitting"}>
          Submit practice
        </Button>
      </div>
    </div>
  );
}
