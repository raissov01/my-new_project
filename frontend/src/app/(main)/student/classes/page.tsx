import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, Sparkles, ListChecks, Clock, Play } from "lucide-react";
import { joinClassByCode } from "@/app/(main)/classes/challenges/actions";
import {
  getStudentDashboardSummary,
  getStudentQuizAssignments,
} from "@/server/services/classrooms";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { requireRole } from "@/server/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function StudentClassesPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const access = await requireRole("student");

  if (access.redirectTo) {
    redirect(access.redirectTo);
  }

  const [summary, quizAssignments] = await Promise.all([
    getStudentDashboardSummary(access.user?.id),
    getStudentQuizAssignments(),
  ]);

  if (!summary) {
    redirect("/login");
  }

  const assignmentCountByGroup = new Map<string, number>();
  for (const assignment of summary.assignments) {
    assignmentCountByGroup.set(
      assignment.groupId,
      (assignmentCountByGroup.get(assignment.groupId) ?? 0) + 1
    );
  }

  const challengeCountByGroup = new Map<string, number>();
  for (const challenge of summary.challenges) {
    challengeCountByGroup.set(
      challenge.groupId,
      (challengeCountByGroup.get(challenge.groupId) ?? 0) + 1
    );
  }

  const quizCountByGroup = new Map<string, number>();
  for (const q of quizAssignments) {
    quizCountByGroup.set(q.groupId, (quizCountByGroup.get(q.groupId) ?? 0) + 1);
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/15 text-emerald-300 border-emerald-400/30";
      case "late":
        return "bg-amber-500/15 text-amber-300 border-amber-400/30";
      case "overdue":
        return "bg-rose-500/15 text-rose-300 border-rose-400/30";
      default:
        return "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border)]";
    }
  };
  const statusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return t("classroom.statusCompleted");
      case "late":
        return t("classroom.statusLate");
      case "overdue":
        return t("classroom.statusOverdue");
      default:
        return t("classroom.statusNotStarted");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.2fr]">
        <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow-strong)]">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">
            {t("student.classesEyebrow")}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
            {t("student.classesTitle")}
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
            {t("student.classesSubtitle")}
          </p>

          <form
            action={async (formData) => {
              "use server";
              await joinClassByCode(formData);
            }}
            className="mt-6 space-y-4"
          >
            <Input
              name="join_code"
              required
              label={t("student.classCode")}
              placeholder={t("student.classCodePlaceholder")}
              className="uppercase tracking-[0.18em]"
            />
            <Button type="submit">{t("student.joinClass")}</Button>
          </form>
        </section>

        <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-400" />
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                {t("student.myClasses")}
                </h2>
              </div>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                {t("student.myClassesBody")}
              </p>
            </div>
            <Link href="/student/dashboard">
              <Button variant="outline">{t("student.backToStudentDashboard")}</Button>
            </Link>
          </div>

          <div className="mt-6 grid gap-4">
            {summary.classes.length > 0 ? (
              summary.classes.map((group) => (
                <div
                  key={group.id}
                  className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--bg-surface)] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                        {group.name}
                      </h3>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        {t("student.joinedAtLabel", {
                          value: new Date(group.joinedAt).toLocaleDateString(locale),
                        })}
                      </p>
                    </div>
                    <Link href="/student/challenges">
                      <Button variant="outline">{t("student.viewClassChallenges")}</Button>
                    </Link>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {t("student.assignmentsCount", {
                        count: assignmentCountByGroup.get(group.id) ?? 0,
                      })}
                    </div>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {t("student.challengesCount", {
                        count: challengeCountByGroup.get(group.id) ?? 0,
                      })}
                    </div>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {t("classroom.quizCountLabel", {
                        count: quizCountByGroup.get(group.id) ?? 0,
                      })}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] px-5 py-10">
                <Sparkles className="h-5 w-5 text-[var(--text-muted)]" />
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {t("student.noClassesTitle")}
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {t("student.noClassesBody")}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow)]">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-indigo-400" />
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
            {t("classroom.assignedQuizzes")}
          </h2>
        </div>
        <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
          {t("classroom.assignedQuizzesBody")}
        </p>

        <div className="mt-5 grid gap-3">
          {quizAssignments.length > 0 ? (
            quizAssignments.map((assignment) => (
              <article
                key={assignment.id}
                className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--bg-surface)] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="line-clamp-1 text-lg font-semibold text-[var(--text-primary)]">
                      {assignment.quizTitle}
                    </h3>
                    <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      {assignment.groupName} ·{" "}
                      {t("classroom.questionCount", {
                        count: assignment.questionCount,
                      })}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${statusBadge(
                      assignment.status
                    )}`}
                  >
                    {statusLabel(assignment.status)}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
                  {assignment.deadline ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {t("classroom.deadlineValue", {
                        value: new Date(assignment.deadline).toLocaleString(locale),
                      })}
                    </span>
                  ) : null}
                  {assignment.bestPercentage !== null ? (
                    <span className="font-semibold text-emerald-300">
                      {t("classroom.bestScore", {
                        value: assignment.bestPercentage,
                      })}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/quizzes/${assignment.quizId}/play`}>
                    <Button size="sm">
                      <Play className="h-4 w-4" />
                      {assignment.bestPercentage !== null
                        ? t("classroom.retakeQuiz")
                        : t("classroom.startQuiz")}
                    </Button>
                  </Link>
                  <Link href={`/quizzes/${assignment.quizId}`}>
                    <Button variant="outline" size="sm">
                      {t("classroom.quizDetails")}
                    </Button>
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] px-5 py-10 text-center">
              <Sparkles className="mx-auto h-5 w-5 text-[var(--text-muted)]" />
              <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
                {t("classroom.noQuizAssignmentsStudentTitle")}
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {t("classroom.noQuizAssignmentsStudentBody")}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
