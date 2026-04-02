import type { RequestCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const ADMIN_EMAIL = "admin@admin.com";
export const ADMIN_PASSWORD = "admin123";
export const ADMIN_COOKIE_NAME = "flashlearn_admin_session";
const ADMIN_COOKIE_VALUE = "enabled";

export const ADMIN_USER = {
  id: "11111111-1111-1111-1111-111111111111",
  email: ADMIN_EMAIL,
} as const;

export function isAdminCredentials(email: string, password: string) {
  return email === ADMIN_EMAIL && password === ADMIN_PASSWORD;
}

export function isAdminSessionCookie(cookie?: Pick<RequestCookie, "value"> | null) {
  return cookie?.value === ADMIN_COOKIE_VALUE;
}

export function getAdminSessionCookie() {
  return {
    name: ADMIN_COOKIE_NAME,
    value: ADMIN_COOKIE_VALUE,
    httpOnly: false,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  };
}

export function getAdminLogoutCookie() {
  return {
    name: ADMIN_COOKIE_NAME,
    value: "",
    httpOnly: false,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  };
}
