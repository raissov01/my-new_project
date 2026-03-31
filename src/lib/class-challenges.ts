import { cache } from "react";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { buildChallengeRankingEntries, getCurrentUserRank } from "@/lib/challenge-rankings";
import type {
  ClassChallenge,
  ClassChallengeAttempt,
  ClassChallengeParticipant,
  ClassGroup,
  Database,
} from "@/types/database";

type ProfileSummary = {
  id: string;
  username: string;
  avatar_url: string | null;
};

export const getClassChallengeById = cache(async (challengeId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("class_challenges")
    .select("*, class_groups(id, name, owner_id)")
    .eq("id", challengeId)
    .single();

  return (data as
    | (ClassChallenge & {
        class_groups: Pick<ClassGroup, "id" | "name" | "owner_id"> | null;
      })
    | null) ?? null;
});

export async function getOwnedGroups() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  const { data } = await supabase
    .from("class_groups")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return (data as ClassGroup[] | null) ?? [];
}

export async function getGroupMembers(groupId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("class_group_members")
    .select("user_id, role")
    .eq("group_id", groupId);

  const rows = (data as { user_id: string; role: "owner" | "student" }[] | null) ?? [];
  const userIds = rows.map((row) => row.user_id);
  const { data: profilesData } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", userIds)
      : { data: [] as const };

  const profileById = new Map(
    (((profilesData as ProfileSummary[] | null) ?? [])).map((profile) => [profile.id, profile])
  );

  return rows.map((row) => ({
    userId: row.user_id,
    role: row.role,
    username: profileById.get(row.user_id)?.username ?? "Unknown",
    avatarUrl: profileById.get(row.user_id)?.avatar_url ?? null,
  }));
}

export async function getAvailableSetsForClassChallenges() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  const { data } = await supabase
    .from("flashcard_sets")
    .select("id, title, description, is_public, user_id, created_at")
    .order("updated_at", { ascending: false });

  const sets =
    (data as {
      id: string;
      title: string;
      description: string | null;
      is_public: boolean;
      user_id: string;
      created_at: string;
    }[] | null) ?? [];

  return sets.filter((set) => set.user_id === user.id);
}

export async function getMyClassChallenges() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  const { data } = await supabase
    .from("class_challenges")
    .select("*, class_groups(id, name, owner_id), flashcard_sets(id, title)")
    .order("created_at", { ascending: false });

  const challenges =
    (data as
      | (ClassChallenge & {
          class_groups: Pick<ClassGroup, "id" | "name" | "owner_id"> | null;
          flashcard_sets: Pick<
            Database["public"]["Tables"]["flashcard_sets"]["Row"],
            "id" | "title"
          > | null;
        })[]
      | null) ?? [];

  const { data: participantsData } = await supabase
    .from("class_challenge_participants")
    .select("challenge_id, user_id");
  const participantRows =
    (participantsData as { challenge_id: string; user_id: string }[] | null) ?? [];

  const participantCountByChallenge = new Map<string, number>();
  const joinedChallengeIds = new Set<string>();

  for (const row of participantRows) {
    participantCountByChallenge.set(
      row.challenge_id,
      (participantCountByChallenge.get(row.challenge_id) ?? 0) + 1
    );
    if (row.user_id === user.id) {
      joinedChallengeIds.add(row.challenge_id);
    }
  }

  return challenges.map((challenge) => ({
    id: challenge.id,
    title: challenge.title,
    deadline: challenge.deadline,
    createdAt: challenge.created_at,
    groupName: challenge.class_groups?.name ?? "Class",
    setTitle: challenge.flashcard_sets?.title ?? "Set",
    isOwner: challenge.class_groups?.owner_id === user.id,
    joined: joinedChallengeIds.has(challenge.id),
    participantCount: participantCountByChallenge.get(challenge.id) ?? 0,
  }));
}

export async function getClassChallengeRanking(challengeId: string) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const challenge = await getClassChallengeById(challengeId);

  if (!challenge) {
    return null;
  }

  const { data: attemptsData } = await supabase
    .from("class_challenge_attempts")
    .select("*")
    .eq("challenge_id", challengeId)
    .order("completed_at", { ascending: false });
  const attempts = (attemptsData as ClassChallengeAttempt[] | null) ?? [];

  const participantIds = Array.from(new Set(attempts.map((attempt) => attempt.user_id)));
  const { data: profilesData } =
    participantIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", participantIds)
      : { data: [] as const };

  const rows = buildChallengeRankingEntries(
    attempts,
    (profilesData as ProfileSummary[] | null) ?? []
  );

  return {
    challenge,
    rows,
    currentUserRank: getCurrentUserRank(rows, user?.id),
  };
}

export async function getClassChallengeParticipant(
  challengeId: string,
  userId: string
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("class_challenge_participants")
    .select("*")
    .eq("challenge_id", challengeId)
    .eq("user_id", userId)
    .maybeSingle();

  return (data as ClassChallengeParticipant | null) ?? null;
}
