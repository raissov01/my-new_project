"use client";

import { Lightbulb, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";

interface ExplanationCardProps {
  term: string;
  definition: string;
  correct: boolean;
  /** The user's wrong answer text (quiz choice or typed text). Omit for correct answers. */
  userAnswer?: string;
}

/**
 * Generates a contextual explanation based on the term, definition,
 * and whether the user answered correctly.
 */
function buildExplanation(
  t: (key: string, vars?: Record<string, string | number>) => string,
  term: string,
  definition: string,
  correct: boolean,
  userAnswer?: string
): { heading: string; body: string; tip: string | null } {
  if (correct) {
    return {
      heading: t("explain.correctHeading"),
      body: t("explain.correctBody", { term, definition }),
      tip: t("explain.correctTip"),
    };
  }

  return {
    heading: t("explain.incorrectHeading"),
    body: userAnswer
      ? t("explain.incorrectBodyWithAnswer", {
          term,
          definition,
          userAnswer,
        })
      : t("explain.incorrectBody", { term, definition }),
    tip: t("explain.incorrectTip"),
  };
}

export function ExplanationCard({
  term,
  definition,
  correct,
  userAnswer,
}: ExplanationCardProps) {
  const { t } = useLocale();
  const { heading, body, tip } = buildExplanation(
    t,
    term,
    definition,
    correct,
    userAnswer
  );

  return (
    <div
      className={`animate-fade-in-up rounded-2xl border p-5 ${
        correct
          ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 dark:border-emerald-800/40 dark:from-emerald-950/30 dark:to-green-950/30"
          : "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-800/40 dark:from-amber-950/30 dark:to-orange-950/30"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div
          className={`rounded-lg p-1.5 ${
            correct
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
          }`}
        >
          <Lightbulb className="h-4 w-4" />
        </div>
        <span
          className={`text-sm font-semibold ${
            correct
              ? "text-emerald-800 dark:text-emerald-300"
              : "text-amber-800 dark:text-amber-300"
          }`}
        >
          {heading}
        </span>
        {correct ? (
          <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" />
        ) : (
          <XCircle className="ml-auto h-4 w-4 text-amber-500" />
        )}
      </div>

      {/* Correct answer display */}
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/60 px-4 py-2.5 dark:bg-white/5">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          {term}
        </span>
        <ArrowRight className="h-3 w-3 shrink-0 text-[var(--text-muted)]" />
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {definition}
        </span>
      </div>

      {/* Explanation body */}
      <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
        {body}
      </p>

      {/* Wrong answer comparison */}
      {!correct && userAnswer && (
        <div className="mt-3 flex items-start gap-3 rounded-xl bg-red-500/5 px-4 py-2.5 dark:bg-red-500/10">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
          <div>
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              {t("explain.yourAnswer")}
            </p>
            <p className="mt-0.5 text-sm text-red-800 dark:text-red-300">
              {userAnswer}
            </p>
          </div>
        </div>
      )}

      {/* Learning tip */}
      {tip && (
        <p className="mt-3 text-xs italic text-[var(--text-muted)]">{tip}</p>
      )}
    </div>
  );
}
