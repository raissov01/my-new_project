import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Flame,
  GraduationCap,
  Sparkles,
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
  const nextAssignment = summary.assignments[0] ?? null;

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      <section className="overflow-hidden rounded-[1.9rem] border border-white/8 bg-[linear-gradient(135deg,rgba(99,91,255,0.18),rgba(15,23,42,0.95)_40%,rgba(45,212,191,0.1))] p-4 shadow-[var(--surface-shadow-strong)] sm:rounded-[2.2rem] sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3.5 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
              {t("student.dashboardEyebrow")}
            </div>
            <h1 className="mt-4 max-w-[12ch] text-3xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] sm:text-5xl">
              {t("dashboard.hello", { name: firstName })}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
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
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  <Trophy className="h-4 w-4" />
                  {t("student.openChallenges")}
                </Button>
              </Link>
              <Link href="/sets">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  <BookOpen className="h-4 w-4" />
                  {t("nav.flashcardLibrary")}
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <HeroSignal
              label={t("student.personalAccuracy")}
              value={`${stats.accuracy}%`}
              detail={t("student.progressBody")}
            />
            <HeroSignal
              label={t("stats.dailyStreak")}
              value={`${stats.streakDays}`}
              detail={stats.streakDays === 1 ? t("stats.dayInRow") : t("stats.daysInRow")}
            />
            <HeroSignal
              label={t("student.assignedSets")}
              value={`${summary.assignments.length}`}
              detail="Assigned work waiting in your ecosystem."
            />
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} label={t("student.classCount")} value={summary.classes.length} />
        <MetricCard icon={BookOpen} label={t("student.assignedSets")} value={summary.assignments.length} />
        <MetricCard icon={Trophy} label={t("student.classChallenges")} value={summary.challenges.length} />
        <MetricCard icon={Target} label={t("student.personalAccuracy")} value={`${stats.accuracy}%`} />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="rounded-[1.8rem] border border-white/8 bg-[rgba(255,255,255,0.04)] p-4 shadow-[var(--surface-shadow)] backdrop-blur-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-xl">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Assigned workspace
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                {t("student.assignedWork")}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                {t("student.assignedWorkBody")}
              </p>
            </div>
            <Link href="/student/classes">
              <Button variant="outline" size="sm">
                {t("student.openClasses")}
              </Button>
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {summary.assignments.length > 0 ? (
              summary.assignments.slice(0, 5).map((assignment) => (
                <div
                  key={assignment.id}
                  className="rounded-[1.5rem] border border-white/8 bg-[rgba(255,255,255,0.04)] p-4 transition-all hover:border-white/12 hover:bg-[rgba(255,255,255,0.06)]"
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

        <section className="space-y-6">
          <section className="rounded-[1.8rem] border border-white/8 bg-[rgba(255,255,255,0.04)] p-4 shadow-[var(--surface-shadow)] backdrop-blur-sm sm:p-6">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Personal performance
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
              {t("student.progressTitle")}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              {t("student.progressBody")}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <ProgressCard icon={BookOpen} label={t("student.cardsStudied")} value={stats.totalStudied} />
              <ProgressCard icon={CheckCircle2} label={t("student.totalCorrect")} value={stats.totalCorrect} />
              <ProgressCard icon={Flame} label={t("student.currentStreak")} value={stats.streakDays} />
              <ProgressCard icon={Star} label={t("student.totalPoints")} value={stats.points} />
            </div>

            <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
              <div
                className="h-full rounded-full bg-[linear-gradient(135deg,var(--primary-from),var(--primary-to))]"
                style={{ width: `${stats.xpProgress}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              {t("stats.level")} {stats.xpLevel} • {stats.levelName}
            </p>
          </section>

          <section className="rounded-[1.8rem] border border-white/8 bg-[linear-gradient(135deg,rgba(79,124,255,0.12),rgba(15,23,42,0.82))] p-4 shadow-[var(--surface-shadow)] sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-indigo-300">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Next action
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  {t("dashboard.startStudying")}
                </h3>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  {nextAssignment ? nextAssignment.setTitle : t("student.noAssignmentsBody")}
                </p>
              </div>
            </div>

            {nextAssignment ? (
              <Link href={`/sets/${nextAssignment.setId}/study`} className="mt-6 inline-flex">
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

function HeroSignal({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[1.45rem] border border-white/8 bg-[rgba(255,255,255,0.05)] p-4 shadow-[var(--surface-shadow)]">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-3xl">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{detail}</p>
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
    <div className="rounded-[1.45rem] border border-white/8 bg-[rgba(255,255,255,0.04)] p-4 shadow-[var(--surface-shadow)]">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/8 text-indigo-300">
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
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[1.35rem] border border-white/8 bg-[rgba(255,255,255,0.04)] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/8 text-indigo-300">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm text-[var(--text-secondary)]">{label}</p>
          <p className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Users;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-[rgba(255,255,255,0.03)] px-5 py-8">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/6 text-indigo-300">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-4 text-base font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{body}</p>
    </div>
  );
}
