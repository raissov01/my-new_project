"use server";

import { redirect } from "next/navigation";
import {
  createClient,
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

type ProfilesTable = {
  upsert: (
    values: Record<string, unknown>,
    options?: { onConflict?: string }
  ) => Promise<{ error: { message: string; code?: string } | null }>;
};

const VALID_ROLES = new Set<ProfileRole>(["student", "teacher"]);

function getRoleErrorMessage(
  rawMessage: string,
  fallback: string
) {
  if (process.env.NODE_ENV !== "production") {
    return `${fallback} ${rawMessage}`;
  }
  return fallback;
}

async function persistRole(role: ProfileRole): Promise<RoleResult> {
  const t = createTranslator(await getServerLocale());
  const user = await getCurrentUser();

  if (!user) {
    console.error("[role] No authenticated user found while saving role.");
    return { error: t("action.notAuthenticated") };
  }

  const supabase = await createClient();
  const profilesTable = supabase.from("profiles") as never as ProfilesTable;

  const metadata =
    "user_metadata" in user && typeof user.user_metadata === "object"
      ? (user.user_metadata as Record<string, unknown>)
      : {};

  const username =
    typeof metadata.username === "string" && metadata.username.trim()
      ? metadata.username.trim()
      : typeof metadata.full_name === "string" && metadata.full_name.trim()
        ? metadata.full_name.trim()
        : user.email?.split("@")[0] ?? `user_${user.id.slice(0, 8)}`;

  const fullName =
    typeof metadata.full_name === "string" && metadata.full_name.trim()
      ? metadata.full_name.trim()
      : username;

  const payload = {
    id: user.id,
    email: user.email ?? "",
    username,
    full_name: fullName,
    role,
    streak_days: 0,
    points: 0,
  };

  const { error } = await profilesTable.upsert(payload, { onConflict: "id" });

  if (error) {
    console.error("[role] Failed to persist role:", {
      message: error.message,
      code: error.code,
      role,
      userId: user.id,
      email: user.email,
      payload,
    });

    return {
      error: getRoleErrorMessage(error.message, t("action.genericError")),
    };
  }

  console.info("[role] Role saved successfully:", {
    role,
    userId: user.id,
    email: user.email,
  });

  redirect(getDefaultAppRoute(role));
}

export async function saveRole(role: string): Promise<RoleResult> {
  if (DEV_MODE) {
    redirect("/student/dashboard");
  }

  const t = createTranslator(await getServerLocale());

  if (!VALID_ROLES.has(role as ProfileRole)) {
    console.error("[saveRole] Invalid role received:", role);
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
    console.error("[changeRole] Invalid role received:", role);
    return { error: t("action.invalidRole") };
  }

  return persistRole(role as ProfileRole);
}
