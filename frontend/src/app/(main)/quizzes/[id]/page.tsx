import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Clock3,
  Globe2,
  ListChecks,
  Lock,
  Play,
  Target,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/auth";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";
import { formatDate } from "@/lib/shared/utils";
import { getQuizById } from "@/server/services/quizzes";

interface QuizDetailPageProps {
  params: Promise<{ id: string }>;
}

const OPTION_KEYS = ["a", "b", "c", "d"] as const;

export default async function QuizDetailPage({ params }: QuizDetailPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const quiz = await getQuizById(id);

  if (!quiz) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/quizzes"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("quiz.backToLibrary")}
      </Link>

      <section className="mt-6 rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow-strong)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5">
                <ListChecks className="h-3.5 w-3.5" />
                {quiz.questionCount} {quiz.questionCount === 1 ? t("quiz.question") : t("quiz.questions")}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5">
                <Clock3 className="h-3.5 w-3.5" />
                {quiz.timePerQuestion}
                {t("quiz.secondsShort")}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5">
                {quiz.isPublic ? <Globe2 className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                {quiz.isPublic ? t("quiz.isPublic") : t("quiz.isPrivate")}
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl md:text-5xl">
              {quiz.title}
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              {quiz.description || t("quiz.noDescription")}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
              {quiz.subject ? (
                <span className="rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5">
                  {quiz.subject}
                </span>
              ) : null}
              {quiz.authorName ? (
                <span className="inline-flex items-center gap-1.5">
                  <UserRound className="h-4 w-4" />
                  {quiz.authorName}
                </span>
              ) : null}
              <span>
                {t("quiz.created")} {formatDate(quiz.createdAt, locale)}
              </span>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/quizzes/${quiz.id}/play`}>
                <Button size="lg">
                  <Play className="h-4 w-4" />
                  {t("quiz.startQuiz")}
                </Button>
              </Link>
              {quiz.isAuthor ? (
                <Link href={`/quizzes/${quiz.id}/edit`}>
                  <Button variant="outline" size="lg">
                    {t("quiz.edit")}
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto lg:min-w-[260px] lg:grid-cols-1">
            <MetricCard
              label={t("quiz.attempts")}
              value={String(quiz.attemptsCount)}
            />
            <MetricCard
              label={t("quiz.avgScore")}
              value={`${quiz.averagePercentage}%`}
            />
            <MetricCard
              label={quiz.isAuthor ? t("quiz.detailAuthorView") : t("quiz.detailPreview")}
              value={quiz.isAuthor ? t("quiz.detailAnswersVisible") : t("quiz.detailAnswersHidden")}
            />
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
            {t("quiz.questionsSection")}
          </h2>
          <span className="text-sm text-[var(--text-muted)]">
            {quiz.shuffleOptions ? t("quiz.shuffleEnabled") : t("quiz.fixedOrder")}
          </span>
        </div>

        <div className="mt-4 space-y-4">
          {quiz.questions.map((question, index) => (
            <article
              key={question.id}
              className="rounded-[1.6rem] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    {t("quiz.question")} {index + 1}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                    {question.questionText}
                  </h3>
                </div>
                {quiz.isAuthor && question.correctOption ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-emerald-400">
                    <Target className="h-3.5 w-3.5" />
                    {t("quiz.correctAnswer")}: {question.correctOption.toUpperCase()}
                  </span>
                ) : null}
              </div>

              {quiz.isAuthor ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {OPTION_KEYS.map((key) => {
                    const text = getOptionText(question, key);
                    const isCorrect = question.correctOption === key;

                    return (
                      <div
                        key={key}
                        className={`rounded-[1.2rem] border px-4 py-3 text-sm ${
                          isCorrect
                            ? "border-emerald-500/25 bg-emerald-500/10 text-[var(--text-primary)]"
                            : "border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-secondary)]"
                        }`}
                      >
                        <span className="font-semibold uppercase text-[var(--text-primary)]">
                          {key}
                        </span>{" "}
                        {text}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-sm)]">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function getOptionText(
  question: {
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
  },
  key: (typeof OPTION_KEYS)[number]
) {
  switch (key) {
    case "a":
      return question.optionA;
    case "b":
      return question.optionB;
    case "c":
      return question.optionC;
    case "d":
      return question.optionD;
  }
}
