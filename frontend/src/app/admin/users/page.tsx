import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Mail } from "lucide-react";
import { requireAdmin } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { AdminPageHeader } from "../_components/coming-soon";
import { CSVButton } from "../_components/csv-button";
import { UserRowActions } from "./UserRowActions";

export const metadata = { title: "Users — Admin" };
export const dynamic = "force-dynamic";

interface UserRow {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: string;
  isSuperadmin: boolean;
  isActive: boolean;
  emailVerified: boolean;
  plan: string;
  streakDays: number;
  points: number;
  createdAt: string;
}

interface UsersResponse {
  items: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const ROLES = ["", "student", "teacher", "admin"] as const;

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string; role?: string }>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const auth = await requireAdmin();
  if (auth.redirectTo) redirect(auth.redirectTo);
  if (!auth.user) redirect("/login");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const search = (sp.search ?? "").trim();
  const role = (ROLES as readonly string[]).includes(sp.role ?? "") ? (sp.role ?? "") : "";

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", "25");
  if (search) params.set("search", search);
  if (role) params.set("role", role);

  let data: UsersResponse | null = null;
  let loadError: string | null = null;
  try {
    data = await fetchBackendJson<UsersResponse>({
      path: `/api/v1/admin/users?${params.toString()}`,
      userId: auth.user.id,
    });
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load users";
  }

  function buildHref(overrides: Record<string, string | undefined>) {
    const next = new URLSearchParams();
    if (search) next.set("search", search);
    if (role) next.set("role", role);
    next.set("page", String(page));
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === "") next.delete(k);
      else next.set(k, v);
    }
    return `/admin/users?${next.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <AdminPageHeader
          title="Users"
          description="Search any account, change role, grant superadmin, or deactivate."
        />
        <CSVButton path="/api/admin/users?format=csv" />
      </div>

      <form
        method="GET"
        action="/admin/users"
        className="flex flex-wrap items-center gap-3"
      >
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder="Search by email, username, or full name…"
          className="flex-1 min-w-[240px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
        />

        <nav className="flex gap-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-1">
          {ROLES.map((r) => {
            const active = role === r;
            return (
              <Link
                key={r || "all"}
                href={buildHref({ role: r || undefined, page: "1" })}
                className={
                  "rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold capitalize transition-colors " +
                  (active
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]")
                }
              >
                {r || "all"}
              </Link>
            );
          })}
        </nav>

        <button
          type="submit"
          className="rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
        >
          Search
        </button>
        {role && <input type="hidden" name="role" value={role} />}
      </form>

      {loadError && (
        <div className="rounded-[var(--radius-md)] border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {data && data.items.length === 0 && (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-10 text-center">
          <p className="text-sm text-[var(--text-secondary)]">No users match your filters.</p>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-soft)] text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                <tr>
                  <th className="px-5 py-2 text-left font-medium">User</th>
                  <th className="px-5 py-2 text-left font-medium">Plan</th>
                  <th className="px-5 py-2 text-right font-medium">Streak</th>
                  <th className="px-5 py-2 text-right font-medium">Points</th>
                  <th className="px-5 py-2 text-left font-medium">Created</th>
                  <th className="px-5 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => {
                  const isSelf = u.id === auth.user!.id;
                  return (
                    <tr key={u.id} className="border-t border-[var(--border)] hover:bg-[var(--bg-soft)]">
                      <td className="px-5 py-2.5">
                        <div className="flex flex-col">
                          <span className="font-medium text-[var(--text-primary)]">
                            {u.username || u.fullName || u.email}
                            {u.isSuperadmin && (
                              <span
                                title="Superadmin"
                                className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
                              >
                                <ShieldCheck className="h-2.5 w-2.5" />
                                superadmin
                              </span>
                            )}
                            {!u.isActive && (
                              <span className="ml-1.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                                inactive
                              </span>
                            )}
                            {!u.emailVerified && (
                              <span
                                title="Email unverified"
                                className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600"
                              >
                                <Mail className="h-2.5 w-2.5" />
                                unverified
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)]">{u.email}</span>
                        </div>
                      </td>
                      <td className="px-5 py-2.5 capitalize text-[var(--text-secondary)]">
                        {u.plan}
                      </td>
                      <td className="px-5 py-2.5 text-right tabular-nums">{u.streakDays}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums">{u.points.toLocaleString()}</td>
                      <td className="px-5 py-2.5 font-mono text-xs text-[var(--text-secondary)]">
                        {u.createdAt.slice(0, 10)}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <UserRowActions user={u} isSelf={isSelf} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

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
