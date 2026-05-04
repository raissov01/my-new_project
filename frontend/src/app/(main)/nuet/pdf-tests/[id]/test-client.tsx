"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, FileText } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import type { NUETPDFTest } from "@/server/integrations/go-backend/nuet";
import { submitNUETPDFTestAttempt } from "../../simulator/actions";

const options = ["", "A", "B", "C", "D", "E"] as const;

export function NUETPDFTestClient({ test }: { test: NUETPDFTest }) {
  const { t } = useLocale();
  const [answers, setAnswers] = useState<string[]>(() => Array.from({ length: test.questionCount }, () => ""));
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof submitNUETPDFTestAttempt>> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const answeredCount = useMemo(() => answers.filter(Boolean).length, [answers]);
  const wrongNumbers = (result?.evaluations ?? []).filter((item) => !item.correct).map((item) => item.question);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await submitNUETPDFTestAttempt({
        pdfTestId: test.id,
        answers: answers as Array<"A" | "B" | "C" | "D" | "E" | "">,
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit test");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <FileText className="h-4 w-4 text-[var(--primary)]" />
            {t("nuet.pdfTest.pdfPreview")}
          </div>
          <a
            href={`/api/v1/files/${encodeURI(test.pdfPath)}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-[var(--primary)] hover:underline"
          >
            {t("nuet.pdfTest.openPdf")}
          </a>
        </div>
        <iframe
          title={test.name}
          src={`/api/v1/files/${encodeURI(test.pdfPath)}`}
          className="min-h-[900px] w-full bg-white"
        />
      </section>

      <aside className="space-y-5">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t("nuet.pdfTest.answerSheet")}</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {t("nuet.pdfTest.answerSheetMeta")
              .replace("{answered}", String(answeredCount))
              .replace("{total}", String(test.questionCount))}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {answers.map((value, index) => (
              <label key={index} className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-3 py-2">
                <span className="mb-2 block text-xs font-semibold text-[var(--text-muted)]">#{index + 1}</span>
                <select
                  value={value}
                  onChange={(event) =>
                    setAnswers((current) =>
                      current.map((item, itemIndex) => (itemIndex === index ? event.target.value : item))
                    )
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-2 text-sm text-[var(--text-primary)]"
                >
                  {options.map((option) => (
                    <option key={option || "empty"} value={option}>
                      {option || "—"}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          ) : null}

          <div className="mt-5">
            <Button onClick={() => void handleSubmit()} isLoading={submitting} className="w-full">
              {t("nuet.pdfTest.submit")}
            </Button>
          </div>
        </section>

        {result ? (
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{t("nuet.pdfTest.resultTitle")}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{t("nuet.pdfTest.savedToHistory")}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <InfoTile label={t("nuet.sectionMath")} value={`${result.scoreMath}/120`} />
              <InfoTile label={t("nuet.sectionCT")} value={`${result.scoreCt}/120`} />
              <InfoTile label={t("nuet.statMaxScore")} value={`${result.scoreTotal}/240`} />
            </div>
            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] p-4 text-sm text-[var(--text-secondary)]">
              {result.scoreAvailable ? (
                wrongNumbers.length > 0 ? (
                  <p>{t("nuet.pdfTest.wrongNumbers").replace("{items}", wrongNumbers.join(", "))}</p>
                ) : (
                  <p>{t("nuet.pdfTest.allCorrect")}</p>
                )
              ) : (
                <p>{result.scoreReason || t("nuet.pdfTest.partialResult")}</p>
              )}
            </div>
            <div className="mt-4">
              <Link href="/nuet/history" className="text-sm text-[var(--primary)] hover:underline">
                {t("nuet.pdfTest.viewHistory")}
              </Link>
            </div>
          </section>
        ) : null}
      </aside>
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
