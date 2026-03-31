import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, CheckCircle2, GraduationCap, Trophy, Users } from "lucide-react";
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
          {t("student.dashboardEyebrow")}
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-[var(--text-primary)]">
          {t("student.dashboardTitle")}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
          {t("student.dashboardSubtitle")}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/student/classes">
            <Button>
              <Users className="h-4 w-4" />
              {t("student.openClasses")}
            </Button>
          </Link>
          <Link href="/student/challenges">
            <Button variant="outline">
              <Trophy className="h-4 w-4" />
              {t("student.openChallenges")}
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Users} label={t("student.classCount")} value={summary.classes.length} />
        <Metric icon={BookOpen} label={t("student.assignedSets")} value={summary.assignments.length} />
        <Metric icon={Trophy} label={t("student.classChallenges")} value={summary.challenges.length} />
        <Metric icon={CheckCircle2} label={t("student.personalAccuracy")} value={`${stats.accuracy}%`} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
                {t("student.assignedWork")}
              </h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {t("student.assignedWorkBody")}
              </p>
            </div>
            <Link href="/student/classes">
              <Button variant="outline">{t("student.openClasses")}</Button>
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {summary.assignments.length > 0 ? (
              summary.assignments.slice(0, 5).map((assignment) => (
                <div
                  key={assignment.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">
                        {assignment.setTitle}
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {assignment.groupName}
                      </p>
                    </div>
                    <Link href={`/sets/${assignment.setId}`}>
                      <Button variant="outline">{t("student.openSet")}</Button>
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <EmptyCard title={t("student.noAssignmentsTitle")} body={t("student.noAssignmentsBody")} />
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
            {t("student.progressTitle")}
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {t("student.progressBody")}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <ProgressCard label={t("student.cardsStudied")} value={stats.totalStudied} />
            <ProgressCard label={t("student.totalCorrect")} value={stats.totalCorrect} />
            <ProgressCard label={t("student.currentStreak")} value={stats.streakDays} />
            <ProgressCard label={t("student.totalPoints")} value={stats.points} />
          </div>

          <div className="mt-6">
            <Link href="/student/challenges">
              <Button variant="outline">
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

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-[var(--bg-surface)] p-3 text-indigo-600">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-[var(--text-secondary)]">{label}</p>
          <p className="mt-1 text-3xl font-semibold text-[var(--text-primary)]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ProgressCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[var(--bg-surface)] p-4">
      <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function EmptyCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] px-5 py-8">
      <p className="text-lg font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{body}</p>
    </div>
  );
}
