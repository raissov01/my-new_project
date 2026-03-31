import { memo, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";

interface ProgressBarProps {
  current: number;
  total: number;
  percent: number;
  answered?: number;
}

export const ProgressBar = memo(function ProgressBar({
  current,
  total,
  percent,
  answered = Math.max(0, current - 1),
}: ProgressBarProps) {
  const { t } = useLocale();
  const [displayPercent, setDisplayPercent] = useState(percent);
  const remaining = Math.max(total - answered, 0);
  const completed = percent >= 100 || answered >= total;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setDisplayPercent(percent);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [percent]);

  const segments = useMemo(
    () =>
      Array.from({ length: total }, (_, index) => {
        const isActive = completed || index < answered;
        const isCurrent = !completed && index === answered && answered < total;

        if (isActive) return "active";
        if (isCurrent) return "current";
        return "idle";
      }),
    [answered, completed, total]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 text-sm">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {t("study.sessionProgress")}
            </span>
            {completed && (
              <span className="animate-special-bounce inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t("study.progressComplete")}
              </span>
            )}
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-[var(--text-primary)]">
              {Math.min(answered, total)}/{total}
            </span>
            <span className="pb-0.5 text-sm text-[var(--text-muted)]">
              {t("study.cardsCompleted")}
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {completed
              ? t("study.feedbackCompleted", {
                  answered: total,
                  total,
                })
              : `${answered} ${t("study.answered")} • ${remaining} ${t("study.remaining")}`}
          </p>
        </div>
        <div className="rounded-2xl bg-[var(--bg-surface)] px-3 py-2 text-right shadow-sm">
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-lg font-bold text-transparent">
            {displayPercent}%
          </span>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            {current} {t("common.of")} {total}
          </p>
        </div>
      </div>
      <div
        className={`relative h-3 w-full overflow-hidden rounded-full bg-[var(--border)] ${
          completed ? "ring-2 ring-emerald-400/20" : ""
        }`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${
            completed
              ? "progress-shimmer bg-gradient-to-r from-emerald-500 via-lime-400 to-amber-300 shadow-sm shadow-emerald-500/30"
              : "progress-shimmer bg-gradient-to-r from-indigo-600 via-purple-500 to-fuchsia-500 shadow-sm shadow-indigo-500/30"
          }`}
          style={{ width: `${displayPercent}%` }}
        />
        <div
          className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white transition-[left] duration-500 ease-out dark:border-[var(--bg-elevated)] ${
            completed
              ? "animate-success-glow bg-emerald-400 shadow-lg shadow-emerald-400/40"
              : "bg-white shadow-md shadow-indigo-500/20"
          }`}
          style={{ left: `calc(${Math.min(displayPercent, 100)}% - 0.5rem)` }}
        >
          {completed && (
            <span className="absolute -inset-2 animate-pulse rounded-full bg-emerald-400/20" />
          )}
        </div>
      </div>
      <div className="grid grid-cols-10 gap-0.5 sm:gap-1">
        {segments.map((state, index) => {
          return (
            <span
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                state === "active"
                  ? completed
                    ? "animate-success-glow bg-gradient-to-r from-emerald-500 to-lime-400"
                    : "bg-gradient-to-r from-indigo-600 to-purple-500"
                  : state === "current"
                    ? "animate-special-bounce bg-amber-400"
                    : "bg-[var(--border)]"
              }`}
            />
          );
        })}
      </div>
      {completed && (
        <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500/12 to-amber-400/12 px-3 py-2 text-sm font-medium text-[var(--text-primary)]">
          <Sparkles className="h-4 w-4 text-amber-500" />
          {t("study.sessionComplete")}
        </div>
      )}
    </div>
  );
});
