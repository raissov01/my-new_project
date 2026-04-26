import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  BarChart2,
  Clock3,
  Globe2,
  Lock,
  Play,
  Radio,
  Target,
} from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";
import { formatDate } from "@/lib/shared/utils";
import { getQuizById, getQuizStats, type QuestionStat } from "@/server/services/quizzes";
import { ShareQuizButton } from "@/features/quizzes/components/share-quiz-button";

interface QuizDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: QuizDetailPageProps) {
  const { id } = await params;
  const quiz = await getQuizById(id);
  if (!quiz) return {};
  const description =
    quiz.description ??
    `${quiz.questionCount} questions · ${quiz.subject ?? "Quiz"}`;
  return {
    title: quiz.title,
    description,
    openGraph: {
      type: "website",
      title: quiz.title,
      description,
      images: [{ url: "/icon-512.png", width: 512, height: 512, alt: quiz.title }],
    },
    twitter: {
      card: "summary",
      title: quiz.title,
      description,
    },
  };
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

  const stats = quiz.isAuthor ? await getQuizStats(id) : null;

  return (
    <div className="page-shell py-6 sm:py-10">
      {/* Page head */}
      <div className="nd-page-head nd-reveal nd-d1">
        <div style={{ minWidth: 0 }}>
          <Link
            href="/quizzes"
            className="nd-tag"
            style={{ marginBottom: 14, display: "inline-flex", textDecoration: "none" }}
          >
            ← {t("quiz.backToLibrary")}
          </Link>
          <p className="nd-eyebrow" style={{ marginTop: 8 }}>
            {quiz.subject ?? t("quiz.navLabel")}
          </p>
          <h1 className="nd-page-title" style={{ marginTop: 8 }}>
            {quiz.title}
          </h1>
          <p className="nd-page-sub">
            {quiz.questionCount} {quiz.questionCount === 1 ? t("quiz.question") : t("quiz.questions")}
            {quiz.authorName ? ` · ${quiz.authorName}` : ""}
            {" · "}
            {formatDate(quiz.createdAt, locale)}
          </p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="nd-kpi-grid nd-reveal nd-d2">
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">{t("quiz.attempts")}</span>
          <strong className="nd-kpi-num">{quiz.attemptsCount}</strong>
        </div>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">{t("quiz.avgScore")}</span>
          <strong className="nd-kpi-num">{quiz.averagePercentage}%</strong>
        </div>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">
            <Clock3 style={{ display: "inline", width: 12, height: 12, marginRight: 4 }} />
            {t("quiz.secondsShort")}
          </span>
          <strong className="nd-kpi-num">{quiz.timePerQuestion}s</strong>
        </div>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">
            {quiz.isPublic ? (
              <Globe2 style={{ display: "inline", width: 12, height: 12, marginRight: 4 }} />
            ) : (
              <Lock style={{ display: "inline", width: 12, height: 12, marginRight: 4 }} />
            )}
            Visibility
          </span>
          <strong className="nd-kpi-num" style={{ fontSize: 16 }}>
            {quiz.isPublic ? t("quiz.isPublic") : t("quiz.isPrivate")}
          </strong>
        </div>
      </div>

      {/* Meta + actions */}
      <div className="nd-reveal nd-d3" style={{ marginBottom: 32 }}>
        {quiz.description ? (
          <p style={{ fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.7, maxWidth: 680, marginBottom: 16 }}>
            {quiz.description}
          </p>
        ) : null}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {quiz.version != null && quiz.version > 1 ? (
            <span className="nd-tag">v{quiz.version}</span>
          ) : null}
          {quiz.shuffleOptions ? (
            <span className="nd-tag nd-tag-green">{t("quiz.shuffleEnabled")}</span>
          ) : null}
          {quiz.tags?.map((tag) => (
            <Link
              key={tag}
              href={`/quizzes?tag=${encodeURIComponent(tag)}`}
              className="nd-tag"
              style={{ textDecoration: "none" }}
            >
              #{tag}
            </Link>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Link href={`/quizzes/${quiz.id}/play`} className="nd-btn-primary">
            <Play style={{ width: 15, height: 15 }} />
            {t("quiz.startQuiz")}
          </Link>
          {quiz.isAuthor ? (
            <>
              <Link href={`/quizzes/${quiz.id}/edit`} className="nd-btn-soft">
                {t("quiz.edit")}
              </Link>
              <Link href={`/quizzes/${quiz.id}/host`} className="nd-btn-soft">
                <Radio style={{ width: 15, height: 15 }} />
                {t("quiz.hostLive")}
              </Link>
            </>
          ) : null}
          <ShareQuizButton quizId={quiz.id} quizTitle={quiz.title} />
        </div>
      </div>

      <section className="nd-reveal nd-d4" style={{ marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <div>
            <p className="nd-eyebrow">{t("quiz.questionsSection")}</p>
          </div>
          <span className="nd-tag" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>
            {quiz.questionCount} {quiz.questionCount === 1 ? t("quiz.question") : t("quiz.questions")}
          </span>
        </div>

        <div className="nd-mock-shell">
          {quiz.questions.map((question, index) => (
            <div
              key={question.id}
              className="nd-mock-q"
              style={{ padding: "18px 24px", borderBottom: index < quiz.questions.length - 1 ? "1px dashed var(--line-strong)" : "none" }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                <h5 style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14, fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                  <span className="nd-mock-qn">{index + 1}</span>
                  {question.questionText}
                </h5>
                {quiz.isAuthor && question.correctOption ? (
                  <span className="nd-tag nd-tag-green" style={{ fontSize: 10.5, whiteSpace: "nowrap" }}>
                    <Target style={{ width: 11, height: 11 }} />
                    {question.correctOption.toUpperCase()}
                  </span>
                ) : null}
              </div>

              {quiz.isAuthor ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {OPTION_KEYS.map((key) => {
                    const text = getOptionText(question, key);
                    const isCorrect = question.correctOption === key;
                    return (
                      <div
                        key={key}
                        className={isCorrect ? "nd-mock-opt on" : "nd-mock-opt"}
                        style={{ cursor: "default", pointerEvents: "none" }}
                      >
                        <span className={isCorrect ? "nd-mock-letter" : "nd-mock-letter"} style={isCorrect ? { background: "var(--terra)", borderColor: "var(--terra)", color: "#fff" } : undefined}>
                          {key.toUpperCase()}
                        </span>
                        {text}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {quiz.isAuthor && stats ? (
        <section className="mt-8">
          <div className="flex items-center gap-3">
            <BarChart2 className="h-5 w-5 text-[var(--text-muted)]" />
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                {t("quiz.stats.title")}
              </h2>
              {stats.totalAttempts > 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  {t("quiz.stats.subtitle", { n: stats.totalAttempts })}
                </p>
              ) : null}
            </div>
          </div>

          {stats.totalAttempts === 0 ? (
            <p className="mt-4 text-sm text-[var(--text-secondary)]">
              {t("quiz.stats.noData")}
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {stats.questions.map((q, index) => (
                <AccuracyRow
                  key={q.questionId}
                  index={index}
                  stat={q}
                  accuracyLabel={t("quiz.stats.accuracy")}
                  outOfLabel={t("quiz.stats.outOf", {
                    correct: q.correctCount,
                    total: q.totalCount,
                  })}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

function AccuracyRow({
  index,
  stat,
  accuracyLabel,
  outOfLabel,
}: {
  index: number;
  stat: QuestionStat;
  accuracyLabel: string;
  outOfLabel: string;
}) {
  const pct = stat.accuracy;
  const color =
    pct >= 70
      ? "bg-emerald-500"
      : pct >= 40
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] px-5 py-4 shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          <span className="mr-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Q{index + 1}
          </span>
          {stat.questionText}
        </p>
        <span className="shrink-0 text-sm text-[var(--text-secondary)]">
          {outOfLabel} &middot; <span className="font-semibold text-[var(--text-primary)]">{pct}%</span>{" "}
          {accuracyLabel}
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-base)]">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function getOptionText(
  question: {
    optionA?: string;
    optionB?: string;
    optionC?: string;
    optionD?: string;
  },
  key: (typeof OPTION_KEYS)[number]
): string {
  switch (key) {
    case "a":
      return question.optionA ?? "";
    case "b":
      return question.optionB ?? "";
    case "c":
      return question.optionC ?? "";
    case "d":
      return question.optionD ?? "";
  }
}
