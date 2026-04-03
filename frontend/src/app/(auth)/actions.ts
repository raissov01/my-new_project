"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getAppHomePath,
  getRoleRegistrationRedirect,
  setAuthToken,
  clearAuthToken,
} from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { DEV_MODE } from "@/lib/shared/auth/dev-mode";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import {
  getAdminLogoutCookie,
  getAdminSessionCookie,
  isAdminCredentials,
} from "@/lib/shared/auth/admin";
import type { ProfileRole } from "@/lib/shared/types/database";

export type AuthResult = {
  error: string | null;
  message?: string | null;
};

function getPublicApiBaseUrl() {
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (publicApiUrl) {
    return publicApiUrl.replace(/\/+$/, "");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    return `${appUrl.replace(/\/+$/, "")}/api/v1`;
  }

  return "/api/v1";
}

function friendlyError(rawMessage: string, t: (key: string) => string): string {
  const lower = rawMessage.toLowerCase();
  if (lower.includes("invalid") && (lower.includes("email") || lower.includes("password"))) return t("action.invalidCredentials");
  if (lower.includes("already exists") || lower.includes("already taken") || lower.includes("conflict")) return t("action.accountExists");
  if (lower.includes("rate") || lower.includes("too many")) return t("action.rateLimitGeneral");
  if (lower.includes("password") && lower.includes("min")) return t("action.passwordMin");
  return t("action.genericError");
}

// ── Login → Go backend ─────────────────────────────────────────────────────

export async function login(formData: FormData): Promise<AuthResult> {
  if (DEV_MODE) redirect("/student");

  const t = createTranslator(await getServerLocale());
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: t("action.requiredEmailPassword") };

  // Admin bypass
  if (isAdminCredentials(email, password)) {
    const cookieStore = await cookies();
    cookieStore.set(getAdminSessionCookie());
    redirect("/teacher");
  }

  try {
    const resp = await fetchBackendJson<{ token: string; user: { role: string } }>({
      path: "/api/v1/auth/login",
      userId: "",
      method: "POST",
      body: JSON.stringify({ email, password }),
      headers: { "Content-Type": "application/json" },
    });

    await setAuthToken(resp.token);
    redirect(resp.user.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard");
  } catch (err) {
    // redirect() throws NEXT_REDIRECT — rethrow it
    if (err && typeof err === "object" && "digest" in err) throw err;
    const msg = err instanceof Error ? err.message : "";
    console.error("[login] error:", msg);
    return { error: friendlyError(msg, t) };
  }
}

// ── Signup → Go backend ────────────────────────────────────────────────────

export async function signup(formData: FormData): Promise<AuthResult> {
  if (DEV_MODE) redirect("/student");

  const t = createTranslator(await getServerLocale());
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();

  if (!email || !password || !fullName || !username || !role) {
    return { error: t("action.allFieldsRequired") };
  }
  if (role !== "student" && role !== "teacher") return { error: t("action.invalidRole") };
  if (password.length < 6) return { error: t("action.passwordMin") };

  try {
    const resp = await fetchBackendJson<{ token: string; user: { role: string } }>({
      path: "/api/v1/auth/register",
      userId: "",
      method: "POST",
      body: JSON.stringify({ email, password, fullName, username, role }),
      headers: { "Content-Type": "application/json" },
    });

    await setAuthToken(resp.token);
    redirect(getRoleRegistrationRedirect(role as ProfileRole));
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    const msg = err instanceof Error ? err.message : "";
    console.error("[signup] error:", msg);
    return { error: friendlyError(msg, t) };
  }
}

// ── Google OAuth ───────────────────────────────────────────────────────────

export async function socialLogin(
  provider: "google" | "apple"
): Promise<AuthResult> {
  if (provider !== "google") {
    return { error: "Only Google login is supported." };
  }

  try {
    redirect(`${getPublicApiBaseUrl()}/auth/google`);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    return { error: err instanceof Error ? err.message : "Google login failed." };
  }
}

// ── Logout ─────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  if (DEV_MODE) redirect("/student");

  const cookieStore = await cookies();
  cookieStore.set(getAdminLogoutCookie());
  await clearAuthToken();
  redirect("/login");
}
