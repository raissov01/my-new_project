import { redirect } from "next/navigation";
import { Coins, Sparkles, AlertCircle, Cpu } from "lucide-react";
import { requireAdmin } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { AdminPageHeader } from "../_components/coming-soon";
import { LineChart } from "../_components/line-chart";

export const metadata = { title: "AI cost — Admin" };
export const dynamic = "force-dynamic";

interface UsageWindow {
  events: number;
  errorEvents: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  avgLatencyMs: number;
}

interface BreakdownRow {
  key: string;
  events: number;
  tokens: number;
  costUsd: number;
}

interface SummaryResponse {
  last24h: UsageWindow;
  last7d: UsageWindow;
  last30d: UsageWindow;
  byModel: BreakdownRow[];
  byFeature: BreakdownRow[];
  byProvider: BreakdownRow[];
  topUsers: BreakdownRow[];
}

interface DailyPoint {
  day: string;
  events: number;
  tokens: number;
  costUsd: number;
  errors: number;
}

export default async function AdminAIUsagePage() {
  const auth = await requireAdmin();
  if (auth.redirectTo) redirect(auth.redirectTo);
  if (!auth.user) redirect("/login");

  let summary: SummaryResponse | null = null;
  let daily: DailyPoint[] = [];
  let loadError: string | null = null;
  try {
    [summary, daily] = await Promise.all([
      fetchBackendJson<SummaryResponse>({
        path: `/api/v1/admin/ai-usage/summary`,
        userId: auth.user.id,
      }),
      fetchBackendJson<DailyPoint[]>({
        path: `/api/v1/admin/ai-usage/daily?days=30`,
        userId: auth.user.id,
      }),
    ]);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load AI usage";
  }

  const chartData = daily.map((d) => ({
    date: d.day,
    cost: Math.round(d.costUsd * 100) / 100,
    tokens: d.tokens,
    events: d.events,
    errors: d.errors,
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="AI cost"
        description="LLM spend, tokens, and error rate aggregated from ai_usage_events. Recorded per call from instrumented features."
      />

      {loadError && (
        <div className="rounded-[var(--radius-md)] border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {summary && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CostTile label="Last 24h" w={summary.last24h} />
            <CostTile label="Last 7 days" w={summary.last7d} />
            <CostTile label="Last 30 days" w={summary.last30d} />
            <ErrorTile w={summary.last7d} />
          </section>

          {chartData.length > 0 && (
            <LineChart
              rangeLabel="Last 30 days · cost (USD) and events per day"
              data={chartData}
              series={[
                { key: "cost", label: "Cost (USD)", color: "#7c3aed" },
                { key: "events", label: "Events", color: "#0ea5e9" },
                { key: "errors", label: "Errors", color: "#ef4444" },
              ]}
            />
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <BreakdownTable
              icon={Cpu}
              title="By model"
              rows={summary.byModel}
              emptyHint="No AI events recorded in the last 30 days."
            />
            <BreakdownTable
              icon={Sparkles}
              title="By feature"
              rows={summary.byFeature}
              emptyHint="Instrument more features with aicost.Record() to populate this."
            />
            <BreakdownTable
              icon={Cpu}
              title="By provider"
              rows={summary.byProvider}
              emptyHint="No events yet."
            />
            <BreakdownTable
              icon={Coins}
              title="Top users (30d)"
              rows={summary.topUsers}
              emptyHint="No per-user spend yet."
            />
          </div>
        </>
      )}
    </div>
  );
}

function fmtUSD(n: number): string {
  if (n === 0) return "$0.00";
  if (n < 0.01) return "<$0.01";
  return `$${n.toFixed(2)}`;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

function CostTile({ label, w }: { label: string; w: UsageWindow }) {
  const totalTokens = w.promptTokens + w.completionTokens;
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--bg-soft)] text-[var(--primary)]">
        <Coins className="h-4 w-4" />
      </div>
      <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-[var(--text-primary)]">
        {fmtUSD(w.costUsd)}
      </div>
      <div className="mt-1 text-xs text-[var(--text-secondary)]">
        {w.events.toLocaleString()} events · {fmtTokens(totalTokens)} tokens
      </div>
    </div>
  );
}

function ErrorTile({ w }: { w: UsageWindow }) {
  const rate = w.events === 0 ? 0 : (w.errorEvents / w.events) * 100;
  const tone =
    rate >= 5 ? "text-red-600" : rate >= 1 ? "text-amber-600" : "text-green-600";
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--bg-soft)] ${tone}`}>
        <AlertCircle className="h-4 w-4" />
      </div>
      <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">7d error rate</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${tone}`}>
        {rate.toFixed(2)}%
      </div>
      <div className="mt-1 text-xs text-[var(--text-secondary)]">
        {w.errorEvents.toLocaleString()} of {w.events.toLocaleString()} · avg {Math.round(w.avgLatencyMs)}ms
      </div>
    </div>
  );
}

function BreakdownTable({
  icon: Icon,
  title,
  rows,
  emptyHint,
}: {
  icon: React.ElementType;
  title: string;
  rows: BreakdownRow[];
  emptyHint: string;
}) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)]">
      <header className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <Icon className="h-4 w-4 text-[var(--text-secondary)]" />
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
        <span className="ml-auto text-xs text-[var(--text-secondary)]">last 30d</span>
      </header>

      {rows.length === 0 ? (
        <div className="p-6 text-center text-sm text-[var(--text-secondary)]">{emptyHint}</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-soft)] text-xs uppercase tracking-wide text-[var(--text-secondary)]">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Key</th>
              <th className="px-3 py-2 text-right font-semibold">Events</th>
              <th className="px-3 py-2 text-right font-semibold">Tokens</th>
              <th className="px-3 py-2 text-right font-semibold">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)] font-mono text-xs">
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="px-3 py-2 text-[var(--text-primary)]">{r.key}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.events.toLocaleString()}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtTokens(r.tokens)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmtUSD(r.costUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
