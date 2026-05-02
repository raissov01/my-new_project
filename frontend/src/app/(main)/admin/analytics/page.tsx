import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { AnalyticsChart, type DailyStat } from "./AnalyticsChart";

export const metadata = { title: "Quizizz Analytics — Admin" };
export const dynamic = "force-dynamic";

interface Summary {
  today_active_users: number;
  week_active_users: number;
  month_active_users: number;
  currently_online: number;
  total_quiz_starts: number;
  total_quiz_finishes: number;
  completion_rate: number;
  total_answer_submissions: number;
}

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];

function clampRange(raw: string | string[] | undefined): Range {
  const n = parseInt(Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? ""), 10);
  return (RANGES as readonly number[]).includes(n) ? (n as Range) : 30;
}

interface PageProps {
  searchParams: Promise<{ days?: string }>;
}

export default async function AdminAnalyticsPage({ searchParams }: PageProps) {
  const auth = await requireAdmin();
  if (auth.redirectTo) redirect(auth.redirectTo);
  if (!auth.user) redirect("/login");

  const { days: daysParam } = await searchParams;
  const days = clampRange(daysParam);

  let summary: Summary | null = null;
  let daily: DailyStat[] = [];
  let loadError: string | null = null;

  try {
    const [s, d] = await Promise.all([
      fetchBackendJson<Summary>({
        path: "/api/v1/admin/quizizz/analytics/summary",
        userId: auth.user.id,
      }),
      fetchBackendJson<DailyStat[]>({
        path: `/api/v1/admin/quizizz/analytics/daily?days=${days}`,
        userId: auth.user.id,
      }),
    ]);
    summary = s;
    daily = d ?? [];
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load analytics";
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            Quizizz analytics
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Active users, quiz starts/finishes, and completion rate.
          </p>
        </div>
        <nav className="flex gap-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-1">
          {RANGES.map((r) => {
            const active = r === days;
            return (
              <Link
                key={r}
                href={`/admin/analytics?days=${r}`}
                className={
                  "rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold transition-colors " +
                  (active
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]")
                }
                aria-current={active ? "page" : undefined}
              >
                {r}d
              </Link>
            );
          })}
        </nav>
      </header>

      {loadError && (
        <div className="rounded-[var(--radius-md)] border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Couldn&apos;t load analytics.</p>
          <p className="mt-1">{loadError}</p>
        </div>
      )}

      {summary && <SummaryGrid summary={summary} />}

      {daily.length > 0 && <AnalyticsChart daily={daily} days={days} />}

      {daily.length > 0 && <DailyTable daily={daily} />}
    </div>
  );
}

function SummaryGrid({ summary }: { summary: Summary }) {
  const cards: { label: string; value: string; hint?: string }[] = [
    {
      label: "Online now",
      value: summary.currently_online.toLocaleString(),
      hint: "Last 5 minutes",
    },
    {
      label: "Active users today",
      value: summary.today_active_users.toLocaleString(),
    },
    {
      label: "Active users (7d)",
      value: summary.week_active_users.toLocaleString(),
    },
    {
      label: "Active users (30d)",
      value: summary.month_active_users.toLocaleString(),
    },
    {
      label: "Total quiz starts",
      value: summary.total_quiz_starts.toLocaleString(),
      hint: "All time",
    },
    {
      label: "Total quiz finishes",
      value: summary.total_quiz_finishes.toLocaleString(),
      hint: "All time",
    },
    {
      label: "Completion rate",
      value: `${summary.completion_rate.toFixed(1)}%`,
      hint: "Finishes ÷ starts",
    },
    {
      label: "Answer submissions",
      value: summary.total_answer_submissions.toLocaleString(),
      hint: "All time",
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-4"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
            {c.label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            {c.value}
          </p>
          {c.hint && (
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{c.hint}</p>
          )}
        </div>
      ))}
    </section>
  );
}

function DailyTable({ daily }: { daily: DailyStat[] }) {
  const rows = [...daily].reverse();
  return (
    <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)]">
      <div className="border-b border-[var(--border)] px-5 py-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Daily breakdown
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-soft)] text-xs uppercase tracking-wide text-[var(--text-secondary)]">
            <tr>
              <th className="px-5 py-2 text-left font-medium">Date</th>
              <th className="px-5 py-2 text-right font-medium">Active</th>
              <th className="px-5 py-2 text-right font-medium">Starts</th>
              <th className="px-5 py-2 text-right font-medium">Finishes</th>
              <th className="px-5 py-2 text-right font-medium">Completion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.date} className="border-t border-[var(--border)]">
                <td className="px-5 py-2 font-mono text-xs text-[var(--text-primary)]">
                  {r.date}
                </td>
                <td className="px-5 py-2 text-right tabular-nums text-[var(--text-primary)]">
                  {r.active_users.toLocaleString()}
                </td>
                <td className="px-5 py-2 text-right tabular-nums text-[var(--text-primary)]">
                  {r.quiz_starts.toLocaleString()}
                </td>
                <td className="px-5 py-2 text-right tabular-nums text-[var(--text-primary)]">
                  {r.quiz_finishes.toLocaleString()}
                </td>
                <td className="px-5 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                  {r.quiz_starts > 0 ? `${r.completion_rate.toFixed(1)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
