import type { ScoreEntry } from "@/components/dashboard/ScoreRadarDashboard";

const SKILLS = [
  { key: "reading" as const, label: "Оқу", abbr: "R", color: "bg-cyan-500" },
  { key: "listening" as const, label: "Аудирование", abbr: "L", color: "bg-indigo-500" },
  { key: "writing" as const, label: "Жазу", abbr: "W", color: "bg-emerald-500" },
  { key: "speaking" as const, label: "Сөйлеу", abbr: "S", color: "bg-violet-500" },
];

function bandToPercent(band: number): number {
  // Band 0-9 → 0-100%
  return Math.round((band / 9) * 100);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffDays = Math.floor((now - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Бүгін";
  if (diffDays === 1) return "Кеше";
  if (diffDays < 7) return `${diffDays} күн бұрын`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} апта бұрын`;
  return `${Math.floor(diffDays / 30)} ай бұрын`;
}

interface Props {
  scoreHistory: ScoreEntry[];
}

export function SkillScoreBar({ scoreHistory }: Props) {
  if (!scoreHistory.length) return null;

  const latest = scoreHistory[scoreHistory.length - 1];
  const overallAvg =
    (latest.reading + latest.listening + latest.writing + latest.speaking) / 4;
  const overallBand = Math.round(overallAvg * 2) / 2;

  return (
    <div className="mt-6 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          Соңғы нәтижелер
        </p>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span>{formatDate(latest.date)}</span>
          <span className="rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-xs font-bold text-[var(--primary)]">
            Band {overallBand.toFixed(1)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SKILLS.map((skill) => {
          const score = latest[skill.key];
          const pct = bandToPercent(score);
          return (
            <div key={skill.key}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  {skill.label}
                </span>
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {score.toFixed(1)}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                <div
                  className={`h-full rounded-full ${skill.color} transition-all`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {scoreHistory.length > 1 && (
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Жалпы {scoreHistory.length} mock · /ielts/dashboard-та толық серпінді қараңыз
        </p>
      )}
    </div>
  );
}
