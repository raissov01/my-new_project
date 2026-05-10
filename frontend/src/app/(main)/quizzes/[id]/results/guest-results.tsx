"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, RotateCw, Timer, Trophy, X } from "lucide-react";
import { createTranslator, type Locale } from "@/lib/shared/i18n";
import { QuizText } from "@/components/quiz/quiz-text";

type GuestAnswer = {
  questionId: string;
  questionText: string;
  questionType: string;
  selectedOption: string | null;
  textAnswer: string | null;
  orderAnswer: string[] | null;
  correctOption: string;
  isCorrect: boolean;
  timeSpent: number;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  optionE?: string;
};

type GuestResult = {
  score: number;
  totalQuestions: number;
  percentage: number;
  timeSpent: number;
  answers: GuestAnswer[];
};

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

function longestStreak(answers: GuestAnswer[]): number {
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

function gradeKey(pct: number): string {
  if (pct >= 90) return "quiz.results.gradeExcellent";
  if (pct >= 70) return "quiz.results.gradeGood";
  if (pct >= 50) return "quiz.results.gradeAverage";
  return "quiz.results.gradeTryAgain";
}

export function GuestResultsPage({
  quizId,
  locale,
  resultKey,
}: {
  quizId: string;
  locale: Locale;
  resultKey?: string;
}) {
  const t = createTranslator(locale);
  const [result, setResult] = useState<GuestResult | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    // Hydration-safe sessionStorage read: must run after mount (server can't
    // see sessionStorage), so the synchronous setState is intentional.
    try {
      const raw = sessionStorage.getItem(`guest_quiz_result_${resultKey ?? quizId}`);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!raw) { setMissing(true); return; }
      setResult(JSON.parse(raw) as GuestResult);
    } catch {
      setMissing(true);
    }
  }, [quizId, resultKey]);

  if (missing) {
    return (
      <div className="page-shell py-10" style={{ textAlign: "center" }}>
        <p role="alert" style={{ color: "var(--ink-soft)", marginBottom: 16 }}>{t("quiz.results.notFound")}</p>
        <Link href={`/quizzes/${quizId}/play`} className="nd-btn-primary">
          {t("quiz.results.tryAgain")}
        </Link>
      </div>
    );
  }

  if (!result) return null;

  const { score, totalQuestions, percentage, timeSpent, answers } = result;
  const grade = t(gradeKey(percentage));
  const avgSeconds = totalQuestions > 0 ? timeSpent / totalQuestions : 0;
  const maxStreak = longestStreak(answers);
  const wrongCount = answers.filter((a) => !a.isCorrect).length;

  const dashArray = 2 * Math.PI * 88;
  const dashOffset = dashArray * (1 - percentage / 100);

  return (
    <div className="page-shell py-6 sm:py-10">
      {/* Sign-up CTA banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          borderRadius: 14,
          padding: "16px 20px",
          marginBottom: 28,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>
            <span aria-hidden>🎓</span> {t("quiz.results.guestSaveCtaTitle")}
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>
            {t("quiz.results.guestSaveCtaBody")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <Link
            href={`/signup?redirect=${encodeURIComponent(`/quizzes/${quizId}/play`)}`}
            style={{
              background: "#fff",
              color: "#6366f1",
              borderRadius: 10,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            {t("quiz.results.guestSignup")}
          </Link>
          <Link
            href={`/login?redirect=${encodeURIComponent(`/quizzes/${quizId}/play`)}`}
            style={{
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              borderRadius: 10,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            {t("quiz.results.guestLogin")}
          </Link>
        </div>
      </div>

      {/* Page head */}
      <div className="nd-page-head nd-reveal nd-d1">
        <div>
          <p className="nd-eyebrow" style={{ marginTop: 8 }}>{t("quiz.results.title")}</p>
          <h1 className="nd-page-title" style={{ marginTop: 8 }}>{grade}</h1>
          <p className="nd-page-sub">
            {score}/{totalQuestions} · {percentage}%
          </p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="nd-kpi-grid nd-reveal nd-d2">
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">{t("quiz.results.scoreLabel")}</span>
          <strong className="nd-kpi-num">{score}/{totalQuestions}</strong>
        </div>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">{t("quiz.results.percentageLabel")}</span>
          <strong className="nd-kpi-num">{percentage}%</strong>
        </div>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">{t("quiz.results.totalTime")}</span>
          <strong className="nd-kpi-num">{formatDuration(timeSpent)}</strong>
        </div>
        <div className="nd-kpi">
          <span className="nd-kpi-lbl">{t("quiz.results.longestStreak")}</span>
          <strong className="nd-kpi-num">{maxStreak}</strong>
        </div>
      </div>

      <section className="nd-mock-shell nd-reveal nd-d3" style={{ marginBottom: 32, overflow: "hidden" }}>
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-[auto_1fr] lg:items-center" style={{ padding: "28px 32px" }}>
          <div
            className="relative mx-auto h-40 w-40 sm:h-48 sm:w-48 md:h-56 md:w-56"
            role="img"
            aria-label={`${score}/${totalQuestions} (${percentage}%)`}
          >
            <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" aria-hidden>
              <circle cx="100" cy="100" r="88" fill="none" stroke="var(--border)" strokeWidth="14" />
              <circle
                cx="100" cy="100" r="88" fill="none"
                stroke="url(#scoreGradientGuest)" strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
              />
              <defs>
                <linearGradient id="scoreGradientGuest" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center px-3">
              <div className="text-2xl font-bold tracking-[-0.05em] text-[var(--text-primary)] sm:text-3xl md:text-4xl">
                {score}/{totalQuestions}
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
                .replace("{score}", String(score))
                .replace("{total}", String(totalQuestions))}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="nd-kpi" style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontFamily: "'JetBrains Mono',monospace", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-mute)", fontWeight: 700 }}>
                  <Timer className="h-4 w-4" />
                  {t("quiz.results.totalTime")}
                </div>
                <strong className="nd-kpi-num" style={{ fontSize: 22, marginTop: 4 }}>{formatDuration(timeSpent)}</strong>
              </div>
              <div className="nd-kpi" style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontFamily: "'JetBrains Mono',monospace", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-mute)", fontWeight: 700 }}>
                  <Timer className="h-4 w-4" />
                  {t("quiz.results.avgPerQuestion")}
                </div>
                <strong className="nd-kpi-num" style={{ fontSize: 22, marginTop: 4 }}>{formatDuration(avgSeconds)}</strong>
              </div>
              <div className="nd-kpi" style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontFamily: "'JetBrains Mono',monospace", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-mute)", fontWeight: 700 }}>
                  <Trophy className="h-4 w-4" />
                  {t("quiz.results.longestStreak")}
                </div>
                <strong className="nd-kpi-num" style={{ fontSize: 22, marginTop: 4 }}>{maxStreak}</strong>
              </div>
            </div>

            <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 10 }}>
              <Link href={`/quizzes/${encodeURIComponent(quizId)}/play`} className="nd-btn-primary">
                <RotateCw style={{ width: 15, height: 15 }} />
                {t("quiz.results.retry")}
              </Link>
              {wrongCount > 0 ? (
                <Link
                  href={`/signup?redirect=${encodeURIComponent(`/quizzes/${quizId}/play`)}`}
                  className="nd-btn-soft"
                >
                  {t("quiz.results.signupToPracticeMistakes").replace("{n}", String(wrongCount))}
                </Link>
              ) : null}
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
          {answers.map((answer, idx) => (
            <GuestAnswerRow
              key={`${answer.questionId}-${idx}`}
              index={idx}
              answer={answer}
              correctText={t("quiz.play.correct")}
              wrongText={t("quiz.play.wrong")}
              yourLabel={t("quiz.results.yourAnswer")}
              correctLabel={t("quiz.results.correctAnswer")}
              skippedLabel={t("quiz.results.skipped")}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function GuestAnswerRow({
  index,
  answer,
  correctText,
  wrongText,
  yourLabel,
  correctLabel,
  skippedLabel,
}: {
  index: number;
  answer: GuestAnswer;
  correctText: string;
  wrongText: string;
  yourLabel: string;
  correctLabel: string;
  skippedLabel: string;
}) {
  const letterToText: Record<string, string> = {
    a: answer.optionA ?? "",
    b: answer.optionB ?? "",
    c: answer.optionC ?? "",
    d: answer.optionD ?? "",
    e: answer.optionE ?? "",
  };

  const selectedText = answer.selectedOption ? (letterToText[answer.selectedOption] ?? answer.textAnswer ?? "") : "";
  const correctOptionText = letterToText[answer.correctOption] ?? answer.correctOption;

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
            {answer.questionText ? <QuizText text={answer.questionText} /> : "—"}
          </h3>
        </div>
        <span
          className={answer.isCorrect ? "nd-tag nd-tag-green" : "nd-tag"}
          style={answer.isCorrect ? {} : { background: "#fff1f2", borderColor: "#f87171", color: "#be123c" }}
        >
          {answer.isCorrect ? <Check style={{ width: 11, height: 11 }} aria-hidden /> : <X style={{ width: 11, height: 11 }} aria-hidden />}
          {answer.isCorrect ? correctText : wrongText}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ borderRadius: 10, border: "1px solid var(--line)", background: "#fff", padding: "10px 14px", fontSize: 13, color: "var(--ink)" }}>
          <p style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-mute)", fontWeight: 700, marginBottom: 6 }}>
            {yourLabel}
          </p>
          {answer.selectedOption ? (
            <>
              <span style={{ fontWeight: 700, textTransform: "uppercase" }}>{answer.selectedOption}</span>
              {selectedText ? ` · ${selectedText}` : ""}
            </>
          ) : answer.textAnswer ? (
            <span style={{ fontWeight: 500 }}>{answer.textAnswer}</span>
          ) : (
            <span style={{ fontStyle: "italic", color: "var(--ink-mute)" }}>{skippedLabel}</span>
          )}
        </div>
        <div style={{ borderRadius: 10, border: "1.5px solid var(--green)", background: "var(--green-soft)", padding: "10px 14px", fontSize: 13, color: "var(--ink)" }}>
          <p style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--green)", fontWeight: 700, marginBottom: 6 }}>
            {correctLabel}
          </p>
          <span style={{ fontWeight: 700, textTransform: "uppercase" }}>{answer.correctOption}</span>
          {correctOptionText ? ` · ${correctOptionText}` : ""}
        </div>
      </div>
    </div>
  );
}
