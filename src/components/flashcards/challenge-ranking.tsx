import { Crown, Medal, Timer, Target, TriangleAlert } from "lucide-react";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { createTranslator, type Locale } from "@/lib/i18n/shared";
import {
  formatCompletionTime,
  type ChallengeRankingEntry,
} from "@/lib/challenge-rankings";

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-5 w-5 text-amber-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-orange-500" />;

  return <span className="text-sm font-semibold text-[var(--text-muted)]">#{rank}</span>;
}

export function ChallengeRanking({
  rows,
  currentUserId = null,
  currentUserRank = null,
  locale = "en",
}: {
  rows: ChallengeRankingEntry[];
  currentUserId?: string | null;
  currentUserRank?: number | null;
  locale?: Locale;
}) {
  const t = createTranslator(locale);

  if (rows.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-[var(--border)] bg-[var(--bg-elevated)] px-6 py-14 text-center">
        <p className="text-sm text-[var(--text-secondary)]">
          {t("challenge.noSets")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {currentUserRank !== null && (
        <div className="rounded-[1.5rem] bg-indigo-600 px-5 py-4 text-white">
          <p className="text-sm font-medium">{t("challenge.yourRank")}</p>
          <p className="mt-1 text-2xl font-semibold">#{currentUserRank}</p>
        </div>
      )}

      {rows.map((row) => (
        <div
          key={row.userId}
          className={`grid gap-4 rounded-[1.5rem] border p-5 md:grid-cols-[0.7fr_2.4fr_1fr_1fr_1fr] ${
            row.userId === currentUserId
              ? "border-indigo-500 bg-indigo-500/5"
              : "border-[var(--border)] bg-[var(--bg-elevated)]"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--bg-surface)]">
              {getRankIcon(row.rank)}
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              #{row.rank}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ProfileAvatar
              username={row.username}
              avatarUrl={row.avatarUrl}
              size="sm"
            />
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {row.username}
                {row.userId === currentUserId && (
                  <span className="ml-2 text-xs font-medium text-indigo-600">
                    ({t("leaderboard.you")})
                  </span>
                )}
              </p>
            </div>
          </div>

          <MetricCell
            icon={<Target className="h-4 w-4 text-emerald-500" />}
            label={t("stats.accuracy")}
            value={`${row.accuracy}%`}
          />
          <MetricCell
            icon={<Timer className="h-4 w-4 text-indigo-500" />}
            label={t("leaderboard.timeLabel")}
            value={formatCompletionTime(row.completionTime)}
          />
          <MetricCell
            icon={<TriangleAlert className="h-4 w-4 text-amber-500" />}
            label={t("stats.incorrect")}
            value={String(row.totalIncorrect)}
          />
        </div>
      ))}
    </div>
  );
}

function MetricCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-[var(--bg-surface)] px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}
