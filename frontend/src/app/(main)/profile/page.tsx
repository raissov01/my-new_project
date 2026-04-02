import Link from "next/link";
import { redirect } from "next/navigation";
import { Pencil, Sparkles, Trophy } from "lucide-react";
import {
  getCurrentProfile,
  getCurrentUser,
} from "@/server/auth";
import { getUserStats } from "@/app/(main)/sets/progress-actions";
import { getUserSetsOverview } from "@/server/services/sets-overview";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { ProfileAvatar } from "@/features/profile/components/profile-avatar";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/shared/utils";

interface ProfilePageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [{ status }, profile, stats, userSets] = await Promise.all([
    searchParams,
    getCurrentProfile(user),
    getUserStats(),
    getUserSetsOverview(),
  ]);

  const metadata =
    "user_metadata" in user && typeof user.user_metadata === "object"
      ? user.user_metadata
      : undefined;
  const fallbackUsername =
    typeof metadata?.username === "string" ? metadata.username : undefined;
  const joinDate =
    profile?.created_at ??
    ("created_at" in user && typeof user.created_at === "string"
      ? user.created_at
      : new Date().toISOString());
  const username = profile?.username ?? fallbackUsername ?? user.email?.split("@")[0] ?? "User";
  const rankLabel = `${t("profile.rankLevel", { level: stats.xpLevel })} • ${stats.levelName}`;
  const currentRole = profile?.role === "teacher" ? t("auth.roleTeacher") : t("auth.roleStudent");

  const metricCards = [
    { label: t("profile.totalCardsStudied"), value: stats.totalStudied },
    { label: t("profile.totalCorrectAnswers"), value: stats.totalCorrect },
    { label: t("profile.accuracy"), value: `${stats.accuracy}%` },
    { label: t("profile.createdSets"), value: userSets.length },
  ];

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      <div className="rounded-[1.6rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--surface-shadow-strong)] sm:rounded-[2rem] sm:p-8">
        <div className="flex flex-col gap-5 sm:gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <ProfileAvatar username={username} avatarUrl={profile?.avatar_url} size="lg" />
            <div className="space-y-3">
              <div>
                <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
                  {username}
                </h1>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)] sm:mt-3 sm:leading-7">
                  {t("profile.subtitle")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-[var(--text-secondary)]">
                  {user.email}
                </span>
                <span className="rounded-full border border-[rgba(99,91,255,0.18)] bg-indigo-500/10 px-3 py-1.5 text-indigo-400">
                  {t("profile.joined")} {formatDate(joinDate, locale)}
                </span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-[var(--text-secondary)]">
                  {t("settings.currentRole")}: {currentRole}
                </span>
                <span className="rounded-full border border-amber-500/15 bg-amber-500/10 px-3 py-1.5 text-amber-400">
                  {stats.points} XP
                </span>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                {profile?.bio || t("profile.noBio")}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
            <Link href="/profile/edit">
              <Button variant="primary" className="w-full sm:w-auto">
                <Pencil className="h-4 w-4" />
                {t("profile.editProfile")}
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="outline" className="w-full sm:w-auto">{t("nav.settings")}</Button>
            </Link>
          </div>
        </div>

        {status === "profile-updated" && (
          <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-300">
            {t("profile.profileUpdated")}
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:mt-8 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <div
            key={metric.label}
            className="rounded-[1.3rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--surface-shadow)] sm:rounded-[1.5rem] sm:p-5"
          >
            <p className="text-sm text-[var(--text-secondary)]">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:mt-3 sm:text-3xl">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:mt-8 sm:gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[1.45rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--surface-shadow)] sm:rounded-[1.75rem] sm:p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:text-xl">
              {t("profile.statsOverview")}
            </h2>
          </div>

          <div className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
              <p className="text-sm text-[var(--text-secondary)]">{t("profile.streak")}</p>
              <p className="mt-2 text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">
                {stats.streakDays}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
              <p className="text-sm text-[var(--text-secondary)]">{t("profile.rank")}</p>
              <p className="mt-2 text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">
                {rankLabel}
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {stats.levelMeaning}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
              <p className="text-sm text-[var(--text-secondary)]">{t("profile.weakCards")}</p>
              <p className="mt-2 text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">
                {stats.smart.weakCards}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
              <p className="text-sm text-[var(--text-secondary)]">{t("profile.dueToday")}</p>
              <p className="mt-2 text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">
                {stats.smart.dueToday}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="rounded-[1.45rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--surface-shadow)] sm:rounded-[1.75rem] sm:p-6">
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:text-xl">
              {t("profile.recentActivity")}
            </h2>
            <div className="mt-4 space-y-3 sm:mt-5">
              {stats.recentActivity.map((activity) => (
                <div
                  key={activity.date}
                  className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3"
                >
                  <span className="text-sm text-[var(--text-secondary)]">
                    {formatDate(activity.date, locale)}
                  </span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {activity.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.45rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--surface-shadow)] sm:rounded-[1.75rem] sm:p-6">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:text-xl">
              {t("profile.achievements")}
            </h2>
          </div>

          <div className="mt-5 space-y-3 sm:mt-6">
            {stats.achievements.length > 0 ? (
              stats.achievements.slice(0, 4).map((achievement) => (
                <div
                  key={achievement.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4"
                >
                  <p className="font-medium text-[var(--text-primary)]">
                    {achievement.label}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {achievement.description}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-2xl bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-secondary)]">
                {t("profile.noAchievements")}
              </p>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
