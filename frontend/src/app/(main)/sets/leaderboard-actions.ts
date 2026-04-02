"use server";

import { createClient, getCurrentUser } from "@/server/supabase/server";
import { DEV_MODE } from "@/lib/shared/auth/dev-mode";
import { ADMIN_EMAIL } from "@/lib/shared/auth/admin";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import type {
  LeaderboardDailyEntry,
  LeaderboardEntry,
  LeaderboardWeeklyEntry,
} from "@/lib/shared/types/database";

export type LeaderboardPeriod = "daily" | "weekly" | "alltime";

export type LeaderboardRow = {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  rankingScore: number;
  totalCardsReviewed: number;
  totalCorrect: number;
  completedSessions: number;
  totalStudyMinutes: number;
  isCurrentUser: boolean;
};

export type LeaderboardData = {
  rows: LeaderboardRow[];
  currentUserRank: number | null;
};

const VIEW_MAP: Record<LeaderboardPeriod, string> = {
  daily: "leaderboard_daily",
  weekly: "leaderboard_weekly",
  alltime: "leaderboard_stats",
};

type LeaderboardViewRow =
  | LeaderboardEntry
  | LeaderboardDailyEntry
  | LeaderboardWeeklyEntry;

export async function getLeaderboard(
  period: LeaderboardPeriod = "alltime",
  limit = 20
): Promise<LeaderboardData> {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const empty: LeaderboardData = { rows: [], currentUserRank: null };

  if (DEV_MODE) return empty;

  const supabase = await createClient();
  const user = await getCurrentUser();

  if (user?.email === ADMIN_EMAIL) return empty;

  const viewName = VIEW_MAP[period];

  // Fetch top N users by ranking_score
  const { data, error } = await supabase
    .from(viewName)
    .select("*")
    .order("ranking_score", { ascending: false })
    .limit(limit);

  const rowsData = data as LeaderboardViewRow[] | null;
  if (error || !rowsData) return empty;

  let currentUserRank: number | null = null;
  const rows: LeaderboardRow[] = rowsData.map((row, index) => {
    const isCurrentUser = row.user_id === user?.id;
    const rank = index + 1;
    if (isCurrentUser) currentUserRank = rank;

    return {
      rank,
      userId: row.user_id,
      username: row.username,
      avatarUrl: row.avatar_url,
      rankingScore: row.ranking_score,
      totalCardsReviewed: row.total_cards_reviewed,
      totalCorrect: row.total_correct,
      completedSessions: row.completed_sessions,
      totalStudyMinutes: row.total_study_minutes,
      isCurrentUser,
    };
  });

  // If current user not in top N, find their rank
  if (user && currentUserRank === null) {
    const { data } = await supabase
      .from(viewName)
      .select("ranking_score")
      .eq("user_id", user.id)
      .single();
    const userRow = data as Pick<LeaderboardViewRow, "ranking_score"> | null;

    if (userRow) {
      const { count } = await supabase
        .from(viewName)
        .select("*", { count: "exact", head: true })
        .gt("ranking_score", userRow.ranking_score);

      currentUserRank = (count ?? 0) + 1;

      // Add the current user's row at the end for display
      rows.push({
        rank: currentUserRank ?? 0,
        userId: user.id,
        username: t("leaderboard.you"),
        avatarUrl: null,
        rankingScore: userRow.ranking_score,
        totalCardsReviewed: 0,
        totalCorrect: 0,
        completedSessions: 0,
        totalStudyMinutes: 0,
        isCurrentUser: true,
      });
    }
  }

  return { rows, currentUserRank };
}
