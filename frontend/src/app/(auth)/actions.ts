"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getDefaultAppRoute,
  setAuthToken,
  clearAuthToken,
} from "@/server/auth";
import { DEV_MODE } from "@/lib/shared/auth/dev-mode";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import {
  getAdminLogoutCookie,
  getAdminSessionCookie,
  isAdminCredentials,
} from "@/lib/shared/auth/admin";

export type AuthResult = {
  error: string | null;
  message?: string | null;
};

type PublicAuthResponse = {
  token: string;
  user: {
    role: string;
  };
  emailDeliveryStatus?: "sent" | "error";
  emailDeliveryMessage?: string;
};

function getPublicApiBaseUrl() {
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  // If NEXT_PUBLIC_API_URL is absolute (http/https), use it directly.
  if (publicApiUrl && /^https?:\/\//i.test(publicApiUrl)) {
    return publicApiUrl.replace(/\/+$/, "");
  }

  // Server actions run under Node.js fetch which REJECTS relative URLs.
  // When NEXT_PUBLIC_API_URL is a path like "/api/v1", combine it with
  // NEXT_PUBLIC_APP_URL to build an absolute URL that fetch() accepts.
  if (appUrl) {
    const apiPath = publicApiUrl && publicApiUrl.startsWith("/") ? publicApiUrl : "/api/v1";
    return `${appUrl.replace(/\/+$/, "")}${apiPath}`.replace(/\/+$/, "");
  }

  return publicApiUrl ?? "/api/v1";
}

async function fetchPublicAuthJson<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`${getPublicApiBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "request failed");
  }

  return data as T;
}

function friendlyError(rawMessage: string, t: (key: string) => string): string {
  const lower = rawMessage.toLowerCase();
  if (lower.includes("verify your email")) return t("action.emailNotVerified");
  if (lower.includes("invalid") && (lower.includes("email") || lower.includes("password"))) return t("action.invalidCredentials");
  if (lower.includes("already exists") || lower.includes("already taken") || lower.includes("conflict")) return t("action.accountExists");
  if (lower.includes("rate") || lower.includes("too many")) return t("action.rateLimitGeneral");
  if (lower.includes("password") && lower.includes("min")) return t("action.passwordMin");
  if (lower.includes("bridge_not_configured") || lower.includes("go_backend_bridge_not_configured")) {
    return "Server auth connection is not configured.";
  }
  // Surface infrastructure / config bugs instead of hiding them behind the
  // generic error — these are NOT user-fixable and should be visible in logs.
  if (lower.includes("failed to parse url") || lower.includes("invalid url")) {
    return "Auth service URL is misconfigured. Please contact support.";
  }
  if (lower.includes("fetch failed") || lower.includes("econnrefused") || lower.includes("enotfound")) {
    return "Cannot reach auth service. Please try again in a moment.";
  }
  return t("action.genericError");
}

export async function login(formData: FormData): Promise<AuthResult> {
  if (DEV_MODE) redirect("/student");

  const t = createTranslator(await getServerLocale());
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const rememberMe = formData.get("rememberMe") === "on";

  if (!email || !password) return { error: t("action.requiredEmailPassword") };

  if (isAdminCredentials(email, password)) {
    const cookieStore = await cookies();
    cookieStore.set(getAdminSessionCookie());
    redirect("/teacher");
  }

  try {
    const resp = await fetchPublicAuthJson<PublicAuthResponse>("/auth/login", {
      email,
      password,
    });

    await setAuthToken(resp.token, rememberMe);
    redirect(
      resp.user.role === "admin"
        ? getDefaultAppRoute("admin")
        : resp.user.role === "teacher"
          ? "/teacher/dashboard"
          : "/student/dashboard"
    );
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    const msg = err instanceof Error ? err.message : "";
    console.error("[login] error:", msg);
    return { error: friendlyError(msg, t) };
  }
}

export async function signup(formData: FormData): Promise<AuthResult> {
  if (DEV_MODE) redirect("/student");

  const t = createTranslator(await getServerLocale());
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();

  if (!email || !password || !fullName || !username || !role) {
    return { error: t("action.allFieldsRequired") };
  }
  if (role !== "student" && role !== "teacher") return { error: t("action.invalidRole") };
  if (password.length < 8) return { error: t("action.passwordMin") };

  try {
    const resp = await fetchPublicAuthJson<PublicAuthResponse>("/auth/register", {
      email,
      phone: phone || undefined,
      password,
      fullName,
      username,
      role,
    });

    if (resp.emailDeliveryStatus === "error") {
      return { error: t("action.emailDeliveryFailed") };
    }

    return { error: null, message: t("action.checkEmailMessage") };
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    const msg = err instanceof Error ? err.message : "";
    console.error("[signup] error:", msg);
    return { error: friendlyError(msg, t) };
  }
}

export async function logout(): Promise<void> {
  if (DEV_MODE) redirect("/student");

  const cookieStore = await cookies();
  cookieStore.set(getAdminLogoutCookie());
  await clearAuthToken();
  redirect("/login");
}
