// No "server-only" here — middleware runs on Edge runtime
import { NextResponse, type NextRequest } from "next/server";
import { DEV_MODE } from "@/lib/shared/auth/dev-mode";
import { isAdminSessionCookie, ADMIN_COOKIE_NAME } from "@/lib/shared/auth/admin";
import { isJwtExpired } from "@/lib/shared/auth/token-expiry";

const TOKEN_COOKIE = "swr_token";
const GHOST_COOKIE = "swr_ghost";

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  // Forward pathname so generateMetadata in layout can build a per-page canonical URL.
  response.headers.set("x-pathname", pathname);

  if (DEV_MODE) {
    return response;
  }

  const isProtectedRoute =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
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
  const isVerifyEmail = pathname === "/verify-email";
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
  // The cookie can outlive the JWT inside it. An expired token must count as
  // logged-out here, otherwise /login redirects to the dashboard, the
  // dashboard's 401 redirects back to /login, and the user is stuck in a loop.
  const tokenExpired = Boolean(token) && isJwtExpired(token as string);
  const isLoggedIn = Boolean(token) && !tokenExpired;

  if (tokenExpired) {
    response.cookies.delete(TOKEN_COOKIE);
  }

  // Ghost mode: unauthenticated users who opted in can browse all pages.
  // They will be prompted to sign in when they try to perform any action.
  const isGhostMode = request.cookies.get(GHOST_COOKIE)?.value === "1";

  if (!isLoggedIn) {
    if (isProtectedRoute || isChooseRole) {
      // Ghost users can browse — don't redirect to login.
      if (isGhostMode) return response;
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      const redirect = NextResponse.redirect(url);
      if (tokenExpired) {
        redirect.cookies.delete(TOKEN_COOKIE);
      }
      return redirect;
    }
    return response;
  }

  // Allow verify-email page regardless of auth state
  if (isVerifyEmail) {
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

  if (pathname === "/admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
