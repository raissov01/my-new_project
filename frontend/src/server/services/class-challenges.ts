import "server-only";

import {
  getAvailableSetsForClassChallengesFromGo,
  getMyClassChallengesFromGo,
  getOwnedGroupsFromGo,
} from "@/server/integrations/go-backend/class-challenges";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { getCurrentUser } from "@/server/auth";
import type {
  AvailableClassChallengeSet,
  MyClassChallenge,
  OwnedGroup,
} from "@/server/services/class-challenges.types";
import type { Flashcard } from "@/lib/shared/types/database";
import type { ChallengeRankingEntry } from "@/lib/shared/study/challenge-rankings";

type BackendChallengeDetail = {
  id: string;
  title: string;
  deadline: string | null;
  createdAt: string;
  participantCount: number;
  joined: boolean;
  group: {
    id: string;
    name: string;
    ownerId: string;
  };
  set: {
    id: string;
    title: string;
    description: string | null;
    isPublic: boolean;
  };
  cards: Array<{
    id: string;
    term: string;
    definition: string;
    position: number;
  }>;
};

type BackendChallengeRanking = {
  challenge: BackendChallengeDetail;
  rows: ChallengeRankingEntry[];
  currentUserRank: number | null;
};

type LegacyChallengeDetail = {
  id: string;
  title: string;
  deadline: string | null;
  set_id: string;
  group_id: string;
  participantCount: number;
  joined: boolean;
  class_groups: {
    id: string;
    name: string;
    owner_id: string;
  } | null;
  cards: Flashcard[];
};

function mapCards(setId: string, createdAt: string, cards: BackendChallengeDetail["cards"]): Flashcard[] {
  return cards.map((card) => ({
    id: card.id,
    set_id: setId,
    term: card.term,
    definition: card.definition,
    position: card.position,
    created_at: createdAt,
  }));
}

export async function getClassChallengeById(challengeId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  try {
    const challenge = await fetchBackendJson<BackendChallengeDetail>({
      path: `/api/v1/classroom/challenges/${encodeURIComponent(challengeId)}`,
      userId: user.id,
    });

    const detail: LegacyChallengeDetail = {
      id: challenge.id,
      title: challenge.title,
      deadline: challenge.deadline,
      set_id: challenge.set.id,
      group_id: challenge.group.id,
      participantCount: challenge.participantCount,
      joined: challenge.joined,
      class_groups: {
        id: challenge.group.id,
        name: challenge.group.name,
        owner_id: challenge.group.ownerId,
      },
      cards: mapCards(challenge.set.id, challenge.createdAt, challenge.cards),
    };

    return detail;
  } catch {
    return null;
  }
}

export async function getOwnedGroups(preloadedUserId?: string): Promise<OwnedGroup[]> {
  const userId = preloadedUserId ?? (await getCurrentUser())?.id;
  if (!userId) return [];

  try {
    return await getOwnedGroupsFromGo(userId);
  } catch {
    return [];
  }
}

export async function getAvailableSetsForClassChallenges(
  preloadedUserId?: string
): Promise<AvailableClassChallengeSet[]> {
  const userId = preloadedUserId ?? (await getCurrentUser())?.id;
  if (!userId) return [];

  try {
    return await getAvailableSetsForClassChallengesFromGo(userId);
  } catch {
    return [];
  }
}

export async function getMyClassChallenges(preloadedUserId?: string): Promise<MyClassChallenge[]> {
  const userId = preloadedUserId ?? (await getCurrentUser())?.id;
  if (!userId) return [];

  try {
    return await getMyClassChallengesFromGo(userId);
  } catch {
    return [];
  }
}

export async function getClassChallengeRanking(challengeId: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  try {
    return await fetchBackendJson<BackendChallengeRanking>({
      path: `/api/v1/classroom/challenges/${encodeURIComponent(challengeId)}/ranking`,
      userId: user.id,
    });
  } catch {
    return null;
  }
}

export async function getClassChallengeParticipant(challengeId: string, userId: string) {
  try {
    const challenge = await fetchBackendJson<BackendChallengeDetail>({
      path: `/api/v1/classroom/challenges/${encodeURIComponent(challengeId)}`,
      userId,
    });
    return challenge.joined ? { challenge_id: challengeId, user_id: userId } : null;
  } catch {
    return null;
  }
}
