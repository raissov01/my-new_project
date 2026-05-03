import { redirect } from "next/navigation";
import { Mail, Bell, AlertTriangle, CheckCircle2 } from "lucide-react";
import { requireAdmin } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { AdminPageHeader } from "../_components/coming-soon";

export const metadata = { title: "Deliverability — Admin" };
export const dynamic = "force-dynamic";

interface Window {
  channel: string;
  total: number;
  sent: number;
  errors: number;
  expired: number;
  delivered: number;
  opened: number;
  clicked: number;
  successRate: number;
}

interface KindRow {
  channel: string;
  kind: string;
  total: number;
  errors: number;
  successRate: number;
}

interface FailureRow {
  id: string;
  channel: string;
  kind: string;
  recipient: string;
  userId?: string;
  status: string;
  statusCode: number;
  error: string;
  createdAt: string;
}

interface SummaryResponse {
  last24h: Window[];
  last7d: Window[];
  byKind: KindRow[];
  recentFailures: FailureRow[];
}

export default async function AdminDeliverabilityPage() {
  const auth = await requireAdmin();
  if (auth.redirectTo) redirect(auth.redirectTo);
  if (!auth.user) redirect("/login");

  let data: SummaryResponse | null = null;
  let loadError: string | null = null;
  try {
    data = await fetchBackendJson<SummaryResponse>({
      path: `/api/v1/admin/deliverability`,
      userId: auth.user.id,
    });
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load deliverability";
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Deliverability"
        description="Email (Resend) and Web Push send outcomes recorded into delivery_events. Numbers reflect what we tried to send — open/click tracking is upstream only."
      />

      {loadError && (
        <div className="rounded-[var(--radius-md)] border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {data && (
        <>
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Last 24 hours
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {channelTiles(data.last24h)}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Last 7 days
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {channelTiles(data.last7d)}
            </div>
          </section>

          <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)]">
            <header className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">By kind (7d)</h2>
              <span className="ml-auto text-xs text-[var(--text-secondary)]">
                Useful for spotting one campaign that's bouncing
              </span>
            </header>
            {data.byKind.length === 0 ? (
              <div className="p-6 text-center text-sm text-[var(--text-secondary)]">
                No sends recorded in the last 7 days.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-soft)] text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Channel</th>
                    <th className="px-3 py-2 text-left font-semibold">Kind</th>
                    <th className="px-3 py-2 text-right font-semibold">Total</th>
                    <th className="px-3 py-2 text-right font-semibold">Errors</th>
                    <th className="px-3 py-2 text-right font-semibold">Success</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] font-mono text-xs">
                  {data.byKind.map((k) => (
                    <tr key={`${k.channel}-${k.kind}`}>
                      <td className="px-3 py-2">
                        {k.channel === "email" ? (
                          <Mail className="inline h-3 w-3 text-[var(--text-secondary)]" />
                        ) : (
                          <Bell className="inline h-3 w-3 text-[var(--text-secondary)]" />
                        )}{" "}
                        {k.channel}
                      </td>
                      <td className="px-3 py-2 text-[var(--text-primary)]">{k.kind}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{k.total.toLocaleString()}</td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums ${
                          k.errors > 0 ? "font-semibold text-red-600" : ""
                        }`}
                      >
                        {k.errors.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {(k.successRate * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)]">
            <header className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-[var(--text-secondary)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent failures</h2>
              <span className="ml-auto text-xs text-[var(--text-secondary)]">last 50</span>
            </header>
            {data.recentFailures.length === 0 ? (
              <div className="p-6 text-center text-sm text-green-700">
                <CheckCircle2 className="mx-auto mb-2 h-6 w-6" />
                No recent failures recorded.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-soft)] text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">When</th>
                    <th className="px-3 py-2 text-left font-semibold">Channel</th>
                    <th className="px-3 py-2 text-left font-semibold">Kind</th>
                    <th className="px-3 py-2 text-left font-semibold">Recipient</th>
                    <th className="px-3 py-2 text-left font-semibold">Status</th>
                    <th className="px-3 py-2 text-left font-semibold">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] font-mono text-xs">
                  {data.recentFailures.map((f) => (
                    <tr key={f.id}>
                      <td className="px-3 py-2 text-[var(--text-secondary)]">
                        {f.createdAt.slice(0, 19).replace("T", " ")}
                      </td>
                      <td className="px-3 py-2">{f.channel}</td>
                      <td className="px-3 py-2 text-[var(--text-primary)]">{f.kind}</td>
                      <td className="px-3 py-2 max-w-[260px] break-all text-[var(--text-secondary)]">
                        {f.recipient}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[10px] font-bold ${
                            f.status === "expired"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {f.status}
                          {f.statusCode > 0 ? ` ${f.statusCode}` : ""}
                        </span>
                      </td>
                      <td className="px-3 py-2 max-w-[300px] break-all text-red-700">{f.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function channelTiles(rows: Window[]) {
  if (rows.length === 0) {
    return (
      <div className="col-span-full rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-6 text-center text-sm text-[var(--text-secondary)]">
        No sends in this window.
      </div>
    );
  }
  return rows.map((r) => {
    const Icon = r.channel === "email" ? Mail : Bell;
    const tone =
      r.successRate >= 0.99
        ? "text-green-600"
        : r.successRate >= 0.9
        ? "text-amber-600"
        : "text-red-600";
    return (
      <div
        key={r.channel}
        className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-5"
      >
        <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--bg-soft)] text-[var(--primary)]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">
          {r.channel}
        </div>
        <div className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${tone}`}>
          {(r.successRate * 100).toFixed(2)}%
        </div>
        <div className="mt-1 text-xs text-[var(--text-secondary)]">
          {r.sent.toLocaleString()} sent · {r.errors.toLocaleString()} errors
          {r.expired > 0 && ` · ${r.expired.toLocaleString()} expired`}
        </div>
        {r.channel === "email" && (r.delivered > 0 || r.opened > 0 || r.clicked > 0) && (
          <div className="mt-1 text-[10px] text-[var(--text-secondary)]">
            ✓ {r.delivered.toLocaleString()} delivered · {r.opened.toLocaleString()} opened ·{" "}
            {r.clicked.toLocaleString()} clicked
          </div>
        )}
      </div>
    );
  });
}
