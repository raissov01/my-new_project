import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Target,
  TrendingUp,
  Zap,
  Award,
  Flame,
  Star,
} from "lucide-react";
import { type Locale, createTranslator } from "@/lib/i18n/shared";
import type { UserStats } from "@/app/(main)/sets/progress-actions";

interface DashboardStatsProps {
  stats: UserStats;
  locale: Locale;
}

export function DashboardStats({ stats, locale }: DashboardStatsProps) {
  const t = createTranslator(locale);
  const maxActivity = Math.max(...stats.recentActivity.map((d) => d.count), 1);
  const milestoneReached = [3, 7, 30].includes(stats.streakDays);
  const weeklyMessage =
    stats.weeklyStudyDelta > 0
      ? t("stats.weeklyImproved", { count: stats.weeklyStudyDelta })
      : stats.weeklyStudyDelta < 0
        ? t("stats.weeklySoft", { count: Math.abs(stats.weeklyStudyDelta) })
        : t("stats.weeklySteady");
  const streakTone =
    stats.streakDays >= 7
      ? "from-orange-500/20 to-rose-500/20"
      : stats.streakDays >= 3
        ? "from-amber-500/20 to-orange-500/20"
        : "from-slate-500/10 to-slate-400/5";

  return (
    <div className="space-y-4 stagger-children sm:space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className={`glass-card relative overflow-hidden rounded-2xl bg-gradient-to-br ${streakTone} p-4 sm:p-6`}>
          <div className="absolute right-4 top-4 h-16 w-16 rounded-full bg-orange-400/10 blur-2xl" />
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--text-muted)]">
                {t("stats.dailyStreak")}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <div className="animate-pulse-glow rounded-2xl bg-orange-500/10 p-3 text-orange-500">
                  <Flame className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-[var(--text-primary)]">
                    {stats.streakDays}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {stats.streakDays === 1 ? t("stats.dayInRow") : t("stats.daysInRow")}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                {Array.from({ length: 7 }).map((_, index) => {
                  const active = index < Math.min(stats.streakDays, 7);
                  return (
                    <span
                      key={index}
                      className={`h-2.5 flex-1 rounded-full transition-all duration-500 ${
                        active
                          ? "bg-gradient-to-r from-orange-500 to-amber-400"
                          : "bg-[var(--border)]"
                      }`}
                    />
                  );
                })}
              </div>
              {milestoneReached && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-600">
                  <Award className="h-3.5 w-3.5" />
                  {t(`stats.streakMilestone${stats.streakDays}`)}
                </div>
              )}
            </div>
            <div className="space-y-2 text-right">
              <div className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-600">
                {t("stats.keepAlive")}
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {t("stats.streakMilestone", {
                  count: Math.max(7 - Math.min(stats.streakDays, 7), 0),
                })}
              </p>
            </div>
          </div>
          {!stats.studiedToday && (
            <div
              className={`mt-5 rounded-2xl px-4 py-3 text-sm ${
                stats.streakAtRisk
                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                  : "bg-[var(--bg-surface)] text-[var(--text-secondary)]"
              }`}
            >
              {stats.streakAtRisk
                ? t("stats.streakWarning")
                : t("stats.dailyReminder")}
            </div>
          )}
        </div>

        <div className="glass-card rounded-2xl p-4 sm:p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Star className="h-4 w-4 text-amber-500" />
            {t("stats.xpProgress")}
          </div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
            <Award className="h-3.5 w-3.5" />
            {stats.levelName}
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-[var(--text-primary)]">
                {stats.points}
              </p>
              <p className="text-sm text-[var(--text-muted)]">{t("stats.totalXp")}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {t("stats.level")} {stats.xpLevel}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {stats.xpCurrentLevelPoints}/{stats.xpRequiredPoints} {t("stats.toNext")}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            {stats.levelMeaning}
          </p>
          <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>{t("stats.level")} {stats.xpLevel}</span>
            <span>{stats.xpProgress}%</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="progress-shimmer h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-700"
              style={{ width: `${stats.xpProgress}%` }}
            />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-[var(--bg-surface)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                {t("stats.levelReward")}
              </p>
              <p className="mt-1 text-sm text-[var(--text-primary)]">
                {stats.levelReward}
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--bg-surface)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                {t("stats.nextUnlock")}
              </p>
              <p className="mt-1 text-sm text-[var(--text-primary)]">
                {stats.nextLevelReward}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Continue learning banner */}
      {(stats.smart.dueToday > 0 || stats.smart.weakCards > 0) && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white shadow-lg shadow-indigo-500/20 sm:p-6">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white/5" />
          <h3 className="relative flex items-center gap-2 text-lg font-bold">
            <Zap className="h-5 w-5" />
            {t("stats.continueLearning")}
          </h3>
          <div className="relative mt-4 flex flex-wrap gap-6">
            {stats.smart.dueToday > 0 && (
              <div>
                <p className="text-3xl font-bold">{stats.smart.dueToday}</p>
                <p className="text-sm text-indigo-200">{t("stats.cardsDueToday")}</p>
              </div>
            )}
            {stats.smart.weakCards > 0 && (
              <div>
                <p className="text-3xl font-bold">{stats.smart.weakCards}</p>
                <p className="text-sm text-indigo-200">{t("stats.needReview")}</p>
              </div>
            )}
            {stats.smart.mastered > 0 && (
              <div>
                <p className="text-3xl font-bold">{stats.smart.mastered}</p>
                <p className="text-sm text-indigo-200">{t("stats.mastered")}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label={t("stats.cardsStudied")}
          value={stats.totalStudied.toLocaleString()}
          gradient="from-indigo-500 to-purple-500"
          shadow="shadow-indigo-500/15"
        />
        <StatCard
          icon={Target}
          label={t("stats.accuracy")}
          value={`${stats.accuracy}%`}
          gradient="from-emerald-500 to-teal-500"
          shadow="shadow-emerald-500/15"
        />
        <StatCard
          icon={CheckCircle2}
          label={t("stats.correct")}
          value={stats.totalCorrect.toLocaleString()}
          gradient="from-green-500 to-emerald-500"
          shadow="shadow-green-500/15"
        />
        <StatCard
          icon={XCircle}
          label={t("stats.incorrect")}
          value={stats.totalIncorrect.toLocaleString()}
          gradient="from-red-500 to-rose-500"
          shadow="shadow-red-500/15"
        />
      </div>

      {stats.achievements.length > 0 && (
        <div className="glass-card rounded-2xl p-4 sm:p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Award className="h-4 w-4 text-amber-500" />
            {t("stats.achievements")}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {stats.achievements.map((achievement) => (
              <span
                key={achievement.id}
                className="rounded-full bg-gradient-to-r from-amber-400/15 to-orange-400/15 px-3 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-300"
                title={achievement.description}
              >
                {achievement.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Activity chart */}
      <div className="glass-card rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <TrendingUp className="h-4 w-4 text-[var(--text-muted)]" />
          {t("stats.last7Days")}
        </div>
        <div className="mt-5 flex items-end gap-2" style={{ height: "80px" }}>
          {stats.recentActivity.map((day) => {
            const pct = day.count > 0 ? (day.count / maxActivity) * 100 : 0;
            const weekday = new Date(day.date + "T00:00:00").toLocaleDateString(locale === "kk" ? "kk-KZ" : locale === "ru" ? "ru-RU" : "en-US", { weekday: "short" });
            return (
              <div key={day.date} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[10px] font-bold text-[var(--text-muted)]">
                  {day.count > 0 ? day.count : ""}
                </span>
                <div
                  className={`w-full rounded-lg transition-all duration-700 ${
                    day.count > 0
                      ? "progress-shimmer bg-gradient-to-t from-indigo-600 to-purple-500"
                      : "bg-[var(--border)]"
                  }`}
                  style={{ height: `${Math.max(pct, day.count > 0 ? 12 : 4)}%` }}
                />
                <span className="text-[10px] text-[var(--text-muted)]">{weekday}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[var(--bg-surface)] px-4 py-3 text-sm">
          <span className="text-[var(--text-secondary)]">{weeklyMessage}</span>
          <span className="font-medium text-[var(--text-primary)]">
            {stats.currentWeekStudied} / {stats.previousWeekStudied} {t("stats.cardsStudied").toLowerCase()}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  gradient,
  shadow,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
  gradient: string;
  shadow: string;
}) {
  return (
    <div className="glass-card hover-lift rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <div className={`rounded-xl bg-gradient-to-br ${gradient} p-2.5 shadow-md ${shadow}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm text-[var(--text-muted)]">{label}</p>
          <p className="text-xl font-bold text-[var(--text-primary)]">{value}</p>
        </div>
      </div>
    </div>
  );
}
