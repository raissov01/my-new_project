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

const VALID_ROLES = new Set<ProfileRole>(["student", "teacher"]);
const TOKEN_COOKIE = "swr_token";

type BackendUser = {
  id: string;
  email: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  role: ProfileRole;
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

const getCurrentBackendUserCached = cache(async (): Promise<BackendUser | null> => {
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
  const user = await getCurrentBackendUserCached();
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

  const backendUser = await getCurrentBackendUserCached();
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
  return role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";
}

export function getRoleRegistrationRedirect(role: ProfileRole) {
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

export async function ensureProfile(_user: unknown, _roleOverride?: ProfileRole) {
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
  return { error: null as string | null };
}
