"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Flame, Sparkles, X } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { MathText } from "@/components/nuet/math-text";
import type { NUETQuestion } from "@/server/integrations/go-backend/nuet";

type StreakState = {
  lastCompletedDate: string;
  streak: number;
};

const STORAGE_KEY = "nuet:dailyChallenge";

export function NUETDailyChallengeWidget({
  date,
  questions,
}: {
  date: string;
  questions: NUETQuestion[];
}) {
  const { t } = useLocale();
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [streak, setStreak] = useState<number>(0);
  const [completedToday, setCompletedToday] = useState<boolean>(false);
  // Hide streak-dependent UI until the localStorage hydration effect has
  // run, otherwise the pill briefly flashes "0 day streak" on first paint
  // before the real value lands. Server-side this is always false so SSR
  // markup matches the first client render.
  const [hydrated, setHydrated] = useState(false);
  // Crossing one of these streak counts pops a celebratory banner. We
  // don't celebrate every day (would get noisy) — only round milestones.
  const [milestone, setMilestone] = useState<number | null>(null);
  const completionRef = useRef(false);

  useEffect(() => {
    // Hydrate the streak from localStorage only on the client to avoid SSR
    // mismatch — the server cannot know the user's stored streak.
    const stored = readStoredStreak();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
    if (!stored) return;
    setStreak(stored.streak);
    if (stored.lastCompletedDate === date) {
      setCompletedToday(true);
      completionRef.current = true;
    }
  }, [date]);

  function handleReveal(questionId: string) {
    if (revealed[questionId]) return;
    const nextRevealed = { ...revealed, [questionId]: true };
    setRevealed(nextRevealed);

    const justFinished =
      questions.length > 0 &&
      questions.every((q) => nextRevealed[q.id]) &&
      !completionRef.current;
    if (!justFinished) return;

    completionRef.current = true;
    const previous = readStoredStreak();
    let nextStreak = 1;
    if (previous) {
      if (previous.lastCompletedDate === date) {
        nextStreak = previous.streak;
      } else if (previous.lastCompletedDate === yesterdayOf(date)) {
        nextStreak = previous.streak + 1;
      }
    }
    const updated: StreakState = {
      lastCompletedDate: date,
      streak: nextStreak,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setStreak(nextStreak);
    setCompletedToday(true);

    // Celebrate at round-number milestones. Skips when the streak didn't
    // actually advance (same-day repeat) by comparing against the previous
    // value rather than just hitting a milestone count.
    const milestones = [3, 7, 14, 30, 60, 100];
    const advanced = previous == null || previous.lastCompletedDate !== date;
    if (advanced && milestones.includes(nextStreak)) {
      setMilestone(nextStreak);
    }
  }

  // Auto-dismiss the milestone banner so it doesn't sit on the page forever.
  useEffect(() => {
    if (milestone == null) return;
    const id = window.setTimeout(() => setMilestone(null), 4500);
    return () => window.clearTimeout(id);
  }, [milestone]);

  if (questions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-5 text-sm text-[var(--text-muted)]">
        {t("nuet.daily.unavailable")}
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
            {date}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
            {t("nuet.daily.title")}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-[var(--text-secondary)]">
            {t("nuet.daily.subtitle")}
          </p>
        </div>
        {hydrated ? (
          <StreakPill streak={streak} completedToday={completedToday} t={t} />
        ) : null}
      </header>

      {milestone != null ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-100 to-orange-100 p-4 text-amber-900 animate-fade-in-up">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-base font-bold">
              {t("nuet.daily.milestoneTitle", { n: milestone })}
            </p>
            <p className="mt-1 text-sm text-amber-800">
              {t("nuet.daily.milestoneBody")}
            </p>
          </div>
        </div>
      ) : null}

      <ol className="mt-5 space-y-4">
        {questions.map((q, index) => (
          <DailyQuestionCard
            key={q.id}
            question={q}
            index={index}
            pick={picks[q.id] ?? ""}
            isRevealed={Boolean(revealed[q.id])}
            onPick={(choice) =>
              setPicks((prev) => ({ ...prev, [q.id]: choice }))
            }
            onReveal={() => handleReveal(q.id)}
          />
        ))}
      </ol>
    </section>
  );
}

function DailyQuestionCard({
  question,
  index,
  pick,
  isRevealed,
  onPick,
  onReveal,
}: {
  question: NUETQuestion;
  index: number;
  pick: string;
  isRevealed: boolean;
  onPick: (choice: string) => void;
  onReveal: () => void;
}) {
  const { t } = useLocale();
  const sectionLabel =
    question.section === "math" ? t("nuet.sectionMath") : t("nuet.sectionCT");
  const userIsCorrect = isRevealed && pick === question.answer;

  return (
    <li className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-mono uppercase tracking-wider text-[var(--text-muted)]">
          {t("nuet.daily.questionShort", { n: index + 1 })}
        </span>
        <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
          {sectionLabel}
        </span>
        {isRevealed ? (
          <CorrectnessBadge correct={userIsCorrect} t={t} />
        ) : null}
      </div>

      <div className="mt-3 text-sm text-[var(--text-primary)]">
        <MathText text={question.prompt} as="div" />
      </div>

      <ul className="mt-4 space-y-2">
        {question.options.map((option, optionIndex) => {
          const letter = String.fromCharCode(65 + optionIndex);
          const isPick = pick === letter;
          const isAnswer = question.answer === letter;
          const tone =
            isRevealed && isAnswer
              ? "bg-emerald-500/10 border-emerald-500/40"
              : isRevealed && isPick && !isAnswer
                ? "bg-rose-500/10 border-rose-500/40"
                : isPick
                  ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                  : "border-[var(--border)] hover:border-[var(--primary)]";
          return (
            <li key={letter}>
              <button
                type="button"
                onClick={() => !isRevealed && onPick(letter)}
                disabled={isRevealed}
                className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${tone}`}
              >
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--border)] font-mono text-[10px] text-[var(--text-muted)]">
                  {letter}
                </span>
                <span className="min-w-0 flex-1 text-[var(--text-primary)]">
                  <MathText text={option} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {!isRevealed ? (
        <button
          type="button"
          onClick={onReveal}
          disabled={!pick}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-1.5 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("nuet.daily.checkButton")}
        </button>
      ) : (
        <details className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)]">
          <summary className="cursor-pointer list-none px-3 py-2 text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--primary)]">
            {t("nuet.review.solutionTitle")}
          </summary>
          <div className="border-t border-[var(--border)] px-3 py-3 text-sm text-[var(--text-secondary)]">
            {question.explanation && question.explanation.trim() ? (
              <MathText text={question.explanation} as="div" />
            ) : (
              <p className="italic text-[var(--text-muted)]">
                {t("nuet.review.noExplanation")}
              </p>
            )}
          </div>
        </details>
      )}
    </li>
  );
}

function CorrectnessBadge({
  correct,
  t,
}: {
  correct: boolean;
  t: (key: string) => string;
}) {
  if (correct) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
        <Check className="h-3 w-3" />
        {t("nuet.daily.correctChoice")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
      <X className="h-3 w-3" />
      {t("nuet.daily.incorrectChoice")}
    </span>
  );
}

function StreakPill({
  streak,
  completedToday,
  t,
}: {
  streak: number;
  completedToday: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  if (streak === 0) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-3 py-1.5 text-xs text-[var(--text-muted)]">
        <Flame className="h-3.5 w-3.5" />
        {t("nuet.daily.noStreak")}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
        completedToday
          ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          : "border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-secondary)]"
      }`}
    >
      <Flame className="h-3.5 w-3.5" />
      {t("nuet.daily.streakDays", { n: streak })}
    </span>
  );
}

function readStoredStreak(): StreakState | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StreakState;
    if (parsed && typeof parsed.streak === "number") return parsed;
    return null;
  } catch {
    return null;
  }
}

function yesterdayOf(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() - 1);
  return parsed.toISOString().slice(0, 10);
}
