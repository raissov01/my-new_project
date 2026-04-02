"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Trophy, TrendingUp, Flame, Zap } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useSound } from "@/features/study/hooks/use-sound";
import { getMemeFeedback, type FeedbackContext } from "@/lib/shared/study/meme-feedback";

interface StudyFeedbackProps {
  correct: boolean;
  currentStreak: number;
  answered: number;
  total: number;
  xpEarned: number;
}

const CONFETTI_COLORS = [
  "bg-amber-400",
  "bg-emerald-400",
  "bg-indigo-400",
  "bg-pink-400",
  "bg-sky-400",
  "bg-orange-400",
];

function MiniConfetti() {
  const particles = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        left: `${14 + i * 10}%`,
        delay: `${(i % 4) * 0.08}s`,
        size: 4 + (i % 3) * 1.5,
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className={`absolute animate-confetti-particle rounded-full ${p.color}`}
          style={{
            left: p.left,
            bottom: 0,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

export function StudyFeedback(props: StudyFeedbackProps) {
  const { t } = useLocale();
  const { playStreak, playSpecial } = useSound();
  const [visible, setVisible] = useState(true);
  const soundPlayedRef = useRef(false);

  const approxAccuracy = useMemo(() => {
    if (props.answered <= 0) return 0;
    return Math.round((props.currentStreak / Math.max(props.answered, 1)) * 100);
  }, [props.answered, props.currentStreak]);

  const ctx: FeedbackContext = useMemo(
    () => ({
      correct: props.correct,
      streak: props.currentStreak,
      answered: props.answered,
      total: props.total,
      accuracy: approxAccuracy,
    }),
    [props.correct, props.currentStreak, props.answered, props.total, approxAccuracy]
  );

  // Memoize with a stable key so it doesn't re-roll on every render
  const feedback = useMemo(
    () => getMemeFeedback(ctx, t),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ctx.correct, ctx.streak, ctx.answered, t]
  );

  const showConfetti = feedback.isSpecial || props.currentStreak >= 5;
  const isStreakMilestone =
    props.correct && props.currentStreak > 0 && props.currentStreak % 3 === 0;

  // Play sounds based on context
  useEffect(() => {
    if (soundPlayedRef.current) return;
    soundPlayedRef.current = true;

    if (feedback.isSpecial && props.correct) {
      playSpecial();
    } else if (isStreakMilestone) {
      playStreak(props.currentStreak);
    }
  }, [feedback.isSpecial, isStreakMilestone, playSpecial, playStreak, props.correct, props.currentStreak]);

  // Reset ref when answer changes
  useEffect(() => {
    soundPlayedRef.current = false;
    setVisible(true);
  }, [props.answered]);

  if (!visible) return null;

  const animClass = props.correct
    ? feedback.isSpecial
      ? "animate-special-bounce animate-success-glow"
      : "animate-fade-in-up animate-success-glow"
    : feedback.isSpecial
      ? "animate-special-bounce animate-error-flash"
      : "animate-shake";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border px-5 py-4 shadow-sm ${animClass} ${
        props.correct
          ? "border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-lime-50 dark:border-emerald-800/40 dark:from-emerald-950/20 dark:via-transparent dark:to-lime-950/20"
          : "border-red-200 bg-gradient-to-r from-red-50 via-white to-orange-50 dark:border-red-800/40 dark:from-red-950/20 dark:via-transparent dark:to-orange-950/20"
      }`}
    >
      {showConfetti && <MiniConfetti />}

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div
              className={`rounded-full p-2 ${
                props.correct
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/15 text-red-600 dark:text-red-400"
              }`}
            >
              {feedback.isSpecial ? (
                <Zap className="h-4 w-4" />
              ) : props.correct && props.currentStreak >= 3 ? (
                <Flame className="h-4 w-4" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </div>
            <p
              className={`text-sm font-bold ${
                props.correct
                  ? "text-emerald-800 dark:text-emerald-300"
                  : "text-red-800 dark:text-red-300"
              }`}
            >
              {feedback.message}
            </p>
            {feedback.isSpecial && (
              <span className="ml-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                RARE
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="animate-xp-pop inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1.5 text-amber-700 shadow-sm dark:text-amber-300">
            <Zap className="h-3.5 w-3.5" />
            {t("study.feedbackXp", { points: props.xpEarned })}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-[var(--text-primary)] shadow-sm dark:bg-white/10">
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
            {props.answered}/{props.total}
          </span>
          {props.currentStreak > 0 && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 shadow-sm ${
                props.currentStreak >= 5
                  ? "animate-streak-pulse bg-gradient-to-r from-orange-500 to-red-500 text-white"
                  : "bg-white/80 text-[var(--text-primary)] dark:bg-white/10"
              }`}
            >
              <Flame className="h-3.5 w-3.5" />
              {props.currentStreak}x
            </span>
          )}
          {!props.correct && props.currentStreak === 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-[var(--text-primary)] shadow-sm dark:bg-white/10">
              <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
              {props.answered > 0
                ? t("study.feedbackProgressPercent", {
                    percent: Math.round((props.answered / props.total) * 100),
                  })
                : "0%"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
