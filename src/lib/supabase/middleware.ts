import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnvSafe } from "./env";
import { DEV_MODE } from "@/lib/dev-mode";
import { isAdminSessionCookie, ADMIN_COOKIE_NAME } from "@/lib/admin-auth";
import type { ProfileRole } from "@/types/database";

function getDefaultAppRoute(role: ProfileRole) {
  return role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";
}

function getRoleFromMetadata(metadata: unknown): ProfileRole | null {
  if (
    metadata &&
    typeof metadata === "object" &&
    "role" in metadata &&
    (metadata as { role?: unknown }).role &&
    ((metadata as { role?: unknown }).role === "student" ||
      (metadata as { role?: unknown }).role === "teacher")
  ) {
    return (metadata as { role: ProfileRole }).role;
  }

  return null;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // DEV MODE: auth disabled — skip all redirects, allow all routes
  if (DEV_MODE) {
    return supabaseResponse;
  }

  const pathname = request.nextUrl.pathname;
  // All /dashboard, /teacher, /student, /sets, /profile, /settings, /guide, /leaderboard, /classes
  // routes require authentication. Only the landing page and auth routes are public.
  const isProtectedRoute =
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/teacher" ||
    pathname.startsWith("/teacher/") ||
    pathname === "/student" ||
    pathname.startsWith("/student/") ||
    pathname === "/sets" ||
    pathname.startsWith("/sets/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    pathname === "/guide" ||
    pathname.startsWith("/guide/") ||
    pathname === "/leaderboard" ||
    pathname.startsWith("/leaderboard/") ||
    pathname === "/classes" ||
    pathname.startsWith("/classes/");
  const isAuthRoute = pathname === "/login" || pathname === "/signup";

  if (isAdminSessionCookie(request.cookies.get(ADMIN_COOKIE_NAME))) {
    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/teacher/dashboard";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const env = getSupabaseEnvSafe();
  if (!env) {
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(env.url, env.anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    if (user && isAuthRoute) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      const role =
        ((profileData as { role?: ProfileRole } | null)?.role ??
          getRoleFromMetadata(user.user_metadata) ??
          "student") as ProfileRole;
      const url = request.nextUrl.clone();
      url.pathname = getDefaultAppRoute(role);
      return NextResponse.redirect(url);
    }

    if (user && (pathname === "/teacher" || pathname.startsWith("/teacher/") || pathname === "/student" || pathname.startsWith("/student/") || pathname === "/dashboard")) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      const role =
        ((profileData as { role?: ProfileRole } | null)?.role ??
          getRoleFromMetadata(user.user_metadata) ??
          "student") as ProfileRole;
      const targetHome = getDefaultAppRoute(role);

      if (pathname === "/dashboard") {
        const url = request.nextUrl.clone();
        url.pathname = targetHome;
        return NextResponse.redirect(url);
      }

      if (pathname.startsWith("/teacher/") && role !== "teacher") {
        const url = request.nextUrl.clone();
        url.pathname = targetHome;
        return NextResponse.redirect(url);
      }

      if (pathname.startsWith("/student/") && role !== "student") {
        const url = request.nextUrl.clone();
        url.pathname = targetHome;
        return NextResponse.redirect(url);
      }

      if (pathname === "/teacher" || pathname === "/student") {
        const url = request.nextUrl.clone();
        url.pathname = targetHome;
        return NextResponse.redirect(url);
      }
    }
  } catch {
    // If Supabase is unreachable, let the request through
    // rather than crashing the middleware.
  }

  return supabaseResponse;
}
