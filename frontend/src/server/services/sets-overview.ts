import "server-only";

import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { getCurrentUser } from "@/server/auth";

export type UserSetOverview = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  cardCount: number;
  lastStudiedAt: string | null;
  accuracy: number;
  reviewCount: number;
  weakCount: number;
  dueCount: number;
};

export type PublicSetOverview = UserSetOverview;

export async function getUserSetsOverview(): Promise<UserSetOverview[]> {
  const user = await getCurrentUser();
  if (!user) {
    return [];
  }

  try {
    const response = await fetchBackendJson<{ items: UserSetOverview[] }>({
      path: "/api/v1/sets/overview",
      userId: user.id,
    });
    return response.items ?? [];
  } catch {
    return [];
  }
}

export async function getPublicSetsOverview(): Promise<PublicSetOverview[]> {
  try {
    const response = await fetchBackendJson<{ items: PublicSetOverview[] }>({
      path: "/api/v1/sets/public",
      userId: "anonymous",
    });
    return response.items ?? [];
  } catch {
    return [];
  }
}

export async function getLibrarySetsOverview(): Promise<UserSetOverview[]> {
  const user = await getCurrentUser();
  if (!user) {
    return getPublicSetsOverview();
  }

  const [ownSets, publicSets] = await Promise.all([
    getUserSetsOverview(),
    getPublicSetsOverview(),
  ]);

  const merged = new Map<string, UserSetOverview>();
  for (const set of publicSets) {
    merged.set(set.id, set);
  }
  for (const set of ownSets) {
    merged.set(set.id, set);
  }

  return Array.from(merged.values()).sort((a, b) => {
    const aDate = a.lastStudiedAt ?? a.updatedAt ?? a.createdAt;
    const bDate = b.lastStudiedAt ?? b.updatedAt ?? b.createdAt;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });
}
