import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import type { Flashcard } from "@/lib/shared/types/database";

type BackendSetCard = {
  id?: string | null;
  term: string;
  definition: string;
};

type BackendSetDetail = {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  userId: string;
  createdAt: string;
  cards: BackendSetCard[];
};

export type AppSetDetail = {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  userId: string;
  createdAt: string;
  flashcards: Flashcard[];
};

function mapBackendSetDetail(data: BackendSetDetail): AppSetDetail {
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    isPublic: data.isPublic,
    userId: data.userId,
    createdAt: data.createdAt,
    flashcards: (data.cards ?? []).map((card, index) => ({
      id: card.id ?? `${data.id}-${index}`,
      set_id: data.id,
      term: card.term,
      definition: card.definition,
      position: index,
      created_at: data.createdAt,
    })),
  };
}

const getUserSetDetailCached = cache(
  async (setId: string, userId: string): Promise<AppSetDetail | null> => {
    try {
      const data = await fetchBackendJson<BackendSetDetail>({
        path: `/api/v1/sets/${encodeURIComponent(setId)}`,
        userId,
      });

      return mapBackendSetDetail(data);
    } catch {
      return null;
    }
  }
);

const getPublicSetDetailCached = unstable_cache(
  async (setId: string): Promise<AppSetDetail | null> => {
    try {
      const data = await fetchBackendJson<BackendSetDetail>({
        path: `/api/v1/sets/${encodeURIComponent(setId)}`,
        userId: "anonymous",
        cache: "force-cache",
        next: {
          revalidate: 300,
          tags: ["public-sets"],
        },
      });

      return mapBackendSetDetail(data);
    } catch {
      return null;
    }
  },
  ["public-set-detail"],
  {
    revalidate: 300,
    tags: ["public-sets"],
  }
);

export async function getSetDetail(
  setId: string,
  userId?: string | null
): Promise<AppSetDetail | null> {
  const normalizedUserId = userId?.trim();
  if (normalizedUserId) {
    return getUserSetDetailCached(setId, normalizedUserId);
  }

  return getPublicSetDetailCached(setId);
}
