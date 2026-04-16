import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Dumbbell,
  RotateCw,
  Timer,
  Trophy,
  X,
} from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";
import { Button } from "@/components/ui/button";
import { getAttemptById, type AttemptAnswerResult } from "@/server/services/quizzes";
import { DownloadCsvButton } from "./download-csv-button";

interface ResultsPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ attempt?: string }>;
}

function gradeKey(percentage: number): string {
  if (percentage >= 90) return "quiz.results.gradeExcellent";
  if (percentage >= 70) return "quiz.results.gradeGood";
  if (percentage >= 50) return "quiz.results.gradeAverage";
  return "quiz.results.gradeTryAgain";
}

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

function longestStreak(answers: AttemptAnswerResult[]): number {
  let max = 0;
  let cur = 0;
  for (const a of answers) {
    if (a.isCorrect) {
      cur += 1;
      if (cur > max) max = cur;
    } else {
      cur = 0;
    }
  }
  return max;
}

export default async function QuizResultsPage({
  params,
  searchParams,
}: ResultsPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const { attempt: attemptId } = await searchParams;
  if (!attemptId) {
    redirect(`/quizzes/${encodeURIComponent(id)}`);
  }

  const attempt = await getAttemptById(attemptId);
  if (!attempt) {
    notFound();
  }

  const locale = await getServerLocale();
  const t = createTranslator(locale);

  const percentage = attempt.percentage;
  const grade = t(gradeKey(percentage));
  const avgSeconds =
    attempt.totalQuestions > 0
      ? attempt.timeSpent / attempt.totalQuestions
      : 0;
  const maxStreak = longestStreak(attempt.answers);
  const wrongCount = attempt.answers.filter((a) => !a.isCorrect).length;

  const dashArray = 2 * Math.PI * 88;
  const dashOffset = dashArray * (1 - percentage / 100);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/quizzes/${encodeURIComponent(id)}`}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("quiz.backToLibrary")}
      </Link>

      <section className="mt-6 overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-xl)] sm:p-8 lg:p-10">
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-[auto_1fr] lg:items-center">
          <div className="relative mx-auto h-40 w-40 sm:h-48 sm:w-48 md:h-56 md:w-56">
            <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
              <circle
                cx="100"
                cy="100"
                r="88"
                fill="none"
                stroke="var(--border)"
                strokeWidth="14"
              />
              <circle
                cx="100"
                cy="100"
                r="88"
                fill="none"
                stroke="url(#scoreGradient)"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center px-3">
              <div className="text-2xl font-bold tracking-[-0.05em] text-[var(--text-primary)] sm:text-3xl md:text-4xl">
                {attempt.score}/{attempt.totalQuestions}
              </div>
              <div className="mt-1 text-base font-semibold text-[var(--primary)] sm:text-lg">
                {percentage}%
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3.5 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              {t("quiz.results.title")}
            </p>
            <h1 className="mt-4 break-words text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl md:text-5xl">
              {grade}
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              {t("quiz.results.subtitle")
                .replace("{score}", String(attempt.score))
                .replace("{total}", String(attempt.totalQuestions))}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Stat
                icon={<Timer className="h-4 w-4" />}
                label={t("quiz.results.totalTime")}
                value={formatDuration(attempt.timeSpent)}
              />
              <Stat
                icon={<Timer className="h-4 w-4" />}
                label={t("quiz.results.avgPerQuestion")}
                value={formatDuration(avgSeconds)}
              />
              <Stat
                icon={<Trophy className="h-4 w-4" />}
                label={t("quiz.results.longestStreak")}
                value={String(maxStreak)}
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/quizzes/${encodeURIComponent(id)}/play`}>
                <Button size="lg">
                  <RotateCw className="h-4 w-4" />
                  {t("quiz.results.retry")}
                </Button>
              </Link>
              {wrongCount > 0 ? (
                <Link
                  href={`/quizzes/${encodeURIComponent(id)}/practice?attempt=${encodeURIComponent(attemptId)}`}
                >
                  <Button variant="outline" size="lg">
                    <Dumbbell className="h-4 w-4" />
                    {t("quiz.results.practiceMistakes").replace(
                      "{n}",
                      String(wrongCount)
                    )}
                  </Button>
                </Link>
              ) : null}
              <Link href="/quizzes">
                <Button variant="outline" size="lg">
                  {t("quiz.results.backToLibrary")}
                </Button>
              </Link>
              <DownloadCsvButton attempt={attempt} label={t("quiz.results.downloadCsv")} />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
          {t("quiz.results.breakdown")}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {t("quiz.results.breakdownBody")}
        </p>

        <div className="mt-5 space-y-3">
          {attempt.answers.map((answer, idx) => (
            <AnswerRow
              key={`${answer.questionId || "removed"}-${idx}`}
              index={idx}
              answer={answer}
              correctLabel={t("quiz.results.correctAnswer")}
              yourLabel={t("quiz.results.yourAnswer")}
              skippedLabel={t("quiz.results.skipped")}
              correctText={t("quiz.play.correct")}
              wrongText={t("quiz.play.wrong")}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
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
    </div>
  );
}

function AnswerRow({
  index,
  answer,
  correctLabel,
  yourLabel,
  skippedLabel,
  correctText,
  wrongText,
}: {
  index: number;
  answer: AttemptAnswerResult;
  correctLabel: string;
  yourLabel: string;
  skippedLabel: string;
  correctText: string;
  wrongText: string;
}) {
  const qType = answer.questionType ?? "mcq";

  // Build display nodes based on question type so every type shows
  // meaningful "your answer" and "correct answer" instead of blank/skipped.
  let yourAnswerNode: React.ReactNode;
  let correctAnswerNode: React.ReactNode;

  if (qType === "fill_blank") {
    const typed = answer.textAnswer?.trim();
    yourAnswerNode = typed ? (
      <span className="font-medium">{typed}</span>
    ) : (
      <span className="italic text-[var(--text-muted)]">{skippedLabel}</span>
    );
    correctAnswerNode = (
      <span className="font-medium">{answer.blankAnswer ?? "—"}</span>
    );
  } else if (qType === "reorder") {
    const userOrder = answer.orderAnswer;
    const correctOrder = answer.reorderItems;
    yourAnswerNode =
      userOrder && userOrder.length > 0 ? (
        <ol className="list-none space-y-1">
          {userOrder.map((item, i) => (
            <li key={i} className="flex items-center gap-1.5 text-sm">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--bg-soft)] text-[10px] font-bold text-[var(--text-secondary)]">
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ol>
      ) : (
        <span className="italic text-[var(--text-muted)]">{skippedLabel}</span>
      );
    correctAnswerNode =
      correctOrder && correctOrder.length > 0 ? (
        <ol className="list-none space-y-1">
          {correctOrder.map((item, i) => (
            <li key={i} className="flex items-center gap-1.5 text-sm">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400">
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ol>
      ) : (
        <span>—</span>
      );
  } else if (qType === "mcq_multi") {
    const letterToText: Record<string, string> = {
      a: answer.optionA ?? "",
      b: answer.optionB ?? "",
      c: answer.optionC ?? "",
      d: answer.optionD ?? "",
    };
    const parseLetters = (raw: string | null | undefined) =>
      (raw ?? "")
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean);

    const selectedLetters = parseLetters(answer.selectedOption);
    const correctLetters = parseLetters(answer.correctOption);

    yourAnswerNode =
      selectedLetters.length > 0 ? (
        <span className="font-semibold uppercase">
          {selectedLetters.join(", ")} ·{" "}
          {selectedLetters.map((l) => letterToText[l]).filter(Boolean).join("; ") || "—"}
        </span>
      ) : (
        <span className="italic text-[var(--text-muted)]">{skippedLabel}</span>
      );
    correctAnswerNode = (
      <span className="font-semibold uppercase">
        {correctLetters.join(", ")} ·{" "}
        {correctLetters.map((l) => letterToText[l]).filter(Boolean).join("; ") || "—"}
      </span>
    );
  } else if (qType === "true_false") {
    const tfLabel = (opt: string | null | undefined) =>
      opt === "t" ? "True" : opt === "f" ? "False" : null;
    const yourTf = tfLabel(answer.selectedOption);
    const correctTf = tfLabel(answer.correctOption);
    yourAnswerNode = yourTf ? (
      <span className="font-semibold">{yourTf}</span>
    ) : (
      <span className="italic text-[var(--text-muted)]">{skippedLabel}</span>
    );
    correctAnswerNode = (
      <span className="font-semibold">{correctTf ?? "—"}</span>
    );
  } else {
    // mcq (default)
    const letterToText: Record<string, string> = {
      a: answer.optionA ?? "",
      b: answer.optionB ?? "",
      c: answer.optionC ?? "",
      d: answer.optionD ?? "",
    };
    const selectedText = answer.selectedOption
      ? (letterToText[answer.selectedOption] ?? "")
      : "";
    const correctAnswerText = letterToText[answer.correctOption] ?? "";
    yourAnswerNode = answer.selectedOption ? (
      <>
        <span className="font-semibold uppercase">{answer.selectedOption}</span>{" "}
        · {selectedText || "—"}
      </>
    ) : (
      <span className="italic text-[var(--text-muted)]">{skippedLabel}</span>
    );
    correctAnswerNode = (
      <>
        <span className="font-semibold uppercase">{answer.correctOption}</span>{" "}
        · {correctAnswerText || "—"}
      </>
    );
  }

  return (
    <article
      className={`rounded-[var(--radius-xl)] border p-5 shadow-[var(--shadow-sm)] ${
        answer.isCorrect
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-rose-500/25 bg-rose-500/5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
            #{index + 1}
          </p>
          <h3 className="mt-1.5 text-base font-semibold text-[var(--text-primary)]">
            {answer.questionText || "—"}
          </h3>
        </div>
        <span
          className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold uppercase tracking-[0.14em] ${
            answer.isCorrect
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-rose-500/15 text-rose-300"
          }`}
        >
          {answer.isCorrect ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <X className="h-3.5 w-3.5" />
          )}
          {answer.isCorrect ? correctText : wrongText}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3 text-sm text-[var(--text-primary)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {yourLabel}
          </p>
          <div className="mt-1.5">{yourAnswerNode}</div>
        </div>
        <div className="rounded-[var(--radius-md)] border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-[var(--text-primary)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-300">
            {correctLabel}
          </p>
          <div className="mt-1.5">{correctAnswerNode}</div>
        </div>
      </div>
    </article>
  );
}
