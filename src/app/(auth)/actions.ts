"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createProfileForSignup,
  createClient,
  ensureProfile,
  getAppHomePath,
  getRoleRegistrationRedirect,
} from "@/lib/supabase/server";
import { DEV_MODE } from "@/lib/dev-mode";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";
import {
  getAdminLogoutCookie,
  getAdminSessionCookie,
  isAdminCredentials,
} from "@/lib/admin-auth";

export type AuthResult = {
  error: string | null;
  message?: string | null;
};

type ProfileLookupTable = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      maybeSingle: () => Promise<{ data: { id: string } | null }>;
    };
  };
};

export async function login(formData: FormData): Promise<AuthResult> {
  if (DEV_MODE) {
    redirect("/student");
  }

  const t = createTranslator(await getServerLocale());

  // Read and sanitize — trim whitespace to prevent copy-paste issues
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

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Log full error in development for debugging
    console.error("[login] Supabase auth error:", {
      message: error.message,
      status: error.status,
      code: error.code,
      email,
      passwordLength: password.length,
    });

    // Show a more helpful message for common cases
    if (error.message === "Invalid login credentials") {
      return {
        error: t("action.invalidCredentials"),
      };
    }

    if (error.message === "Email not confirmed") {
      return {
        error: t("action.emailNotConfirmed"),
      };
    }

    return { error: error.message };
  }

  // Defensive: if no error but also no session, something is wrong
  if (!data.session) {
    console.error("[login] No error but no session returned:", {
      user: data.user?.id,
      email,
    });
    return { error: t("action.loginNoSession") };
  }

  await ensureProfile(data.user);

  redirect(await getAppHomePath(data.user));
}

export async function signup(formData: FormData): Promise<AuthResult> {
  if (DEV_MODE) {
    redirect("/student");
  }

  const t = createTranslator(await getServerLocale());

  const supabase = await createClient();
  const profilesTable = supabase.from("profiles") as never as ProfileLookupTable;

  // Read and sanitize
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

  const { data: existingProfile } = await profilesTable
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existingProfile) {
    return { error: t("action.usernameTaken") };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, username, role },
    },
  });

  if (error) {
    console.error("[signup] Supabase auth error:", {
      message: error.message,
      status: error.status,
      code: error.code,
      email,
    });
    return { error: error.message };
  }

  // Supabase returns a user with identities=[] when the email already exists
  // and email confirmation is enabled. Detect this case.
  if (
    data.user &&
    data.user.identities &&
    data.user.identities.length === 0
  ) {
    return {
      error: t("action.accountExists"),
    };
  }

  // If email confirmation is required, Supabase returns a user with
  // an empty session. Don't redirect to dashboard — they can't access it.
  if (data.user) {
    const profileResult = await createProfileForSignup({
      user: data.user,
      email,
      fullName,
      username,
      role,
    });

    if (profileResult.error) {
      console.error("[signup] profile insert failed:", {
        error: profileResult.error,
        userId: data.user.id,
        email,
        role,
      });
      return { error: t("action.profileCreateFailed") };
    }
  }

  if (data.user && !data.session) {
    return {
      error: null,
      message: t("action.checkEmailMessage"),
    };
  }

  await ensureProfile(data.user, role);

  redirect(getRoleRegistrationRedirect(role));
}

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
