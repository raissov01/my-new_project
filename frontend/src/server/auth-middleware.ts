// No "server-only" here — middleware runs on Edge runtime
import { NextResponse, type NextRequest } from "next/server";
import { DEV_MODE } from "@/lib/shared/auth/dev-mode";
import { isAdminSessionCookie, ADMIN_COOKIE_NAME } from "@/lib/shared/auth/admin";

const TOKEN_COOKIE = "swr_token";

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });

  if (DEV_MODE) {
    return response;
  }

  const pathname = request.nextUrl.pathname;

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

  if (isAdminSessionCookie(request.cookies.get(ADMIN_COOKIE_NAME))) {
    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/teacher/dashboard";
      return NextResponse.redirect(url);
    }
    return response;
  }

  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const isLoggedIn = Boolean(token);

  if (!isLoggedIn) {
    if (isProtectedRoute || isChooseRole) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (isLoggedIn && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/student/dashboard";
    return NextResponse.redirect(url);
  }

  if (pathname === "/dashboard") {
    const url = request.nextUrl.clone();
    url.pathname = "/student/dashboard";
    return NextResponse.redirect(url);
  }

  if (pathname === "/teacher" || pathname === "/student") {
    const url = request.nextUrl.clone();
    url.pathname = `${pathname}/dashboard`;
    return NextResponse.redirect(url);
  }

  return response;
}
