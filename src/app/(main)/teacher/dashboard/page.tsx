import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, GraduationCap, Layers3, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/supabase/server";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";
import { getTeacherDashboardSummary } from "@/lib/classrooms";

export default async function TeacherDashboardPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const access = await requireRole("teacher");

  if (access.redirectTo) {
    redirect(access.redirectTo);
  }

  const summary = await getTeacherDashboardSummary();

  if (!summary) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow-strong)] sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">
              {t("teacher.dashboardEyebrow")}
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-5xl">
              {t("teacher.dashboardTitle")}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              {t("teacher.dashboardSubtitle")}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/teacher/classes">
                <Button size="lg">
                  <GraduationCap className="h-4 w-4" />
                  {t("teacher.manageClasses")}
                </Button>
              </Link>
              <Link href="/teacher/challenges">
                <Button size="lg" variant="secondary">
                  <Trophy className="h-4 w-4" />
                  {t("teacher.manageChallenges")}
                </Button>
              </Link>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
            <p className="text-sm text-[var(--text-secondary)]">{t("teacher.topStudents")}</p>
            {summary.topStudents[0] ? (
              <>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  {summary.topStudents[0].username}
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {summary.topStudents[0].accuracy}% • {t("teacher.secondsLabel", { value: summary.topStudents[0].completionTime })}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-[var(--text-secondary)]">
                {t("teacher.noRankingBody")}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Layers3} label={t("teacher.totalClasses")} value={summary.groups.length} />
        <MetricCard icon={Users} label={t("teacher.totalStudents")} value={summary.totalStudents} />
        <MetricCard icon={BookOpen} label={t("teacher.totalAssignments")} value={summary.totalAssignments} />
        <MetricCard icon={Trophy} label={t("teacher.totalChallenges")} value={summary.totalChallenges} />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.9fr]">
        <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--surface-shadow)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                {t("teacher.classesOverview")}
              </h2>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                {t("teacher.classesOverviewBody")}
              </p>
            </div>
            <Link href="/teacher/classes">
              <Button variant="outline" size="sm">
                {t("teacher.openClasses")}
              </Button>
            </Link>
          </div>

          <div className="mt-6 grid gap-4">
            {summary.groups.length > 0 ? (
              summary.groups.map((group) => (
                <div
                  key={group.id}
                  className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--bg-surface)] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                        {group.name}
                      </h3>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        {t("teacher.classCodeLabel", { code: group.joinCode })}
                      </p>
                    </div>
                    <Link href={`/teacher/classes/${group.id}`}>
                      <Button variant="secondary" size="sm">
                        {t("teacher.openClass")}
                      </Button>
                    </Link>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <SmallStat label={t("teacher.students")} value={group.membersCount} />
                    <SmallStat label={t("teacher.assignments")} value={group.assignmentsCount} />
                    <SmallStat label={t("teacher.challenges")} value={group.challengesCount} />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title={t("teacher.noClassesTitle")} body={t("teacher.noClassesBody")} />
            )}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--surface-shadow)] sm:p-6">
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
            {t("teacher.topStudents")}
          </h2>
          <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
            {t("teacher.topStudentsBody")}
          </p>

          <div className="mt-6 space-y-3">
            {summary.topStudents.length > 0 ? (
              summary.topStudents.map((student, index) => (
                <div
                  key={student.userId}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                        {t("teacher.rankLabel", { rank: index + 1 })}
                      </p>
                      <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                        {student.username}
                      </p>
                    </div>
                    <div className="text-right text-sm text-[var(--text-secondary)]">
                      <p>{student.accuracy}%</p>
                      <p>{t("teacher.secondsLabel", { value: student.completionTime })}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title={t("teacher.noRankingTitle")} body={t("teacher.noRankingBody")} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Layers3;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--surface-shadow)]">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--bg-soft)] text-indigo-400">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm text-[var(--text-secondary)]">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] px-5 py-8">
      <p className="text-lg font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{body}</p>
    </div>
  );
}
