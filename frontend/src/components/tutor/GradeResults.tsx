import Link from "next/link";
import type { GradeScores } from "@/features/tutor/api";

interface Props {
  scores: GradeScores;
  scenarioSlug: string;
}

const DIMENSIONS = [
  { key: "fluency", label: "Fluency", description: "Natural flow and pacing" },
  { key: "grammar", label: "Grammar", description: "Accuracy for your level" },
  { key: "vocabulary", label: "Vocabulary", description: "Range and appropriateness" },
  { key: "task", label: "Task completion", description: "Did you achieve the goal?" },
] as const;

function ScoreMeter({ score, label }: { score: number; label: string }) {
  const pct = (score / 10) * 100;
  const color = score >= 8 ? "bg-green-500" : score >= 6 ? "bg-amber-400" : "bg-red-400";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-bold text-[var(--text-primary)]">{score}/10</span>
      </div>
      <div className="h-2 w-full rounded-full bg-[var(--bg-soft)]">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={10}
        />
      </div>
    </div>
  );
}

export function GradeResults({ scores, scenarioSlug }: Props) {
  const avg = Math.round((scores.fluency + scores.grammar + scores.vocabulary + scores.task) / 4);

  return (
    <div className="space-y-6 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-6">
      {/* Overall */}
      <div className="text-center space-y-1">
        <p className="text-5xl font-bold text-[var(--primary)]">{avg}<span className="text-2xl text-[var(--text-secondary)]">/10</span></p>
        <p className="text-sm text-[var(--text-secondary)]">Overall score</p>
      </div>

      {/* Dimensions */}
      <div className="space-y-3">
        {DIMENSIONS.map((d) => (
          <ScoreMeter key={d.key} score={scores[d.key] ?? 0} label={d.label} />
        ))}
      </div>

      {/* Tips */}
      {scores.tips && scores.tips.length > 0 && (
        <div className="rounded-[var(--radius-lg)] bg-[var(--bg-soft)] p-4 space-y-2">
          <p className="font-semibold text-sm">Tips for improvement</p>
          <ul className="space-y-1.5">
            {scores.tips.map((tip, i) => (
              <li key={i} className="flex gap-2 text-sm text-[var(--text-secondary)]">
                <span className="shrink-0 font-bold text-[var(--primary)]">{i + 1}.</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/tutor/${scenarioSlug}`}
          className="rounded-[var(--radius-md)] bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          Try again
        </Link>
        <Link
          href="/tutor"
          className="rounded-[var(--radius-md)] border border-[var(--border)] px-5 py-2.5 text-sm font-medium hover:bg-[var(--bg-soft)] transition-colors"
        >
          More scenarios
        </Link>
        <Link
          href="/tutor/history"
          className="rounded-[var(--radius-md)] border border-[var(--border)] px-5 py-2.5 text-sm font-medium hover:bg-[var(--bg-soft)] transition-colors"
        >
          My history
        </Link>
      </div>
    </div>
  );
}
