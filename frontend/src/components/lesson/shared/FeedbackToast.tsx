"use client";

import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";

interface Props {
  isCorrect: boolean;
  combo?: number;
  explanation?: string;
  onNext: () => void;
  nextLabel?: string;
}

export function FeedbackToast({
  isCorrect,
  combo,
  explanation,
  onNext,
  nextLabel,
}: Props) {
  const { t } = useLocale();
  const label = nextLabel ?? t("lesson.continue");

  const feedbackText = isCorrect
    ? combo && combo >= 2
      ? t("lesson.combo", { n: combo })
      : t("lesson.correct")
    : t("lesson.notQuite");

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-4 rounded-xl p-4 transition-all ${
        isCorrect ? "bg-emerald-500/10" : "bg-red-500/10"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isCorrect ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
          <span
            className={`text-sm font-semibold ${
              isCorrect ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {feedbackText}
          </span>
        </div>
        <Button size="sm" onClick={onNext}>
          {label} <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
      {!isCorrect && explanation && (
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          💡 {explanation}
        </p>
      )}
    </div>
  );
}
