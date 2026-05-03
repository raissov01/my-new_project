import { redirect } from "next/navigation";
import { Activity, AlertTriangle, Clock, Cpu, Database, GitBranch, Users, Zap } from "lucide-react";
import { requireAdmin } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { AdminPageHeader } from "../_components/coming-soon";

export const metadata = { title: "System — Admin" };
export const dynamic = "force-dynamic";

interface HealthResponse {
  uptime: { startedAt: string; seconds: number; pretty: string };
  version: { module: string; goVersion: string; vcsRev: string; vcsTime: string };
  runtime: {
    goroutines: number;
    numCPU: number;
    gomaxprocs: number;
    heapAllocMb: number;
    heapInuseMb: number;
    sysMb: number;
    numGc: number;
  };
  dbPool: {
    total: number;
    idle: number;
    acquired: number;
    maxConns: number;
    acquireCount: number;
    canceledAcquireCount: number;
  };
  onlineUsers: number;
  errorCounts: Record<string, number>;
}

interface ErrorEntry {
  time: string;
  level: "fatal" | "error" | "warn" | "info";
  message: string;
}

interface ErrorsResponse {
  items: ErrorEntry[];
  counts: Record<string, number>;
  capacity: number;
}

interface PageProps {
  searchParams: Promise<{ level?: string }>;
}

export default async function AdminSystemPage({ searchParams }: PageProps) {
  const auth = await requireAdmin();
  if (auth.redirectTo) redirect(auth.redirectTo);
  if (!auth.user) redirect("/login");

  const sp = await searchParams;
  const level = ["fatal", "error", "warn", "info"].includes(sp.level ?? "") ? sp.level : "";

  const errParams = new URLSearchParams();
  errParams.set("limit", "150");
  if (level) errParams.set("level", level);

  let health: HealthResponse | null = null;
  let errors: ErrorsResponse | null = null;
  let loadError: string | null = null;
  try {
    [health, errors] = await Promise.all([
      fetchBackendJson<HealthResponse>({
        path: `/api/v1/admin/system/health`,
        userId: auth.user.id,
      }),
      fetchBackendJson<ErrorsResponse>({
        path: `/api/v1/admin/system/errors?${errParams.toString()}`,
        userId: auth.user.id,
      }),
    ]);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load system health";
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="System health"
        description="Process uptime, runtime stats, DB pool, online users, and recent backend logs."
      />

      {loadError && (
        <div className="rounded-[var(--radius-md)] border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {health && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile
              icon={Clock}
              label="Uptime"
              value={health.uptime.pretty}
              hint={`Started ${health.uptime.startedAt.slice(0, 19).replace("T", " ")} UTC`}
            />
            <Tile
              icon={Users}
              label="Online users"
              value={String(health.onlineUsers)}
              hint="Active in the last 5 min"
            />
            <Tile
              icon={Cpu}
              label="Goroutines"
              value={String(health.runtime.goroutines)}
              hint={`${health.runtime.gomaxprocs} CPU / ${health.runtime.numCPU} cores`}
            />
            <Tile
              icon={Zap}
              label="Heap"
              value={`${health.runtime.heapAllocMb.toFixed(1)} MB`}
              hint={`${health.runtime.heapInuseMb.toFixed(1)} in use · ${health.runtime.sysMb.toFixed(1)} sys · GC ${health.runtime.numGc}`}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card icon={Database} title="Database pool">
              <Row k="Acquired" v={String(health.dbPool.acquired)} />
              <Row k="Idle" v={String(health.dbPool.idle)} />
              <Row k="Total" v={String(health.dbPool.total)} />
              <Row k="Max" v={String(health.dbPool.maxConns)} />
              <Row k="Acquire count" v={health.dbPool.acquireCount.toLocaleString()} />
              <Row
                k="Canceled acquires"
                v={health.dbPool.canceledAcquireCount.toLocaleString()}
                warn={health.dbPool.canceledAcquireCount > 0}
              />
            </Card>

            <Card icon={GitBranch} title="Build info">
              <Row k="Module" v={health.version.module || "—"} mono />
              <Row k="Revision" v={health.version.vcsRev || "—"} mono />
              <Row k="Built" v={health.version.vcsTime?.slice(0, 19).replace("T", " ") || "—"} />
              <Row k="Go" v={health.version.goVersion} mono />
            </Card>
          </section>

          <section>
            <header className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Recent log</h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Last {errors?.capacity ?? 500} lines from the running process.
                </p>
              </div>
              <LevelFilter current={level ?? ""} counts={errors?.counts ?? {}} />
            </header>

            {errors && errors.items.length === 0 ? (
              <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-10 text-center">
                <Activity className="mx-auto h-6 w-6 text-[var(--text-secondary)]" />
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  No log entries{level ? ` at level "${level}"` : ""}.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)]">
                <ul className="divide-y divide-[var(--border)] font-mono text-xs">
                  {errors?.items.map((e, i) => (
                    <LogLine key={i} entry={e} />
                  ))}
                </ul>
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
      <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-[var(--text-primary)]">
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-[var(--text-secondary)]">{hint}</div>}
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-[var(--primary)]" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      </div>
      <dl className="space-y-1.5 text-sm">{children}</dl>
    </div>
  );
}

function Row({
  k,
  v,
  mono,
  warn,
}: {
  k: string;
  v: string;
  mono?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[var(--text-secondary)]">{k}</dt>
      <dd
        className={`tabular-nums ${mono ? "font-mono text-xs" : ""} ${
          warn ? "text-amber-600 font-semibold" : "text-[var(--text-primary)]"
        }`}
      >
        {v}
      </dd>
    </div>
  );
}

function LevelFilter({ current, counts }: { current: string; counts: Record<string, number> }) {
  const levels: { key: string; label: string }[] = [
    { key: "", label: "All" },
    { key: "fatal", label: "Fatal" },
    { key: "error", label: "Error" },
    { key: "warn", label: "Warn" },
    { key: "info", label: "Info" },
  ];
  return (
    <form
      method="GET"
      action="/admin/system"
      className="flex flex-wrap items-center gap-1 text-xs"
    >
      {levels.map((l) => {
        const count = l.key ? counts[l.key] ?? 0 : Object.values(counts).reduce((a, b) => a + b, 0);
        const active = (current ?? "") === l.key;
        return (
          <button
            key={l.key || "all"}
            type="submit"
            name="level"
            value={l.key}
            className={`rounded-[var(--radius-sm)] px-2 py-1 font-medium transition-colors ${
              active
                ? "bg-[var(--primary)] text-white"
                : "border border-[var(--border)] hover:bg-[var(--bg-soft)]"
            }`}
          >
            {l.label} <span className="opacity-60">({count})</span>
          </button>
        );
      })}
    </form>
  );
}

function LogLine({ entry }: { entry: ErrorEntry }) {
  const tone =
    entry.level === "fatal"
      ? "text-red-700 bg-red-50/40"
      : entry.level === "error"
        ? "text-red-600"
        : entry.level === "warn"
          ? "text-amber-600"
          : "text-[var(--text-primary)]";
  return (
    <li className={`flex gap-3 px-4 py-2 ${tone}`}>
      <span className="shrink-0 text-[var(--text-secondary)]">
        {entry.time.slice(11, 19)}
      </span>
      <span
        className="shrink-0 w-12 text-[10px] uppercase tracking-wide font-bold opacity-80"
        title={entry.level}
      >
        {entry.level}
      </span>
      <span className="flex-1 flex items-start gap-1 break-words whitespace-pre-wrap">
        {(entry.level === "error" || entry.level === "fatal") && (
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
        )}
        <span className="flex-1">{entry.message}</span>
      </span>
    </li>
  );
}
