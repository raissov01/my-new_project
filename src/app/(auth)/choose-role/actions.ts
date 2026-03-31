"use server";

import { redirect } from "next/navigation";
import {
  createClient,
  ensureProfile,
  getCurrentUser,
  getDefaultAppRoute,
} from "@/lib/supabase/server";
import { DEV_MODE } from "@/lib/dev-mode";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";
import type { ProfileRole } from "@/types/database";

export type RoleResult = {
  error: string | null;
};

const VALID_ROLES = new Set<ProfileRole>(["student", "teacher"]);

/**
 * Saves the role for the current user.
 *
 * Strategy: first ensure a profile row exists (via ensureProfile which uses
 * the service-level upsert), then do a targeted UPDATE on just the role
 * column. This avoids RLS issues with upsert and doesn't reset points/streak.
 */
async function persistRole(role: ProfileRole): Promise<RoleResult> {
  const t = createTranslator(await getServerLocale());
  const user = await getCurrentUser();

  if (!user) {
    return { error: t("action.notAuthenticated") };
  }

  // Step 1: Make sure a profile row exists (handles new OAuth users)
  await ensureProfile(user);

  // Step 2: Update ONLY the role column — no risk of resetting other data,
  // and compatible with RLS UPDATE policy (auth.uid() = id).
  const supabase = await createClient();
  const { error } = await (supabase.from("profiles") as never as {
    update: (values: { role: string }) => {
      eq: (column: string, value: string) => Promise<{
        error: { message: string; code?: string } | null;
      }>;
    };
  })
    .update({ role })
    .eq("id", user.id);

  if (error) {
    console.error("[persistRole] Failed to update role:", {
      message: error.message,
      code: error.code,
      role,
      userId: user.id,
    });
    return { error: t("action.genericError") };
  }

  redirect(getDefaultAppRoute(role));
}

export async function saveRole(role: string): Promise<RoleResult> {
  if (DEV_MODE) {
    redirect("/student/dashboard");
  }

  const t = createTranslator(await getServerLocale());

  if (!VALID_ROLES.has(role as ProfileRole)) {
    return { error: t("action.invalidRole") };
  }

  return persistRole(role as ProfileRole);
}

export async function changeRole(role: string): Promise<RoleResult> {
  if (DEV_MODE) {
    redirect("/student/dashboard");
  }

  const t = createTranslator(await getServerLocale());

  if (!VALID_ROLES.has(role as ProfileRole)) {
    return { error: t("action.invalidRole") };
  }

  return persistRole(role as ProfileRole);
}
