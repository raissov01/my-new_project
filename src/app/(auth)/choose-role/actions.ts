"use server";

import { redirect } from "next/navigation";
import { createClient, getCurrentUser, getDefaultAppRoute } from "@/lib/supabase/server";
import { DEV_MODE } from "@/lib/dev-mode";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";
import type { ProfileRole } from "@/types/database";

export type RoleResult = {
  error: string | null;
};

type ProfilesTable = {
  upsert: (
    values: Record<string, unknown>,
    options?: { onConflict?: string }
  ) => Promise<{ error: { message: string } | null }>;
};

export async function saveRole(role: string): Promise<RoleResult> {
  if (DEV_MODE) {
    redirect("/student/dashboard");
  }

  const t = createTranslator(await getServerLocale());
  const user = await getCurrentUser();

  if (!user) {
    return { error: t("action.notAuthenticated") };
  }

  if (role !== "student" && role !== "teacher") {
    return { error: t("action.invalidRole") };
  }

  const supabase = await createClient();
  const profilesTable = supabase.from("profiles") as never as ProfilesTable;

  const meta =
    "user_metadata" in user && typeof user.user_metadata === "object"
      ? (user.user_metadata as Record<string, unknown>)
      : {};
  const username =
    typeof meta.username === "string" && (meta.username as string).trim()
      ? (meta.username as string).trim()
      : typeof meta.full_name === "string" && (meta.full_name as string).trim()
        ? (meta.full_name as string).trim()
        : user.email?.split("@")[0] ?? `user_${user.id.slice(0, 8)}`;

  const { error } = await profilesTable.upsert(
    {
      id: user.id,
      email: user.email ?? "",
      username,
      full_name: username,
      role,
      streak_days: 0,
      points: 0,
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("[saveRole] Failed:", error.message);
    return { error: t("action.genericError") };
  }

  redirect(getDefaultAppRoute(role as ProfileRole));
}

/**
 * Change role for an existing user from the settings page.
 */
export async function changeRole(role: string): Promise<RoleResult> {
  if (DEV_MODE) {
    redirect("/student/dashboard");
  }

  const t = createTranslator(await getServerLocale());
  const user = await getCurrentUser();

  if (!user) {
    return { error: t("action.notAuthenticated") };
  }

  if (role !== "student" && role !== "teacher") {
    return { error: t("action.invalidRole") };
  }

  const supabase = await createClient();

  const { error } = await (supabase.from("profiles") as never as {
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
    };
  })
    .update({ role })
    .eq("id", user.id);

  if (error) {
    console.error("[changeRole] Failed:", error.message);
    return { error: t("action.genericError") };
  }

  redirect(getDefaultAppRoute(role as ProfileRole));
}
