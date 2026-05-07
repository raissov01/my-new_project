"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";
import type { NUETAttempt } from "@/server/integrations/go-backend/nuet";

type ChartFilter = "all" | "full_mock" | "section_math" | "section_ct" | "topic_practice";

const CHART_LIMIT = 10;
const PASSING_THRESHOLD = 120;

export function NUETHistoryClient({
  attempts,
  locale,
}: {
  attempts: NUETAttempt[];
  locale: string;
}) {
  const { t } = useLocale();
  const [filter, setFilter] = useState<ChartFilter>("all");

  const scoredAttempts = useMemo(
    () => attempts.filter((attempt) => attempt.status === "completed" && attempt.scoreAvailable),
    [attempts]
  );

  const filteredAttempts = useMemo(
    () => scoredAttempts.filter((attempt) => matchesFilter(attempt, filter)),
    [scoredAttempts, filter]
  );

  const chartAttempts = useMemo(
    () => filteredAttempts.slice(0, CHART_LIMIT).reverse(),
    [filteredAttempts]
  );

  const chartData = useMemo(
    () =>
      chartAttempts.map((attempt, index) => ({
        x: `${t("nuet.history.attemptShort")}${index + 1}`,
        timestamp: new Date(attempt.createdAt).toLocaleString(locale, {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
        total: attempt.scoreTotal,
        math: attempt.scoreMath,
        ct: attempt.scoreCt,
      })),
    [chartAttempts, locale, t]
  );

  const yDomain = filterYDomain(filter, chartAttempts);
  const showPassingLine = filter === "all" || filter === "full_mock";
  const lineConfig = filterLineConfig(filter);

  const summary = useMemo(() => {
    if (chartAttempts.length === 0) return null;
    const scores = chartAttempts.map((a) => primaryScore(a, filter));
    const current = scores[scores.length - 1];
    const best = Math.max(...scores);
    const previous = scores.length > 1 ? scores[scores.length - 2] : null;
    const delta = previous === null ? null : current - previous;
    return { current, best, delta };
  }, [chartAttempts, filter]);

  const filterOptions: Array<{ value: ChartFilter; label: string }> = [
    { value: "all", label: t("nuet.history.filterAll") },
    { value: "full_mock", label: t("nuet.history.filterMock") },
    { value: "section_math", label: t("nuet.history.filterMath") },
    { value: "section_ct", label: t("nuet.history.filterCT") },
    { value: "topic_practice", label: t("nuet.history.filterTopic") },
  ];

  return (
    <div className="space-y-6">
      {attempts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-secondary)]">
          {t("nuet.history.empty")}
        </div>
      ) : (
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {t("nuet.history.chartTitle")}
              </h3>
              {chartAttempts.length > 0 ? (
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {t("nuet.history.lastN").replace("{n}", String(chartAttempts.length))}
                </p>
              ) : null}
            </div>
            {summary ? (
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <SummaryStat label={t("nuet.history.currentScore")} value={summary.current} />
                <SummaryStat label={t("nuet.history.bestScore")} value={summary.best} highlight />
                {summary.delta !== null ? (
                  <SummaryStat
                    label={t("nuet.history.delta")}
                    value={summary.delta}
                    tone={summary.delta > 0 ? "up" : summary.delta < 0 ? "down" : "neutral"}
                    showSign
                  />
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">{t("nuet.history.filterLabel")}</span>
            {filterOptions.map((option) => {
              const active = filter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    active
                      ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-secondary)] hover:border-[var(--primary)]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {chartData.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-base)] p-6 text-center text-sm text-[var(--text-secondary)]">
              <p>{t("nuet.history.chartEmpty")}</p>
              {filter === "all" || filter === "full_mock" ? (
                <p className="mt-2 text-xs text-[var(--text-muted)]">{t("nuet.history.startCta")}</p>
              ) : null}
            </div>
          ) : (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="x"
                    tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={{ stroke: "var(--border)" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={yDomain}
                    tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={{ stroke: "var(--border)" }}
                    width={36}
                  />
                  <Tooltip content={HistoryTooltip} />
                  <Legend wrapperStyle={{ color: "var(--text-secondary)", fontSize: 12 }} />
                  {showPassingLine ? (
                    <ReferenceLine
                      y={PASSING_THRESHOLD}
                      stroke="var(--primary)"
                      strokeDasharray="4 4"
                      label={{
                        value: t("nuet.history.passingLine"),
                        position: "insideTopRight",
                        fill: "var(--primary)",
                        fontSize: 11,
                      }}
                    />
                  ) : null}
                  {lineConfig.includes("total") ? (
                    <Line
                      type="monotone"
                      dataKey="total"
                      name={t("nuet.history.totalScore")}
                      stroke="var(--blue)"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  ) : null}
                  {lineConfig.includes("math") ? (
                    <Line
                      type="monotone"
                      dataKey="math"
                      name={t("nuet.sectionMath")}
                      stroke="var(--success)"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  ) : null}
                  {lineConfig.includes("ct") ? (
                    <Line
                      type="monotone"
                      dataKey="ct"
                      name={t("nuet.sectionCT")}
                      stroke="var(--yellow)"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  ) : null}
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

            <div className="mt-4 flex justify-end">
              <Link
                href={`/nuet/history/${attempt.id}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline"
              >
                {t("nuet.review.openLink")}
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function matchesFilter(attempt: NUETAttempt, filter: ChartFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "full_mock":
      return attempt.attemptType === "full_mock" || attempt.attemptType === "pdf_test";
    case "section_math":
      return attempt.attemptType === "section_practice" && attempt.section === "math";
    case "section_ct":
      return attempt.attemptType === "section_practice" && attempt.section === "critical_thinking";
    case "topic_practice":
      return attempt.attemptType === "topic_practice";
  }
}

function primaryScore(attempt: NUETAttempt, filter: ChartFilter): number {
  if (filter === "section_math") return attempt.scoreMath;
  if (filter === "section_ct") return attempt.scoreCt;
  return attempt.scoreTotal;
}

function filterYDomain(filter: ChartFilter, chartAttempts: NUETAttempt[]): [number, number | "auto"] {
  if (filter === "all" || filter === "full_mock") return [0, 240];
  if (filter === "section_math" || filter === "section_ct") return [0, 120];
  const max = chartAttempts.reduce((acc, a) => Math.max(acc, a.scoreTotal), 0);
  return [0, Math.max(max, 10)];
}

function filterLineConfig(filter: ChartFilter): Array<"total" | "math" | "ct"> {
  switch (filter) {
    case "section_math":
      return ["math"];
    case "section_ct":
      return ["ct"];
    case "topic_practice":
      return ["total"];
    default:
      return ["total", "math", "ct"];
  }
}

function HistoryTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const datum = payload[0]?.payload as { x?: string; timestamp?: string } | undefined;

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-xs shadow-md">
      <p className="font-mono font-semibold text-[var(--text-primary)]">{datum?.x}</p>
      {datum?.timestamp ? (
        <p className="mt-0.5 text-[var(--text-muted)]">{datum.timestamp}</p>
      ) : null}
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

function SummaryStat({
  label,
  value,
  tone = "neutral",
  highlight = false,
  showSign = false,
}: {
  label: string;
  value: number;
  tone?: "up" | "down" | "neutral";
  highlight?: boolean;
  showSign?: boolean;
}) {
  const valueColor =
    tone === "up"
      ? "text-emerald-600"
      : tone === "down"
        ? "text-rose-600"
        : highlight
          ? "text-[var(--primary)]"
          : "text-[var(--text-primary)]";
  const display = showSign && value > 0 ? `+${value}` : String(value);
  return (
    <div className="flex flex-col items-end leading-tight">
      <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{label}</span>
      <span className={`font-mono text-sm font-semibold ${valueColor}`}>{display}</span>
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
