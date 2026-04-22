import { getCurrentUser } from "@/server/auth";
import { getScenarios } from "@/features/tutor/api";
import { ScenarioCard } from "@/components/tutor/ScenarioCard";
import { MessageSquareText, History } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "AI Tutor — StudyWithRaissov" };

const CATEGORIES = ["travel", "work", "daily", "social", "academic"];
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default async function TutorPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; category?: string }>;
}) {
  await getCurrentUser();
  const params = await searchParams;

  const scenarios = await getScenarios({ level: params.level, category: params.category });

  const buildHref = (key: string, val: string) => {
    const p = new URLSearchParams(params as Record<string, string>);
    if (p.get(key) === val) p.delete(key);
    else p.set(key, val);
    return `/tutor?${p}`;
  };

  return (
    <div className="page-shell py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <MessageSquareText className="h-8 w-8 text-[var(--primary)]" />
          <div>
            <h1 className="text-2xl font-bold">AI Tutor Scenarios</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Roleplay real situations with an AI character
            </p>
          </div>
        </div>
        <Link
          href="/tutor/history"
          className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--bg-soft)] transition-colors"
        >
          <History className="h-4 w-4" />
          My history
        </Link>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Level</p>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((lv) => (
              <a key={lv} href={buildHref("level", lv)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  params.level === lv ? "bg-[var(--primary)] text-white" : "bg-[var(--bg-soft)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
                }`}>
                {lv}
              </a>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Category</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <a key={cat} href={buildHref("category", cat)}
                className={`rounded-full px-3 py-1 text-sm capitalize transition-colors ${
                  params.category === cat ? "bg-[var(--primary)] text-white" : "bg-[var(--bg-soft)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
                }`}>
                {cat}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      {scenarios.length === 0 ? (
        <p className="py-12 text-center text-[var(--text-secondary)]">
          No scenarios match. <a href="/tutor" className="text-[var(--primary)] underline">Clear filters</a>
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {scenarios.map((sc) => <ScenarioCard key={sc.id} scenario={sc} />)}
        </div>
      )}
    </div>
  );
}
