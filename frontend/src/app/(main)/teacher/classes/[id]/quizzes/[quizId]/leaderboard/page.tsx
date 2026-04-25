import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Clock, Medal } from "lucide-react";
import { getClassQuizLeaderboard } from "@/server/services/classrooms";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { requireRole } from "@/server/auth";

interface LeaderboardPageProps {
  params: Promise<{ id: string; quizId: string }>;
}

function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null) return "—";
  const s = Math.max(0, Math.round(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

export default async function ClassQuizLeaderboardPage({
  params,
}: LeaderboardPageProps) {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const access = await requireRole("teacher");
  if (access.redirectTo) {
    redirect(access.redirectTo);
  }

  const { id: groupId, quizId } = await params;
  const board = await getClassQuizLeaderboard(groupId, quizId);
  if (!board) {
    notFound();
  }

  const rankedRows = board.rows.reduce<
    Array<{ row: (typeof board.rows)[number]; rank: number | null }>
  >((acc, row) => {
    const lastRank = acc.length > 0 ? acc[acc.length - 1].rank : 0;
    const nextRank =
      row.bestPercentage !== null ? (lastRank ?? 0) + 1 : null;
    acc.push({ row, rank: nextRank });
    return acc;
  }, []);

  return (
    <div className="page-shell py-4 sm:py-6">
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href={`/teacher/classes/${encodeURIComponent(groupId)}`} className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>← {board.groupName}</Link>
          <h3 style={{ flex: 1 }}>{board.quizTitle}</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: "var(--ink-mute)" }}>{t("classroom.leaderboardTitle")}</span>
        </div>
      </div>

      {board.deadline ? (
        <p className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
          <Clock className="h-3.5 w-3.5" />
          {t("classroom.deadlineValue", {
            value: new Date(board.deadline).toLocaleString(locale),
          })}
        </p>
      ) : null}

      <section className="mt-2 rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)] sm:p-6">
        {rankedRows.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--text-secondary)]">
            {t("classroom.noStudentsInClass")}
          </p>
        ) : (
          <div className="space-y-2">
            {rankedRows.map(({ row, rank }) => (
              <LeaderboardRow
                key={row.userId}
                rank={rank}
                username={row.username}
                percentage={row.bestPercentage}
                score={row.bestScore}
                total={row.totalQuestions}
                timeSpent={row.bestTimeSpent}
                attempts={row.attemptsCount}
                late={row.late}
                t={t}
                formatTime={formatDuration}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function LeaderboardRow({
  rank,
  username,
  percentage,
  score,
  total,
  timeSpent,
  attempts,
  late,
  t,
  formatTime,
}: {
  rank: number | null;
  username: string;
  percentage: number | null;
  score: number | null;
  total: number | null;
  timeSpent: number | null;
  attempts: number;
  late: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
  formatTime: (seconds: number | null) => string;
}) {
  const notStarted = percentage === null;
  const rankClasses =
    rank === 1
      ? "bg-amber-500/20 text-amber-300 border-amber-400/40"
      : rank === 2
        ? "bg-slate-400/20 text-slate-200 border-slate-400/40"
        : rank === 3
          ? "bg-orange-500/20 text-orange-300 border-orange-400/40"
          : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border)]";

  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border p-3 sm:gap-4 sm:p-4 ${
        notStarted
          ? "border-[var(--border)] bg-[var(--bg-base)] opacity-70"
          : "border-[var(--border)] bg-[var(--bg-surface)]"
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold sm:h-11 sm:w-11 ${rankClasses}`}
      >
        {rank === null ? "—" : rank === 1 ? <Medal className="h-5 w-5" /> : rank}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-[var(--text-primary)]">
          {username}
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {notStarted
            ? t("classroom.statusNotStarted")
            : t("classroom.attemptsCount", { count: attempts })}
          {late ? ` · ${t("classroom.statusLate")}` : ""}
        </p>
      </div>

      <div className="ml-auto flex items-center gap-4 text-sm sm:gap-6">
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)] sm:text-xs">
            {t("quiz.results.title")}
          </p>
          <p className="mt-0.5 whitespace-nowrap font-semibold text-[var(--text-primary)]">
            {notStarted
              ? "—"
              : `${score ?? 0}/${total ?? 0} · ${percentage}%`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)] sm:text-xs">
            {t("quiz.results.totalTime")}
          </p>
          <p className="mt-0.5 whitespace-nowrap font-semibold text-[var(--text-primary)]">
            {formatTime(timeSpent)}
          </p>
        </div>
      </div>
    </div>
  );
}
