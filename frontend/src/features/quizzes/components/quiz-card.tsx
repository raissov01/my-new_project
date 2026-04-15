import Link from "next/link";
import { ListChecks, Target, Users, Timer, Pencil } from "lucide-react";
import { formatDate } from "@/lib/shared/utils";
import { type Locale, createTranslator } from "@/lib/shared/i18n";
import type { QuizOverview } from "@/server/services/quizzes";

interface QuizCardProps {
  quiz: QuizOverview;
  locale: Locale;
  isOwner: boolean;
}

export function QuizCard({ quiz, locale, isOwner }: QuizCardProps) {
  const t = createTranslator(locale);

  return (
    <article className="relative isolate z-50 flex h-full flex-col rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)] hover:border-[var(--border-strong)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/quizzes/${quiz.id}`} className="group block">
            <h3 className="line-clamp-1 text-lg font-bold tracking-[-0.02em] text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary)]">
              {quiz.title}
            </h3>
          </Link>
          <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-6 text-[var(--text-secondary)]">
            {quiz.description || t("quiz.noDescription")}
          </p>
          {quiz.subject ? (
            <span className="badge-primary mt-3 text-[11px]">{quiz.subject}</span>
          ) : null}
          {quiz.tags && quiz.tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {quiz.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-[var(--bg-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <span className="badge-primary text-[11px]">
          <ListChecks className="h-3 w-3" />
          {quiz.questionCount}{" "}
          {quiz.questionCount === 1 ? t("quiz.question") : t("quiz.questions")}
        </span>
      </div>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        <Stat
          icon={<Users className="h-3.5 w-3.5" />}
          label={t("quiz.attempts")}
          value={String(quiz.attemptsCount)}
        />
        <Stat
          icon={<Target className="h-3.5 w-3.5" />}
          label={t("quiz.avgScore")}
          value={`${quiz.averagePercentage}%`}
        />
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1">
          <Timer className="h-3.5 w-3.5" />
          {quiz.timePerQuestion}
          {t("quiz.secondsShort")}
        </span>
        <span>•</span>
        <span>
          {t("quiz.created")} {formatDate(quiz.createdAt, locale)}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2.5">
        <Link
          href={`/quizzes/${quiz.id}`}
          className="relative z-20 pointer-events-auto inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_-8px_rgba(37,99,235,0.4)] transition-all hover:bg-[var(--primary-hover)]"
        >
          {t("quiz.openQuiz")}
        </Link>
      </div>

      {isOwner ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
          <Link
            href={`/quizzes/${quiz.id}/edit`}
            className="relative z-20 pointer-events-auto inline-flex h-8 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)]"
          >
            <Pencil className="h-3.5 w-3.5" />
            {t("quiz.edit")}
          </Link>
        </div>
      ) : null}
    </article>
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
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-soft)] px-3.5 py-3">
      <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
        {icon}
        {label}
      </div>
      <p className="mt-1.5 text-sm font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
