import type { ChallengeAttempt, ClassChallengeAttempt } from "@/types/database";

type RankingAttempt = {
  user_id: string;
  accuracy: number;
  completion_time: number;
  total_correct: number;
  total_incorrect: number;
  completed_at: string;
};

export type ChallengeRankingEntry = {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  accuracy: number;
  completionTime: number;
  totalCorrect: number;
  totalIncorrect: number;
  completedAt: string;
};

type ChallengeProfile = {
  id: string;
  username: string;
  avatar_url: string | null;
};

export function compareChallengeAttempts(
  left: Pick<
    RankingAttempt,
    "accuracy" | "completion_time" | "total_incorrect" | "completed_at"
  >,
  right: Pick<
    RankingAttempt,
    "accuracy" | "completion_time" | "total_incorrect" | "completed_at"
  >
) {
  if (left.accuracy !== right.accuracy) {
    return right.accuracy - left.accuracy;
  }

  if (left.completion_time !== right.completion_time) {
    return left.completion_time - right.completion_time;
  }

  if (left.total_incorrect !== right.total_incorrect) {
    return left.total_incorrect - right.total_incorrect;
  }

  return (
    new Date(left.completed_at).getTime() - new Date(right.completed_at).getTime()
  );
}

export function pickBestChallengeAttempts(attempts: ChallengeAttempt[]) {
  return pickBestRankingAttempts(attempts);
}

export function pickBestRankingAttempts<
  T extends RankingAttempt
>(attempts: T[]) {
  const bestByUser = new Map<string, T>();

  for (const attempt of attempts) {
    const current = bestByUser.get(attempt.user_id);
    if (!current || compareChallengeAttempts(attempt, current) < 0) {
      bestByUser.set(attempt.user_id, attempt);
    }
  }

  return Array.from(bestByUser.values()).sort(compareChallengeAttempts);
}

export function buildChallengeRankingEntries(
  attempts: ChallengeAttempt[] | ClassChallengeAttempt[],
  profiles: ChallengeProfile[]
): ChallengeRankingEntry[] {
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  return pickBestRankingAttempts(attempts).map((attempt, index) => {
    const profile = profileById.get(attempt.user_id);

    return {
      rank: index + 1,
      userId: attempt.user_id,
      username: profile?.username ?? "Unknown",
      avatarUrl: profile?.avatar_url ?? null,
      accuracy: attempt.accuracy,
      completionTime: attempt.completion_time,
      totalCorrect: attempt.total_correct,
      totalIncorrect: attempt.total_incorrect,
      completedAt: attempt.completed_at,
    };
  });
}

export function getCurrentUserRank(
  rows: ChallengeRankingEntry[],
  currentUserId: string | null | undefined
) {
  if (!currentUserId) {
    return null;
  }

  const row = rows.find((entry) => entry.userId === currentUserId);
  return row?.rank ?? null;
}

export function formatCompletionTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
