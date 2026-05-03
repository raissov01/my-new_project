import { redirect } from "next/navigation";
import { Database, AlertTriangle, Activity } from "lucide-react";
import { requireAdmin } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { AdminPageHeader } from "../_components/coming-soon";

export const metadata = { title: "Database — Admin" };
export const dynamic = "force-dynamic";

interface TableRow {
  schema: string;
  name: string;
  rowCount: number;
  totalBytes: number;
  indexBytes: number;
  deadTuples: number;
  deadFraction: number;
  lastVacuum?: string;
  lastAnalyze?: string;
}

interface ActivityRow {
  pid: number;
  state: string;
  waitEvent?: string;
  username?: string;
  applicationName?: string;
  clientAddr?: string;
  queryStart?: string;
  durationMs: number;
  query: string;
}

interface DBSummary {
  database: string;
  version: string;
  sizeBytes: number;
  connections: number;
  idleInTransaction: number;
  tables: TableRow[];
  activity: ActivityRow[];
}

export default async function AdminDatabasePage() {
  const auth = await requireAdmin();
  if (auth.redirectTo) redirect(auth.redirectTo);
  if (!auth.user) redirect("/login");

  let data: DBSummary | null = null;
  let loadError: string | null = null;
  try {
    data = await fetchBackendJson<DBSummary>({
      path: `/api/v1/admin/database`,
      userId: auth.user.id,
      timeoutMs: 15_000,
    });
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load database summary";
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Database"
        description="Postgres internals: table sizes, vacuum pressure, current activity. Pulled from pg_class + pg_stat_*."
      />

      {loadError && (
        <div className="rounded-[var(--radius-md)] border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {data && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile icon={Database} label="Database" value={data.database} hint={shortVersion(data.version)} />
            <Tile icon={Database} label="Size on disk" value={fmtBytes(data.sizeBytes)} />
            <Tile icon={Activity} label="Active connections" value={String(data.connections)} hint={`${data.idleInTransaction} idle-in-tx`} />
            <Tile icon={AlertTriangle} label="Tables shown" value={String(data.tables.length)} hint="Top by total bytes" />
          </section>

          <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)]">
            <header className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Tables</h2>
              <span className="ml-auto text-xs text-[var(--text-secondary)]">
                Dead tuple % &gt; 20 means VACUUM is overdue
              </span>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-soft)] text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Table</th>
                    <th className="px-3 py-2 text-right font-semibold">Rows</th>
                    <th className="px-3 py-2 text-right font-semibold">Total</th>
                    <th className="px-3 py-2 text-right font-semibold">Indexes</th>
                    <th className="px-3 py-2 text-right font-semibold">Dead tuples</th>
                    <th className="px-3 py-2 text-right font-semibold">Last vacuum</th>
                    <th className="px-3 py-2 text-right font-semibold">Last analyze</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] font-mono text-xs">
                  {data.tables.map((t) => {
                    const deadPct = t.deadFraction * 100;
                    const tone = deadPct >= 20 ? "text-red-600 font-semibold" : deadPct >= 5 ? "text-amber-600" : "";
                    return (
                      <tr key={`${t.schema}.${t.name}`}>
                        <td className="px-3 py-2 text-[var(--text-primary)]">
                          {t.schema !== "public" && (
                            <span className="text-[var(--text-secondary)]">{t.schema}.</span>
                          )}
                          {t.name}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{t.rowCount.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtBytes(t.totalBytes)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                          {fmtBytes(t.indexBytes)}
                        </td>
                        <td className={`px-3 py-2 text-right tabular-nums ${tone}`}>
                          {t.deadTuples.toLocaleString()}
                          {deadPct > 0 && (
                            <span className="ml-1 text-[10px]">({deadPct.toFixed(1)}%)</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-[var(--text-secondary)]">
                          {t.lastVacuum ? t.lastVacuum.slice(0, 16).replace("T", " ") : "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-[var(--text-secondary)]">
                          {t.lastAnalyze ? t.lastAnalyze.slice(0, 16).replace("T", " ") : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)]">
            <header className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
              <Activity className="h-4 w-4 text-[var(--text-secondary)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Current activity</h2>
              <span className="ml-auto text-xs text-[var(--text-secondary)]">
                non-idle backends, ordered by query start
              </span>
            </header>
            {data.activity.length === 0 ? (
              <div className="p-6 text-center text-sm text-[var(--text-secondary)]">
                No active queries — all backends are idle.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-soft)] text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">PID</th>
                      <th className="px-3 py-2 text-left font-semibold">State</th>
                      <th className="px-3 py-2 text-left font-semibold">Wait</th>
                      <th className="px-3 py-2 text-right font-semibold">Duration</th>
                      <th className="px-3 py-2 text-left font-semibold">Query</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] font-mono text-xs">
                    {data.activity.map((a) => (
                      <tr key={a.pid}>
                        <td className="px-3 py-2 text-[var(--text-secondary)]">{a.pid}</td>
                        <td className="px-3 py-2">{stateBadge(a.state)}</td>
                        <td className="px-3 py-2 text-[var(--text-secondary)]">{a.waitEvent || "—"}</td>
                        <td
                          className={`px-3 py-2 text-right tabular-nums ${
                            a.durationMs > 5000 ? "font-semibold text-red-600" : a.durationMs > 1000 ? "text-amber-600" : ""
                          }`}
                        >
                          {a.durationMs.toFixed(0)} ms
                        </td>
                        <td className="px-3 py-2 break-all text-[var(--text-primary)]">{a.query}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
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
      <div className="mt-1 truncate text-2xl font-semibold tabular-nums tracking-tight text-[var(--text-primary)]">
        {value}
      </div>
      {hint && <div className="mt-1 truncate text-xs text-[var(--text-secondary)]">{hint}</div>}
    </div>
  );
}

function fmtBytes(n: number): string {
  if (n === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function shortVersion(v: string): string {
  const m = v.match(/PostgreSQL \d+(?:\.\d+)?/);
  return m ? m[0] : v.slice(0, 30);
}

function stateBadge(s: string) {
  const tone =
    s === "active"
      ? "bg-blue-100 text-blue-800"
      : s === "idle in transaction"
      ? "bg-red-100 text-red-800"
      : s === "idle"
      ? "bg-[var(--bg-soft)] text-[var(--text-secondary)]"
      : "bg-amber-100 text-amber-800";
  return (
    <span className={`rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[10px] font-bold ${tone}`}>
      {s || "—"}
    </span>
  );
}
