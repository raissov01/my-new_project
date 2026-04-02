"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { fetchBackendJson } from "@/lib/backend/server";
import { isGoBackendBridgeConfigured } from "@/lib/backend/env";
import { DEV_MODE, DEV_USER } from "@/lib/dev-mode";
import { ADMIN_EMAIL } from "@/lib/admin-auth";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";

// ── Types ───────────────────────────────────────────────────────────────────

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

function isConnectionError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("fetch failed") ||
    msg.includes("econnrefused") ||
    msg.includes("connect") ||
    msg.includes("go_backend_bridge_not_configured") ||
    msg.includes("network") ||
    msg.includes("aborted")
  );
}

// ── Supabase direct fallback ────────────────────────────────────────────────

async function createSetViaSupabase(
  userId: string,
  title: string,
  description: string,
  cards: FlashcardInput[],
  isPublic: boolean
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();

  // Insert set
  const { data: setData, error: setError } = await (supabase.from("flashcard_sets") as never as {
    insert: (values: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
      };
    };
  })
    .insert({
      user_id: userId,
      title,
      description: description || null,
      is_public: isPublic,
    })
    .select("id")
    .single();

  if (setError || !setData) {
    console.error("[createSetViaSupabase] Set insert failed:", setError?.message);
    return { error: `Set insert failed: ${setError?.message ?? "no data returned"}` };
  }

  // Insert cards
  const cardPayload = cards.map((card, index) => ({
    set_id: setData.id,
    term: card.term.trim(),
    definition: card.definition.trim(),
    position: index,
  }));

  const { error: cardsError } = await (supabase.from("flashcards") as never as {
    insert: (values: Record<string, unknown>[]) => Promise<{ error: { message: string } | null }>;
  }).insert(cardPayload);

  if (cardsError) {
    console.error("[createSetViaSupabase] Cards insert failed:", cardsError.message);
    // Clean up the orphaned set
    await (supabase.from("flashcard_sets") as never as {
      delete: () => { eq: (col: string, val: string) => Promise<unknown> };
    }).delete().eq("id", setData.id);
    return { error: `Cards insert failed: ${cardsError.message}` };
  }

  return { id: setData.id };
}

async function updateSetViaSupabase(
  userId: string,
  setId: string,
  title: string,
  description: string,
  cards: FlashcardInput[],
  isPublic: boolean
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  // Verify ownership
  const { data: existing } = await (supabase.from("flashcard_sets") as never as {
    select: (columns: string) => {
      eq: (col: string, val: string) => {
        single: () => Promise<{ data: { user_id: string } | null; error: unknown }>;
      };
    };
  }).select("user_id").eq("id", setId).single();

  if (!existing || existing.user_id !== userId) {
    return { error: "access denied" };
  }

  // Update set metadata
  await (supabase.from("flashcard_sets") as never as {
    update: (values: Record<string, unknown>) => {
      eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
    };
  }).update({ title, description: description || null, is_public: isPublic }).eq("id", setId);

  // Replace cards
  await (supabase.from("flashcards") as never as {
    delete: () => { eq: (col: string, val: string) => Promise<unknown> };
  }).delete().eq("set_id", setId);

  const cardPayload = cards
    .filter((c) => c.term.trim() && c.definition.trim())
    .map((card, index) => ({
      set_id: setId,
      term: card.term.trim(),
      definition: card.definition.trim(),
      position: index,
    }));

  if (cardPayload.length > 0) {
    const { error: cardsError } = await (supabase.from("flashcards") as never as {
      insert: (values: Record<string, unknown>[]) => Promise<{ error: { message: string } | null }>;
    }).insert(cardPayload);

    if (cardsError) {
      return { error: `Cards insert failed: ${cardsError.message}` };
    }
  }

  return { error: null };
}

async function deleteSetViaSupabase(
  userId: string,
  setId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await (supabase.from("flashcard_sets") as never as {
    delete: () => {
      eq: (col: string, val: string) => {
        eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
      };
    };
  }).delete().eq("id", setId).eq("user_id", userId);

  return { error: error?.message ?? null };
}

// ── Create Set ──────────────────────────────────────────────────────────────

export async function createSet(
  title: string,
  description: string,
  cards: FlashcardInput[],
  visibility: SetVisibilityInput
): Promise<SetFormState> {
  const t = createTranslator(await getServerLocale());
  const user = await requireUser();
  const isDev = process.env.NODE_ENV !== "production";

  if (!user) return { error: t("action.notAuthenticated") };
  if (!title.trim()) return { error: t("action.titleRequired") };

  const filledCards = cards.filter((c) => c.term.trim() && c.definition.trim());
  if (filledCards.length === 0) return { error: t("action.addOneFlashcard") };

  // Try Go backend first
  if (isGoBackendBridgeConfigured()) {
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
      if (!isConnectionError(err)) {
        // Real Go backend error (validation, DB, etc.) — don't fall back
        console.error("[createSet] Go backend error:", err);
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("title is required")) return { error: t("action.titleRequired") };
        if (msg.includes("at least one card")) return { error: t("action.addOneFlashcard") };
        return {
          error: isDev && msg ? msg.replace(/^\[Go backend\]\s+\d+\s+/, "") : t("action.failedCreateSet"),
        };
      }
      // Connection error — fall through to Supabase
      console.warn("[createSet] Go backend unreachable, falling back to Supabase");
    }
  }

  // Supabase direct fallback
  try {
    const result = await createSetViaSupabase(
      user.id,
      title.trim(),
      description.trim(),
      filledCards,
      visibility.isPublic
    );

    if ("error" in result) {
      console.error("[createSet] Supabase error:", result.error);
      return { error: isDev ? result.error : t("action.failedCreateSet") };
    }

    revalidatePath("/dashboard");
    revalidatePath("/sets");
    redirect(`/sets/${result.id}`);
  } catch (err) {
    // redirect() throws NEXT_REDIRECT — rethrow it
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    // Check for the redirect digest property
    if (err && typeof err === "object" && "digest" in err) throw err;

    console.error("[createSet] Supabase fallback error:", err);
    return {
      error: isDev && err instanceof Error ? err.message : t("action.failedCreateSet"),
    };
  }
}

// ── Update Set ──────────────────────────────────────────────────────────────

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

  // Try Go backend first
  if (isGoBackendBridgeConfigured()) {
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
      if (!isConnectionError(err)) {
        console.error("[updateSet] Go backend error:", err);
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("access denied")) return { error: t("action.accessDenied") };
        return { error: t("action.failedSaveCards") };
      }
      console.warn("[updateSet] Go backend unreachable, falling back to Supabase");
    }
  }

  // Supabase fallback
  try {
    const result = await updateSetViaSupabase(
      user.id, setId, title.trim(), description.trim(), cards, visibility.isPublic
    );
    if (result.error) {
      if (result.error === "access denied") return { error: t("action.accessDenied") };
      return { error: t("action.failedSaveCards") };
    }

    revalidatePath("/dashboard");
    revalidatePath(`/sets/${setId}`);
    redirect(`/sets/${setId}`);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    console.error("[updateSet] Supabase fallback error:", err);
    return { error: t("action.failedSaveCards") };
  }
}

// ── Delete Set ──────────────────────────────────────────────────────────────

export async function deleteSet(setId: string): Promise<SetFormState> {
  const t = createTranslator(await getServerLocale());
  const user = await requireUser();

  if (!user) return { error: t("action.notAuthenticated") };

  // Try Go backend first
  if (isGoBackendBridgeConfigured()) {
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
      if (!isConnectionError(err)) {
        console.error("[deleteSet] Go backend error:", err);
        return { error: t("action.setNotFound") };
      }
      console.warn("[deleteSet] Go backend unreachable, falling back to Supabase");
    }
  }

  // Supabase fallback
  try {
    const result = await deleteSetViaSupabase(user.id, setId);
    if (result.error) return { error: t("action.setNotFound") };

    revalidatePath("/dashboard");
    revalidatePath("/sets");
    redirect("/dashboard");
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    return { error: t("action.setNotFound") };
  }
}
