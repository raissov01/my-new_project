"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createClient,
  ensureProfile,
  getAppHomePath,
  getRoleRegistrationRedirect,
} from "@/lib/supabase/server";
import { DEV_MODE } from "@/lib/dev-mode";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";
import { getPublicSiteUrl, isSupabaseConfigured } from "@/lib/supabase/env";
import {
  getAdminLogoutCookie,
  getAdminSessionCookie,
  isAdminCredentials,
} from "@/lib/admin-auth";
import type { ProfileRole } from "@/types/database";

export type AuthResult = {
  error: string | null;
  message?: string | null;
};

/**
 * Maps raw Supabase error messages to friendly localized messages.
 */
function friendlyAuthError(
  rawMessage: string,
  t: (key: string) => string
): string {
  const lower = rawMessage.toLowerCase();

  if (lower.includes("invalid login credentials")) return t("action.invalidCredentials");
  if (lower.includes("email not confirmed")) return t("action.emailNotConfirmed");
  if (lower.includes("email rate limit exceeded")) return t("action.rateLimitEmail");
  if (lower.includes("rate limit") || lower.includes("too many requests")) return t("action.rateLimitGeneral");
  if (lower.includes("user already registered")) return t("action.accountExists");
  if (lower.includes("signup is disabled")) return t("action.signupDisabled");
  if (lower.includes("password") && lower.includes("at least")) return t("action.passwordMin");
  if (lower.includes("network") || lower.includes("fetch")) return t("action.networkError");
  if (lower.includes("email") && lower.includes("format")) return t("action.invalidEmail");

  return t("action.genericError");
}

// ── Login ────────────────────────────────────────────────────────────────────

export async function login(formData: FormData): Promise<AuthResult> {
  if (DEV_MODE) {
    redirect("/student");
  }

  const t = createTranslator(await getServerLocale());

  if (!isSupabaseConfigured()) {
    return { error: t("action.supabaseNotConfigured") };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: t("action.requiredEmailPassword") };
  }

  // Admin bypass
  if (isAdminCredentials(email, password)) {
    const cookieStore = await cookies();
    cookieStore.set(getAdminSessionCookie());
    redirect("/teacher");
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth
    .signInWithPassword({ email, password })
    .catch((authError: Error) => ({
      data: { user: null, session: null },
      error: { message: authError.message, status: 0, code: "fetch_failed" },
    }));

  if (error) {
    console.error("[login] Supabase auth error:", {
      message: error.message,
      code: error.code,
      email,
    });
    return { error: friendlyAuthError(error.message, t) };
  }

  if (!data.session) {
    console.error("[login] No session returned:", { user: data.user?.id, email });
    return { error: t("action.loginNoSession") };
  }

  // Safety net: ensure profile exists for this user.
  // This covers the case where signup created the auth user but profile insert failed.
  if (data.user) {
    await ensureProfile(data.user);
  }

  redirect(await getAppHomePath(data.user));
}

// ── Signup ───────────────────────────────────────────────────────────────────

export async function signup(formData: FormData): Promise<AuthResult> {
  if (DEV_MODE) {
    redirect("/student");
  }

  const t = createTranslator(await getServerLocale());

  if (!isSupabaseConfigured()) {
    return { error: t("action.supabaseNotConfigured") };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();

  if (!email || !password || !fullName || !username || !role) {
    return { error: t("action.allFieldsRequired") };
  }

  if (role !== "student" && role !== "teacher") {
    return { error: t("action.invalidRole") };
  }

  if (password.length < 6) {
    return { error: t("action.passwordMin") };
  }

  const supabase = await createClient();

  // NOTE: Username uniqueness cannot be reliably checked via RLS-protected SELECT
  // because the SELECT policy restricts to auth.uid() = id. The DB UNIQUE constraint
  // on the username column will catch duplicates at insert time instead.
  // If a Go backend endpoint for username checking exists, use that.

  // Create the auth user
  const { data, error } = await supabase.auth
    .signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, username, role },
      },
    })
    .catch((authError: Error) => ({
      data: { user: null, session: null },
      error: { message: authError.message, status: 0, code: "fetch_failed" },
    }));

  if (error) {
    console.error("[signup] Supabase auth error:", {
      message: error.message,
      code: error.code,
      email,
    });
    return { error: friendlyAuthError(error.message, t) };
  }

  // Supabase returns identities=[] when user already exists + email confirmation is on
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { error: t("action.accountExists") };
  }

  // Create profile using the SAME supabase client (has the new session).
  // Use upsert directly — it's safe with onConflict:"id" and avoids the
  // insert-then-fallback pattern that fails under RLS timing issues.
  if (data.user) {
    const profilesTable = supabase.from("profiles") as never as {
      upsert: (
        values: Record<string, unknown>,
        options?: { onConflict?: string }
      ) => Promise<{ error: { message: string } | null }>;
    };

    const { error: profileError } = await profilesTable.upsert(
      {
        id: data.user.id,
        email,
        full_name: fullName,
        username,
        role,
        streak_days: 0,
        points: 0,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      const msg = profileError.message?.toLowerCase() ?? "";
      console.error("[signup] Profile upsert failed:", {
        message: profileError.message,
        userId: data.user.id,
        email,
      });

      // If the username is taken (UNIQUE constraint violation), tell the user
      if (msg.includes("duplicate") && msg.includes("username")) {
        return { error: t("action.usernameTaken") };
      }

      // For other profile errors, log but don't block — ensureProfile on next login
      // will retry. The auth user already exists in Supabase.
    }
  }

  // If Supabase requires email confirmation (session is null), show message.
  if (data.user && !data.session) {
    return {
      error: null,
      message: t("action.checkEmailMessage"),
    };
  }

  // Session exists — user can log in immediately.
  redirect(getRoleRegistrationRedirect(role as ProfileRole));
}

// ── Social OAuth ─────────────────────────────────────────────────────────────

export async function socialLogin(
  provider: "google" | "apple"
): Promise<AuthResult> {
  if (DEV_MODE) {
    redirect("/student");
  }

  const t = createTranslator(await getServerLocale());

  if (!isSupabaseConfigured()) {
    return { error: t("action.supabaseNotConfigured") };
  }

  const supabase = await createClient();
  const siteUrl = getPublicSiteUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${siteUrl}/callback?provider=${provider}`,
    },
  });

  if (error) {
    console.error("[socialLogin] OAuth error:", { message: error.message, provider });
    return { error: friendlyAuthError(error.message, t) };
  }

  if (data.url) {
    redirect(data.url);
  }

  return { error: t("action.genericError") };
}

// ── Logout ───────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  if (DEV_MODE) {
    redirect("/student");
  }

  const cookieStore = await cookies();
  cookieStore.set(getAdminLogoutCookie());

  const supabase = await createClient();
  await supabase.auth.signOut().catch(() => undefined);
  redirect("/login");
}
