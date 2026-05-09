import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getCurrentUser } from "@/server/auth";
import { getNUETAttempt } from "@/server/integrations/go-backend/nuet";
import { NUETReviewClient } from "./client";
import { PrintButton } from "@/components/nuet/print-button";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  return {
    title: t("nuet.review.metaTitle"),
    description: t("nuet.review.metaDesc"),
  };
}

export default async function NUETAttemptReviewPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="page-shell py-10">
        <p>{t("nuet.signInRequired")}</p>
        <Link
          href="/login"
          className="mt-4 inline-block text-[var(--primary)] hover:underline"
        >
          {t("auth.signIn")}
        </Link>
      </div>
    );
  }

  const attempt = await getNUETAttempt(user.id, attemptId).catch(() => null);
  if (!attempt) notFound();

  const evaluations = attempt.evaluations ?? [];
  const totalQuestions = evaluations.length;
  const correctCount = evaluations.filter((e) => e.correct).length;

  const headerTitle =
    attempt.attemptType === "pdf_test"
      ? attempt.pdfTestName || t("nuet.pdfTest.title")
      : attempt.attemptType === "full_mock"
        ? t("nuet.simulator.title")
        : attempt.topicTitle || t("nuet.mod.practice");

  return (
    <div className="page-shell print-paper py-6 sm:py-10">
      <Link
        href="/nuet/history"
        className="print-hide inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("nuet.review.backToHistory")}
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
            {t("nuet.review.title")}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {headerTitle} · {new Date(attempt.createdAt).toLocaleString(locale)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="print-hide">
            <PrintButton />
          </div>
          <Stat
            label={t("nuet.review.score")}
            value={String(attempt.scoreTotal)}
            highlight
          />
          <Stat
            label={t("nuet.sectionMath")}
            value={String(attempt.scoreMath)}
          />
          <Stat
            label={t("nuet.sectionCT")}
            value={String(attempt.scoreCt)}
          />
          {totalQuestions > 0 ? (
            <Stat
              label={t("nuet.history.correct")}
              value={t("nuet.review.correctOfTotal", {
                correct: correctCount,
                total: totalQuestions,
              })}
            />
          ) : null}
        </div>
      </header>

      {!attempt.scoreAvailable && attempt.scoreReason ? (
        <p className="mt-4 rounded-lg border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200">
          {attempt.scoreReason}
        </p>
      ) : null}

      <div className="mt-8">
        {evaluations.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-secondary)]">
            {t("nuet.review.unavailable")}
          </p>
        ) : (
          <NUETReviewClient evaluations={evaluations} />
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-end leading-tight">
      <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </span>
      <span
        className={`font-mono text-sm font-semibold ${
          highlight ? "text-[var(--primary)]" : "text-[var(--text-primary)]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
