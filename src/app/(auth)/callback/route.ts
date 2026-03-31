import { NextResponse } from "next/server";
import { createClient, getAppHomePath, getCurrentUser } from "@/lib/supabase/server";
import { DEV_MODE } from "@/lib/dev-mode";

// Handles the OAuth/magic-link redirect from Supabase
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (DEV_MODE) {
    return NextResponse.redirect(`${origin}/student/dashboard`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      const user = await getCurrentUser();
      const appHome = user ? await getAppHomePath(user) : "/login";
      return NextResponse.redirect(`${origin}${appHome}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
