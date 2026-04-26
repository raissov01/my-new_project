import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
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
    <div className="page-shell py-6 sm:py-10">
      {/* Page head */}
      <div className="nd-page-head nd-reveal nd-d1">
        <div>
          <Link
            href={`/quizzes/${encodeURIComponent(id)}`}
            className="nd-tag"
            style={{ marginBottom: 14, display: "inline-flex", textDecoration: "none" }}
          >
            ← {t("quiz.backToLibrary")}
          </Link>
          <p className="nd-eyebrow" style={{ marginTop: 8 }}>{t("quiz.results.title")}</p>
          <h1 className="nd-page-title" style={{ marginTop: 8 }}>{grade}</h1>
          <p className="nd-page-sub">
            {attempt.score}/{attempt.totalQuestions} · {percentage}%
          </p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="nd-kpi-grid nd-reveal nd-d2">
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">Score</span>
          <strong className="nd-kpi-num">{attempt.score}/{attempt.totalQuestions}</strong>
        </div>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">Percentage</span>
          <strong className="nd-kpi-num">{percentage}%</strong>
        </div>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">{t("quiz.results.totalTime")}</span>
          <strong className="nd-kpi-num">{formatDuration(attempt.timeSpent)}</strong>
        </div>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">{t("quiz.results.longestStreak")}</span>
          <strong className="nd-kpi-num">{maxStreak}</strong>
        </div>
      </div>

      <section className="nd-mock-shell nd-reveal nd-d3" style={{ marginBottom: 32, overflow: "hidden" }}>
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-[auto_1fr] lg:items-center" style={{ padding: "28px 32px" }}>
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

            <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 10 }}>
              <Link href={`/quizzes/${encodeURIComponent(id)}/play`} className="nd-btn-primary">
                <RotateCw style={{ width: 15, height: 15 }} />
                {t("quiz.results.retry")}
              </Link>
              {wrongCount > 0 ? (
                <Link
                  href={`/quizzes/${encodeURIComponent(id)}/practice?attempt=${encodeURIComponent(attemptId)}`}
                  className="nd-btn-soft"
                >
                  <Dumbbell style={{ width: 15, height: 15 }} />
                  {t("quiz.results.practiceMistakes").replace("{n}", String(wrongCount))}
                </Link>
              ) : null}
              <Link href="/quizzes" className="nd-btn-soft">
                {t("quiz.results.backToLibrary")}
              </Link>
              <DownloadCsvButton attempt={attempt} label={t("quiz.results.downloadCsv")} />
            </div>
          </div>
        </div>
      </section>

      <section className="nd-reveal nd-d4" style={{ marginTop: 32 }}>
        <div style={{ marginBottom: 16 }}>
          <p className="nd-eyebrow">{t("quiz.results.breakdown")}</p>
          <p style={{ fontSize: 13, color: "var(--ink-mute)", marginTop: 6 }}>
            {t("quiz.results.breakdownBody")}
          </p>
        </div>

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
    <div className="nd-kpi" style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontFamily: "'JetBrains Mono',monospace", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-mute)", fontWeight: 700 }}>
        {icon}
        {label}
      </div>
      <strong className="nd-kpi-num" style={{ fontSize: 22, marginTop: 4 }}>{value}</strong>
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
    <div
      style={{
        borderRadius: 14,
        border: `1.5px solid ${answer.isCorrect ? "var(--green)" : "#f87171"}`,
        background: answer.isCorrect ? "var(--green-soft)" : "#fff1f2",
        padding: "16px 20px",
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-mute)", fontWeight: 700, marginBottom: 4 }}>
            #{index + 1}
          </p>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", margin: 0, lineHeight: 1.4, wordBreak: "break-word" }}>
            {answer.questionText || "—"}
          </h3>
        </div>
        <span
          className={answer.isCorrect ? "nd-tag nd-tag-green" : "nd-tag"}
          style={answer.isCorrect ? {} : { background: "#fff1f2", borderColor: "#f87171", color: "#be123c" }}
        >
          {answer.isCorrect ? (
            <Check style={{ width: 11, height: 11 }} />
          ) : (
            <X style={{ width: 11, height: 11 }} />
          )}
          {answer.isCorrect ? correctText : wrongText}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ borderRadius: 10, border: "1px solid var(--line)", background: "#fff", padding: "10px 14px", fontSize: 13, color: "var(--ink)" }}>
          <p style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-mute)", fontWeight: 700, marginBottom: 6 }}>
            {yourLabel}
          </p>
          {yourAnswerNode}
        </div>
        <div style={{ borderRadius: 10, border: "1.5px solid var(--green)", background: "var(--green-soft)", padding: "10px 14px", fontSize: 13, color: "var(--ink)" }}>
          <p style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--green)", fontWeight: 700, marginBottom: 6 }}>
            {correctLabel}
          </p>
          {correctAnswerNode}
        </div>
      </div>
    </div>
  );
}
