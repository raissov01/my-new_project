import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getCurrentUser } from "@/server/auth";
import { listNUETPDFTests } from "@/server/integrations/go-backend/nuet";
import { listNUETParsedMocks } from "@/server/nuet/mock-json";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  return {
    title: t("nuet.pdfTest.metaTitle"),
    description: t("nuet.pdfTest.metaDesc"),
    alternates: { canonical: "/nuet/pdf-tests" },
  };
}

export default async function NUETPDFTestsPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const user = await getCurrentUser();
  const [data, parsedIndex] = await Promise.all([
    listNUETPDFTests(user?.id ?? "").catch(() => ({ items: [] })),
    listNUETParsedMocks().catch(() => []),
  ]);

  const parsedByName = new Map(
    parsedIndex.map((item) => [item.source_file.replace(/\.pdf$/i, ""), item])
  );

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
        {t("nuet.pdfTest.title")}
      </h1>
      <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">
        {t("nuet.pdfTest.subtitle")}
      </p>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {data.items.map((test) => (
          <Link
            key={test.id}
            href={`/nuet/pdf-tests/${test.id}`}
            className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 transition hover:border-[var(--primary)]"
          >
            {(() => {
              const parsed = parsedByName.get(test.name);
              return (
                <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                  <FileText className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-base font-semibold text-[var(--text-primary)]">{test.name}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {test.testType === "mock_test" ? t("nuet.typeMock") : t("nuet.typeTrial")} · {test.questionCount} {t("nuet.questions")}
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  test.isScorable ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {test.isScorable ? t("nuet.pdfTest.scored") : t("nuet.pdfTest.practiceOnly")}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <InfoTile label={t("nuet.sectionMath")} value={String(test.mathCount)} />
              <InfoTile label={t("nuet.sectionCT")} value={String(test.ctCount)} />
              <InfoTile label={t("nuet.pdfTest.answerKeys")} value={`${test.answerKeyCount}/${test.questionCount}`} />
            </div>

            {parsed ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <InfoTile label={t("nuet.pdfTest.parsedQuestions")} value={String(parsed.question_count)} />
                <InfoTile label={t("nuet.pdfTest.parsedAnswers")} value={String(parsed.answer_count)} />
                <InfoTile label={t("nuet.pdfTest.parseWarnings")} value={String(parsed.warnings.length)} />
              </div>
            ) : null}

            <div className="mt-4 flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] p-4 text-sm text-[var(--text-secondary)]">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
              <span>
                {test.isScorable ? t("nuet.pdfTest.autoScoreReady") : t("nuet.pdfTest.autoScorePartial")}
              </span>
            </div>
            {parsed ? (
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                {parsed.warnings.length > 0
                  ? t("nuet.pdfTest.parsedWithWarnings")
                  : t("nuet.pdfTest.parsedReady")}
              </p>
            ) : null}
                </>
              );
            })()}
          </Link>
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
