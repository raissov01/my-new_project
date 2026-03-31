"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { DEV_MODE } from "@/lib/dev-mode";
import { ADMIN_EMAIL } from "@/lib/admin-auth";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";
import type { Database } from "@/types/database";
import {
  POMODORO_DEFAULTS,
  normalizePomodoroSettings,
  validatePomodoroSettings,
  type PomodoroPreset,
  type PomodoroSettings,
} from "@/lib/pomodoro";

export type SavePomodoroInput = {
  setId: string | null;
  studyMode: "flashcard" | "quiz" | "write";
  preset: PomodoroPreset;
  workMinutes: number;
  breakMinutes: number;
  cardsReviewed: number;
  correctAnswers: number;
};

type TableError = { message: string } | null;

type PomodoroPreferencesRow =
  Database["public"]["Tables"]["pomodoro_preferences"]["Row"];
type PomodoroPreferencesInsert =
  Database["public"]["Tables"]["pomodoro_preferences"]["Insert"];
type PomodoroSessionInsert =
  Database["public"]["Tables"]["pomodoro_sessions"]["Insert"];

type PomodoroPreferencesTable = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      maybeSingle: () => Promise<{
        data: Pick<PomodoroPreferencesRow, "work_minutes" | "break_minutes"> | null;
      }>;
    };
  };
  upsert: (values: PomodoroPreferencesInsert) => Promise<{ error: TableError }>;
};

type PomodoroSessionsTable = {
  insert: (values: PomodoroSessionInsert) => Promise<{ error: TableError }>;
};

export async function getPomodoroPreferences(): Promise<PomodoroSettings> {
  if (DEV_MODE) return POMODORO_DEFAULTS;

  const supabase = await createClient();
  const user = await getCurrentUser();
  const preferencesTable =
    supabase.from("pomodoro_preferences") as never as PomodoroPreferencesTable;

  if (!user || user.email === ADMIN_EMAIL) {
    return POMODORO_DEFAULTS;
  }

  const { data: preferenceData } = await preferencesTable
    .select("work_minutes, break_minutes")
    .eq("user_id", user.id)
    .maybeSingle();
  const data = preferenceData as Pick<
    Database["public"]["Tables"]["pomodoro_preferences"]["Row"],
    "work_minutes" | "break_minutes"
  > | null;

  if (!data) {
    return POMODORO_DEFAULTS;
  }

  return normalizePomodoroSettings({
    workMinutes: data.work_minutes,
    breakMinutes: data.break_minutes,
  });
}

export async function savePomodoroPreferences(
  settings: PomodoroSettings
): Promise<{ error: string | null; settings: PomodoroSettings | null }> {
  const t = createTranslator(await getServerLocale());
  const normalized = normalizePomodoroSettings(settings);
  const validation = validatePomodoroSettings(normalized);

  if (!validation.workValid) {
    return { error: t("pomodoro.studyValidation"), settings: null };
  }

  if (!validation.breakValid) {
    return { error: t("pomodoro.breakValidation"), settings: null };
  }

  if (DEV_MODE) {
    return { error: null, settings: normalized };
  }

  const supabase = await createClient();
  const user = await getCurrentUser();
  const preferencesTable =
    supabase.from("pomodoro_preferences") as never as PomodoroPreferencesTable;

  if (!user) return { error: t("action.notAuthenticated"), settings: null };
  if (user.email === ADMIN_EMAIL) return { error: null, settings: normalized };

  const { error } = await preferencesTable.upsert({
    user_id: user.id,
    work_minutes: normalized.workMinutes,
    break_minutes: normalized.breakMinutes,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { error: error.message, settings: null };
  }

  revalidatePath("/dashboard");
  revalidatePath("/sets");
  return { error: null, settings: normalized };
}

export async function savePomodoroSession(
  input: SavePomodoroInput
): Promise<{ error: string | null }> {
  const t = createTranslator(await getServerLocale());

  if (DEV_MODE) return { error: null };

  const supabase = await createClient();
  const user = await getCurrentUser();
  const sessionsTable =
    supabase.from("pomodoro_sessions") as never as PomodoroSessionsTable;

  if (!user) return { error: t("action.notAuthenticated") };
  if (user.email === ADMIN_EMAIL) return { error: null };

  const normalized = normalizePomodoroSettings({
    preset: input.preset,
    workMinutes: input.workMinutes,
    breakMinutes: input.breakMinutes,
  });

  const { error } = await sessionsTable.insert({
    user_id: user.id,
    set_id: input.setId,
    study_mode: input.studyMode,
    preset: normalized.preset,
    work_minutes: normalized.workMinutes,
    break_minutes: normalized.breakMinutes,
    cards_reviewed: input.cardsReviewed,
    correct_answers: input.correctAnswers,
    completed: true,
    finished_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };

  // Attempt to refresh leaderboard views (best-effort, ignore errors)
  await supabase.rpc("refresh_leaderboard_views");

  revalidatePath("/dashboard");
  return { error: null };
}
