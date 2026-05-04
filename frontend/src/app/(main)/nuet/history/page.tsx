import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getCurrentUser } from "@/server/auth";
import { listNUETAttempts } from "@/server/integrations/go-backend/nuet";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  return {
    title: t("nuet.history.metaTitle"),
    description: t("nuet.history.metaDesc"),
    alternates: { canonical: "/nuet/history" },
  };
}

export default async function NUETHistoryPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="page-shell py-10">
        <p>{t("nuet.signInRequired")}</p>
        <Link href="/login" className="mt-4 inline-block text-[var(--primary)] hover:underline">
          {t("auth.signIn")}
        </Link>
      </div>
    );
  }

  const data = await listNUETAttempts(user.id, { limit: 50 }).catch(() => ({
    attempts: [],
    total: 0,
    limit: 50,
    offset: 0,
  }));

  return (
    <div className="page-shell py-6 sm:py-10">
      <Link
        href="/nuet"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("nuet.backToHub")}
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
        {t("nuet.history.title")}
      </h1>
      <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">{t("nuet.history.subtitle")}</p>

      <div className="mt-8 space-y-3">
        {data.attempts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-secondary)]">
            {t("nuet.history.empty")}
          </div>
        ) : null}

        {data.attempts.map((attempt) => (
          <article key={attempt.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-[var(--text-primary)]">
                  {attempt.attemptType === "pdf_test"
                    ? attempt.pdfTestName || t("nuet.pdfTest.title")
                    : attempt.topicTitle || t("nuet.mod.practice")}
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {attempt.attemptType} · {new Date(attempt.createdAt).toLocaleString(locale)}
                </p>
              </div>
              <span className="rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-3 py-1 text-sm font-semibold text-[var(--text-primary)]">
                {attempt.scoreTotal}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <InfoTile label={t("nuet.history.status")} value={attempt.status} />
              <InfoTile label={t("nuet.sectionMath")} value={String(attempt.scoreMath)} />
              <InfoTile label={t("nuet.sectionCT")} value={String(attempt.scoreCt)} />
              <InfoTile label={t("nuet.history.correct")} value={String(attempt.correctMath + attempt.correctCt)} />
            </div>

            {!attempt.scoreAvailable && attempt.scoreReason ? (
              <p className="mt-4 text-sm text-amber-700">{attempt.scoreReason}</p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
