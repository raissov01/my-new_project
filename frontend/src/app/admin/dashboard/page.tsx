import Link from "next/link";
import { Activity, BarChart3, ClipboardCheck, ShieldCheck } from "lucide-react";

export const metadata = { title: "Admin Dashboard" };

const tiles = [
  {
    title: "Quiz analytics",
    body: "Active users, quiz starts/finishes, completion rate over time.",
    icon: BarChart3,
    href: "/admin/analytics",
    cta: "Open analytics",
  },
  {
    title: "Question review",
    body: "Approve or reject questions queued by the AI generator.",
    icon: ClipboardCheck,
    href: "/admin/review-questions",
    cta: "Open review queue",
  },
];

const notes = [
  {
    title: "Admin access",
    body: "Only users with the database admin role can view this area.",
    icon: ShieldCheck,
  },
  {
    title: "Event tracking",
    body: "Quizizz usage events are persisted to PostgreSQL on every page open, start, answer, and finish.",
    icon: Activity,
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="nd-eyebrow">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
          Control panel
        </h1>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <div
              key={tile.title}
              className="flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-5"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--bg-soft)] text-[var(--primary)]">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                {tile.title}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-[var(--text-secondary)]">
                {tile.body}
              </p>
              <Link href={tile.href} className="nd-btn-primary mt-4 self-start">
                <Icon className="h-4 w-4" />
                {tile.cta}
              </Link>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {notes.map((note) => {
          const Icon = note.icon;
          return (
            <div
              key={note.title}
              className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-5"
            >
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--bg-soft)] text-[var(--primary)]">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {note.title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">
                {note.body}
              </p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
