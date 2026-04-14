import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BarChart3, Check, Clock, Users } from "lucide-react";
import { getClassQuizTeacherStats } from "@/server/services/classrooms";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { requireRole } from "@/server/auth";

interface StatsPageProps {
  params: Promise<{ id: string; quizId: string }>;
}

function errorColor(rate: number): string {
  if (rate >= 70) return "bg-rose-500/20 text-rose-300 border-rose-400/40";
  if (rate >= 40) return "bg-amber-500/15 text-amber-300 border-amber-400/30";
  if (rate > 0) return "bg-amber-400/10 text-amber-200 border-amber-300/20";
  return "bg-emerald-500/15 text-emerald-300 border-emerald-400/30";
}

export default async function ClassQuizStatsPage({ params }: StatsPageProps) {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const access = await requireRole("teacher");
  if (access.redirectTo) {
    redirect(access.redirectTo);
  }

  const { id: groupId, quizId } = await params;
  const stats = await getClassQuizTeacherStats(groupId, quizId);
  if (!stats) {
    notFound();
  }

  const completionRate =
    stats.totalStudents > 0
      ? Math.round((stats.completedCount / stats.totalStudents) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href={`/teacher/classes/${encodeURIComponent(groupId)}`}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {stats.groupName}
      </Link>

      <div className="mt-6 rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow-strong)] sm:p-8">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
          <BarChart3 className="h-3.5 w-3.5 text-indigo-400" />
          {t("classroom.teacherStatsTitle")}
        </div>
        <h1 className="mt-4 break-words text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl md:text-5xl">
          {stats.quizTitle}
        </h1>
        {stats.deadline ? (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
            <Clock className="h-3.5 w-3.5" />
            {t("classroom.deadlineValue", {
              value: new Date(stats.deadline).toLocaleString(locale),
            })}
          </p>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <MetricCard
            icon={<Users className="h-4 w-4" />}
            label={t("classroom.teacherStatsCompletion")}
            value={`${stats.completedCount} / ${stats.totalStudents}`}
            sub={`${completionRate}%`}
          />
          <MetricCard
            icon={<Check className="h-4 w-4" />}
            label={t("classroom.teacherStatsAverage")}
            value={`${stats.averagePercent}%`}
          />
          <MetricCard
            icon={<BarChart3 className="h-4 w-4" />}
            label={t("classroom.teacherStatsQuestionCount")}
            value={String(stats.questions.length)}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/teacher/classes/${encodeURIComponent(groupId)}/quizzes/${encodeURIComponent(quizId)}/leaderboard`}
          >
            <span className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-sm font-medium text-[var(--text-primary)]">
              {t("classroom.viewLeaderboard")}
            </span>
          </Link>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
          {t("classroom.teacherStatsQuestions")}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {t("classroom.teacherStatsQuestionsBody")}
        </p>

        <div className="mt-5 space-y-3">
          {stats.questions.length === 0 ? (
            <p className="rounded-[1.4rem] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] px-6 py-10 text-center text-sm text-[var(--text-secondary)]">
              {t("classroom.teacherStatsNoData")}
            </p>
          ) : (
            stats.questions.map((q, idx) => (
              <article
                key={q.questionId}
                className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      #{idx + 1}
                      {" · "}
                      {t("classroom.correctAnswer", {
                        value: q.correctOption.toUpperCase(),
                      })}
                    </p>
                    <h3 className="mt-1.5 text-base font-semibold text-[var(--text-primary)]">
                      {q.questionText}
                    </h3>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${errorColor(q.errorRate)}`}
                  >
                    {t("classroom.errorRate", { value: q.errorRate })}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <QuestionMetric
                    label={t("classroom.statsAttempts")}
                    value={q.attempts}
                  />
                  <QuestionMetric
                    label={t("classroom.statsCorrect")}
                    value={q.correct}
                  />
                  <QuestionMetric
                    label={t("classroom.statsIncorrect")}
                    value={q.incorrect}
                  />
                  <QuestionMetric
                    label={t("classroom.statsSkipped")}
                    value={q.skipped}
                  />
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
        {value}
      </p>
      {sub ? <p className="text-xs text-[var(--text-muted)]">{sub}</p> : null}
    </div>
  );
}

function QuestionMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-base)] px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}
