import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, GraduationCap, Layers3, Sparkles, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/server/auth";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getTeacherDashboardSummary } from "@/server/services/classrooms";

export default async function TeacherDashboardPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const access = await requireRole("teacher");

  if (access.redirectTo) {
    redirect(access.redirectTo);
  }

  const summary = await getTeacherDashboardSummary(access.user?.id);

  if (!summary) {
    redirect("/login");
  }

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      <section className="overflow-hidden rounded-[1.9rem] border border-white/8 bg-[linear-gradient(135deg,rgba(45,212,191,0.12),rgba(15,23,42,0.95)_38%,rgba(99,91,255,0.14))] p-4 shadow-[var(--surface-shadow-strong)] sm:rounded-[2.2rem] sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3.5 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
              {t("teacher.dashboardEyebrow")}
            </div>
            <h1 className="mt-4 max-w-[12ch] text-3xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] sm:text-5xl">
              {t("teacher.dashboardTitle")}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              {t("teacher.dashboardSubtitle")}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/teacher/classes">
                <Button size="lg" className="w-full sm:w-auto">
                  <GraduationCap className="h-4 w-4" />
                  {t("teacher.manageClasses")}
                </Button>
              </Link>
              <Link href="/teacher/challenges">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  <Trophy className="h-4 w-4" />
                  {t("teacher.manageChallenges")}
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <TeacherSignal
              label={t("teacher.totalStudents")}
              value={`${summary.totalStudents}`}
              detail="Students connected across your classroom ecosystem."
            />
            <TeacherSignal
              label={t("teacher.totalChallenges")}
              value={`${summary.totalChallenges}`}
              detail="Challenge flows managed from one control surface."
            />
            <TeacherSignal
              label={t("teacher.topStudents")}
              value={summary.topStudents[0]?.username ?? "—"}
              detail={
                summary.topStudents[0]
                  ? `${summary.topStudents[0].accuracy}% • ${t("teacher.secondsLabel", {
                      value: summary.topStudents[0].completionTime,
                    })}`
                  : t("teacher.noRankingBody")
              }
            />
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Layers3} label={t("teacher.totalClasses")} value={summary.groups.length} />
        <MetricCard icon={Users} label={t("teacher.totalStudents")} value={summary.totalStudents} />
        <MetricCard icon={BookOpen} label={t("teacher.totalAssignments")} value={summary.totalAssignments} />
        <MetricCard icon={Trophy} label={t("teacher.totalChallenges")} value={summary.totalChallenges} />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.16fr_0.84fr]">
        <section className="rounded-[1.8rem] border border-white/8 bg-[rgba(255,255,255,0.04)] p-4 shadow-[var(--surface-shadow)] backdrop-blur-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-xl">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Classroom system
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                {t("teacher.classesOverview")}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
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
                  className="rounded-[1.55rem] border border-white/8 bg-[rgba(255,255,255,0.04)] p-4 shadow-[var(--surface-shadow)]"
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

        <section className="space-y-6">
          <section className="rounded-[1.8rem] border border-white/8 bg-[rgba(255,255,255,0.04)] p-4 shadow-[var(--surface-shadow)] backdrop-blur-sm sm:p-6">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Student signal
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
              {t("teacher.topStudents")}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              {t("teacher.topStudentsBody")}
            </p>

            <div className="mt-6 space-y-3">
              {summary.topStudents.length > 0 ? (
                summary.topStudents.map((student, index) => (
                  <div
                    key={student.userId}
                    className="rounded-[1.45rem] border border-white/8 bg-[rgba(255,255,255,0.04)] p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
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

          <section className="rounded-[1.8rem] border border-white/8 bg-[linear-gradient(135deg,rgba(45,212,191,0.14),rgba(15,23,42,0.82))] p-4 shadow-[var(--surface-shadow)] sm:p-6">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Teacher control
            </p>
            <h3 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
              Build classes, assign sets, and shape challenge activity from one dashboard
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              The workspace now presents teaching as a connected system: members, assignments,
              rankings, and class momentum all surfaced together.
            </p>
          </section>
        </section>
      </div>
    </div>
  );
}

function TeacherSignal({
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
  icon: typeof Layers3;
  label: string;
  value: number;
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

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.35rem] border border-white/8 bg-[rgba(255,255,255,0.04)] px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:text-xl">
        {value}
      </p>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-[rgba(255,255,255,0.03)] px-5 py-8">
      <p className="text-base font-semibold text-[var(--text-primary)] sm:text-lg">{title}</p>
      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{body}</p>
    </div>
  );
}
