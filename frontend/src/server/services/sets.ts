import "server-only";

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

export async function getSetDetail(
  setId: string,
  userId?: string | null
): Promise<AppSetDetail | null> {
  try {
    const data = await fetchBackendJson<BackendSetDetail>({
      path: `/api/v1/sets/${encodeURIComponent(setId)}`,
      userId: userId?.trim() || "anonymous",
    });

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
  } catch {
    return null;
  }
}
