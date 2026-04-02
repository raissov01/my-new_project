import "server-only";

import { cache } from "react";
import { createClient, getCurrentUser } from "@/server/supabase/server";
import type { Database } from "@/lib/shared/types/database";

export type SetAccessSummary = {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  userId: string;
  createdAt: string;
};

type ProfileSummary = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "username" | "avatar_url"
>;

export const getAccessibleSetById = cache(async (setId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("flashcard_sets").select("*").eq("id", setId).single();

  return data as Database["public"]["Tables"]["flashcard_sets"]["Row"] | null;
});

export async function getAllowedProfilesForSet(setId: string) {
  const supabase = await createClient();
  const set = await getAccessibleSetById(setId);
  const user = await getCurrentUser();

  if (!set || user?.id !== set.user_id) {
    return [];
  }

  const { data: accessRows } = await supabase
    .from("flashcard_set_access")
    .select("user_id")
    .eq("set_id", setId);

  const userIds = ((accessRows as { user_id: string }[] | null) ?? []).map(
    (row) => row.user_id
  );

  if (userIds.length === 0) {
    return [];
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", userIds)
    .order("username", { ascending: true });

  return (profiles as ProfileSummary[] | null) ?? [];
}

export async function getAccessibleChallengeSets(limit?: number) {
  const supabase = await createClient();
  let query = supabase
    .from("flashcard_sets")
    .select("id, title, description, is_public, user_id, created_at")
    .order("updated_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data: sets } = await query;
  const accessibleSets =
    (sets as {
      id: string;
      title: string;
      description: string | null;
      is_public: boolean;
      user_id: string;
      created_at: string;
    }[] | null) ?? [];

  if (accessibleSets.length === 0) {
    return [];
  }

  const setIds = accessibleSets.map((set) => set.id);
  const { data: cards } = await supabase
    .from("flashcards")
    .select("id, set_id")
    .in("set_id", setIds);

  const cardCounts = new Map<string, number>();
  for (const card of ((cards as { id: string; set_id: string }[] | null) ?? [])) {
    cardCounts.set(card.set_id, (cardCounts.get(card.set_id) ?? 0) + 1);
  }

  return accessibleSets
    .map((set) => ({
      id: set.id,
      title: set.title,
      description: set.description,
      isPublic: set.is_public,
      userId: set.user_id,
      createdAt: set.created_at,
      cardCount: cardCounts.get(set.id) ?? 0,
    }))
    .filter((set) => set.cardCount > 0);
}

export async function resolveInviteProfiles(rawInput: string) {
  const normalized = Array.from(
    new Set(
      rawInput
        .split(/[\n,]+/)
        .map((value) => value.trim().replace(/^@/, ""))
        .filter(Boolean)
    )
  );

  if (normalized.length === 0) {
    return { usernames: [] as string[], profiles: [] as ProfileSummary[] };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("username", normalized);

  return {
    usernames: normalized,
    profiles: (data as ProfileSummary[] | null) ?? [],
  };
}
