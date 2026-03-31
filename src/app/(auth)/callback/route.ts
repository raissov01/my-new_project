import { NextResponse } from "next/server";
import { createClient, ensureProfile, getCurrentUser, getCurrentProfile, getDefaultAppRoute } from "@/lib/supabase/server";
import { DEV_MODE } from "@/lib/dev-mode";
import type { ProfileRole } from "@/types/database";

// Handles the OAuth/magic-link redirect from Supabase
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const role = searchParams.get("role") as ProfileRole | null;

  if (DEV_MODE) {
    return NextResponse.redirect(`${origin}/student/dashboard`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const user = await getCurrentUser();

      if (user) {
        // Check if this user already has a profile with a role
        const existingProfile = await getCurrentProfile(user);

        if (existingProfile?.role) {
          // Returning user with a role → go to dashboard
          if (next) {
            return NextResponse.redirect(`${origin}${next}`);
          }
          return NextResponse.redirect(
            `${origin}${getDefaultAppRoute(existingProfile.role)}`
          );
        }

        // New user — ensure a profile row exists.
        // If a role was explicitly passed via URL (from email signup form), use it.
        // Otherwise default to "student" — this covers Google sign-in where no
        // role selection screen is shown.
        const validRole: ProfileRole =
          role === "teacher" || role === "student" ? role : "student";
        await ensureProfile(user, validRole);

        return NextResponse.redirect(
          `${origin}${getDefaultAppRoute(validRole)}`
        );
      }

      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      return NextResponse.redirect(`${origin}/login`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
