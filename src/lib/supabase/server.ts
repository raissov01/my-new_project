import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import type { Database, Profile, ProfileRole } from "@/types/database";
import { getSupabaseEnv } from "./env";
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
};

const VALID_ROLES = new Set<ProfileRole>(["student", "teacher"]);

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function ensureProfile(
  user:
    | (Pick<User, "id" | "email"> & { user_metadata?: User["user_metadata"] })
    | null
    | undefined,
  roleOverride?: ProfileRole
) {
  if (!user || DEV_MODE || user.email === ADMIN_USER.email) {
    return;
  }

  const supabase = await createClient();
  const profilesTable = supabase.from("profiles") as never as ProfilesTable;
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
  const role = roleOverride ?? getRoleFromMetadata(user);

  await profilesTable.upsert(
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

  await ensureProfile(user);

  const supabase = await createClient();
  const profilesTable = supabase.from("profiles") as never as ProfilesTable;
  const { data } = await profilesTable
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data ?? null;
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
