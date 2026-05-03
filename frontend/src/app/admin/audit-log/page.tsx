import { redirect } from "next/navigation";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import { requireAdmin } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { AdminPageHeader } from "../_components/coming-soon";
import { CSVButton } from "../_components/csv-button";

export const metadata = { title: "Audit log — Admin" };
export const dynamic = "force-dynamic";

interface AuditRow {
  id: string;
  adminUserId: string;
  adminEmail: string;
  adminUsername: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  beforeValue?: string | null;
  afterValue?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

interface AuditResponse {
  items: AuditRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface PageProps {
  searchParams: Promise<{ page?: string; action?: string }>;
}

export default async function AdminAuditLogPage({ searchParams }: PageProps) {
  const auth = await requireAdmin();
  if (auth.redirectTo) redirect(auth.redirectTo);
  if (!auth.user) redirect("/login");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const action = (sp.action ?? "").trim();

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", "50");
  if (action) params.set("action", action);

  let data: AuditResponse | null = null;
  let loadError: string | null = null;
  try {
    data = await fetchBackendJson<AuditResponse>({
      path: `/api/v1/admin/audit-log?${params.toString()}`,
      userId: auth.user.id,
    });
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load audit log";
  }

  function buildHref(overrides: Record<string, string | undefined>) {
    const next = new URLSearchParams();
    if (action) next.set("action", action);
    next.set("page", String(page));
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === "") next.delete(k);
      else next.set(k, v);
    }
    return `/admin/audit-log?${next.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <AdminPageHeader
          title="Audit log"
          description="Every superadmin action recorded with before/after state and IP."
        />
        <CSVButton path="/api/admin/audit-log?format=csv" />
      </div>

      <form
        method="GET"
        action="/admin/audit-log"
        className="flex flex-wrap items-center gap-3"
      >
        <input
          type="search"
          name="action"
          defaultValue={action}
          placeholder="Filter by action (e.g. user.patch, quiz.patch)…"
          className="flex-1 min-w-[260px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm font-mono"
        />
        <button
          type="submit"
          className="rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
        >
          Filter
        </button>
        {action && (
          <Link
            href="/admin/audit-log"
            className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]"
          >
            Clear
          </Link>
        )}
      </form>

      {loadError && (
        <div className="rounded-[var(--radius-md)] border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {data && data.items.length === 0 && (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-10 text-center">
          <ScrollText className="mx-auto h-6 w-6 text-[var(--text-secondary)]" />
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            No log entries match your filter.
          </p>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)]">
          <ul className="divide-y divide-[var(--border)]">
            {data.items.map((row) => (
              <AuditEntry key={row.id} row={row} />
            ))}
          </ul>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3 text-xs text-[var(--text-secondary)]">
              <span>
                Page {data.page} of {data.totalPages} · {data.total.toLocaleString()} total
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={buildHref({ page: String(page - 1) })}
                    className="rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-1 font-medium hover:bg-[var(--bg-soft)]"
                  >
                    Previous
                  </Link>
                )}
                {page < data.totalPages && (
                  <Link
                    href={buildHref({ page: String(page + 1) })}
                    className="rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-1 font-medium hover:bg-[var(--bg-soft)]"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AuditEntry({ row }: { row: AuditRow }) {
  const actor = row.adminUsername || row.adminEmail || row.adminUserId.slice(0, 8);
  const before = parseJSON(row.beforeValue);
  const after = parseJSON(row.afterValue);

  return (
    <li className="px-5 py-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
        <span className="font-mono text-xs text-[var(--text-secondary)]">
          {row.createdAt.slice(0, 19).replace("T", " ")}
        </span>
        <span className="font-medium text-[var(--text-primary)]">{actor}</span>
        <span className="rounded-full bg-[var(--bg-soft)] px-2 py-0.5 font-mono text-xs text-[var(--text-primary)]">
          {row.action}
        </span>
        <span className="text-[var(--text-secondary)]">on</span>
        <span className="font-mono text-xs">
          {row.targetType}
          {row.targetId ? `:${row.targetId.slice(0, 8)}` : ""}
        </span>
        {row.ipAddress && (
          <span className="ml-auto font-mono text-xs text-[var(--text-secondary)]">
            {row.ipAddress}
          </span>
        )}
      </div>

      {(before !== null || after !== null) && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Before / after
          </summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {before !== null && (
              <pre className="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-soft)] p-2 text-xs">
                <span className="block pb-1 font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  Before
                </span>
                {JSON.stringify(before, null, 2)}
              </pre>
            )}
            {after !== null && (
              <pre className="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-soft)] p-2 text-xs">
                <span className="block pb-1 font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  After
                </span>
                {JSON.stringify(after, null, 2)}
              </pre>
            )}
          </div>
        </details>
      )}
    </li>
  );
}

function parseJSON(s: string | null | undefined): unknown {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
