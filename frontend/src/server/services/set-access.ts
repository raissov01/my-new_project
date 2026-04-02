import "server-only";

import { getCurrentUser } from "@/server/auth";
import { getSetDetail } from "@/server/services/sets";
import { getLibrarySetsOverview, getPublicSetsOverview } from "@/server/services/sets-overview";

export type SetAccessSummary = {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  userId: string;
  createdAt: string;
};

export async function getAccessibleSetById(setId: string) {
  const user = await getCurrentUser();
  const set = await getSetDetail(setId, user?.id);
  if (!set) return null;

  return {
    id: set.id,
    title: set.title,
    description: set.description,
    is_public: set.isPublic,
    user_id: set.userId,
    created_at: set.createdAt,
  };
}

export async function getAllowedProfilesForSet(_setId: string) {
  return [];
}

export async function getAccessibleChallengeSets(limit?: number) {
  const user = await getCurrentUser();
  const sets = user ? await getLibrarySetsOverview() : await getPublicSetsOverview();

  return sets.slice(0, limit ?? sets.length).map((set) => ({
    id: set.id,
    title: set.title,
    description: set.description,
    isPublic: true,
    userId: "",
    createdAt: set.createdAt,
    cardCount: set.cardCount,
  }));
}

export async function resolveInviteProfiles(rawInput: string) {
  const usernames = Array.from(
    new Set(
      rawInput
        .split(/[\n,]+/)
        .map((value) => value.trim().replace(/^@/, ""))
        .filter(Boolean)
    )
  );

  return {
    usernames,
    profiles: [],
  };
}
