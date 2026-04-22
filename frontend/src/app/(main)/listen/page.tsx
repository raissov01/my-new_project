import { getCurrentUser } from "@/server/auth";
import { getListeningClips } from "@/features/listening/api";
import { ClipCard } from "@/components/listening/ClipCard";
import { Headphones } from "lucide-react";

export const metadata = { title: "Listening Library — StudyWithRaissov" };

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const TOPICS = ["daily", "travel", "work", "food", "health", "technology", "environment", "society", "science", "psychology"];

export default async function ListenPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; topic?: string; source?: string }>;
}) {
  await getCurrentUser();
  const params = await searchParams;

  const clips = await getListeningClips({
    level: params.level,
    topic: params.topic,
    source: params.source,
  });

  const buildHref = (key: string, val: string) => {
    const p = new URLSearchParams(params as Record<string, string>);
    if (p.get(key) === val) p.delete(key);
    else p.set(key, val);
    return `/listen?${p}`;
  };

  return (
    <div className="page-shell py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Headphones className="h-8 w-8 text-[var(--primary)]" />
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Listening Library</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {clips.length} clip{clips.length !== 1 ? "s" : ""} available
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Level</p>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((lv) => (
              <a
                key={lv}
                href={buildHref("level", lv)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  params.level === lv
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--bg-soft)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                }`}
              >
                {lv}
              </a>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Topic</p>
          <div className="flex flex-wrap gap-2">
            {TOPICS.map((tp) => (
              <a
                key={tp}
                href={buildHref("topic", tp)}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  params.topic === tp
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--bg-soft)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tp}
              </a>
            ))}
          </div>
        </div>
        <div>
          <a
            href={buildHref("source", "podcast")}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              params.source === "podcast"
                ? "bg-[var(--primary)] text-white"
                : "bg-[var(--bg-soft)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
            }`}
          >
            🎙 Podcast only
          </a>
        </div>
      </div>

      {/* Grid */}
      {clips.length === 0 ? (
        <div className="py-16 text-center text-[var(--text-secondary)]">
          <Headphones className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p>No clips match your filters.</p>
          <a href="/listen" className="mt-2 inline-block text-sm text-[var(--primary)] underline">Clear filters</a>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {clips.map((clip) => (
            <ClipCard key={clip.id} clip={clip} />
          ))}
        </div>
      )}
    </div>
  );
}
