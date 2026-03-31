import "server-only";

import { fetchBackendJson } from "./server";
import type {
  AvailableClassChallengeSet,
  MyClassChallenge,
  OwnedGroup,
} from "@/lib/class-challenges-types";

export async function getOwnedGroupsFromGo(userId: string): Promise<OwnedGroup[]> {
  const response = await fetchBackendJson<{ items: OwnedGroup[] }>({
    path: "/api/v1/classroom/owned-groups",
    userId,
  });

  return response.items;
}

export async function getAvailableSetsForClassChallengesFromGo(
  userId: string
): Promise<AvailableClassChallengeSet[]> {
  const response = await fetchBackendJson<{ items: AvailableClassChallengeSet[] }>({
    path: "/api/v1/classroom/available-sets",
    userId,
  });

  return response.items;
}

export async function getMyClassChallengesFromGo(
  userId: string
): Promise<MyClassChallenge[]> {
  const response = await fetchBackendJson<{ items: MyClassChallenge[] }>({
    path: "/api/v1/classroom/my-challenges",
    userId,
  });

  return response.items;
}
