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

function getAuthProvider(metadata: unknown): string | null {
  if (
    metadata &&
    typeof metadata === "object" &&
    "provider" in metadata &&
    typeof (metadata as { provider?: unknown }).provider === "string"
  ) {
    return (metadata as { provider: string }).provider;
  }

  return null;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (DEV_MODE) {
    return supabaseResponse;
  }

  const pathname = request.nextUrl.pathname;

  // Routes that require authentication
  const isProtectedRoute =
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/teacher" ||
    pathname.startsWith("/teacher/") ||
    pathname === "/student" ||
    pathname.startsWith("/student/") ||
    pathname === "/sets/new" ||
    pathname === "/sets/new/ai" ||
    /^\/sets\/[^/]+\/edit$/.test(pathname) ||
    /^\/sets\/[^/]+\/study$/.test(pathname) ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    pathname === "/classes" ||
    pathname.startsWith("/classes/");

  const isAuthRoute = pathname === "/login" || pathname === "/signup";
  const isChooseRole = pathname === "/choose-role";
  const isTeacherRoute = pathname === "/teacher" || pathname.startsWith("/teacher/");
  const isStudentRoute = pathname === "/student" || pathname.startsWith("/student/");
  const isRoleSensitiveRoute =
    isAuthRoute || isChooseRole || pathname === "/dashboard" || isTeacherRoute || isStudentRoute;

  // Admin bypass
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

    // ── Not logged in ──────────────────────────────────────────────────
    if (!user) {
      if (isProtectedRoute || isChooseRole) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    // ── Logged in: resolve role ────────────────────────────────────────
    // Only fetch profile when we need role information
    if (!isRoleSensitiveRoute) {
      return supabaseResponse;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role =
      (profileData as { role?: ProfileRole } | null)?.role ??
      getRoleFromMetadata(user.user_metadata) ??
      null; // null = no role yet

    // ── User has NO role: force role selection ─────────────────────────
    if (!role) {
      const provider = getAuthProvider(user.app_metadata);

      if (provider === "google") {
        const fullName =
          typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
            ? user.user_metadata.full_name.trim()
            : typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()
              ? user.user_metadata.name.trim()
              : user.email?.split("@")[0] ?? `user_${user.id.slice(0, 8)}`;
        const username =
          typeof user.user_metadata?.username === "string" && user.user_metadata.username.trim()
            ? user.user_metadata.username.trim()
            : fullName;

        await supabase.from("profiles").upsert(
          {
            id: user.id,
            email: user.email ?? "",
            full_name: fullName,
            username,
            role: "student",
            streak_days: 0,
            points: 0,
          },
          { onConflict: "id" }
        );

        const url = request.nextUrl.clone();
        url.pathname = "/student/dashboard";
        return NextResponse.redirect(url);
      }

      // If already on choose-role, let them through
      if (isChooseRole) {
        return supabaseResponse;
      }
      // If on auth route, redirect to choose-role (they're logged in but need a role)
      if (isRoleSensitiveRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/choose-role";
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    // ── User HAS a role ────────────────────────────────────────────────

    // Logged-in user on auth route or choose-role → go to dashboard
    if (isAuthRoute || isChooseRole) {
      const url = request.nextUrl.clone();
      url.pathname = getDefaultAppRoute(role);
      return NextResponse.redirect(url);
    }

    // /dashboard → redirect to role-specific dashboard
    if (pathname === "/dashboard") {
      const url = request.nextUrl.clone();
      url.pathname = getDefaultAppRoute(role);
      return NextResponse.redirect(url);
    }

    // Prevent students from accessing teacher routes and vice versa
    if (pathname.startsWith("/teacher/") && role !== "teacher") {
      const url = request.nextUrl.clone();
      url.pathname = getDefaultAppRoute(role);
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/student/") && role !== "student") {
      const url = request.nextUrl.clone();
      url.pathname = getDefaultAppRoute(role);
      return NextResponse.redirect(url);
    }

    // Bare /teacher or /student → redirect to dashboard
    if (pathname === "/teacher" || pathname === "/student") {
      const url = request.nextUrl.clone();
      url.pathname = getDefaultAppRoute(role);
      return NextResponse.redirect(url);
    }
  } catch {
    // If Supabase is unreachable, let the request through
  }

  return supabaseResponse;
}
