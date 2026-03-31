import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Flame,
  GraduationCap,
  Star,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { getUserStats } from "@/app/(main)/sets/progress-actions";
import { getStudentDashboardSummary } from "@/lib/classrooms";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";
import { requireRole } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function StudentDashboardPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const access = await requireRole("student");

  if (access.redirectTo) {
    redirect(access.redirectTo);
  }

  const [summary, stats] = await Promise.all([getStudentDashboardSummary(), getUserStats()]);

  if (!summary) {
    redirect("/login");
  }

  const firstName = access.profile?.username ?? t("student.dashboardTitle");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      {/* ── Hero welcome ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-sm sm:p-8">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-indigo-500/10 to-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-cyan-500/8 blur-3xl" />

        <div className="relative">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
            {t("student.dashboardEyebrow")}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            {t("dashboard.hello", { name: firstName })}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
            {t("student.dashboardSubtitle")}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/student/classes">
              <Button size="lg" className="w-full sm:w-auto">
                <Users className="h-4 w-4" />
                {t("student.openClasses")}
              </Button>
            </Link>
            <Link href="/student/challenges">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                <Trophy className="h-4 w-4" />
                {t("student.openChallenges")}
              </Button>
            </Link>
            <Link href="/sets">
              <Button size="lg" variant="ghost" className="w-full sm:w-auto">
                <BookOpen className="h-4 w-4" />
                {t("nav.mySets")}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats strip ───────────────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MetricCard
          icon={Users}
          label={t("student.classCount")}
          value={summary.classes.length}
          color="indigo"
        />
        <MetricCard
          icon={BookOpen}
          label={t("student.assignedSets")}
          value={summary.assignments.length}
          color="blue"
        />
        <MetricCard
          icon={Trophy}
          label={t("student.classChallenges")}
          value={summary.challenges.length}
          color="amber"
        />
        <MetricCard
          icon={Target}
          label={t("student.personalAccuracy")}
          value={`${stats.accuracy}%`}
          color="emerald"
        />
      </div>

      {/* ── Streak + XP row ───────────────────────────────────────────────── */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Streak */}
        <div className="relative overflow-hidden rounded-2xl border border-orange-200/50 bg-gradient-to-br from-orange-500/10 to-amber-500/5 p-5 dark:border-orange-500/10">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-orange-400/10 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="animate-pulse-glow rounded-2xl bg-orange-500/15 p-3 text-orange-500">
              <Flame className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">{t("stats.dailyStreak")}</p>
              <p className="text-3xl font-bold text-[var(--text-primary)]">{stats.streakDays}</p>
              <p className="text-xs text-[var(--text-muted)]">
                {stats.streakDays === 1 ? t("stats.dayInRow") : t("stats.daysInRow")}
              </p>
            </div>
          </div>
        </div>

        {/* XP / Level */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-200/50 bg-gradient-to-br from-amber-500/10 to-yellow-500/5 p-5 dark:border-amber-500/10">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-amber-400/10 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="rounded-2xl bg-amber-500/15 p-3 text-amber-500">
              <Star className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">{t("stats.totalXp")}</p>
              <p className="text-3xl font-bold text-[var(--text-primary)]">{stats.points.toLocaleString()}</p>
              <p className="text-xs text-[var(--text-muted)]">
                {t("stats.level")} {stats.xpLevel} • {stats.levelName}
              </p>
            </div>
          </div>
          <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="progress-shimmer h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-700"
              style={{ width: `${stats.xpProgress}%` }}
            />
          </div>
        </div>

        {/* Quick study CTA */}
        {summary.assignments.length > 0 && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600 p-5 text-white shadow-lg shadow-blue-500/15">
            <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                <h3 className="text-base font-semibold">{t("dashboard.startStudying")}</h3>
              </div>
              <p className="mt-2 text-sm text-blue-100">
                {summary.assignments[0].setTitle}
              </p>
              <Link
                href={`/sets/${summary.assignments[0].setId}/study`}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-white/30"
              >
                {t("nav.startStudy")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        {/* Assigned work */}
        <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">
                {t("student.assignedWork")}
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {t("student.assignedWorkBody")}
              </p>
            </div>
            <Link href="/student/classes">
              <Button variant="outline" size="sm">{t("student.openClasses")}</Button>
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {summary.assignments.length > 0 ? (
              summary.assignments.slice(0, 5).map((assignment) => (
                <div
                  key={assignment.id}
                  className="group rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 transition-all hover:border-indigo-500/20 hover:shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-[var(--text-primary)]">
                        {assignment.setTitle}
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {assignment.groupName}
                      </p>
                    </div>
                    <Link href={`/sets/${assignment.setId}`}>
                      <Button variant="outline" size="sm">{t("student.openSet")}</Button>
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <EmptyCard
                icon={BookOpen}
                title={t("student.noAssignmentsTitle")}
                body={t("student.noAssignmentsBody")}
              />
            )}
          </div>
        </section>

        {/* Progress overview */}
        <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">
            {t("student.progressTitle")}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {t("student.progressBody")}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ProgressCard icon={BookOpen} label={t("student.cardsStudied")} value={stats.totalStudied} color="indigo" />
            <ProgressCard icon={CheckCircle2} label={t("student.totalCorrect")} value={stats.totalCorrect} color="emerald" />
            <ProgressCard icon={Flame} label={t("student.currentStreak")} value={stats.streakDays} color="orange" />
            <ProgressCard icon={Star} label={t("student.totalPoints")} value={stats.points} color="amber" />
          </div>

          <div className="mt-5">
            <Link href="/student/challenges">
              <Button variant="outline" size="sm">
                <GraduationCap className="h-4 w-4" />
                {t("student.openChallenges")}
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────────────────────── */

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-500/10 text-indigo-600 shadow-indigo-500/10",
    blue: "bg-blue-500/10 text-blue-600 shadow-blue-500/10",
    amber: "bg-amber-500/10 text-amber-600 shadow-amber-500/10",
    emerald: "bg-emerald-500/10 text-emerald-600 shadow-emerald-500/10",
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-2.5 shadow-md ${colorMap[color] ?? colorMap.indigo}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-[var(--text-muted)] sm:text-sm">{label}</p>
          <p className="mt-0.5 text-xl font-bold text-[var(--text-primary)] sm:text-2xl">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ProgressCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof BookOpen;
  label: string;
  value: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    indigo: "text-indigo-500",
    emerald: "text-emerald-500",
    orange: "text-orange-500",
    amber: "text-amber-500",
  };

  return (
    <div className="rounded-2xl bg-[var(--bg-surface)] p-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${colorMap[color] ?? "text-indigo-500"}`} />
        <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{value.toLocaleString()}</p>
    </div>
  );
}

function EmptyCard({ icon: Icon, title, body }: { icon: typeof BookOpen; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] px-5 py-10 text-center">
      <Icon className="mx-auto h-10 w-10 text-[var(--text-muted)] opacity-40" />
      <p className="mt-4 text-base font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{body}</p>
    </div>
  );
}
