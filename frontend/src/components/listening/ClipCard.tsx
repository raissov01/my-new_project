import Link from "next/link";
import { Headphones, Clock } from "lucide-react";

interface Clip {
  id: string;
  title: string;
  level: string;
  topic: string;
  durationSeconds: number;
  source: string;
  license: string;
  sourcePodcast?: string;
}

const LEVEL_COLORS: Record<string, string> = {
  A1: "bg-green-100 text-green-700",
  A2: "bg-emerald-100 text-emerald-700",
  B1: "bg-blue-100 text-blue-700",
  B2: "bg-indigo-100 text-indigo-700",
  C1: "bg-purple-100 text-purple-700",
  C2: "bg-rose-100 text-rose-700",
};

const TOPIC_ICONS: Record<string, string> = {
  daily: "🏠", shopping: "🛒", travel: "✈️", food: "🍽️", work: "💼",
  health: "💊", technology: "💻", environment: "🌿", society: "🌍",
  culture: "🎭", science: "🔬", psychology: "🧠", animals: "🐾", weather: "🌤️",
};

function fmtDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function ClipCard({ clip }: { clip: Clip }) {
  const levelCls = LEVEL_COLORS[clip.level] ?? "bg-gray-100 text-gray-600";
  const topicIcon = TOPIC_ICONS[clip.topic] ?? "🎧";

  return (
    <Link href={`/listen/${clip.id}`} className="group block">
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-4 transition-shadow hover:shadow-md h-full flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-2xl" role="img" aria-hidden>{topicIcon}</span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${levelCls}`}>
            {clip.level}
          </span>
        </div>

        {/* Title */}
        <p className="font-semibold text-[var(--text-primary)] line-clamp-2 group-hover:text-[var(--primary)] transition-colors">
          {clip.title}
        </p>

        {/* Meta */}
        <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {fmtDuration(clip.durationSeconds)}
          </span>
          {clip.sourcePodcast && (
            <span className="flex items-center gap-1">
              <Headphones className="h-3 w-3" />
              {clip.sourcePodcast}
            </span>
          )}
        </div>

        {/* License badge */}
        {clip.license && clip.license !== "Original" && (
          <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">
            {clip.license} • {clip.source}
          </p>
        )}
      </div>
    </Link>
  );
}
