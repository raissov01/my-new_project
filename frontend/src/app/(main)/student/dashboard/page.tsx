import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Flame,
  GraduationCap,
  ListChecks,
  Play,
  RefreshCw,
  Sparkles,
  Star,
  Target,
  Trophy,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUserStats } from "@/app/(main)/sets/progress-actions";
import {
  getStudentDashboardSummary,
  getStudentQuizAssignments,
} from "@/server/services/classrooms";
import {
  getRecentQuizAttempts,
  getRecommendedQuizzes,
} from "@/server/services/quizzes";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { requireRole } from "@/server/auth";

export default async function StudentDashboardPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const access = await requireRole("student");

  if (access.redirectTo) {
    redirect(access.redirectTo);
  }

  const [summary, stats, quizAssignments, recentAttempts, recommendedQuizzes] =
    await Promise.all([
      getStudentDashboardSummary(access.user?.id),
      getUserStats(),
      getStudentQuizAssignments(),
      getRecentQuizAttempts(),
      getRecommendedQuizzes(),
    ]);

  if (!summary) {
    redirect("/login");
  }

  const pendingQuizzes = quizAssignments.filter(
    (q) => q.status !== "completed"
  );

  const firstName = access.profile?.username ?? t("student.dashboardTitle");
  const nextAssignment = summary.assignments[0] ?? null;

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-lg)] sm:p-8">
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[var(--primary)] opacity-[0.06]" style={{ filter: "blur(60px)" }} />

        <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <div className="badge-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {t("student.dashboardEyebrow")}
            </div>
            <h1 className="mt-4 max-w-[12ch] text-3xl font-extrabold tracking-[-0.03em] text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
              {t("dashboard.hello", { name: firstName })}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              {t("student.dashboardSubtitle")}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/ielts">
                <Button size="lg" className="w-full sm:w-auto">
                  <GraduationCap className="h-4 w-4" />
                  {t("nav.ieltsPrep")}
                </Button>
              </Link>
              <Link href="/student/classes">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  <Users className="h-4 w-4" />
                  {t("student.openClasses")}
                </Button>
              </Link>
              <Link href="/flashcards">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  <BookOpen className="h-4 w-4" />
                  {t("nav.flashcards")}
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <HeroSignal
              label={t("student.personalAccuracy")}
              value={`${stats.accuracy}%`}
              detail={t("student.progressBody")}
              accent="border-l-[var(--primary)]"
            />
            <HeroSignal
              label={t("stats.dailyStreak")}
              value={`${stats.streakDays}`}
              detail={stats.streakDays === 1 ? t("stats.dayInRow") : t("stats.daysInRow")}
              accent="border-l-[var(--accent)]"
            />
            <HeroSignal
              label={t("student.assignedSets")}
              value={`${summary.assignments.length}`}
              detail={t("student.assignedWorkDetail")}
              accent="border-l-emerald-500"
            />
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} label={t("student.classCount")} value={summary.classes.length} color="text-blue-500 bg-blue-500/10" />
        <MetricCard icon={BookOpen} label={t("student.assignedSets")} value={summary.assignments.length} color="text-emerald-500 bg-emerald-500/10" />
        <MetricCard icon={Trophy} label={t("student.classChallenges")} value={summary.challenges.length} color="text-amber-500 bg-amber-500/10" />
        <MetricCard icon={Target} label={t("student.personalAccuracy")} value={`${stats.accuracy}%`} color="text-violet-500 bg-violet-500/10" />
      </section>

      {/* Content grid */}
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        {/* Assigned work */}
        <section className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                {t("student.assignedWorkspace")}
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                {t("student.assignedWork")}
              </h2>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
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
                  className="rounded-[var(--radius-lg)] border border-[var(--border)] border-l-[3px] border-l-[var(--primary)] bg-[var(--bg-soft)] p-4 transition-all hover:shadow-[var(--shadow-sm)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                        {assignment.setTitle}
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {assignment.groupName}
                      </p>
                    </div>
                    <Link href={`/sets/${assignment.setId}`}>
                      <Button variant="secondary" size="sm">{t("student.openSet")}</Button>
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <EmptyCard
                icon={BookOpen}
                title={t("student.noAssignmentsTitle")}
                body={t("student.noAssignmentsBody")}
                ctaHref="/student/classes"
                ctaLabel={t("student.joinClass")}
              />
            )}
          </div>
        </section>

        {/* Right column */}
        <section className="space-y-5">
          {/* Progress */}
          <section className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              {t("student.personalPerformance")}
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
              {t("student.progressTitle")}
            </h2>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
              {t("student.progressBody")}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ProgressCard icon={BookOpen} label={t("student.cardsStudied")} value={stats.totalStudied} color="text-blue-500 bg-blue-500/10" />
              <ProgressCard icon={CheckCircle2} label={t("student.totalCorrect")} value={stats.totalCorrect} color="text-emerald-500 bg-emerald-500/10" />
              <ProgressCard icon={Flame} label={t("student.currentStreak")} value={stats.streakDays} color="text-orange-500 bg-orange-500/10" />
              <ProgressCard icon={Star} label={t("student.totalPoints")} value={stats.points} color="text-amber-500 bg-amber-500/10" />
            </div>

            <div className="progress-track mt-5">
              <div
                className="progress-fill"
                style={{ width: `${stats.xpProgress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              {t("stats.level")} {stats.xpLevel} • {stats.levelName}
            </p>
          </section>

          {/* Assigned quizzes widget */}
          <section className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  {t("classroom.studentAssignedQuizzesEyebrow")}
                </p>
                <h2 className="mt-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                  {t("classroom.assignedQuizzes")}
                </h2>
              </div>
              <Link href="/student/classes">
                <Button variant="outline" size="sm">
                  <ListChecks className="h-4 w-4" />
                  {t("classroom.seeAll")}
                </Button>
              </Link>
            </div>

            <div className="mt-4 space-y-2.5">
              {pendingQuizzes.length > 0 ? (
                pendingQuizzes.slice(0, 4).map((assignment) => (
                  <Link
                    key={assignment.id}
                    href={`/quizzes/${assignment.quizId}/play`}
                    className="group flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-soft)] p-3.5 transition-all hover:border-[var(--border-strong)]"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--primary-soft)] text-[var(--primary)]">
                      <Play className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary)]">
                        {assignment.quizTitle}
                      </p>
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        {assignment.groupName}
                        {assignment.status === "overdue"
                          ? ` · ${t("classroom.statusOverdue")}`
                          : ""}
                      </p>
                    </div>
                  </Link>
                ))
              ) : quizAssignments.length > 0 ? (
                <EmptyCard
                  icon={CheckCircle2}
                  title={t("classroom.allQuizzesDoneTitle")}
                  body={t("classroom.allQuizzesDoneBody")}
                />
              ) : (
                <EmptyCard
                  icon={ListChecks}
                  title={t("classroom.noQuizAssignmentsStudentTitle")}
                  body={t("classroom.noQuizAssignmentsStudentBody")}
                  ctaHref="/student/classes"
                  ctaLabel={t("student.browseClasses")}
                />
              )}
            </div>
          </section>

          {/* Recent quiz results */}
          <section className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  {t("quiz.liveMode")}
                </p>
                <h2 className="mt-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                  {t("quiz.dashboard.recentTitle")}
                </h2>
              </div>
              <Link href="/quizzes">
                <Button variant="outline" size="sm">
                  <TrendingUp className="h-4 w-4" />
                  {t("quiz.backToLibrary")}
                </Button>
              </Link>
            </div>

            <div className="mt-4 space-y-2.5">
              {recentAttempts.length > 0 ? (
                recentAttempts.map((attempt) => {
                  const pctColor =
                    attempt.percentage >= 80
                      ? "text-emerald-400"
                      : attempt.percentage >= 60
                        ? "text-amber-400"
                        : "text-rose-400";
                  return (
                    <Link
                      key={attempt.attemptId}
                      href={`/quizzes/${attempt.quizId}/results?attempt=${attempt.attemptId}`}
                      className="group flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-soft)] p-3.5 transition-all hover:border-[var(--border-strong)]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--primary-soft)] text-[var(--primary)]">
                        <Star className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary)]">
                          {attempt.quizTitle}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {attempt.score}/{attempt.totalQuestions} {t("quiz.dashboard.score").toLowerCase()}
                        </p>
                      </div>
                      <span className={`shrink-0 font-mono text-sm font-bold ${pctColor}`}>
                        {attempt.percentage}%
                      </span>
                    </Link>
                  );
                })
              ) : (
                <EmptyCard
                  icon={Star}
                  title={t("quiz.dashboard.recentEmpty")}
                  body={t("quiz.browseHint")}
                  ctaHref="/quizzes"
                  ctaLabel={t("student.playQuiz")}
                />
              )}
            </div>
          </section>

          {/* Recommended practice */}
          {recommendedQuizzes.length > 0 ? (
            <section className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                    Quiz
                  </p>
                  <h2 className="mt-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                    {t("quiz.dashboard.recommendedTitle")}
                  </h2>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                {recommendedQuizzes.map((q) => (
                  <div
                    key={q.quizId}
                    className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] border-l-[3px] border-l-amber-500/60 bg-[var(--bg-soft)] p-3.5"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-amber-500/10 text-amber-500">
                      <RefreshCw className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {q.quizTitle}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {t("quiz.dashboard.bestScore")}: {q.bestPercentage}% · {q.attemptsCount}× {t("quiz.dashboard.attempts").toLowerCase()}
                      </p>
                    </div>
                    <Link href={`/quizzes/${q.quizId}/play`}>
                      <Button size="sm" variant="secondary">
                        <Play className="h-3.5 w-3.5" />
                        {t("quiz.dashboard.practiceNow")}
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Next action */}
          <section className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[var(--primary)] opacity-[0.04]" style={{ filter: "blur(40px)" }} />
            <div className="relative flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-soft)] text-[var(--primary)]">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  {t("student.nextAction")}
                </p>
                <h3 className="mt-1.5 text-lg font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                  {t("dashboard.startStudying")}
                </h3>
                <p className="mt-1.5 text-sm leading-7 text-[var(--text-secondary)]">
                  {nextAssignment ? nextAssignment.setTitle : t("student.noAssignmentsBody")}
                </p>
              </div>
            </div>

            {nextAssignment ? (
              <Link href={`/sets/${nextAssignment.setId}/study`} className="relative mt-5 inline-flex">
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

function HeroSignal({ label, value, detail, accent }: { label: string; value: string; detail: string; accent: string }) {
  return (
    <div className={`rounded-[var(--radius-lg)] border border-[var(--border)] border-l-[3px] ${accent} bg-[var(--bg-soft)] p-4`}>
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-[var(--text-primary)] sm:text-3xl">{value}</p>
      <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">{detail}</p>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }: { icon: typeof Users; label: string; value: string | number; color: string }) {
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

function ProgressCard({ icon: Icon, label, value, color }: { icon: typeof Users; label: string; value: number; color: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-soft)] p-3.5">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-[var(--text-muted)]">{label}</p>
          <p className="mt-0.5 text-base font-bold tracking-[-0.02em] text-[var(--text-primary)]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyCard({ icon: Icon, title, body, ctaHref, ctaLabel }: { icon: typeof Users; title: string; body: string; ctaHref?: string; ctaLabel?: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-soft)] px-5 py-8">
      <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-soft)] text-[var(--primary)]">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 text-base font-bold text-[var(--text-primary)]">{title}</p>
      <p className="mt-1.5 text-sm leading-7 text-[var(--text-secondary)]">{body}</p>
      {ctaHref && ctaLabel ? (
        <Link href={ctaHref} className="mt-4 inline-block">
          <Button size="sm" variant="secondary">
            <ArrowRight className="h-3.5 w-3.5" />
            {ctaLabel}
          </Button>
        </Link>
      ) : null}
    </div>
  );
}
