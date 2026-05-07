"use client";

import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { MathText } from "@/components/nuet/math-text";
import type { NUETAttempt } from "@/server/integrations/go-backend/nuet";

type Evaluation = NonNullable<NUETAttempt["evaluations"]>[number];
type ReviewFilter = "all" | "wrong" | "correct";

export function NUETReviewClient({
  evaluations,
}: {
  evaluations: Evaluation[];
}) {
  const { t } = useLocale();
  const [filter, setFilter] = useState<ReviewFilter>("all");

  const filtered = useMemo(() => {
    if (filter === "wrong") return evaluations.filter((e) => !e.correct);
    if (filter === "correct") return evaluations.filter((e) => e.correct);
    return evaluations;
  }, [evaluations, filter]);

  const filterOptions: Array<{ value: ReviewFilter; label: string; count: number }> = [
    { value: "all", label: t("nuet.review.filterAll"), count: evaluations.length },
    {
      value: "wrong",
      label: t("nuet.review.filterWrong"),
      count: evaluations.filter((e) => !e.correct).length,
    },
    {
      value: "correct",
      label: t("nuet.review.filterCorrect"),
      count: evaluations.filter((e) => e.correct).length,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--text-muted)]">
          {t("nuet.history.filterLabel")}
        </span>
        {filterOptions.map((option) => {
          const active = filter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                active
                  ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                  : "border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-secondary)] hover:border-[var(--primary)]"
              }`}
            >
              {option.label}
              <span className="ml-1.5 font-mono text-[10px] text-[var(--text-muted)]">
                {option.count}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-secondary)]">
          {t("nuet.review.empty")}
        </p>
      ) : (
        <ol className="space-y-4">
          {filtered.map((ev) => (
            <ReviewItem key={`${ev.question}-${ev.questionId ?? ""}`} ev={ev} />
          ))}
        </ol>
      )}
    </div>
  );
}

function ReviewItem({ ev }: { ev: Evaluation }) {
  const { t } = useLocale();
  const sectionLabel =
    ev.section === "math" ? t("nuet.sectionMath") : t("nuet.sectionCT");
  const givenAnswer = ev.received?.trim();
  const expectedAnswer = ev.expected?.trim() || "?";

  return (
    <li className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono uppercase tracking-wider text-[var(--text-muted)]">
            {t("nuet.review.questionLabel", { n: ev.question })}
          </span>
          <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            {sectionLabel}
          </span>
        </div>
        <CorrectnessBadge correct={ev.correct} />
      </div>

      {ev.prompt ? (
        <div className="mt-3 text-sm text-[var(--text-primary)]">
          <MathText text={ev.prompt} as="div" />
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <AnswerCell
          label={t("nuet.review.yourAnswer")}
          value={givenAnswer || t("nuet.review.notAnswered")}
          tone={
            !givenAnswer ? "muted" : ev.correct ? "correct" : "wrong"
          }
        />
        <AnswerCell
          label={t("nuet.review.correctAnswer")}
          value={expectedAnswer}
          tone="correct"
        />
      </div>

      <details className="group mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg-base)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--primary)]">
          <span>{t("nuet.review.solutionTitle")}</span>
          <span className="group-open:hidden">{t("nuet.topic.expand")}</span>
          <span className="hidden group-open:inline">
            {t("nuet.topic.collapse")}
          </span>
        </summary>
        <div className="border-t border-[var(--border)] px-3 py-3 text-sm text-[var(--text-secondary)]">
          {ev.explanation && ev.explanation.trim() ? (
            <MathText text={ev.explanation} as="div" />
          ) : (
            <p className="italic text-[var(--text-muted)]">
              {t("nuet.review.noExplanation")}
            </p>
          )}
        </div>
      </details>
    </li>
  );
}

function CorrectnessBadge({ correct }: { correct: boolean }) {
  const { t } = useLocale();
  if (correct) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
        <Check className="h-3 w-3" />
        {t("nuet.review.correct")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
      <X className="h-3 w-3" />
      {t("nuet.review.incorrect")}
    </span>
  );
}

function AnswerCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "correct" | "wrong" | "muted";
}) {
  const valueColor =
    tone === "correct"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "wrong"
        ? "text-rose-700 dark:text-rose-300"
        : "text-[var(--text-muted)]";
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-base)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p className={`mt-0.5 font-mono text-sm font-semibold ${valueColor}`}>
        {value}
      </p>
    </div>
  );
}
