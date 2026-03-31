import { NextResponse } from "next/server";
import { createClient, ensureProfile, getAppHomePath, getCurrentUser } from "@/lib/supabase/server";
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
        // For social logins: ensure a profile exists.
        // If a role was passed via the redirect URL, use it.
        const validRole = role === "teacher" || role === "student" ? role : "student";
        await ensureProfile(user, validRole);
      }

      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      const appHome = user ? await getAppHomePath(user) : "/login";
      return NextResponse.redirect(`${origin}${appHome}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
