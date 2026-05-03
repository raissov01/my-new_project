import { redirect } from "next/navigation";
import Link from "next/link";
import { Activity, AlertTriangle, CheckCircle2, Database, Zap } from "lucide-react";
import { requireAdmin } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { AdminPageHeader } from "../_components/coming-soon";

export const metadata = { title: "API metrics — Admin" };
export const dynamic = "force-dynamic";

interface RouteRow {
  method: string;
  path: string;
  count: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  status2xx: number;
  status3xx: number;
  status4xx: number;
  status5xx: number;
  errorRate: number;
  lastSeen: string;
}

interface MetricsResponse {
  startedAt: string;
  totalReqs: number;
  uniqueRoutes: number;
  routes: RouteRow[];
  migration: {
    lastRunAt: string;
    durationMs: number;
    error: string;
    ok: boolean;
  };
}

type SortKey = "count" | "avg" | "p95" | "errorRate";

interface PageProps {
  searchParams: Promise<{ sort?: string }>;
}

export default async function AdminAPIMetricsPage({ searchParams }: PageProps) {
  const auth = await requireAdmin();
  if (auth.redirectTo) redirect(auth.redirectTo);
  if (!auth.user) redirect("/login");

  const sp = await searchParams;
  const sort: SortKey = (["count", "avg", "p95", "errorRate"] as SortKey[]).includes(
    sp.sort as SortKey,
  )
    ? (sp.sort as SortKey)
    : "count";

  let data: MetricsResponse | null = null;
  let loadError: string | null = null;
  try {
    data = await fetchBackendJson<MetricsResponse>({
      path: `/api/v1/admin/api-metrics`,
      userId: auth.user.id,
    });
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load API metrics";
  }

  const sortedRoutes = data
    ? [...data.routes].sort((a, b) => {
        switch (sort) {
          case "avg":
            return b.avgMs - a.avgMs;
          case "p95":
            return b.p95Ms - a.p95Ms;
          case "errorRate":
            return b.errorRate - a.errorRate;
          case "count":
          default:
            return b.count - a.count;
        }
      })
    : [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="API metrics"
        description="Per-route request count, latency percentiles, and 5xx rate observed in this process."
      />

      {loadError && (
        <div className="rounded-[var(--radius-md)] border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {data && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Tile
              icon={Activity}
              label="Total requests"
              value={data.totalReqs.toLocaleString()}
              hint={`Since ${data.startedAt.slice(0, 19).replace("T", " ")} UTC`}
            />
            <Tile
              icon={Zap}
              label="Unique routes"
              value={String(data.uniqueRoutes)}
              hint="Path templates seen at least once"
            />
            <MigrationTile mig={data.migration} />
          </section>

          <section>
            <header className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Routes</h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Bucketed histogram percentiles — exact within bucket boundary (10/25/50/100/250/500ms · 1/2.5/5/10s).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1 text-xs">
                {(
                  [
                    { key: "count", label: "Traffic" },
                    { key: "p95", label: "Slowest p95" },
                    { key: "avg", label: "Avg latency" },
                    { key: "errorRate", label: "Error rate" },
                  ] as { key: SortKey; label: string }[]
                ).map((s) => {
                  const active = s.key === sort;
                  return (
                    <Link
                      key={s.key}
                      href={`/admin/api-metrics?sort=${s.key}`}
                      className={`rounded-[var(--radius-sm)] px-2 py-1 font-medium transition-colors ${
                        active
                          ? "bg-[var(--primary)] text-white"
                          : "border border-[var(--border)] hover:bg-[var(--bg-soft)]"
                      }`}
                    >
                      {s.label}
                    </Link>
                  );
                })}
              </div>
            </header>

            {sortedRoutes.length === 0 ? (
              <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-10 text-center">
                <Activity className="mx-auto h-6 w-6 text-[var(--text-secondary)]" />
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  No traffic recorded yet — make some requests and refresh.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--bg-soft)] text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                      <tr>
                        <Th>Method</Th>
                        <Th>Path</Th>
                        <Th align="right">Count</Th>
                        <Th align="right">Avg</Th>
                        <Th align="right">p50</Th>
                        <Th align="right">p95</Th>
                        <Th align="right">Max</Th>
                        <Th align="right">2xx / 3xx / 4xx / 5xx</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] font-mono text-xs">
                      {sortedRoutes.map((r) => (
                        <RouteRowEl key={`${r.method} ${r.path}`} r={r} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function MigrationTile({
  mig,
}: {
  mig: MetricsResponse["migration"];
}) {
  const Icon = mig.ok ? CheckCircle2 : AlertTriangle;
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
      <div
        className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] ${
          mig.ok ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
        }`}
      >
        <Database className="h-4 w-4" />
      </div>
      <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">
        Last AutoMigrate
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-[var(--text-primary)]">
        {mig.lastRunAt ? `${mig.durationMs.toFixed(0)} ms` : "—"}
      </div>
      <div className="mt-1 flex items-center gap-1 text-xs text-[var(--text-secondary)]">
        <Icon className={`h-3 w-3 ${mig.ok ? "text-green-600" : "text-red-600"}`} />
        {mig.lastRunAt
          ? `${mig.ok ? "OK" : "Failed"} · ${mig.lastRunAt.slice(0, 19).replace("T", " ")} UTC`
          : "Not yet run"}
      </div>
      {mig.error && (
        <div className="mt-2 break-words rounded-[var(--radius-sm)] border border-red-200 bg-red-50 p-2 font-mono text-[10px] text-red-700">
          {mig.error}
        </div>
      )}
    </div>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--bg-soft)] text-[var(--primary)]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-[var(--text-primary)]">
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-[var(--text-secondary)]">{hint}</div>}
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th className={`px-3 py-2 ${align === "right" ? "text-right" : "text-left"} font-semibold`}>
      {children}
    </th>
  );
}

function RouteRowEl({ r }: { r: RouteRow }) {
  const errored = r.errorRate > 0;
  const slow = r.p95Ms > 500;
  return (
    <tr className={errored ? "bg-red-50/40" : undefined}>
      <td className="px-3 py-2">
        <span
          className={`rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[10px] font-bold ${methodTone(r.method)}`}
        >
          {r.method}
        </span>
      </td>
      <td className="px-3 py-2 text-[var(--text-primary)]">{r.path}</td>
      <td className="px-3 py-2 text-right tabular-nums">{r.count.toLocaleString()}</td>
      <td className="px-3 py-2 text-right tabular-nums">{r.avgMs.toFixed(1)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{r.p50Ms.toFixed(0)}</td>
      <td
        className={`px-3 py-2 text-right tabular-nums ${slow ? "font-semibold text-amber-600" : ""}`}
      >
        {r.p95Ms.toFixed(0)}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{r.maxMs.toFixed(0)}</td>
      <td className="px-3 py-2 text-right tabular-nums">
        <span className="text-green-600">{r.status2xx}</span>
        <span className="text-[var(--text-secondary)]"> / </span>
        <span>{r.status3xx}</span>
        <span className="text-[var(--text-secondary)]"> / </span>
        <span className="text-amber-600">{r.status4xx}</span>
        <span className="text-[var(--text-secondary)]"> / </span>
        <span className={`${r.status5xx > 0 ? "font-semibold text-red-600" : ""}`}>
          {r.status5xx}
        </span>
      </td>
    </tr>
  );
}

function methodTone(method: string): string {
  switch (method) {
    case "GET":
      return "bg-blue-100 text-blue-800";
    case "POST":
      return "bg-green-100 text-green-800";
    case "PATCH":
    case "PUT":
      return "bg-amber-100 text-amber-800";
    case "DELETE":
      return "bg-red-100 text-red-800";
    default:
      return "bg-[var(--bg-soft)] text-[var(--text-primary)]";
  }
}
