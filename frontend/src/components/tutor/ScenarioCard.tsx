import Link from "next/link";
import { Clock } from "lucide-react";
import type { AIScenario } from "@/features/tutor/api";

const LEVEL_COLORS: Record<string, string> = {
  A1: "bg-green-100 text-green-700",
  A2: "bg-emerald-100 text-emerald-700",
  B1: "bg-blue-100 text-blue-700",
  B2: "bg-indigo-100 text-indigo-700",
  C1: "bg-purple-100 text-purple-700",
  C2: "bg-rose-100 text-rose-700",
};

const CAT_COLORS: Record<string, string> = {
  travel: "bg-sky-50 text-sky-700",
  work: "bg-amber-50 text-amber-700",
  daily: "bg-lime-50 text-lime-700",
  social: "bg-pink-50 text-pink-700",
  academic: "bg-violet-50 text-violet-700",
};

export function ScenarioCard({ scenario }: { scenario: AIScenario }) {
  const levelCls = LEVEL_COLORS[scenario.level] ?? "bg-gray-100 text-gray-600";
  const catCls = CAT_COLORS[scenario.category] ?? "bg-gray-50 text-gray-600";

  return (
    <Link href={`/tutor/${scenario.slug}`} className="group block">
      <div className="h-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-4 flex flex-col gap-3 transition-shadow hover:shadow-md">
        {/* Icon + level */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-3xl" role="img" aria-hidden>{scenario.icon ?? "💬"}</span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${levelCls}`}>
            {scenario.level}
          </span>
        </div>

        {/* Title */}
        <p className="font-semibold text-[var(--text-primary)] line-clamp-2 group-hover:text-[var(--primary)] transition-colors">
          {scenario.title}
        </p>

        {/* Description */}
        <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{scenario.description}</p>

        {/* Footer */}
        <div className="mt-auto flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${catCls}`}>
            {scenario.category}
          </span>
          {scenario.personaName && (
            <span className="text-xs text-[var(--text-secondary)]">with {scenario.personaName}</span>
          )}
          <span className="ml-auto flex items-center gap-1 text-xs text-[var(--text-secondary)]">
            <Clock className="h-3 w-3" />
            ~{scenario.estimatedMinutes}m
          </span>
        </div>
      </div>
    </Link>
  );
}
