import { redirect } from "next/navigation";
import Link from "next/link";
import { EyeOff, Lock, Globe, BarChart3 } from "lucide-react";
import { requireAdmin } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { AdminPageHeader } from "../_components/coming-soon";

export const metadata = { title: "Quizzes — Admin" };
export const dynamic = "force-dynamic";

interface QuizRow {
  id: string;
  title: string;
  ownerId: string;
  ownerEmail: string;
  ownerUsername: string;
  isPublic: boolean;
  isHiddenByAdmin: boolean;
  questionCount: number;
  attemptCount: number;
  createdAt: string;
}

interface QuizzesResponse {
  items: QuizRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    isPublic?: string;
  }>;
}

export default async function AdminQuizzesPage({ searchParams }: PageProps) {
  const auth = await requireAdmin();
  if (auth.redirectTo) redirect(auth.redirectTo);
  if (!auth.user) redirect("/login");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const search = (sp.search ?? "").trim();
  const isPublicFilter = sp.isPublic === "true" ? "true" : sp.isPublic === "false" ? "false" : "";

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", "25");
  if (search) params.set("search", search);
  if (isPublicFilter) params.set("isPublic", isPublicFilter);

  let data: QuizzesResponse | null = null;
  let loadError: string | null = null;
  try {
    data = await fetchBackendJson<QuizzesResponse>({
      path: `/api/v1/admin/quizzes?${params.toString()}`,
      userId: auth.user.id,
    });
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load quizzes";
  }

  function buildHref(overrides: Record<string, string | undefined>): string {
    const next = new URLSearchParams();
    if (search) next.set("search", search);
    if (isPublicFilter) next.set("isPublic", isPublicFilter);
    next.set("page", String(page));
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === "") next.delete(k);
      else next.set(k, v);
    }
    return `/admin/quizzes?${next.toString()}`;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Quizzes"
        description="Browse every quiz with playthrough counts. Click a row for detailed analytics."
      />

      <form
        method="GET"
        action="/admin/quizzes"
        className="flex flex-wrap items-center gap-3"
      >
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder="Search by title…"
          className="flex-1 min-w-[200px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
        />

        <nav
          className="flex gap-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-1"
          aria-label="Visibility filter"
        >
          {(
            [
              ["", "All"],
              ["true", "Public"],
              ["false", "Private"],
            ] as const
          ).map(([v, label]) => {
            const active = isPublicFilter === v;
            return (
              <Link
                key={v || "all"}
                href={buildHref({ isPublic: v || undefined, page: "1" })}
                className={
                  "rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold transition-colors " +
                  (active
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]")
                }
                aria-current={active ? "page" : undefined}
              >
                {label}
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

        {/* Preserve filter when searching */}
        {isPublicFilter && (
          <input type="hidden" name="isPublic" value={isPublicFilter} />
        )}
      </form>

      {loadError && (
        <div className="rounded-[var(--radius-md)] border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {data && data.items.length === 0 && (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-10 text-center">
          <p className="text-sm text-[var(--text-secondary)]">No quizzes match your filters.</p>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-soft)] text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                <tr>
                  <th className="px-5 py-2 text-left font-medium">Title</th>
                  <th className="px-5 py-2 text-left font-medium">Owner</th>
                  <th className="px-5 py-2 text-right font-medium">Qs</th>
                  <th className="px-5 py-2 text-right font-medium">Attempts</th>
                  <th className="px-5 py-2 text-left font-medium">Visibility</th>
                  <th className="px-5 py-2 text-left font-medium">Created</th>
                  <th className="px-5 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((q) => (
                  <tr
                    key={q.id}
                    className="border-t border-[var(--border)] hover:bg-[var(--bg-soft)]"
                  >
                    <td className="px-5 py-2.5">
                      <Link
                        href={`/admin/quizzes/${q.id}`}
                        className="font-medium text-[var(--text-primary)] hover:underline"
                      >
                        {q.title}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 text-[var(--text-secondary)]">
                      {q.ownerUsername || q.ownerEmail || (
                        <span className="italic">no owner</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {q.questionCount}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {q.attemptCount}
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {q.isPublic ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            <Globe className="h-3 w-3" /> public
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                            <Lock className="h-3 w-3" /> private
                          </span>
                        )}
                        {q.isHiddenByAdmin && (
                          <span
                            title="Hidden from public listings by admin"
                            className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700"
                          >
                            <EyeOff className="h-3 w-3" /> hidden
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-2.5 font-mono text-xs text-[var(--text-secondary)]">
                      {q.createdAt.slice(0, 10)}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <Link
                        href={`/admin/quizzes/${q.id}`}
                        className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--bg-soft)]"
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                        Analytics
                      </Link>
                    </td>
                  </tr>
                ))}
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
