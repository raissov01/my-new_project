"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Trophy,
  RotateCcw,
  Flag,
  BookOpen,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Flame,
  Star,
  Award,
  TrendingUp,
  Crown,
  Zap,
  Target,
} from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import {
  saveSessionResults,
  type StudyReward,
} from "@/app/(main)/sets/progress-actions";
import { saveChallengeAttempt } from "@/app/(main)/sets/challenge-actions";
import { saveClassChallengeAttempt } from "@/app/(main)/classes/challenges/actions";
import type { CardSessionResult } from "@/features/study/hooks/use-study-session";
import { getLevelInfo } from "@/lib/shared/study/gamification";

interface ResultsScreenProps {
  score: number;
  total: number;
  difficultCount: number;
  cardResults: Map<string, CardSessionResult>;
  onReset: () => void;
  onStudyDifficult: () => void;
  challengeResult?:
    | {
        type: "set";
        setId: string;
        completionTime: number;
        rankingHref: string;
      }
    | {
        type: "class";
        challengeId: string;
        completionTime: number;
        rankingHref: string;
      }
    | null;
}

export function ResultsScreen({
  score,
  total,
  difficultCount,
  cardResults,
  onReset,
  onStudyDifficult,
  challengeResult = null,
}: ResultsScreenProps) {
  const { t } = useLocale();
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  const incorrect = total - score;
  const results = Array.from(cardResults.values());
  const incorrectCards = results.filter((r) => !r.correct);
  const correctRate = total > 0 ? Math.round((score / total) * 100) : 0;

  const saveAttempted = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reward, setReward] = useState<StudyReward | null>(null);
  const [challengeError, setChallengeError] = useState<string | null>(null);

  useEffect(() => {
    if (saveAttempted.current || results.length === 0) return;
    saveAttempted.current = true;
    setSaving(true);
    const payload = results.map((r) => ({ flashcardId: r.flashcardId, correct: r.correct }));
    saveSessionResults(payload)
      .then(async ({ error, reward }) => {
        if (error) setSaveError(error);
        if (reward) setReward(reward);

        if (!challengeResult) {
          return;
        }

        const challengeSave =
          challengeResult.type === "set"
            ? await saveChallengeAttempt({
                setId: challengeResult.setId,
                completionTime: challengeResult.completionTime,
                accuracy: correctRate,
                totalCorrect: score,
                totalIncorrect: incorrect,
              })
            : await saveClassChallengeAttempt({
                challengeId: challengeResult.challengeId,
                completionTime: challengeResult.completionTime,
                accuracy: correctRate,
                totalCorrect: score,
                totalIncorrect: incorrect,
              });

        if (challengeSave.error) {
          setChallengeError(challengeSave.error);
        }
      })
      .catch(() => { setSaveError(t("common.networkError")); })
      .finally(() => { setSaving(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let message: string;
  let emoji: string;
  let gradient: string;
  if (percent === 100) {
    message = t("study.perfectScore");
    emoji = "from-emerald-400 to-green-500";
    gradient = "from-emerald-500 to-green-600";
  } else if (percent >= 70) {
    message = t("study.greatJob");
    emoji = "from-indigo-400 to-purple-500";
    gradient = "from-indigo-500 to-purple-600";
  } else if (percent >= 40) {
    message = t("study.keepGoing");
    emoji = "from-amber-400 to-orange-500";
    gradient = "from-amber-500 to-orange-600";
  } else {
    message = t("study.dontGiveUp");
    emoji = "from-rose-400 to-red-500";
    gradient = "from-rose-500 to-red-600";
  }

  const improvementMessage = reward
    ? reward.accuracyDelta > 0
      ? t("study.improvedVsAverage", {
          percent: reward.accuracyDelta,
          accuracy: reward.currentAccuracy,
        })
      : reward.accuracyDelta < 0
        ? t("study.comebackMessage", {
            accuracy: reward.currentAccuracy,
          })
        : t("study.steadyProgress", { accuracy: reward.currentAccuracy })
    : null;
  const leveledUp = reward ? reward.currentLevel > reward.previousLevel : false;
  const levelInfo = reward ? getLevelInfo(reward.currentPoints) : null;

  return (
    <div className="space-y-5 animate-fade-in-up sm:space-y-8">
      {/* Score header */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-6 text-center shadow-sm sm:rounded-[2rem] sm:px-6 sm:py-8 md:px-8">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-indigo-500/10 via-amber-400/5 to-transparent" />
        <div className="absolute -left-10 top-10 h-28 w-28 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -right-10 top-6 h-32 w-32 rounded-full bg-amber-400/10 blur-3xl" />

        <div className={`relative mx-auto animate-confetti-pop rounded-2xl bg-gradient-to-br ${emoji} p-5 shadow-lg`}>
          {percent === 100 ? (
            <Sparkles className="h-10 w-10 text-white" />
          ) : (
            <Trophy className="h-10 w-10 text-white" />
          )}
        </div>

        <h2 className="relative mt-6 text-2xl font-bold text-[var(--text-primary)]">
          {t("study.sessionComplete")}
        </h2>
        <p className={`relative mt-2 text-lg font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
          {message}
        </p>

        {/* Score ring */}
        <div className="relative mt-6">
          <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke="url(#scoreGradient)" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${percent * 2.64} 264`}
              className="transition-[stroke-dasharray] duration-700 ease-out"
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-[var(--text-primary)]">{score}/{total}</span>
          </div>
        </div>

        <p className="relative mt-2 text-sm text-[var(--text-muted)]">{percent}% {t("study.accuracyPercent")}</p>
        <div className="relative mt-4 mx-auto h-2 w-full max-w-xs overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className="progress-shimmer h-full rounded-full bg-gradient-to-r from-indigo-600 via-purple-500 to-amber-400 transition-all duration-700"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
          <SessionHighlightCard
            icon={BookOpen}
            label={t("study.cardsCompleted")}
            value={String(total)}
            tone="indigo"
          />
          <SessionHighlightCard
            icon={Target}
            label={t("study.accuracyPercent")}
            value={`${correctRate}%`}
            tone="emerald"
          />
          <SessionHighlightCard
            icon={Zap}
            label={t("study.xp")}
            value={reward ? `+${reward.pointsEarned}` : "…"}
            tone="amber"
          />
        </div>

        {improvementMessage && (
          <div className="relative mt-5 inline-flex max-w-2xl items-center gap-2 rounded-2xl bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-secondary)] shadow-sm">
            <TrendingUp className="h-4 w-4 text-[var(--primary)]" />
            {improvementMessage}
          </div>
        )}

        <div className="relative mt-5 flex flex-wrap justify-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            {score} {t("study.correctCount")}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-sm font-medium text-red-600 dark:text-red-400">
            <XCircle className="h-4 w-4" />
            {incorrect} {t("study.wrongCount")}
          </span>
        </div>

        {saving && <p className="relative mt-3 text-xs text-[var(--text-muted)]">{t("study.saving")}</p>}
        {saveError && <p className="relative mt-3 text-xs text-red-500">{saveError}</p>}
        {challengeError && <p className="relative mt-3 text-xs text-red-500">{challengeError}</p>}

        {challengeResult && (
          <div className="relative mt-5">
            <Link
              href={challengeResult.rankingHref}
              className="inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)]"
            >
              {t("challenge.viewRanking")}
            </Link>
          </div>
        )}
      </div>

      {reward && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 sm:p-6">
          {leveledUp && (
            <div className="level-up-burst relative mb-4 overflow-hidden rounded-2xl border border-amber-300/50 bg-gradient-to-r from-amber-400/20 via-white to-orange-400/20 px-5 py-4 shadow-sm dark:border-amber-500/20 dark:from-amber-500/10 dark:via-transparent dark:to-orange-500/10">
              <div className="relative flex items-center gap-3">
                <div className="rounded-full bg-amber-500/15 p-2 text-amber-600 dark:text-amber-300">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {t("study.levelUp", { level: reward.currentLevel })}
                  </p>
                  <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">
                    {reward.currentLevelName}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {t("study.levelUpMessage")}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Sparkles className="h-4 w-4 text-amber-500" />
            {t("study.rewardsEarned")}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-amber-500/10 p-5">
              <div className="flex items-center gap-2 text-amber-600">
                <Star className="h-4 w-4" />
                <span className="text-sm font-semibold">{t("study.xp")}</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-[var(--text-primary)] animate-scale-in">
                +{reward.pointsEarned}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {t("study.xpRewardMessage", { points: reward.pointsEarned })}
              </p>
              {levelInfo && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium text-[var(--text-secondary)]">
                    <span>
                      {t("common.levelShort")} {reward.currentLevel}
                    </span>
                    <span>
                      {t("study.xpProgressNow", {
                        current: levelInfo.currentLevelPoints,
                        required: levelInfo.requiredPoints,
                      })}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
                    <div
                      className="progress-shimmer h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-pink-500 transition-all duration-1000"
                      style={{ width: `${levelInfo.progressPercent}%` }}
                    />
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                    <Zap className="h-3 w-3" />
                    +{reward.pointsEarned} XP
                  </div>
                </div>
              )}
              <div className="mt-4 grid gap-2">
                <div className="rounded-2xl bg-[var(--bg-surface)] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    {t("study.levelMeaning")}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-primary)]">
                    {reward.currentLevelName} • {reward.currentLevelReward}
                  </p>
                </div>
                <div className="rounded-2xl bg-[var(--bg-surface)] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    {t("study.nextUnlock")}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-primary)]">
                    {reward.nextLevelReward}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-orange-500/10 p-5">
              <div className="flex items-center gap-2 text-orange-600">
                <Flame className="h-4 w-4" />
                <span className="text-sm font-semibold">{t("study.streak")}</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-[var(--text-primary)] animate-scale-in">
                {reward.streakDays}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {t("study.streakRewardMessage", { days: reward.streakDays })}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {reward.rewardMessages.map((message) => (
              <div
                key={message}
                className="rounded-xl bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-secondary)] animate-fade-in-up"
              >
                {message}
              </div>
            ))}
          </div>

          {reward.unlockedAchievements.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                <Award className="h-4 w-4 text-amber-500" />
                {t("study.newBadges")}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {reward.unlockedAchievements.map((badge) => (
                  <span
                    key={badge.id}
                    className="rounded-full bg-gradient-to-r from-amber-400/15 to-orange-400/15 px-3 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-300"
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 sm:gap-4">
        <SummaryStatCard
          label={t("study.cardsCompleted")}
          value={String(total)}
          tone="indigo"
        />
        <SummaryStatCard
          label={t("study.progressComparison")}
          value={reward ? `${reward.currentAccuracy}%` : `${correctRate}%`}
          tone="orange"
          sublabel={
            reward
              ? reward.accuracyDelta >= 0
                ? t("study.progressUp", { percent: reward.accuracyDelta })
                : t("study.progressDown", {
                    percent: Math.abs(reward.accuracyDelta),
                  })
              : t("study.accuracyPercent")
          }
        />
        <SummaryStatCard
          label={t("study.focusCards")}
          value={String(difficultCount)}
          tone="amber"
        />
      </div>

      {/* Cards to review */}
      {incorrectCards.length > 0 && (
        <div className="animate-scale-in overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]">
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-6 py-4">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {t("study.reviewCards")} {incorrectCards.length}
            </h3>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {incorrectCards.map((card) => (
              <div key={card.flashcardId} className="grid gap-1 px-6 py-3 sm:grid-cols-2 sm:gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{t("study.term")}</p>
                  <p className="mt-0.5 text-sm text-[var(--text-primary)]">{card.term}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{t("study.definition")}</p>
                  <p className="mt-0.5 text-sm text-[var(--text-primary)]">{card.definition}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button onClick={onReset} variant="outline">
          <RotateCcw className="mr-2 h-4 w-4" />
          {t("study.studyAgain")}
        </Button>
        {difficultCount > 0 && (
          <Button onClick={onStudyDifficult} variant="accent">
            <Flag className="mr-2 h-4 w-4" />
            {t("study.studyDifficult")} {difficultCount}
          </Button>
        )}
      </div>
    </div>
  );
}

function SessionHighlightCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
  tone: "indigo" | "emerald" | "amber";
}) {
  const tones = {
    indigo: "from-indigo-500/15 to-purple-500/10 text-indigo-700 dark:text-indigo-300",
    emerald: "from-emerald-500/15 to-teal-500/10 text-emerald-700 dark:text-emerald-300",
    amber: "from-amber-500/15 to-orange-500/10 text-amber-700 dark:text-amber-300",
  } as const;

  return (
    <div className={`animate-scale-in rounded-[var(--radius-2xl)] border border-[var(--border)] bg-gradient-to-br ${tones[tone]} px-5 py-4 text-left shadow-[var(--shadow-xs)]`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-3 text-3xl font-bold text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function SummaryStatCard({
  label,
  value,
  tone,
  sublabel,
}: {
  label: string;
  value: string;
  tone: "indigo" | "orange" | "amber";
  sublabel?: string;
}) {
  const toneClasses = {
    indigo: "from-indigo-500/10 to-purple-500/10 text-indigo-700 dark:text-indigo-300",
    orange: "from-orange-500/10 to-amber-500/10 text-orange-700 dark:text-orange-300",
    amber: "from-amber-500/10 to-yellow-500/10 text-amber-700 dark:text-amber-300",
  } as const;

  return (
    <div className={`rounded-2xl bg-gradient-to-br ${toneClasses[tone]} p-5`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">{label}</p>
      <p className="mt-3 text-3xl font-bold text-[var(--text-primary)]">{value}</p>
      {sublabel ? (
        <p className="mt-2 text-xs text-[var(--text-muted)]">{sublabel}</p>
      ) : null}
    </div>
  );
}
