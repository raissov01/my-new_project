"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock3, Loader2, Trash2 } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { abandonNUETAttempt } from "./simulator/actions";
import type { NUETAttempt } from "@/server/integrations/go-backend/nuet";

export function NUETInProgressCard({
  attempt,
  locale,
}: {
  attempt: NUETAttempt;
  locale: string;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const continueHref = inferContinueHref(attempt);
  const label = inferAttemptLabel(attempt, t);

  function handleAbandon() {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      try {
        await abandonNUETAttempt(attempt.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to abandon");
      }
    });
  }

  return (
    <article className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] p-4">
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
          {t(`nuet.inProgress.type.${attempt.attemptType}`)}
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">
          {label}
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-[var(--text-muted)]">
          <Clock3 className="h-3 w-3" />
          {new Date(attempt.startedAt).toLocaleString(locale)}
        </p>
        {error ? (
          <p className="mt-2 text-xs text-rose-600">{error}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {continueHref ? (
          <Link
            href={continueHref}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            {t("nuet.inProgress.continue")}
            <ArrowRight className="h-3 w-3" />
          </Link>
        ) : null}
        <button
          type="button"
          onClick={handleAbandon}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-rose-400 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Trash2 className="h-3 w-3" />
          )}
          {t("nuet.inProgress.abandon")}
        </button>
      </div>
    </article>
  );
}

function inferContinueHref(attempt: NUETAttempt): string | null {
  switch (attempt.attemptType) {
    case "full_mock":
      return "/nuet/simulator";
    case "section_practice":
      return "/nuet/simulator";
    case "pdf_test":
      return attempt.pdfTestId ? `/nuet/pdf-tests/${attempt.pdfTestId}` : "/nuet/pdf-tests";
    case "topic_practice":
      return attempt.topicSlug ? `/nuet/practice/${attempt.topicSlug}` : "/nuet/practice";
    default:
      return null;
  }
}

function inferAttemptLabel(
  attempt: NUETAttempt,
  t: (key: string) => string
): string {
  if (attempt.attemptType === "pdf_test") {
    return attempt.pdfTestName || t("nuet.pdfTest.title");
  }
  if (attempt.attemptType === "full_mock") {
    return t("nuet.simulator.title");
  }
  if (attempt.attemptType === "topic_practice") {
    return attempt.topicTitle || t("nuet.mod.practice");
  }
  return t("nuet.mod.practice");
}
