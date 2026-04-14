import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  GraduationCap,
  Layers3,
  ListChecks,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/server/auth";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import {
  getRecentTeacherQuizActivity,
  getTeacherDashboardSummary,
} from "@/server/services/classrooms";

export default async function TeacherDashboardPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const access = await requireRole("teacher");

  if (access.redirectTo) {
    redirect(access.redirectTo);
  }

  const [summary, recentQuizActivity] = await Promise.all([
    getTeacherDashboardSummary(access.user?.id),
    getRecentTeacherQuizActivity(),
  ]);

  if (!summary) {
    redirect("/login");
  }

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-lg)] sm:p-8">
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-emerald-500 opacity-[0.05]" style={{ filter: "blur(60px)" }} />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-[var(--primary)] opacity-[0.04]" style={{ filter: "blur(60px)" }} />

        <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <div className="badge-success">
              <Sparkles className="h-3.5 w-3.5" />
              {t("teacher.dashboardEyebrow")}
            </div>
            <h1 className="mt-4 max-w-[12ch] text-3xl font-extrabold tracking-[-0.03em] text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
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
            <TeacherSignal label={t("teacher.totalStudents")} value={`${summary.totalStudents}`} detail={t("teacher.studentsDetail")} accent="border-l-[var(--primary)]" />
            <TeacherSignal label={t("teacher.totalChallenges")} value={`${summary.totalChallenges}`} detail={t("teacher.challengesDetail")} accent="border-l-[var(--accent)]" />
            <TeacherSignal
              label={t("teacher.topStudents")}
              value={summary.topStudents[0]?.username ?? "—"}
              detail={
                summary.topStudents[0]
                  ? `${summary.topStudents[0].accuracy}% • ${t("teacher.secondsLabel", { value: summary.topStudents[0].completionTime })}`
                  : t("teacher.noRankingBody")
              }
              accent="border-l-emerald-500"
            />
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Layers3} label={t("teacher.totalClasses")} value={summary.groups.length} color="text-blue-500 bg-blue-500/10" />
        <MetricCard icon={Users} label={t("teacher.totalStudents")} value={summary.totalStudents} color="text-emerald-500 bg-emerald-500/10" />
        <MetricCard icon={BookOpen} label={t("teacher.totalAssignments")} value={summary.totalAssignments} color="text-violet-500 bg-violet-500/10" />
        <MetricCard icon={Trophy} label={t("teacher.totalChallenges")} value={summary.totalChallenges} color="text-amber-500 bg-amber-500/10" />
      </section>

      {/* Content grid */}
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.16fr_0.84fr]">
        {/* Classes */}
        <section className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                {t("teacher.classroomSystem")}
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                {t("teacher.classesOverview")}
              </h2>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                {t("teacher.classesOverviewBody")}
              </p>
            </div>
            <Link href="/teacher/classes">
              <Button variant="outline" size="sm">{t("teacher.openClasses")}</Button>
            </Link>
          </div>

          <div className="mt-5 grid gap-3">
            {summary.groups.length > 0 ? (
              summary.groups.map((group) => (
                <div
                  key={group.id}
                  className="rounded-[var(--radius-lg)] border border-[var(--border)] border-l-[3px] border-l-emerald-500 bg-[var(--bg-soft)] p-4 transition-all hover:shadow-[var(--shadow-sm)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                        {group.name}
                      </h3>
                      <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                        {t("teacher.classCodeLabel", { code: group.joinCode })}
                      </p>
                    </div>
                    <Link href={`/teacher/classes/${group.id}`}>
                      <Button variant="secondary" size="sm">{t("teacher.openClass")}</Button>
                    </Link>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
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

        {/* Right column */}
        <section className="space-y-5">
          {/* Top students */}
          <section className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              {t("teacher.studentSignal")}
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
              {t("teacher.topStudents")}
            </h2>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
              {t("teacher.topStudentsBody")}
            </p>

            <div className="mt-5 space-y-2.5">
              {summary.topStudents.length > 0 ? (
                summary.topStudents.map((student, index) => (
                  <div
                    key={student.userId}
                    className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-soft)] p-3.5"
                  >
                    <div className="band-indicator h-8 w-8 text-sm">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                        {student.username}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {student.accuracy}% • {t("teacher.secondsLabel", { value: student.completionTime })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState title={t("teacher.noRankingTitle")} body={t("teacher.noRankingBody")} />
              )}
            </div>
          </section>

          {/* Recent quiz activity */}
          <section className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  {t("classroom.teacherRecentQuizzesEyebrow")}
                </p>
                <h2 className="mt-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                  {t("classroom.teacherRecentQuizzes")}
                </h2>
              </div>
              <Link href="/quizzes">
                <Button variant="outline" size="sm">
                  <ListChecks className="h-4 w-4" />
                  {t("quiz.navLabel")}
                </Button>
              </Link>
            </div>

            <div className="mt-4 space-y-2.5">
              {recentQuizActivity.length > 0 ? (
                recentQuizActivity.slice(0, 6).map((activity) => (
                  <div
                    key={activity.attemptId}
                    className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-soft)] p-3.5"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        activity.percentage >= 80
                          ? "bg-emerald-500/15 text-emerald-300"
                          : activity.percentage >= 50
                            ? "bg-amber-500/15 text-amber-300"
                            : "bg-rose-500/15 text-rose-300"
                      }`}
                    >
                      {activity.percentage}%
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {activity.studentName}
                      </p>
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        {activity.quizTitle} ·{" "}
                        {new Date(activity.completedAt).toLocaleDateString(locale)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title={t("classroom.teacherRecentQuizzesEmptyTitle")}
                  body={t("classroom.teacherRecentQuizzesEmptyBody")}
                />
              )}
            </div>
          </section>

          {/* Teacher control */}
          <section className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500 opacity-[0.04]" style={{ filter: "blur(40px)" }} />
            <p className="relative text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              {t("teacher.teacherControl")}
            </p>
            <h3 className="relative mt-2 text-lg font-bold tracking-[-0.03em] text-[var(--text-primary)]">
              {t("teacher.teacherControlTitle")}
            </h3>
            <p className="relative mt-2 text-sm leading-7 text-[var(--text-secondary)]">
              {t("teacher.teacherControlBody")}
            </p>
          </section>
        </section>
      </div>
    </div>
  );
}

function TeacherSignal({ label, value, detail, accent }: { label: string; value: string; detail: string; accent: string }) {
  return (
    <div className={`rounded-[var(--radius-lg)] border border-[var(--border)] border-l-[3px] ${accent} bg-[var(--bg-soft)] p-4`}>
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-[var(--text-primary)] sm:text-3xl">{value}</p>
      <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">{detail}</p>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }: { icon: typeof Layers3; label: string; value: number; color: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-xs)]">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm text-[var(--text-secondary)]">{label}</p>
          <p className="mt-0.5 text-xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elevated)] px-3.5 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-1.5 text-lg font-bold tracking-[-0.03em] text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-soft)] px-5 py-8">
      <p className="text-base font-bold text-[var(--text-primary)]">{title}</p>
      <p className="mt-1.5 text-sm leading-7 text-[var(--text-secondary)]">{body}</p>
    </div>
  );
}
