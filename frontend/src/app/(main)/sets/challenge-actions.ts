"use server";

import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import type { ChallengeRankingEntry } from "@/lib/shared/study/challenge-rankings";

export type SaveChallengeAttemptInput = {
  setId: string;
  completionTime: number;
  accuracy: number;
  totalCorrect: number;
  totalIncorrect: number;
};

export async function saveChallengeAttempt(input: SaveChallengeAttemptInput) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You need to log in before your challenge result can be ranked." };
  }

  try {
    await fetchBackendJson({
      path: "/api/v1/challenges/attempt",
      userId: user.id,
      method: "POST",
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
    });
    return { error: null };
  } catch (err) {
    console.error("[saveChallengeAttempt] error:", err);
    return { error: "Failed to save challenge result." };
  }
}

export async function getChallengeRanking(setId: string) {
  try {
    // Ranking is a public read — no auth required
    const user = await getCurrentUser();
    const data = await fetchBackendJson<{
      setTitle: string;
      isPublic: boolean;
      rows: ChallengeRankingEntry[];
    }>({
      path: `/api/v1/challenges/ranking/${encodeURIComponent(setId)}`,
      userId: user?.id ?? "anonymous",
    });

    return {
      set: { title: data.setTitle, is_public: data.isPublic },
      rows: data.rows ?? [],
    };
  } catch {
    return null;
  }
}
