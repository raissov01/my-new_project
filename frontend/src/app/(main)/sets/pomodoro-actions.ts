"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { DEV_MODE } from "@/lib/shared/auth/dev-mode";
import { ADMIN_EMAIL } from "@/lib/shared/auth/admin";
import {
  POMODORO_DEFAULTS,
  normalizePomodoroSettings,
  validatePomodoroSettings,
  type PomodoroPreset,
  type PomodoroSettings,
} from "@/lib/shared/study/pomodoro";

export type SavePomodoroInput = {
  setId: string | null;
  studyMode: "flashcard" | "quiz" | "write";
  preset: PomodoroPreset;
  workMinutes: number;
  breakMinutes: number;
  cardsReviewed: number;
  correctAnswers: number;
};

async function requireUser() {
  const user = await getCurrentUser();
  if (!user || DEV_MODE || user.email === ADMIN_EMAIL) return null;
  return user;
}

// ── Get preferences → Go backend ────────────────────────────────────────────

export async function getPomodoroPreferences(): Promise<PomodoroSettings> {
  const user = await requireUser();
  if (!user) return POMODORO_DEFAULTS;

  try {
    const prefs = await fetchBackendJson<{ workMinutes: number; breakMinutes: number }>({
      path: "/api/v1/pomodoro/preferences",
      userId: user.id,
    });
    return normalizePomodoroSettings(prefs);
  } catch {
    return POMODORO_DEFAULTS;
  }
}

// ── Save preferences → Go backend ──────────────────────────────────────────

export async function savePomodoroPreferences(
  settings: PomodoroSettings
): Promise<{ error: string | null; settings: PomodoroSettings | null }> {
  const user = await requireUser();
  if (!user) return { error: null, settings: null };

  const normalized = normalizePomodoroSettings(settings);
  const { workValid, breakValid } = validatePomodoroSettings(normalized);
  if (!workValid || !breakValid) return { error: "Invalid pomodoro settings.", settings: null };

  try {
    await fetchBackendJson({
      path: "/api/v1/pomodoro/preferences",
      userId: user.id,
      method: "POST",
      body: JSON.stringify(normalized),
      headers: { "Content-Type": "application/json" },
    });
    return { error: null, settings: normalized };
  } catch (err) {
    console.error("[savePomodoroPreferences] error:", err);
    return { error: "Failed to save preferences.", settings: null };
  }
}

// ── Save session → Go backend ──────────────────────────────────────────────

export async function savePomodoroSession(
  input: SavePomodoroInput
): Promise<{ error: string | null }> {
  const user = await requireUser();
  if (!user) return { error: null };

  try {
    await fetchBackendJson({
      path: "/api/v1/pomodoro/session",
      userId: user.id,
      method: "POST",
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
    });

    revalidatePath("/dashboard");
    return { error: null };
  } catch (err) {
    console.error("[savePomodoroSession] error:", err);
    return { error: "Failed to save session." };
  }
}
