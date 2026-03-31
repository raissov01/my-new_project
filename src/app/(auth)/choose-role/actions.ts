"use server";

import { redirect } from "next/navigation";
import {
  getDefaultAppRoute,
  upsertCurrentUserRole,
} from "@/lib/supabase/server";
import { DEV_MODE } from "@/lib/dev-mode";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";
import type { ProfileRole } from "@/types/database";

export type RoleResult = {
  error: string | null;
};

const VALID_ROLES = new Set<ProfileRole>(["student", "teacher"]);

async function persistRole(role: ProfileRole): Promise<RoleResult> {
  const t = createTranslator(await getServerLocale());

  const result = await upsertCurrentUserRole(role);

  if (result.error) {
    console.error("[persistRole] Failed to upsert role:", {
      error: result.error,
      role,
      userId: result.user?.id ?? null,
    });
    return {
      error:
        process.env.NODE_ENV !== "production"
          ? `${t("action.genericError")} (${result.error})`
          : t("action.genericError"),
    };
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
