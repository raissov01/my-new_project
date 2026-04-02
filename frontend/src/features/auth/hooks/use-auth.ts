"use client";

import { useEffect, useState } from "react";
import { DEV_MODE, DEV_USER } from "@/lib/shared/auth/dev-mode";
import { ADMIN_COOKIE_NAME, ADMIN_EMAIL, ADMIN_USER } from "@/lib/shared/auth/admin";
import { fetchApiJson } from "@/lib/client/api";

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

type BackendUser = {
  id: string;
  email: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  role: string;
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

    let cancelled = false;

    async function loadUser() {
      if (!hasAuthToken()) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const backendUser = await fetchApiJson<BackendUser>("/auth/me");
        if (cancelled) return;

        setUser({
          id: backendUser.id,
          email: backendUser.email,
          user_metadata: {
            full_name: backendUser.fullName,
            username: backendUser.username,
            avatar_url: backendUser.avatarUrl,
            role: backendUser.role,
          },
        });
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadUser();

    function handleProfileUpdated() {
      void loadUser();
    }

    window.addEventListener("flashlearn-profile-updated", handleProfileUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener("flashlearn-profile-updated", handleProfileUpdated);
    };
  }, [adminSession]);

  if (user?.email === ADMIN_EMAIL) {
    return { user, loading: false };
  }

  return { user, loading };
}
