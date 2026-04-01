"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, ensureProfile, getCurrentUser } from "@/lib/supabase/server";
import { DEV_MODE, DEV_USER } from "@/lib/dev-mode";
import { ADMIN_EMAIL } from "@/lib/admin-auth";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";
import type { Database } from "@/types/database";
import { resolveInviteProfiles } from "@/lib/set-access";

// ── Types ────────────────────────────────────────────────────────────────────

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

type FlashcardSetRow = Database["public"]["Tables"]["flashcard_sets"]["Row"];
type FlashcardSetInsert = Database["public"]["Tables"]["flashcard_sets"]["Insert"];
type FlashcardSetUpdate = Database["public"]["Tables"]["flashcard_sets"]["Update"];
type FlashcardInsert = Database["public"]["Tables"]["flashcards"]["Insert"];

type TableError = { message: string } | null;

type FlashcardSetsTable = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      single: () => Promise<{
        data: Pick<FlashcardSetRow, "id" | "user_id"> | null;
        error: TableError;
      }>;
    };
  };
  insert: (values: FlashcardSetInsert) => {
    select: (columns: string) => {
      single: () => Promise<{
        data: Pick<FlashcardSetRow, "id"> | null;
        error: TableError;
      }>;
    };
  };
  update: (values: FlashcardSetUpdate) => {
    eq: (column: string, value: string) => Promise<{ error: TableError }>;
  };
  delete: () => {
    eq: (column: string, value: string) => Promise<{ error: TableError }>;
  };
};

type FlashcardsTable = {
  insert: (values: FlashcardInsert[]) => Promise<{ error: TableError }>;
  delete: () => {
    eq: (column: string, value: string) => Promise<{ error: TableError }>;
  };
};

type FlashcardSetAccessInsert =
  Database["public"]["Tables"]["flashcard_set_access"]["Insert"];

type FlashcardSetAccessTable = {
  insert: (values: FlashcardSetAccessInsert[]) => Promise<{ error: TableError }>;
  delete: () => {
    eq: (column: string, value: string) => Promise<{ error: TableError }>;
  };
};

function isFlashcardAccessSchemaMissing(message?: string | null) {
  if (!message) return false;
  return (
    message.includes("Could not find the table 'public.flashcard_set_access'") ||
    message.includes('relation "public.flashcard_set_access" does not exist') ||
    message.includes('relation "flashcard_set_access" does not exist')
  );
}

function getFlashcardAccessSchemaError() {
  return "Private set access schema is missing. Run migration 018_flashcard_access_schema_repair.sql.";
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthenticatedUser() {
  const supabase = await createClient();

  // DEV MODE: auth disabled — skip auth check, use mock user ID
  if (DEV_MODE) {
    return { supabase, user: { id: DEV_USER.id, email: DEV_USER.email } };
  }
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  await ensureProfile(user);

  return { supabase, user };
}

function validateSetInput(title: string, cards: FlashcardInput[]) {
  if (!title.trim()) {
    return "Title is required.";
  }
  if (cards.length === 0) {
    return "Add at least one flashcard.";
  }
  for (let i = 0; i < cards.length; i++) {
    if (!cards[i].term.trim() || !cards[i].definition.trim()) {
      return `Card ${i + 1}: both term and definition are required.`;
    }
  }
  return null;
}

async function syncSetAccess(
  setId: string,
  ownerId: string,
  visibility: SetVisibilityInput,
  resolvedProfiles?: Awaited<ReturnType<typeof resolveInviteProfiles>>["profiles"]
) {
  const supabase = await createClient();
  const accessTable =
    supabase.from("flashcard_set_access") as never as FlashcardSetAccessTable;

  const invitedProfiles = (resolvedProfiles ?? []).filter(
    (profile) => profile.id !== ownerId
  );

  const { error: deleteError } = await accessTable.delete().eq("set_id", setId);
  if (deleteError) {
    if (isFlashcardAccessSchemaMissing(deleteError.message)) {
      if (visibility.isPublic) {
        return { error: null };
      }
      return { error: getFlashcardAccessSchemaError() };
    }
    return { error: deleteError.message };
  }

  if (visibility.isPublic || invitedProfiles.length === 0) {
    return { error: null };
  }

  const { error: insertError } = await accessTable.insert(
    invitedProfiles.map((profile) => ({
      set_id: setId,
      user_id: profile.id,
      granted_by: ownerId,
    }))
  );

  if (insertError && isFlashcardAccessSchemaMissing(insertError.message)) {
    return { error: getFlashcardAccessSchemaError() };
  }

  return { error: insertError?.message ?? null };
}

async function validateInvitedUsers(visibility: SetVisibilityInput) {
  const inviteResolution = await resolveInviteProfiles(visibility.invitedUsers);
  const missingUsernames = inviteResolution.usernames.filter(
    (username) =>
      !inviteResolution.profiles.some((profile) => profile.username === username)
  );

  if (missingUsernames.length > 0) {
    return {
      error: `Unknown usernames: ${missingUsernames.join(", ")}`,
      profiles: [] as Awaited<ReturnType<typeof resolveInviteProfiles>>["profiles"],
    };
  }

  return { error: null, profiles: inviteResolution.profiles };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getOwnedSet(supabase: Awaited<ReturnType<typeof createClient>>, setId: string, userId: string) {
  const t = createTranslator(await getServerLocale());
  if (!UUID_RE.test(setId)) {
    return { set: null, error: t("action.invalidSetId") };
  }

  const flashcardSetsTable = supabase.from("flashcard_sets") as never as FlashcardSetsTable;
  const { data, error } = await flashcardSetsTable
    .select("id, user_id")
    .eq("id", setId)
    .single();
  const set = data as Pick<
    Database["public"]["Tables"]["flashcard_sets"]["Row"],
    "id" | "user_id"
  > | null;

  if (error || !set) {
    return { set: null, error: t("action.setNotFound") };
  }

  if (set.user_id !== userId) {
    return { set: null, error: t("action.accessDenied") };
  }

  return { set, error: null };
}

// ── Actions ──────────────────────────────────────────────────────────────────

export async function createSet(
  title: string,
  description: string,
  cards: FlashcardInput[],
  visibility: SetVisibilityInput
): Promise<SetFormState> {
  const t = createTranslator(await getServerLocale());
  if (DEV_MODE) {
    return {
      error:
        "Dev mode is using a mock user, so saving to Supabase is disabled. Set DEV_MODE=false to create real sets.",
    };
  }

  const { supabase, user } = await getAuthenticatedUser();

  if (user.email === ADMIN_EMAIL) {
    return {
      error:
        "Admin quick login can browse the app, but saving sets still requires a real Supabase account with a profile.",
    };
  }

  const validationError = validateSetInput(title, cards);
  if (validationError) {
    return { error: localizeValidationError(validationError, t) };
  }
  const inviteValidation = await validateInvitedUsers(visibility);
  if (inviteValidation.error) {
    return { error: inviteValidation.error };
  }

  const flashcardSetsTable = supabase.from("flashcard_sets") as never as FlashcardSetsTable;
  const flashcardsTable = supabase.from("flashcards") as never as FlashcardsTable;

  // Insert the set
  const { data, error: setError } = await flashcardSetsTable
    .insert({
      title: title.trim(),
      description: description.trim() || null,
      is_public: visibility.isPublic,
      user_id: user.id,
    })
    .select("id")
    .single();
  const set = data as Pick<
    Database["public"]["Tables"]["flashcard_sets"]["Row"],
    "id"
  > | null;

  if (setError || !set) {
    return { error: setError?.message ?? t("action.failedCreateSet") };
  }

  // Insert the flashcards
  const flashcards = cards.map((card, index) => ({
    set_id: set.id,
    term: card.term.trim(),
    definition: card.definition.trim(),
    position: index,
  }));

  const { error: cardsError } = await flashcardsTable.insert(flashcards);

  if (cardsError) {
    // Clean up the orphaned set — if this also fails, surface both errors
    const { error: cleanupError } = await flashcardSetsTable
      .delete()
      .eq("id", set.id);

    const message = cleanupError
      ? `${cardsError.message} (cleanup also failed: ${cleanupError.message})`
      : cardsError.message;

    return { error: message };
  }

  const accessResult = await syncSetAccess(
    set.id,
    user.id,
    visibility,
    inviteValidation.profiles
  );
  if (accessResult.error) {
    return { error: accessResult.error };
  }

  revalidatePath("/dashboard");
  revalidatePath("/collections");
  revalidatePath("/sets");
  revalidatePath("/leaderboard");
  redirect(`/sets/${set.id}?share=1`);
}

export async function updateSet(
  setId: string,
  title: string,
  description: string,
  cards: FlashcardInput[],
  visibility: SetVisibilityInput
): Promise<SetFormState> {
  const t = createTranslator(await getServerLocale());
  if (DEV_MODE) {
    return {
      error:
        "Dev mode is using a mock user, so updating Supabase data is disabled. Set DEV_MODE=false to edit real sets.",
    };
  }

  const { supabase, user } = await getAuthenticatedUser();

  if (user.email === ADMIN_EMAIL) {
    return {
      error:
        "Admin quick login can browse the app, but editing sets still requires a real Supabase account with a profile.",
    };
  }

  const validationError = validateSetInput(title, cards);
  if (validationError) {
    return { error: localizeValidationError(validationError, t) };
  }
  const inviteValidation = await validateInvitedUsers(visibility);
  if (inviteValidation.error) {
    return { error: inviteValidation.error };
  }

  // Verify ownership (also validates UUID format)
  const { error: ownershipError } = await getOwnedSet(supabase, setId, user.id);
  if (ownershipError) {
    return { error: ownershipError };
  }

  const flashcardSetsTable = supabase.from("flashcard_sets") as never as FlashcardSetsTable;
  const flashcardsTable = supabase.from("flashcards") as never as FlashcardsTable;

  // Update the set metadata
  const { error: setError } = await flashcardSetsTable
    .update({
      title: title.trim(),
      description: description.trim() || null,
      is_public: visibility.isPublic,
    })
    .eq("id", setId);

  if (setError) {
    return { error: setError.message };
  }

  // Replace all flashcards: delete old, insert new.
  //
  // Risk: if delete succeeds but insert fails, cards are lost.
  // Mitigation: if insert fails, we attempt to re-insert the original
  // cards from the form data (which were the pre-edit values on a
  // fresh page load). This is better than leaving the set empty.

  const { error: deleteError } = await flashcardsTable.delete().eq("set_id", setId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  const flashcards = cards.map((card, index) => ({
    set_id: setId,
    term: card.term.trim(),
    definition: card.definition.trim(),
    position: index,
  }));

  const { error: cardsError } = await flashcardsTable.insert(flashcards);

  if (cardsError) {
    // Attempt recovery: re-insert the same cards so the set isn't left empty
    await flashcardsTable.insert(flashcards);
    return { error: `${t("action.failedSaveCards")} ${cardsError.message}` };
  }

  const accessResult = await syncSetAccess(
    setId,
    user.id,
    visibility,
    inviteValidation.profiles
  );
  if (accessResult.error) {
    return { error: accessResult.error };
  }

  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  revalidatePath(`/sets/${setId}`);
  redirect(`/sets/${setId}`);
}

export async function deleteSet(setId: string): Promise<SetFormState> {
  if (DEV_MODE) {
    return {
      error:
        "Dev mode is using a mock user, so deleting Supabase data is disabled. Set DEV_MODE=false to remove real sets.",
    };
  }

  const { supabase, user } = await getAuthenticatedUser();

  if (user.email === ADMIN_EMAIL) {
    return {
      error:
        "Admin quick login can browse the app, but deleting sets still requires a real Supabase account with a profile.",
    };
  }

  const flashcardSetsTable = supabase.from("flashcard_sets") as never as FlashcardSetsTable;

  // Verify ownership (also validates UUID format)
  const { error: ownershipError } = await getOwnedSet(supabase, setId, user.id);
  if (ownershipError) {
    return { error: ownershipError };
  }

  // Flashcards are deleted via ON DELETE CASCADE
  const { error } = await flashcardSetsTable.delete().eq("id", setId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  redirect("/dashboard");
}

function localizeValidationError(
  error: string,
  t: (key: string, vars?: Record<string, string | number>) => string
) {
  if (error === "Title is required.") return t("action.titleRequired");
  if (error === "Add at least one flashcard.") return t("action.addOneFlashcard");

  const match = error.match(/^Card (\d+): both term and definition are required\.$/);
  if (match) {
    return t("action.cardBothRequired", { index: match[1] });
  }

  return error;
}
