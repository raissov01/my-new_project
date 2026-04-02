"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { DEV_MODE, DEV_USER } from "@/lib/shared/auth/dev-mode";
import { ADMIN_EMAIL } from "@/lib/shared/auth/admin";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";

export type FlashcardInput = {
  id?: string;
  term: string;
  definition: string;
};

export type SetFormState = {
  error: string | null;
};

export type SetVisibilityInput = {
  isPublic: boolean;
  invitedUsers: string;
};

async function requireUser() {
  if (DEV_MODE) return DEV_USER;
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.email === ADMIN_EMAIL) return user;
  return user;
}

function sanitizeCards(cards: FlashcardInput[]) {
  return cards
    .map((card) => ({
      id: card.id,
      term: card.term.trim(),
      definition: card.definition.trim(),
    }))
    .filter((card) => card.term && card.definition);
}

function formatBackendError(message: string, t: (key: string) => string) {
  if (message.includes("title is required")) return t("action.titleRequired");
  if (message.includes("at least one card")) return t("action.addOneFlashcard");
  if (message.includes("access denied")) return t("action.accessDenied");
  if (message.includes("set not found")) return t("action.setNotFound");
  return t("action.failedCreateSet");
}

export async function createSet(
  title: string,
  description: string,
  cards: FlashcardInput[],
  visibility: SetVisibilityInput
): Promise<SetFormState> {
  const t = createTranslator(await getServerLocale());
  const user = await requireUser();

  if (!user) return { error: t("action.notAuthenticated") };
  if (!title.trim()) return { error: t("action.titleRequired") };

  const filledCards = sanitizeCards(cards);
  if (filledCards.length === 0) return { error: t("action.addOneFlashcard") };

  try {
    const response = await fetchBackendJson<{ id: string }>({
      path: "/api/v1/sets",
      userId: user.id,
      method: "POST",
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        cards: filledCards,
        isPublic: visibility.isPublic,
        invitedUsers: visibility.invitedUsers,
      }),
      headers: { "Content-Type": "application/json" },
    });

    revalidatePath("/dashboard");
    revalidatePath("/sets");
    redirect(`/sets/${response.id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return { error: formatBackendError(message, t) };
  }
}

export async function updateSet(
  setId: string,
  title: string,
  description: string,
  cards: FlashcardInput[],
  visibility: SetVisibilityInput
): Promise<SetFormState> {
  const t = createTranslator(await getServerLocale());
  const user = await requireUser();

  if (!user) return { error: t("action.notAuthenticated") };
  if (!title.trim()) return { error: t("action.titleRequired") };

  try {
    await fetchBackendJson({
      path: `/api/v1/sets/${encodeURIComponent(setId)}`,
      userId: user.id,
      method: "PUT",
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        cards: sanitizeCards(cards),
        isPublic: visibility.isPublic,
        invitedUsers: visibility.invitedUsers,
      }),
      headers: { "Content-Type": "application/json" },
    });

    revalidatePath("/dashboard");
    revalidatePath(`/sets/${setId}`);
    redirect(`/sets/${setId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("access denied")) {
      return { error: t("action.accessDenied") };
    }
    return { error: t("action.failedSaveCards") };
  }
}

export async function deleteSet(setId: string): Promise<SetFormState> {
  const t = createTranslator(await getServerLocale());
  const user = await requireUser();

  if (!user) return { error: t("action.notAuthenticated") };

  try {
    await fetchBackendJson({
      path: `/api/v1/sets/${encodeURIComponent(setId)}`,
      userId: user.id,
      method: "DELETE",
    });

    revalidatePath("/dashboard");
    revalidatePath("/sets");
    redirect("/dashboard");
  } catch {
    return { error: t("action.setNotFound") };
  }
}
