import "server-only";

import { cache } from "react";
import {
  getAvailableSetsForClassChallengesFromGo,
  getMyClassChallengesFromGo,
  getOwnedGroupsFromGo,
} from "@/server/integrations/go-backend/class-challenges";
import { isGoBackendBridgeConfigured } from "@/server/integrations/go-backend/env";
import { createClient, getCurrentUser } from "@/server/supabase/server";
import { buildChallengeRankingEntries, getCurrentUserRank } from "@/lib/shared/study/challenge-rankings";
import type {
  AvailableClassChallengeSet,
  MyClassChallenge,
  OwnedGroup,
} from "@/server/services/class-challenges.types";
import type {
  ClassChallenge,
  ClassChallengeAttempt,
  ClassChallengeParticipant,
  ClassGroup,
  Database,
} from "@/lib/shared/types/database";

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

async function getOwnedGroupsFromSupabase(
  userId: string
): Promise<OwnedGroup[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("class_groups")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  return (((data as ClassGroup[] | null) ?? [])).map((group) => ({
    id: group.id,
    name: group.name,
    ownerId: group.owner_id,
    joinCode: group.join_code,
    createdAt: group.created_at,
  }));
}

export async function getOwnedGroups(preloadedUserId?: string) {
  const userId = preloadedUserId ?? (await getCurrentUser())?.id;

  if (!userId) {
    return [];
  }

  if (isGoBackendBridgeConfigured()) {
    try {
      return await getOwnedGroupsFromGo(userId);
    } catch (error) {
      console.warn("[getOwnedGroups] Falling back to Supabase:", error);
    }
  }

  return getOwnedGroupsFromSupabase(userId);
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

async function getAvailableSetsForClassChallengesFromSupabase(
  userId: string
): Promise<AvailableClassChallengeSet[]> {
  const supabase = await createClient();

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

  return sets
    .filter((set) => set.user_id === userId)
    .map((set) => ({
      id: set.id,
      title: set.title,
      description: set.description,
      isPublic: set.is_public,
      userId: set.user_id,
      createdAt: set.created_at,
    }));
}

export async function getAvailableSetsForClassChallenges(preloadedUserId?: string) {
  const userId = preloadedUserId ?? (await getCurrentUser())?.id;

  if (!userId) {
    return [];
  }

  if (isGoBackendBridgeConfigured()) {
    try {
      return await getAvailableSetsForClassChallengesFromGo(userId);
    } catch (error) {
      console.warn("[getAvailableSetsForClassChallenges] Falling back to Supabase:", error);
    }
  }

  return getAvailableSetsForClassChallengesFromSupabase(userId);
}

async function getMyClassChallengesFromSupabase(
  userId: string
): Promise<MyClassChallenge[]> {
  const supabase = await createClient();

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
    if (row.user_id === userId) {
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
    isOwner: challenge.class_groups?.owner_id === userId,
    joined: joinedChallengeIds.has(challenge.id),
    participantCount: participantCountByChallenge.get(challenge.id) ?? 0,
  }));
}

export async function getMyClassChallenges(preloadedUserId?: string) {
  const userId = preloadedUserId ?? (await getCurrentUser())?.id;

  if (!userId) {
    return [];
  }

  if (isGoBackendBridgeConfigured()) {
    try {
      return await getMyClassChallengesFromGo(userId);
    } catch (error) {
      console.warn("[getMyClassChallenges] Falling back to Supabase:", error);
    }
  }

  return getMyClassChallengesFromSupabase(userId);
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
