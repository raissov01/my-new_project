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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUserStats } from "@/app/(main)/sets/progress-actions";
import { getStudentDashboardSummary } from "@/lib/classrooms";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";
import { requireRole } from "@/lib/supabase/server";

export default async function StudentDashboardPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const access = await requireRole("student");

  if (access.redirectTo) {
    redirect(access.redirectTo);
  }

  const [summary, stats] = await Promise.all([
    getStudentDashboardSummary(access.user?.id),
    getUserStats(),
  ]);

  if (!summary) {
    redirect("/login");
  }

  const firstName = access.profile?.username ?? t("student.dashboardTitle");

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      <section className="rounded-[1.6rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--surface-shadow-strong)] sm:rounded-[2rem] sm:p-8">
        <div className="grid gap-5 sm:gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">
              {t("student.dashboardEyebrow")}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:mt-4 sm:text-5xl">
              {t("dashboard.hello", { name: firstName })}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:mt-4 sm:text-base sm:leading-7">
              {t("student.dashboardSubtitle")}
            </p>

            <div className="mt-5 flex flex-col gap-2.5 sm:mt-7 sm:flex-row sm:flex-wrap sm:gap-3">
              <Link href="/student/classes">
                <Button size="lg" className="w-full sm:w-auto">
                  <Users className="h-4 w-4" />
                  {t("student.openClasses")}
                </Button>
              </Link>
              <Link href="/student/challenges">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  <Trophy className="h-4 w-4" />
                  {t("student.openChallenges")}
                </Button>
              </Link>
              <Link href="/sets">
                <Button size="lg" variant="ghost" className="w-full sm:w-auto">
                  <BookOpen className="h-4 w-4" />
                  {t("nav.flashcardLibrary")}
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <QuickInfo
              title={t("student.personalAccuracy")}
              value={`${stats.accuracy}%`}
              detail={t("student.progressBody")}
            />
            <QuickInfo
              title={t("stats.dailyStreak")}
              value={`${stats.streakDays}`}
              detail={stats.streakDays === 1 ? t("stats.dayInRow") : t("stats.daysInRow")}
            />
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 sm:mt-6 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} label={t("student.classCount")} value={summary.classes.length} />
        <MetricCard icon={BookOpen} label={t("student.assignedSets")} value={summary.assignments.length} />
        <MetricCard icon={Trophy} label={t("student.classChallenges")} value={summary.challenges.length} />
        <MetricCard icon={Target} label={t("student.personalAccuracy")} value={`${stats.accuracy}%`} />
      </section>

      <div className="mt-5 grid gap-4 sm:mt-6 sm:gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[1.45rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--surface-shadow)] sm:rounded-[1.75rem] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:text-2xl">
                {t("student.assignedWork")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)] sm:leading-7">
                {t("student.assignedWorkBody")}
              </p>
            </div>
            <Link href="/student/classes">
              <Button variant="outline" size="sm">
                {t("student.openClasses")}
              </Button>
            </Link>
          </div>

          <div className="mt-5 space-y-3 sm:mt-6">
            {summary.assignments.length > 0 ? (
              summary.assignments.slice(0, 5).map((assignment) => (
                <div
                  key={assignment.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 transition-colors hover:border-[var(--border-strong)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-[var(--text-primary)]">
                        {assignment.setTitle}
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {assignment.groupName}
                      </p>
                    </div>
                    <Link href={`/sets/${assignment.setId}`}>
                      <Button variant="secondary" size="sm">
                        {t("student.openSet")}
                      </Button>
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

        <section className="space-y-4 sm:space-y-6">
          <section className="rounded-[1.45rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--surface-shadow)] sm:rounded-[1.75rem] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:text-2xl">
                  {t("student.progressTitle")}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)] sm:leading-7">
                  {t("student.progressBody")}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2">
              <ProgressCard icon={BookOpen} label={t("student.cardsStudied")} value={stats.totalStudied} />
              <ProgressCard icon={CheckCircle2} label={t("student.totalCorrect")} value={stats.totalCorrect} />
              <ProgressCard icon={Flame} label={t("student.currentStreak")} value={stats.streakDays} />
              <ProgressCard icon={Star} label={t("student.totalPoints")} value={stats.points} />
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--bg-soft)] sm:mt-6">
              <div
                className="h-full rounded-full bg-[linear-gradient(135deg,var(--primary-from),var(--primary-to))]"
                style={{ width: `${stats.xpProgress}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              {t("stats.level")} {stats.xpLevel} • {stats.levelName}
            </p>
          </section>

          <section className="rounded-[1.45rem] border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-[var(--surface-shadow)] sm:rounded-[1.75rem] sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-elevated)] text-indigo-400">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                  {t("dashboard.startStudying")}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  {summary.assignments.length > 0
                    ? summary.assignments[0].setTitle
                    : t("student.noAssignmentsBody")}
                </p>
              </div>
            </div>

            {summary.assignments.length > 0 ? (
              <Link href={`/sets/${summary.assignments[0].setId}/study`} className="mt-5 inline-flex">
                <Button variant="secondary">
                  {t("nav.startStudy")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : null}
          </section>
        </section>
      </div>
    </div>
  );
}

function QuickInfo({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:rounded-[1.4rem] sm:p-5">
      <p className="text-sm text-[var(--text-secondary)]">{title}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:text-3xl">
        {value}
      </p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{detail}</p>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--surface-shadow)] sm:rounded-[1.4rem] sm:p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--bg-soft)] text-indigo-400 sm:h-11 sm:w-11">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm text-[var(--text-secondary)]">{label}</p>
          <p className="mt-1 text-xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:text-2xl">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function ProgressCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
      <div className="flex items-center gap-2 text-[var(--text-secondary)]">
        <Icon className="h-4 w-4 text-indigo-400" />
        <p className="text-sm">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function EmptyCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof BookOpen;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] px-5 py-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-elevated)] text-[var(--text-muted)]">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{body}</p>
    </div>
  );
}
