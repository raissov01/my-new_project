"use server";

import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { buildChallengeRankingEntries } from "@/lib/challenge-rankings";
import { getAccessibleSetById } from "@/lib/set-access";
import type { ChallengeAttempt, Database } from "@/types/database";

type TableError = { message: string } | null;

type ChallengeAttemptsTable = {
  insert: (
    values: Database["public"]["Tables"]["challenge_attempts"]["Insert"]
  ) => Promise<{ error: TableError }>;
};

export type SaveChallengeAttemptInput = {
  setId: string;
  completionTime: number;
  accuracy: number;
  totalCorrect: number;
  totalIncorrect: number;
};

export async function saveChallengeAttempt(input: SaveChallengeAttemptInput) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const set = await getAccessibleSetById(input.setId);

  if (!user) {
    return { error: "You need to log in before your challenge result can be ranked." };
  }

  if (!set) {
    return { error: "This challenge is no longer available." };
  }

  const attemptsTable =
    supabase.from("challenge_attempts") as never as ChallengeAttemptsTable;

  const { error } = await attemptsTable.insert({
    user_id: user.id,
    set_id: input.setId,
    completion_time: Math.max(0, Math.round(input.completionTime)),
    accuracy: Number(input.accuracy.toFixed(2)),
    total_correct: input.totalCorrect,
    total_incorrect: input.totalIncorrect,
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function getChallengeRanking(setId: string) {
  const supabase = await createClient();
  const set = await getAccessibleSetById(setId);

  if (!set) {
    return null;
  }

  const { data: attemptsData } = await supabase
    .from("challenge_attempts")
    .select("*")
    .eq("set_id", setId)
    .order("completed_at", { ascending: false });
  const attempts = (attemptsData as ChallengeAttempt[] | null) ?? [];

  const participantIds = Array.from(new Set(attempts.map((attempt) => attempt.user_id)));
  const { data: profilesData } =
    participantIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", participantIds)
      : { data: [] as const };

  return {
    set,
    attempts,
    rows: buildChallengeRankingEntries(attempts, (profilesData as {
      id: string;
      username: string;
      avatar_url: string | null;
    }[] | null) ?? []),
  };
}
