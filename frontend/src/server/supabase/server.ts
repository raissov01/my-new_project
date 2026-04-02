import "server-only";

/**
 * Auth/profile module — calls the Go backend instead of Supabase.
 *
 * This file keeps the same exports as the old Supabase version so all
 * pages/actions that import from "@/server/supabase/server" keep working.
 * TODO: Rename this path to "@/server/auth" once migration is complete.
 */

import { cookies } from "next/headers";
import type { Profile, ProfileRole } from "@/lib/shared/types/database";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { isGoBackendBridgeConfigured } from "@/server/integrations/go-backend/env";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_USER,
  isAdminSessionCookie,
} from "@/lib/shared/auth/admin";
import { DEV_MODE, DEV_USER } from "@/lib/shared/auth/dev-mode";

// ── Constants ──────────────────────────────────────────────────────────────

const VALID_ROLES = new Set<ProfileRole>(["student", "teacher"]);
const TOKEN_COOKIE = "swr_token";

// ── User type (matches Go backend /auth/me response) ───────────────────────

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
};

// ── Compat type: pages expect this shape from getCurrentUser() ─────────────

type AppUser = {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    username?: string;
    role?: string;
  };
  app_metadata?: {
    provider?: string;
  };
};

// ── Token management ───────────────────────────────────────────────────────

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(TOKEN_COOKIE)?.value ?? null;
}

export async function setAuthToken(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days (matches JWT expiry)
  });
}

export async function clearAuthToken() {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE, "", { maxAge: 0, path: "/" });
}

// ── getCurrentUser ─────────────────────────────────────────────────────────

export async function getCurrentUser(): Promise<AppUser | null> {
  if (DEV_MODE) {
    return DEV_USER as unknown as AppUser;
  }

  const cookieStore = await cookies();
  if (isAdminSessionCookie(cookieStore.get(ADMIN_COOKIE_NAME))) {
    return ADMIN_USER as unknown as AppUser;
  }

  const token = await getAuthToken();
  if (!token) return null;

  if (!isGoBackendBridgeConfigured()) return null;

  try {
    const user = await fetchBackendJson<BackendUser>({
      path: "/api/v1/auth/me",
      userId: "",
      headers: { Authorization: `Bearer ${token}` },
    });

    return {
      id: user.id,
      email: user.email,
      user_metadata: {
        full_name: user.fullName,
        username: user.username,
        role: user.role,
      },
    };
  } catch {
    return null;
  }
}

// ── getCurrentProfile ──────────────────────────────────────────────────────

export async function getCurrentProfile(
  _preloadedUser?: Awaited<ReturnType<typeof getCurrentUser>>
): Promise<Profile | null> {
  const token = await getAuthToken();
  if (!token) return null;
  if (!isGoBackendBridgeConfigured()) return null;

  try {
    const user = await fetchBackendJson<BackendUser>({
      path: "/api/v1/auth/me",
      userId: "",
      headers: { Authorization: `Bearer ${token}` },
    });

    return {
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      username: user.username,
      avatar_url: user.avatarUrl ?? null,
      bio: user.bio ?? null,
      role: user.role as ProfileRole,
      streak_days: user.streakDays,
      points: user.points,
      last_active_date: user.lastActiveDate ?? null,
      created_at: user.createdAt,
    } as Profile;
  } catch {
    return null;
  }
}

// ── Role helpers ───────────────────────────────────────────────────────────

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
  if (!user) return null;
  const role = user.user_metadata?.role;
  return role && VALID_ROLES.has(role as ProfileRole) ? (role as ProfileRole) : "student";
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
  const currentRole = (profile?.role as ProfileRole) ?? "student";

  if (currentRole !== role) {
    return { user, profile, redirectTo: getDefaultAppRoute(currentRole) };
  }

  return { user, profile, redirectTo: null };
}

// ── ensureProfile (no-op during Go migration — Go handles this) ────────────

export async function ensureProfile(
  _user: unknown,
  _roleOverride?: ProfileRole
) {
  // The Go backend creates profiles on register.
  // This is a no-op shim for backward compatibility.
}

// ── createClient (stub — pages that still call supabase.from() will get null) ─

export async function createClient() {
  // Return a stub that won't crash but won't return data.
  // Pages should use the Go backend bridge instead.
  return {
    from: (_table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: { message: "Supabase removed — use Go backend" } }),
          maybeSingle: async () => ({ data: null, error: null }),
          order: () => ({
            then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
          }),
        }),
        in: () => ({
          then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
        }),
        order: () => ({
          eq: () => ({
            then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
          }),
          then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
        }),
        then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
      }),
      insert: async () => ({ data: null, error: { message: "Supabase removed" } }),
      update: () => ({ eq: async () => ({ error: { message: "Supabase removed" } }) }),
      delete: () => ({ eq: async () => ({ error: { message: "Supabase removed" } }) }),
      upsert: async () => ({ error: { message: "Supabase removed" } }),
    }),
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: "Use Go backend /auth/login" } }),
      signUp: async () => ({ data: { user: null, session: null }, error: { message: "Use Go backend /auth/register" } }),
      signOut: async () => {},
      signInWithOAuth: async () => ({ data: { url: null }, error: { message: "OAuth not available" } }),
      updateUser: async () => ({ data: { user: null }, error: { message: "Use Go backend" } }),
    },
    rpc: async () => ({ error: { message: "Supabase removed" } }),
  } as any; // eslint-disable-line
}

// ── upsertCurrentUserRole ──────────────────────────────────────────────────

export async function upsertCurrentUserRole(role: ProfileRole) {
  const token = await getAuthToken();
  if (!token) return { error: "not-authenticated", user: null };

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
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update role", user: null };
  }
}

// ── createProfileForSignup (handled by Go /auth/register now) ──────────────

export async function createProfileForSignup(_params: {
  user: unknown;
  email: string;
  fullName: string;
  username: string;
  role: ProfileRole;
}) {
  return { error: null as string | null };
}
