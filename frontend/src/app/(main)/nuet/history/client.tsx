"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, GitCompare, Search, X } from "lucide-react";
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
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date_desc" | "score_desc" | "score_asc">("date_desc");
  // Compare-mode picks up to 2 attempt IDs. Once the user selects two, a
  // side-by-side card renders above the list. Click the X on either to
  // unselect; "Reset" clears both.
  const [compareIds, setCompareIds] = useState<string[]>([]);
  function toggleCompare(id: string) {
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((c) => c !== id);
      if (current.length >= 2) return [current[1], id];
      return [...current, id];
    });
  }
  const compareAttempts = compareIds
    .map((id) => attempts.find((a) => a.id === id))
    .filter((a): a is NUETAttempt => Boolean(a));

  // List-section filtering — independent from the chart filter so the user
  // can keep their chart view while narrowing the list. Matches against the
  // attempt title (test name / topic / mock label) and the date string.
  const visibleAttempts = useMemo(() => {
    const q = query.trim().toLowerCase();
    let items = attempts;
    if (q) {
      items = items.filter((a) => {
        const title =
          a.attemptType === "pdf_test"
            ? a.pdfTestName ?? ""
            : a.attemptType === "full_mock"
              ? "mock simulator"
              : a.topicTitle ?? a.attemptType;
        const haystack = `${title} ${a.attemptType} ${a.section ?? ""} ${a.createdAt}`.toLowerCase();
        return haystack.includes(q);
      });
    }
    const sorted = [...items];
    if (sortBy === "score_desc") {
      sorted.sort((a, b) => b.scoreTotal - a.scoreTotal);
    } else if (sortBy === "score_asc") {
      sorted.sort((a, b) => a.scoreTotal - b.scoreTotal);
    } else {
      sorted.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    }
    return sorted;
  }, [attempts, query, sortBy]);

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

      {compareAttempts.length === 2 ? (
        <CompareCard
          a={compareAttempts[0]}
          b={compareAttempts[1]}
          locale={locale}
          onClear={() => setCompareIds([])}
          labels={{
            heading: t("nuet.history.compareHeading"),
            sub: t("nuet.history.compareSub"),
            clear: t("nuet.history.compareClear"),
            total: t("nuet.history.totalScore"),
            math: t("nuet.sectionMath"),
            ct: t("nuet.sectionCT"),
            correct: t("nuet.history.correct"),
            time: t("nuet.history.timeTaken"),
            improvement: t("nuet.history.improvement"),
          }}
        />
      ) : compareAttempts.length === 1 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-base)] p-3 text-center text-xs text-[var(--text-muted)]">
          {t("nuet.history.compareHint")}
        </div>
      ) : null}

      {attempts.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-3 py-1.5 text-sm">
            <Search className="h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("nuet.history.searchPlaceholder")}
              className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
          >
            <option value="date_desc">{t("nuet.history.sortDateDesc")}</option>
            <option value="score_desc">{t("nuet.history.sortScoreDesc")}</option>
            <option value="score_asc">{t("nuet.history.sortScoreAsc")}</option>
          </select>
          <span className="font-mono text-xs text-[var(--text-muted)]">
            {visibleAttempts.length} / {attempts.length}
          </span>
        </div>
      ) : null}

      <div className="space-y-3">
        {visibleAttempts.length === 0 && query ? (
          <p className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-base)] p-6 text-center text-sm text-[var(--text-muted)]">
            {t("nuet.history.searchEmpty")}
          </p>
        ) : null}
        {visibleAttempts.map((attempt) => {
          const isPicked = compareIds.includes(attempt.id);
          return (
          <article key={attempt.id} className={`rounded-2xl border bg-[var(--bg-surface)] p-5 transition ${isPicked ? "border-[var(--primary)] ring-2 ring-[var(--primary-soft)]" : "border-[var(--border)]"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <label className="mt-1 inline-flex cursor-pointer items-center" title={t("nuet.history.compareCheckTooltip")}>
                  <input
                    type="checkbox"
                    checked={isPicked}
                    onChange={() => toggleCompare(attempt.id)}
                    aria-label={t("nuet.history.compareCheckTooltip")}
                    className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
                  />
                </label>
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
          );
        })}
      </div>
    </div>
  );
}

function CompareCard({
  a,
  b,
  locale,
  onClear,
  labels,
}: {
  a: NUETAttempt;
  b: NUETAttempt;
  locale: string;
  onClear: () => void;
  labels: {
    heading: string;
    sub: string;
    clear: string;
    total: string;
    math: string;
    ct: string;
    correct: string;
    time: string;
    improvement: string;
  };
}) {
  // Order chronologically so the "improvement" delta is always
  // newer-minus-older, regardless of which checkbox the user clicked first.
  const [older, newer] =
    new Date(a.createdAt) <= new Date(b.createdAt) ? [a, b] : [b, a];
  const totalDelta = newer.scoreTotal - older.scoreTotal;
  const mathDelta = newer.scoreMath - older.scoreMath;
  const ctDelta = newer.scoreCt - older.scoreCt;
  const correctDelta =
    newer.correctMath + newer.correctCt - (older.correctMath + older.correctCt);
  return (
    <section className="rounded-2xl border-2 border-[var(--primary)] bg-[var(--bg-surface)] p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <GitCompare className="mt-1 h-5 w-5 text-[var(--primary)]" />
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{labels.heading}</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{labels.sub}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:border-rose-300 hover:text-rose-600"
        >
          <X className="h-3.5 w-3.5" />
          {labels.clear}
        </button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <CompareCol attempt={older} locale={locale} olderLabel={labels.improvement} isOlder={true} />
        <div className="hidden lg:block lg:border-l lg:border-[var(--border)]" />
        <CompareCol attempt={newer} locale={locale} olderLabel={labels.improvement} isOlder={false} />
      </div>
      <div className="mt-4 grid gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] p-4 sm:grid-cols-4">
        <DeltaPill label={labels.total} value={totalDelta} />
        <DeltaPill label={labels.math} value={mathDelta} />
        <DeltaPill label={labels.ct} value={ctDelta} />
        <DeltaPill label={labels.correct} value={correctDelta} />
      </div>
    </section>
  );
}

function CompareCol({
  attempt,
  locale,
  isOlder,
}: {
  attempt: NUETAttempt;
  locale: string;
  olderLabel: string;
  isOlder: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${isOlder ? "border-[var(--border)] bg-[var(--bg-base)]" : "border-emerald-200 bg-emerald-50/30"}`}>
      <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
        {new Date(attempt.createdAt).toLocaleString(locale, {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
      <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{attempt.scoreTotal}</p>
      <p className="text-xs text-[var(--text-secondary)]">/240</p>
      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-[var(--text-secondary)]">Math</dt>
          <dd className="font-mono font-semibold text-[var(--text-primary)]">{attempt.scoreMath}/120</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[var(--text-secondary)]">CT</dt>
          <dd className="font-mono font-semibold text-[var(--text-primary)]">{attempt.scoreCt}/120</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[var(--text-secondary)]">Correct</dt>
          <dd className="font-mono font-semibold text-[var(--text-primary)]">
            {attempt.correctMath + attempt.correctCt}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function DeltaPill({ label, value }: { label: string; value: number }) {
  const tone =
    value > 0
      ? "text-emerald-600"
      : value < 0
        ? "text-rose-600"
        : "text-[var(--text-secondary)]";
  const sign = value > 0 ? "+" : "";
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{label}</span>
      <span className={`font-mono text-sm font-semibold ${tone}`}>
        {sign}
        {value}
      </span>
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
