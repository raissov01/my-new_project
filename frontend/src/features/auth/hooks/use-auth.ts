"use client";

import { useEffect, useState } from "react";
import { DEV_MODE, DEV_USER } from "@/lib/shared/auth/dev-mode";
import { ADMIN_COOKIE_NAME, ADMIN_EMAIL, ADMIN_USER } from "@/lib/shared/auth/admin";

function hasAdminSessionCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((entry) => entry.startsWith(`${ADMIN_COOKIE_NAME}=`));
}

function hasAuthToken() {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((entry) => entry.startsWith("swr_token="));
}

type SimpleUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

/**
 * Client-side auth hook. Checks for JWT token cookie (set by Go backend).
 * For user details, pages should use getCurrentUser() server-side.
 */
export function useAuth() {
  const adminSession = hasAdminSessionCookie();
  const [user, setUser] = useState<SimpleUser | null>(
    DEV_MODE
      ? (DEV_USER as unknown as SimpleUser)
      : adminSession
        ? (ADMIN_USER as unknown as SimpleUser)
        : null
  );
  const [loading, setLoading] = useState(!(DEV_MODE || adminSession));

  useEffect(() => {
    if (DEV_MODE || adminSession) return;

    // Check if token cookie exists — if so, user is logged in
    if (hasAuthToken()) {
      // We don't have the full user object client-side. Set a minimal marker.
      setUser({ id: "authenticated", email: "" });
    }
    setLoading(false);
  }, [adminSession]);

  if (user?.email === ADMIN_EMAIL) {
    return { user, loading: false };
  }

  return { user, loading };
}
