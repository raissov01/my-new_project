"use server";

import { getCurrentUser } from "@/server/auth";
import { DEV_MODE } from "@/lib/shared/auth/dev-mode";
import { ADMIN_EMAIL } from "@/lib/shared/auth/admin";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

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

export async function getLeaderboard(
  period: LeaderboardPeriod = "alltime",
  limit = 20
): Promise<LeaderboardData> {
  const empty: LeaderboardData = { rows: [], currentUserRank: null };
  if (DEV_MODE) return empty;

  const user = await getCurrentUser();
  if (user?.email === ADMIN_EMAIL) return empty;

  try {
    const response = await fetchBackendJson<{
      rows: LeaderboardRow[];
      currentUserRank: number | null;
    }>({
      path: `/api/v1/leaderboard?period=${encodeURIComponent(period)}&limit=${limit}`,
      userId: user?.id ?? "anonymous",
    });

    return {
      rows: response.rows ?? [],
      currentUserRank: response.currentUserRank ?? null,
    };
  } catch {
    return empty;
  }
}
