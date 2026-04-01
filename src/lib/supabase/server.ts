import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import type { Database, Profile, ProfileRole } from "@/types/database";
import { getSupabaseEnv, getSupabaseEnvSafe } from "./env";
import { getCurrentProfileFromGo } from "@/lib/backend/profile";
import { isGoBackendBridgeConfigured } from "@/lib/backend/env";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_USER,
  isAdminSessionCookie,
} from "@/lib/admin-auth";
import { DEV_MODE, DEV_USER } from "@/lib/dev-mode";

type TableError = { message: string } | null;

type ProfilesTable = {
  upsert: (
    values: Database["public"]["Tables"]["profiles"]["Insert"],
    options?: { onConflict?: string }
  ) => Promise<{ error: TableError }>;
  insert: (
    values: Database["public"]["Tables"]["profiles"]["Insert"]
  ) => Promise<{ error: TableError }>;
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      maybeSingle: () => Promise<{ data: Profile | null }>;
    };
  };
  update: (
    values: Database["public"]["Tables"]["profiles"]["Update"]
  ) => {
    eq: (column: string, value: string) => Promise<{ error: TableError }>;
  };
};

const VALID_ROLES = new Set<ProfileRole>(["student", "teacher"]);

function getAuthProvider(
  user:
    | (Pick<User, "id" | "email"> & {
        app_metadata?: User["app_metadata"];
        user_metadata?: User["user_metadata"];
      })
    | null
    | undefined
) {
  const provider =
    typeof user?.app_metadata?.provider === "string"
      ? user.app_metadata.provider
      : null;

  return provider;
}

function getRoleFromMetadata(
  user:
    | (Pick<User, "id" | "email"> & { user_metadata?: User["user_metadata"] })
    | null
    | undefined
): ProfileRole | null {
  const role =
    typeof user?.user_metadata?.role === "string" ? user.user_metadata.role : null;
  return role && VALID_ROLES.has(role as ProfileRole) ? (role as ProfileRole) : null;
}

export function getDefaultAppRoute(role: ProfileRole) {
  return role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";
}

export function getRoleRegistrationRedirect(role: ProfileRole) {
  return role === "teacher" ? "/teacher" : "/student";
}

export async function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method is called from a Server Component.
          // This can be ignored if middleware refreshes user sessions.
        }
      },
    },
  });
}

export async function getCurrentUser() {
  if (DEV_MODE) {
    return DEV_USER;
  }

  const cookieStore = await cookies();
  if (isAdminSessionCookie(cookieStore.get(ADMIN_COOKIE_NAME))) {
    return ADMIN_USER;
  }

  const env = getSupabaseEnvSafe();
  if (!env) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function ensureProfile(
  user:
    | (Pick<User, "id" | "email"> & {
        user_metadata?: User["user_metadata"];
        app_metadata?: User["app_metadata"];
      })
    | null
    | undefined,
  roleOverride?: ProfileRole
) {
  if (!user || DEV_MODE || user.email === ADMIN_USER.email) {
    return;
  }

  const supabase = await createClient();
  const profilesTable = supabase.from("profiles") as never as ProfilesTable;

  // Check if profile already exists — if it does, don't overwrite anything
  const { data: existing } = await profilesTable
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    // Profile exists. Only update role if a new one is explicitly requested
    // and the current one is missing.
    if (roleOverride && !existing.role) {
      await profilesTable.update({ role: roleOverride }).eq("id", user.id);
    }
    return;
  }

  // Profile does NOT exist — create it
  const fullName =
    typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : typeof user.user_metadata?.username === "string" && user.user_metadata.username.trim()
        ? user.user_metadata.username.trim()
        : user.email?.split("@")[0] ?? `user_${user.id.slice(0, 8)}`;
  const username =
    typeof user.user_metadata?.username === "string" && user.user_metadata.username.trim()
      ? user.user_metadata.username.trim()
      : fullName;
  const metadataRole = getRoleFromMetadata(user);
  const authProvider = getAuthProvider(user);
  const role =
    roleOverride ??
    metadataRole ??
    (authProvider === "google" ? "student" : undefined);

  const { error } = await profilesTable.upsert(
    {
      id: user.id,
      email: user.email ?? "",
      full_name: fullName,
      username,
      streak_days: 0,
      points: 0,
      ...(role ? { role } : {}),
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("[ensureProfile] Failed to create profile:", {
      userId: user.id,
      email: user.email,
      role,
      message: error.message,
    });
  }
}

export async function createProfileForSignup(params: {
  user:
    | (Pick<User, "id" | "email"> & { user_metadata?: User["user_metadata"] })
    | null
    | undefined;
  email: string;
  fullName: string;
  username: string;
  role: ProfileRole;
}) {
  const { user, email, fullName, username, role } = params;

  if (!user || DEV_MODE || user.email === ADMIN_USER.email) {
    return { error: null as string | null };
  }

  const supabase = await createClient();
  const profilesTable = supabase.from("profiles") as never as ProfilesTable;
  const payload: Database["public"]["Tables"]["profiles"]["Insert"] = {
    id: user.id,
    email,
    full_name: fullName,
    username,
    role,
    streak_days: 0,
    points: 0,
  };

  const { error: insertError } = await profilesTable.insert(payload);
  if (insertError && !insertError.message.toLowerCase().includes("duplicate")) {
    const { error: upsertError } = await profilesTable.upsert(payload, {
      onConflict: "id",
    });
    return { error: upsertError?.message ?? null };
  }

  return { error: null as string | null };
}

export async function upsertCurrentUserRole(role: ProfileRole) {
  const user = await getCurrentUser();

  if (!user || DEV_MODE || user.email === ADMIN_USER.email) {
    return { error: "not-authenticated" as string | null };
  }

  const supabase = await createClient();
  const profilesTable = supabase.from("profiles") as never as ProfilesTable;
  const { data: existingProfile } = await profilesTable
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const userMetadata =
    "user_metadata" in user && user.user_metadata && typeof user.user_metadata === "object"
      ? (user.user_metadata as { full_name?: unknown; username?: unknown })
      : null;

  if (existingProfile) {
    const { error } = await profilesTable.update({ role }).eq("id", user.id);
    return { error: error?.message ?? null, user };
  }

  const fullName =
    typeof userMetadata?.full_name === "string" && userMetadata.full_name.trim()
      ? userMetadata.full_name.trim()
      : typeof userMetadata?.username === "string" && userMetadata.username.trim()
        ? userMetadata.username.trim()
        : user.email?.split("@")[0] ?? `user_${user.id.slice(0, 8)}`;
  const username =
    typeof userMetadata?.username === "string" && userMetadata.username.trim()
      ? userMetadata.username.trim()
      : fullName;

  const payload: Database["public"]["Tables"]["profiles"]["Insert"] = {
    id: user.id,
    email: user.email ?? "",
    full_name: fullName,
    username,
    role,
    streak_days: 0,
    points: 0,
    avatar_url: null,
    bio: null,
  };

  const { error } = await profilesTable.upsert(payload, { onConflict: "id" });
  return { error: error?.message ?? null, user };
}

/**
 * Accepts an optional pre-fetched user to avoid a duplicate getCurrentUser() call.
 * The dashboard already calls getCurrentUser() at the top level — pass it in.
 */
export async function getCurrentProfile(
  preloadedUser?: Awaited<ReturnType<typeof getCurrentUser>>
): Promise<Profile | null> {
  const user = preloadedUser ?? (await getCurrentUser());

  if (!user || DEV_MODE || user.email === ADMIN_USER.email) {
    return null;
  }

  if (isGoBackendBridgeConfigured()) {
    try {
      return await getCurrentProfileFromGo(user.id);
    } catch (error) {
      console.warn("[getCurrentProfile] Falling back to Supabase:", error);
    }
  }

  const supabase = await createClient();
  const profilesTable = supabase.from("profiles") as never as ProfilesTable;
  const { data } = await profilesTable
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (data) {
    return data;
  }

  await ensureProfile(user);

  const { data: ensuredProfile } = await profilesTable
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return ensuredProfile ?? null;
}

export async function getCurrentRole(
  preloadedUser?: Awaited<ReturnType<typeof getCurrentUser>>
): Promise<ProfileRole | null> {
  const user = preloadedUser ?? (await getCurrentUser());

  if (!user) {
    return null;
  }

  const profile = await getCurrentProfile(user);
  return profile?.role ?? getRoleFromMetadata(user) ?? "student";
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
  const currentRole = profile?.role ?? getRoleFromMetadata(user) ?? "student";

  if (currentRole !== role) {
    return {
      user,
      profile,
      redirectTo: getDefaultAppRoute(currentRole),
    };
  }

  return { user, profile, redirectTo: null };
}
