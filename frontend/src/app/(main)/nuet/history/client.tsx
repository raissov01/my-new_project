"use client";

import { useMemo } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";
import type { NUETAttempt } from "@/server/integrations/go-backend/nuet";

export function NUETHistoryClient({
  attempts,
  locale,
}: {
  attempts: NUETAttempt[];
  locale: string;
}) {
  const { t } = useLocale();

  const scoredAttempts = useMemo(
    () => attempts.filter((attempt) => attempt.status === "completed" && attempt.scoreAvailable),
    [attempts]
  );

  const chartData = useMemo(
    () =>
      scoredAttempts
        .slice()
        .reverse()
        .map((attempt) => ({
          date: new Date(attempt.createdAt).toLocaleDateString(locale, {
            month: "short",
            day: "2-digit",
          }),
          total: attempt.scoreTotal,
          math: attempt.scoreMath,
          ct: attempt.scoreCt,
        })),
    [locale, scoredAttempts]
  );

  return (
    <div className="space-y-6">
      {attempts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-secondary)]">
          {t("nuet.history.empty")}
        </div>
      ) : (
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {t("nuet.history.chartTitle")}
            </h3>
          </div>

          {chartData.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-base)] p-6 text-sm text-[var(--text-secondary)]">
              {t("nuet.history.chartEmpty")}
            </div>
          ) : (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={{ stroke: "var(--border)" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, 240]}
                    tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={{ stroke: "var(--border)" }}
                    width={36}
                  />
                  <Tooltip content={HistoryTooltip} />
                  <Legend wrapperStyle={{ color: "var(--text-secondary)", fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name={t("nuet.history.totalScore")}
                    stroke="var(--blue)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="math"
                    name={t("nuet.sectionMath")}
                    stroke="var(--success)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ct"
                    name={t("nuet.sectionCT")}
                    stroke="var(--yellow)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      )}

      <div className="space-y-3">
        {attempts.map((attempt) => (
          <article key={attempt.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-[var(--text-primary)]">
                  {attempt.attemptType === "pdf_test"
                    ? attempt.pdfTestName || t("nuet.pdfTest.title")
                    : attempt.attemptType === "full_mock"
                      ? t("nuet.simulator.title")
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

            <div className="mt-4 grid gap-3 sm:grid-cols-5">
              <InfoTile label={t("nuet.history.status")} value={attempt.status} />
              <InfoTile label={t("nuet.sectionMath")} value={String(attempt.scoreMath)} />
              <InfoTile label={t("nuet.sectionCT")} value={String(attempt.scoreCt)} />
              <InfoTile label={t("nuet.history.correct")} value={String(attempt.correctMath + attempt.correctCt)} />
              <InfoTile label={t("ielts.dashboard.violations")} value={String(attempt.violationCount)} />
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

function HistoryTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-xs shadow-md">
      <p className="font-mono font-semibold text-[var(--text-primary)]">{label}</p>
      <ul className="mt-1 space-y-0.5">
        {payload.map((entry) => (
          <li key={String(entry.dataKey)} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: entry.color ?? "var(--text-secondary)" }}
              />
              {entry.name}
            </span>
            <span className="font-mono text-[var(--text-primary)]">
              {(Number(entry.value) || 0).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
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
