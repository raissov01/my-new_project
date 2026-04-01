"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/server";
import { fetchBackendJson } from "@/lib/backend/server";
import { DEV_MODE, DEV_USER } from "@/lib/dev-mode";
import { ADMIN_EMAIL } from "@/lib/admin-auth";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";

// ── Types (kept for frontend compatibility) ─────────────────────────────────

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

// ── Helpers ─────────────────────────────────────────────────────────────────

async function requireUser() {
  if (DEV_MODE) return DEV_USER;
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.email === ADMIN_EMAIL) return user;
  return user;
}

// ── Create Set → Go backend ─────────────────────────────────────────────────

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

  const filledCards = cards.filter((c) => c.term.trim() && c.definition.trim());
  if (filledCards.length === 0) return { error: t("action.addOneFlashcard") };

  try {
    const resp = await fetchBackendJson<{ id: string }>({
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
    redirect(`/sets/${resp.id}`);
  } catch (err) {
    console.error("[createSet] error:", err);
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("title is required")) return { error: t("action.titleRequired") };
    if (msg.includes("at least one card")) return { error: t("action.addOneFlashcard") };
    return { error: t("action.failedCreateSet") };
  }
}

// ── Update Set → Go backend ─────────────────────────────────────────────────

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
        cards,
        isPublic: visibility.isPublic,
        invitedUsers: visibility.invitedUsers,
      }),
      headers: { "Content-Type": "application/json" },
    });

    revalidatePath("/dashboard");
    revalidatePath(`/sets/${setId}`);
    redirect(`/sets/${setId}`);
  } catch (err) {
    console.error("[updateSet] error:", err);
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("access denied")) return { error: t("action.accessDenied") };
    return { error: t("action.failedSaveCards") };
  }
}

// ── Delete Set → Go backend ────────────────────────────────────────────────

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
  } catch (err) {
    console.error("[deleteSet] error:", err);
    return { error: t("action.setNotFound") };
  }
}
