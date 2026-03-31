import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Flag,
  Sparkles,
  TimerReset,
  Zap,
} from "lucide-react";
import { type Locale, createTranslator } from "@/lib/i18n/shared";
import { formatDate } from "@/lib/utils";
import type { PersonalizedRecommendations as PersonalizedRecommendationsData } from "@/app/(main)/sets/progress-actions";
import { StudyRoutePrefetch } from "./study-route-prefetch";

interface PersonalizedRecommendationsProps {
  data: PersonalizedRecommendationsData;
  locale: Locale;
}

export function PersonalizedRecommendations({
  data,
  locale,
}: PersonalizedRecommendationsProps) {
  const t = createTranslator(locale);

  return (
    <div className="space-y-6">
      <section className="ui-panel ui-section">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">
              {t("recommend.studyToday")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              {data.todayFocus
                ? t("recommend.todayTitle", { title: data.todayFocus.title })
                : t("recommend.noRecommendations")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              {data.todayFocus
                ? getFocusReason(data.todayFocus, t)
                : t("recommend.basedOnMistakes")}
            </p>
          </div>
          <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-600 dark:text-indigo-300">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>

        {data.todayFocus && (
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="ui-subtle p-5">
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <StatusChip tone="indigo">
                  {data.todayFocus.reviewCount} {t("recommend.reviewCards")}
                </StatusChip>
                <StatusChip tone="amber">
                  {data.todayFocus.weakCount} {t("recommend.weakTopics")}
                </StatusChip>
                <StatusChip tone="emerald">
                  {data.todayFocus.newCount} {t("recommend.newCards")}
                </StatusChip>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--text-secondary)]">
                <span className="inline-flex items-center gap-1.5">
                  <TimerReset className="h-4 w-4 text-indigo-500" />
                  {t("recommend.estimatedTime", {
                    minutes: data.todayFocus.estimatedMinutes,
                  })}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Brain className="h-4 w-4 text-amber-500" />
                  {t("recommend.accuracy")} {data.todayFocus.accuracy}%
                </span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={`/sets/${data.todayFocus.setId}/study?mode=${data.todayFocus.suggestedMode}`}
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                >
                  <Zap className="mr-1.5 h-4 w-4" />
                  {t("recommend.startToday")}
                </Link>
                <Link
                  href={`/sets/${data.todayFocus.setId}`}
                  className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-surface)]"
                >
                  <BookOpen className="mr-1.5 h-4 w-4" />
                  {t("recommend.openSet")}
                </Link>
              </div>
            </div>

            <div className="grid gap-3">
              <SummaryCard
                icon={Zap}
                label={t("recommend.reviewToday")}
                value={String(data.reviewCards)}
              />
              <SummaryCard
                icon={Flag}
                label={t("recommend.weakAreasCount")}
                value={String(data.weakAreasCount)}
              />
              <SummaryCard
                icon={Sparkles}
                label={t("recommend.freshCards")}
                value={String(data.newOpportunities)}
              />
            </div>
          </div>
        )}
      </section>

      <section className="glass-card ui-section">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <Sparkles className="h-4 w-4 text-amber-500" />
          {t("recommend.recommendedForYou")}
        </div>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {t("recommend.basedOnMistakes")}
        </p>

        {data.recommendedSets.length > 0 ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {data.recommendedSets.map((set) => (
              <article key={set.setId} className="ui-panel ui-interactive p-5">
                <StudyRoutePrefetch setId={set.setId} />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">
                      {set.title}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {formatDate(set.createdAt, locale)}
                    </p>
                  </div>
                  <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                    {set.cardCount} {set.cardCount === 1 ? t("set.card") : t("set.cards")}
                  </span>
                </div>
                {set.description && (
                  <p className="mt-3 line-clamp-2 text-sm text-[var(--text-secondary)]">
                    {set.description}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  {set.reviewCount > 0 && (
                    <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-indigo-700 dark:text-indigo-300">
                      {set.reviewCount} {t("recommend.reviewCards")}
                    </span>
                  )}
                  {set.weakCount > 0 && (
                    <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300">
                      {set.weakCount} {t("recommend.weakTopics")}
                    </span>
                  )}
                  {set.newCount > 0 && (
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300">
                      {set.newCount} {t("recommend.newCards")}
                    </span>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>{t("recommend.accuracy")} {set.accuracy}%</span>
                  <span>{t("stats.cardsStudied")} {set.studiedCards}</span>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={`/sets/${set.setId}/study?mode=${set.reviewCount > 0 ? "review" : "smart"}`}
                    className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                  >
                    <Zap className="mr-1.5 h-4 w-4" />
                    {set.suggestedMode === "review"
                      ? t("recommend.reviewNow")
                      : t("set.smartStudy")}
                  </Link>
                  <Link
                    href={`/sets/${set.setId}`}
                    className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-elevated)]"
                  >
                    <BookOpen className="mr-1.5 h-4 w-4" />
                    {t("recommend.openSet")}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyRecommendationState message={t("recommend.noRecommendations")} />
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="glass-card ui-section">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Zap className="h-4 w-4 text-indigo-500" />
            {t("recommend.continueLearning")}
          </div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {t("recommend.pickUpWhereYouLeftOff")}
          </p>

          {data.continueLearning.length > 0 ? (
            <div className="mt-5 space-y-3">
              {data.continueLearning.map((set) => (
                <Link
                  key={set.setId}
                  href={`/sets/${set.setId}/study?mode=${set.reviewCount > 0 ? "review" : "smart"}`}
                  className="ui-panel ui-interactive flex items-center justify-between gap-4 px-4 py-4"
                >
                  <StudyRoutePrefetch setId={set.setId} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {set.title}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
                      <span>{set.reviewCount} {t("recommend.reviewCards")}</span>
                      <span>{set.weakCount} {t("recommend.weakTopics")}</span>
                      <span>{set.newCount} {t("recommend.newCards")}</span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyRecommendationState message={t("recommend.noContinueLearning")} />
          )}
        </section>

        <section className="glass-card ui-section">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Brain className="h-4 w-4 text-amber-500" />
            {t("recommend.weakTopics")}
          </div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {t("recommend.focusAreas")}
          </p>

          {data.weakTopics.length > 0 ? (
            <div className="mt-5 space-y-3">
              {data.weakTopics.map((topic) => (
                <div
                  key={topic.setId}
                  className="ui-panel px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {topic.title}
                    </p>
                    <span className="text-xs text-[var(--text-muted)]">
                      {t("recommend.accuracy")} {topic.accuracy}%
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300">
                      <Flag className="mr-1 inline h-3 w-3" />
                      {topic.weakCount} {t("recommend.weakTopics")}
                    </span>
                    <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-indigo-700 dark:text-indigo-300">
                      {topic.reviewCount} {t("recommend.reviewCards")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyRecommendationState message={t("recommend.noWeakTopics")} />
          )}
        </section>
      </div>
    </div>
  );
}

function getFocusReason(
  set: PersonalizedRecommendationsData["recommendedSets"][number],
  t: (key: string, vars?: Record<string, string | number>) => string
) {
  if (set.dueCount > 0 && set.weakCount > 0) {
    return t("recommend.todayReasonMixed", {
      due: set.dueCount,
      weak: set.weakCount,
    });
  }

  if (set.dueCount > 0) {
    return t("recommend.todayReasonDue", { count: set.dueCount });
  }

  if (set.weakCount > 0) {
    return t("recommend.todayReasonWeak", { count: set.weakCount });
  }

  return t("recommend.todayReasonNew", { count: set.newCount });
}

function StatusChip({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "indigo" | "amber" | "emerald";
}) {
  const toneClass =
    tone === "indigo"
      ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
      : tone === "amber"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";

  return (
    <span className={`rounded-full px-2.5 py-1 ${toneClass}`}>{children}</span>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <Icon className="h-4 w-4 text-indigo-500" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function EmptyRecommendationState({ message }: { message: string }) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
      {message}
    </div>
  );
}
