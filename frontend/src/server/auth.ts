import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import type { Profile, ProfileRole } from "@/lib/shared/types/database";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_USER,
  isAdminSessionCookie,
} from "@/lib/shared/auth/admin";
import { DEV_MODE, DEV_USER } from "@/lib/shared/auth/dev-mode";

const VALID_ROLES = new Set<ProfileRole>(["student", "teacher", "admin"]);
const TOKEN_COOKIE = "swr_token";

type BackendUser = {
  id: string;
  email: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  role: ProfileRole;
  isSuperadmin?: boolean;
  isActive?: boolean;
  streakDays: number;
  points: number;
  lastActiveDate: string | null;
  createdAt: string;
  plan: "free" | "pro";
};

type AppUser = {
  id: string;
  email?: string;
  plan?: "free" | "pro";
  user_metadata?: {
    full_name?: string;
    username?: string;
    avatar_url?: string | null;
    role?: string;
  };
  app_metadata?: {
    provider?: string;
  };
};

async function fetchCurrentBackendUser(token: string): Promise<BackendUser | null> {
  try {
    return await fetchBackendJson<BackendUser>({
      path: "/api/v1/auth/me",
      userId: "",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    return null;
  }
}

const getAuthTokenCached = cache(async (): Promise<string | null> => {
  const cookieStore = await cookies();
  return cookieStore.get(TOKEN_COOKIE)?.value ?? null;
});

export const getCurrentBackendUser = cache(async (): Promise<BackendUser | null> => {
  if (DEV_MODE) {
    return {
      id: DEV_USER.id,
      email: DEV_USER.email,
      fullName: DEV_USER.email,
      username: DEV_USER.user_metadata.username,
      avatarUrl: null,
      bio: null,
      role: "student",
      streakDays: 0,
      points: 0,
      lastActiveDate: null,
      createdAt: new Date(0).toISOString(),
      plan: "free",
    };
  }

  const cookieStore = await cookies();
  if (isAdminSessionCookie(cookieStore.get(ADMIN_COOKIE_NAME))) {
    return {
      id: ADMIN_USER.id,
      email: ADMIN_USER.email,
      fullName: "Admin",
      username: "admin",
      avatarUrl: null,
      bio: null,
      role: "teacher",
      streakDays: 0,
      points: 0,
      lastActiveDate: null,
      createdAt: new Date(0).toISOString(),
      plan: "pro",
    };
  }

  const token = await getAuthTokenCached();
  if (!token) {
    return null;
  }

  return fetchCurrentBackendUser(token);
});

export async function getAuthToken(): Promise<string | null> {
  return getAuthTokenCached();
}

export async function setAuthToken(token: string, rememberMe = true) {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(rememberMe ? { maxAge: 30 * 24 * 60 * 60 } : {}),
  });
}

export async function clearAuthToken() {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE, "", { maxAge: 0, path: "/" });
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const user = await getCurrentBackendUser();
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    plan: user.plan ?? "free",
    user_metadata: {
      full_name: user.fullName,
      username: user.username,
      avatar_url: user.avatarUrl,
      role: user.role,
    },
  };
}

export async function getCurrentProfile(
  preloadedUser?: Awaited<ReturnType<typeof getCurrentUser>>
): Promise<Profile | null> {
  const user = preloadedUser ?? (await getCurrentUser());
  if (!user) {
    return null;
  }

  const backendUser = await getCurrentBackendUser();
  if (!backendUser) {
    return null;
  }

  return {
    id: backendUser.id,
    email: backendUser.email,
    full_name: backendUser.fullName,
    username: backendUser.username,
    avatar_url: backendUser.avatarUrl,
    bio: backendUser.bio,
    role: backendUser.role,
    streak_days: backendUser.streakDays,
    points: backendUser.points,
    last_active_date: backendUser.lastActiveDate,
    created_at: backendUser.createdAt,
  } as Profile;
}

export function getDefaultAppRoute(role: ProfileRole) {
  if (role === "admin") return "/admin/dashboard";
  return role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";
}

export function getRoleRegistrationRedirect(role: ProfileRole) {
  if (role === "admin") return "/admin/dashboard";
  return role === "teacher" ? "/teacher" : "/student";
}

export async function getCurrentRole(
  preloadedUser?: Awaited<ReturnType<typeof getCurrentUser>>
): Promise<ProfileRole | null> {
  const user = preloadedUser ?? (await getCurrentUser());
  const role = user?.user_metadata?.role;
  return role && VALID_ROLES.has(role as ProfileRole) ? (role as ProfileRole) : null;
}

export async function getAppHomePath(
  preloadedUser?: Awaited<ReturnType<typeof getCurrentUser>>
) {
  const role = await getCurrentRole(preloadedUser);
  return role ? getDefaultAppRoute(role) : "/login";
}

export async function requireRole(role: ProfileRole) {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, profile: null, redirectTo: "/login" as const };
  }

  const profile = await getCurrentProfile(user);
  const currentRole = (profile?.role as ProfileRole | undefined) ?? "student";

  if (currentRole !== role) {
    return { user, profile, redirectTo: getDefaultAppRoute(currentRole) };
  }

  return { user, profile, redirectTo: null };
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, profile: null, redirectTo: "/login" as const };
  }

  const profile = await getCurrentProfile(user);
  if (profile?.role !== "admin") {
    return { user, profile, redirectTo: getDefaultAppRoute(profile?.role ?? "student") };
  }

  return { user, profile, redirectTo: null };
}

/**
 * Gate the developer/owner control panel. Distinct from {@link requireAdmin}:
 * `role='admin'` is reserved for a future "school admin" role and does NOT
 * grant access here. Only users with `is_superadmin = TRUE` in the DB pass.
 *
 * The DB is the single source of truth — the JWT carries no superadmin claim,
 * so revoking access takes effect on the very next request.
 */
export async function requireSuperadmin() {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, profile: null, isSuperadmin: false, redirectTo: "/login" as const };
  }

  const backendUser = await getCurrentBackendUser();
  const profile = await getCurrentProfile(user);

  if (!backendUser?.isSuperadmin) {
    return {
      user,
      profile,
      isSuperadmin: false,
      redirectTo: getDefaultAppRoute(profile?.role ?? "student"),
    };
  }

  return { user, profile, isSuperadmin: true, redirectTo: null };
}

export async function ensureProfile(_user: unknown, _roleOverride?: ProfileRole) {
  void _user;
  void _roleOverride;
  return;
}

export async function upsertCurrentUserRole(role: ProfileRole) {
  const token = await getAuthToken();
  if (!token) {
    return { error: "not-authenticated", user: null };
  }

  try {
    await fetchBackendJson({
      path: "/api/v1/auth/role",
      userId: "",
      method: "POST",
      body: JSON.stringify({ role }),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    const user = await getCurrentUser();
    return { error: null, user };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update role",
      user: null,
    };
  }
}

export async function createProfileForSignup(_params: {
  user: unknown;
  email: string;
  fullName: string;
  username: string;
  role: ProfileRole;
}) {
  void _params;
  return { error: null as string | null };
}
