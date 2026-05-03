import { redirect } from "next/navigation";
import { CheckCircle2, AlertTriangle, Clock, History } from "lucide-react";
import { requireAdmin } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { AdminPageHeader } from "../_components/coming-soon";
import { RunNowButton } from "./RunNowButton";

export const metadata = { title: "Background jobs — Admin" };
export const dynamic = "force-dynamic";

interface JobSummary {
  name: string;
  lastStatus: string;
  lastRunAt: string;
  lastDurationMs: number;
  lastError?: string;
  runs7d: number;
  errors7d: number;
  successRate: number;
}

interface JobRun {
  id: string;
  name: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  status: string;
  error?: string;
}

export default async function AdminJobsPage() {
  const auth = await requireAdmin();
  if (auth.redirectTo) redirect(auth.redirectTo);
  if (!auth.user) redirect("/login");

  let jobs: JobSummary[] = [];
  let history: JobRun[] = [];
  let loadError: string | null = null;
  try {
    [jobs, history] = await Promise.all([
      fetchBackendJson<JobSummary[]>({
        path: `/api/v1/admin/jobs`,
        userId: auth.user.id,
      }),
      fetchBackendJson<JobRun[]>({
        path: `/api/v1/admin/jobs/history?limit=100`,
        userId: auth.user.id,
      }),
    ]);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load jobs";
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Background jobs"
        description="Cron scheduler status. Each job records start/finish/duration into job_runs; admins can trigger a manual run."
      />

      {loadError && (
        <div className="rounded-[var(--radius-md)] border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)]">
        <header className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
          <Clock className="h-4 w-4 text-[var(--text-secondary)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Scheduled jobs</h2>
          <span className="ml-auto text-xs text-[var(--text-secondary)]">
            All times UTC · last 7 days
          </span>
        </header>

        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-soft)] text-xs uppercase tracking-wide text-[var(--text-secondary)]">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Job</th>
              <th className="px-3 py-2 text-left font-semibold">Last status</th>
              <th className="px-3 py-2 text-left font-semibold">Last run</th>
              <th className="px-3 py-2 text-right font-semibold">Duration</th>
              <th className="px-3 py-2 text-right font-semibold">7d runs</th>
              <th className="px-3 py-2 text-right font-semibold">Success</th>
              <th className="px-3 py-2 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)] text-xs">
            {jobs.map((j) => (
              <tr key={j.name}>
                <td className="px-3 py-2 font-mono text-[var(--text-primary)]">{j.name}</td>
                <td className="px-3 py-2">{statusBadge(j.lastStatus)}</td>
                <td className="px-3 py-2 font-mono text-[var(--text-secondary)]">
                  {j.lastRunAt ? j.lastRunAt.slice(0, 19).replace("T", " ") : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {j.lastRunAt ? `${j.lastDurationMs.toLocaleString()} ms` : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {j.runs7d > 0 ? (
                    <>
                      {j.runs7d}
                      {j.errors7d > 0 && (
                        <span className="ml-1 text-red-600">({j.errors7d} err)</span>
                      )}
                    </>
                  ) : (
                    "0"
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {j.runs7d > 0 ? `${(j.successRate * 100).toFixed(0)}%` : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <RunNowButton name={j.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)]">
        <header className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
          <History className="h-4 w-4 text-[var(--text-secondary)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent run history</h2>
          <span className="ml-auto text-xs text-[var(--text-secondary)]">last 100</span>
        </header>

        {history.length === 0 ? (
          <div className="p-6 text-center text-sm text-[var(--text-secondary)]">
            No jobs have run yet — wait for the next scheduled tick or trigger one above.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-soft)] text-xs uppercase tracking-wide text-[var(--text-secondary)]">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Started</th>
                <th className="px-3 py-2 text-left font-semibold">Job</th>
                <th className="px-3 py-2 text-left font-semibold">Status</th>
                <th className="px-3 py-2 text-right font-semibold">Duration</th>
                <th className="px-3 py-2 text-left font-semibold">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-mono text-xs">
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="px-3 py-2 text-[var(--text-secondary)]">
                    {h.startedAt.slice(0, 19).replace("T", " ")}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-primary)]">{h.name}</td>
                  <td className="px-3 py-2">{statusBadge(h.status)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {h.durationMs.toLocaleString()} ms
                  </td>
                  <td className="px-3 py-2 break-all text-red-700">{h.error || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function statusBadge(s: string) {
  if (s === "success") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-800">
        <CheckCircle2 className="h-3 w-3" /> success
      </span>
    );
  }
  if (s === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-800">
        <AlertTriangle className="h-3 w-3" /> error
      </span>
    );
  }
  return <span className="text-[10px] text-[var(--text-secondary)]">never</span>;
}
