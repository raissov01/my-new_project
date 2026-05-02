import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Globe, Lock, EyeOff, Link2 } from "lucide-react";
import { requireAdmin } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { AdminPageHeader } from "../../_components/coming-soon";
import { LineChart, type SeriesDef } from "../../_components/line-chart";
import { InviteLinkActions } from "./InviteLinkActions";

export const metadata = { title: "Quiz analytics — Admin" };
export const dynamic = "force-dynamic";

interface QuizDaily {
  date: string;
  opens: number;
  starts: number;
  finishes: number;
}

interface RecentAttempt {
  id: string;
  user_id: string | null;
  username: string | null;
  email: string | null;
  score: number;
  total_questions: number;
  duration_seconds: number;
  created_at: string;
}

interface QuizAnalyticsResponse {
  quiz: {
    id: string;
    title: string;
    owner_id: string;
    owner_username: string;
    owner_email: string;
    is_public: boolean;
    is_hidden_by_admin: boolean;
    question_count: number;
    created_at: string;
  };
  counts: {
    opens: number;
    starts: number;
    finishes: number;
    abandons: number;
    distinct_players_total: number;
    distinct_signed_in: number;
    distinct_guests: number;
    avg_score: number;
    completion_rate: number;
  };
  daily: QuizDaily[];
  recent_attempts: RecentAttempt[];
  days: number;
}

interface InviteLinkStat {
  token: string;
  opens: number;
  distinct_visitors: number;
  signed_in_count: number;
  guest_count: number;
  starts: number;
  finishes: number;
  use_count?: number | null;
  max_uses?: number | null;
  is_active?: boolean | null;
  created_at?: string | null;
  last_seen_at: string;
}

interface InviteLinksResponse {
  quiz_id: string;
  links: InviteLinkStat[];
}

const RANGES = [7, 30, 90] as const;

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ days?: string }>;
}

const SERIES: SeriesDef<QuizDaily>[] = [
  { key: "opens", label: "Opens", color: "#6366f1" },
  { key: "starts", label: "Starts", color: "#10b981" },
  { key: "finishes", label: "Finishes", color: "#f59e0b" },
];

export default async function AdminQuizAnalyticsPage({ params, searchParams }: PageProps) {
  const auth = await requireAdmin();
  if (auth.redirectTo) redirect(auth.redirectTo);
  if (!auth.user) redirect("/login");

  const { id } = await params;
  const { days: daysParam } = await searchParams;
  const dParsed = parseInt(daysParam ?? "", 10);
  const days: (typeof RANGES)[number] = (RANGES as readonly number[]).includes(dParsed)
    ? (dParsed as (typeof RANGES)[number])
    : 30;

  let data: QuizAnalyticsResponse | null = null;
  let links: InviteLinkStat[] = [];
  let loadError: string | null = null;
  try {
    const [analytics, linksRes] = await Promise.all([
      fetchBackendJson<QuizAnalyticsResponse>({
        path: `/api/v1/admin/quizzes/${encodeURIComponent(id)}/analytics?days=${days}`,
        userId: auth.user.id,
      }),
      fetchBackendJson<InviteLinksResponse>({
        path: `/api/v1/admin/quizzes/${encodeURIComponent(id)}/invite-links`,
        userId: auth.user.id,
      }).catch(() => ({ quiz_id: id, links: [] })),
    ]);
    data = analytics;
    links = linksRes.links ?? [];
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load";
    if (msg.includes("404")) notFound();
    loadError = msg;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/quizzes"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to quizzes
      </Link>

      <AdminPageHeader
        title={data?.quiz.title ?? "Quiz analytics"}
        description={
          data
            ? `Owned by ${data.quiz.owner_username || data.quiz.owner_email || "—"} · ${data.quiz.question_count} questions`
            : undefined
        }
      />

      {data && (
        <div className="flex flex-wrap items-center gap-2">
          {data.quiz.is_public ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <Globe className="h-3 w-3" /> Public
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
              <Lock className="h-3 w-3" /> Private
            </span>
          )}
          {data.quiz.is_hidden_by_admin && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              <EyeOff className="h-3 w-3" /> Hidden by admin
            </span>
          )}
          <span className="ml-auto" />
          <nav className="flex gap-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-1">
            {RANGES.map((r) => {
              const active = r === days;
              return (
                <Link
                  key={r}
                  href={`/admin/quizzes/${id}?days=${r}`}
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
        </div>
      )}

      {loadError && (
        <div className="rounded-[var(--radius-md)] border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {data && (
        <>
          <CountsGrid counts={data.counts} />
          {data.daily.length > 0 && (
            <LineChart<QuizDaily>
              data={data.daily}
              series={SERIES}
              rangeLabel={`Last ${data.days} days`}
            />
          )}
          <InviteLinksTable links={links} />
          <RecentAttemptsTable attempts={data.recent_attempts} />
        </>
      )}
    </div>
  );
}

function CountsGrid({ counts }: { counts: QuizAnalyticsResponse["counts"] }) {
  const cards: { label: string; value: string; hint?: string }[] = [
    { label: "Opens", value: counts.opens.toLocaleString(), hint: "Page views" },
    { label: "Starts", value: counts.starts.toLocaleString() },
    { label: "Finishes", value: counts.finishes.toLocaleString() },
    {
      label: "Completion rate",
      value: `${counts.completion_rate.toFixed(1)}%`,
      hint: "Finishes ÷ starts",
    },
    { label: "Abandons", value: counts.abandons.toLocaleString() },
    {
      label: "Avg score",
      value: `${counts.avg_score.toFixed(1)}%`,
      hint: "Across all attempts",
    },
    {
      label: "Distinct players",
      value: counts.distinct_players_total.toLocaleString(),
      hint: `${counts.distinct_signed_in.toLocaleString()} signed-in · ${counts.distinct_guests.toLocaleString()} guest`,
    },
    {
      label: "Guest share",
      value: counts.distinct_players_total
        ? `${((counts.distinct_guests / counts.distinct_players_total) * 100).toFixed(0)}%`
        : "—",
      hint: "Of distinct players",
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
          <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{c.value}</p>
          {c.hint && (
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{c.hint}</p>
          )}
        </div>
      ))}
    </section>
  );
}

function InviteLinksTable({ links }: { links: InviteLinkStat[] }) {
  if (links.length === 0) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-6 text-center">
        <Link2 className="mx-auto h-6 w-6 text-[var(--text-secondary)]" />
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          No traffic from invite links yet — opens via /quizzes/join/[token] will appear here.
        </p>
      </section>
    );
  }
  return (
    <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Invite link traffic
        </h3>
        <span className="text-xs text-[var(--text-secondary)]">
          {links.length} link{links.length === 1 ? "" : "s"} with traffic
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-soft)] text-xs uppercase tracking-wide text-[var(--text-secondary)]">
            <tr>
              <th className="px-5 py-2 text-left font-medium">Token</th>
              <th className="px-5 py-2 text-right font-medium">Opens</th>
              <th className="px-5 py-2 text-right font-medium">Visitors</th>
              <th className="px-5 py-2 text-right font-medium">Signed-in</th>
              <th className="px-5 py-2 text-right font-medium">Guest</th>
              <th className="px-5 py-2 text-right font-medium">Starts</th>
              <th className="px-5 py-2 text-right font-medium">Finishes</th>
              <th className="px-5 py-2 text-left font-medium">Status</th>
              <th className="px-5 py-2 text-left font-medium">Last seen</th>
              <th className="px-5 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {links.map((l) => (
              <tr key={l.token} className="border-t border-[var(--border)]">
                <td className="px-5 py-2 font-mono text-xs text-[var(--text-primary)]">
                  {l.token.slice(0, 8)}…
                  {l.use_count != null && l.max_uses != null && (
                    <span className="ml-2 text-[var(--text-secondary)]">
                      {l.use_count}/{l.max_uses} uses
                    </span>
                  )}
                </td>
                <td className="px-5 py-2 text-right tabular-nums">{l.opens.toLocaleString()}</td>
                <td className="px-5 py-2 text-right tabular-nums">{l.distinct_visitors.toLocaleString()}</td>
                <td className="px-5 py-2 text-right tabular-nums text-[var(--text-secondary)]">{l.signed_in_count.toLocaleString()}</td>
                <td className="px-5 py-2 text-right tabular-nums text-[var(--text-secondary)]">{l.guest_count.toLocaleString()}</td>
                <td className="px-5 py-2 text-right tabular-nums">{l.starts.toLocaleString()}</td>
                <td className="px-5 py-2 text-right tabular-nums">{l.finishes.toLocaleString()}</td>
                <td className="px-5 py-2">
                  {l.is_active === true && (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      active
                    </span>
                  )}
                  {l.is_active === false && (
                    <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                      revoked
                    </span>
                  )}
                  {l.is_active === null || l.is_active === undefined ? (
                    <span className="text-xs text-[var(--text-secondary)]">deleted</span>
                  ) : null}
                </td>
                <td className="px-5 py-2 font-mono text-xs text-[var(--text-secondary)]">
                  {l.last_seen_at.slice(0, 16).replace("T", " ")}
                </td>
                <td className="px-5 py-2">
                  <InviteLinkActions token={l.token} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RecentAttemptsTable({ attempts }: { attempts: RecentAttempt[] }) {
  if (attempts.length === 0) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-6 text-center text-sm text-[var(--text-secondary)]">
        No completed attempts yet.
      </section>
    );
  }
  return (
    <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)]">
      <div className="border-b border-[var(--border)] px-5 py-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Recent attempts
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-soft)] text-xs uppercase tracking-wide text-[var(--text-secondary)]">
            <tr>
              <th className="px-5 py-2 text-left font-medium">Player</th>
              <th className="px-5 py-2 text-right font-medium">Score</th>
              <th className="px-5 py-2 text-right font-medium">Time</th>
              <th className="px-5 py-2 text-left font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((a) => {
              const pct = a.total_questions > 0
                ? ((a.score / a.total_questions) * 100).toFixed(0)
                : "—";
              const minutes = Math.floor(a.duration_seconds / 60);
              const seconds = a.duration_seconds % 60;
              return (
                <tr key={a.id} className="border-t border-[var(--border)]">
                  <td className="px-5 py-2">
                    <span className="font-medium text-[var(--text-primary)]">
                      {a.username || a.email || "anonymous"}
                    </span>
                  </td>
                  <td className="px-5 py-2 text-right tabular-nums">
                    {a.score}/{a.total_questions}{" "}
                    <span className="text-[var(--text-secondary)]">({pct}%)</span>
                  </td>
                  <td className="px-5 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                    {a.duration_seconds > 0
                      ? `${minutes}m ${seconds}s`
                      : "—"}
                  </td>
                  <td className="px-5 py-2 font-mono text-xs text-[var(--text-secondary)]">
                    {a.created_at.slice(0, 16).replace("T", " ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
