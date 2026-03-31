/**
 * Typed client for calling the Go backend API.
 *
 * Falls back to the Next.js server action if the Go backend is unreachable.
 * This means the leaderboard works whether or not the Go backend is running.
 */

import {
  getLeaderboard as getLeaderboardAction,
  type LeaderboardPeriod as ServerPeriod,
} from "@/app/(main)/sets/leaderboard-actions";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

function isReachabilityError(error: unknown) {
  if (!(error instanceof Error)) return false;

  return (
    error instanceof TypeError ||
    error.message === "Failed to fetch" ||
    error.message === "Load failed" ||
    error.message.includes("NetworkError") ||
    error.message.includes("fetch")
  );
}

async function fetchAPI<T>(
  path: string,
  init?: RequestInit,
  authUserId?: string | null
): Promise<T> {
  const url = `${BACKEND_URL}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(authUserId ? { Authorization: `Bearer ${authUserId}` } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `API error ${res.status}`);
  }

  return res.json();
}

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Client ────────────────────────────────────────────────────────────────────

export const apiClient = {
  /**
   * Fetches the leaderboard.
   * Tries the Go backend first. If the backend is unreachable (network error),
   * transparently falls back to the Next.js server action via Supabase.
   */
  async getLeaderboard(
    period: LeaderboardPeriod = "alltime",
    limit = 20,
    userId?: string | null
  ): Promise<LeaderboardData> {
    if (userId) {
      return getLeaderboardAction(period as ServerPeriod, limit);
    }

    try {
      return await fetchAPI<LeaderboardData>(
        `/api/v1/leaderboard?period=${period}&limit=${limit}`,
        undefined,
        userId
      );
    } catch (err) {
      // Browser/network/CORS/backend reachability issues fall back to the server action.
      if (isReachabilityError(err)) {
        console.warn(
          `[api-client] Go backend unreachable at ${BACKEND_URL}, falling back to server action`
        );
        return getLeaderboardAction(period as ServerPeriod, limit);
      }
      throw err;
    }
  },
};
