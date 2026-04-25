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

type AuthUser = {
  id: string;
  email?: string;
  plan?: "free" | "pro";
  user_metadata?: Record<string, unknown>;
};

type MeResponse = {
  user: {
    id: string;
    email: string;
    fullName: string;
    username: string;
    avatarUrl: string | null;
    role: string;
    plan: "free" | "pro";
  } | null;
};

/**
 * Client-side auth hook.
 *
 * Calls /api/auth/me (a Next.js API route) which reads the httpOnly JWT
 * cookie server-side and returns the user data. This avoids the problem
 * where document.cookie can't see httpOnly cookies and the Go backend's
 * /auth/me endpoint requires a Bearer header the client can't provide.
 */
export function useAuth() {
  const adminSession = hasAdminSessionCookie();
  const [user, setUser] = useState<AuthUser | null>(
    DEV_MODE
      ? (DEV_USER as unknown as AuthUser)
      : adminSession
        ? (ADMIN_USER as unknown as AuthUser)
        : null
  );
  const [loading, setLoading] = useState(!(DEV_MODE || adminSession));

  useEffect(() => {
    if (DEV_MODE || adminSession) return;

    let cancelled = false;

    async function loadUser() {
      try {
        // Call the Next.js API route which reads the httpOnly cookie server-side
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok || cancelled) return;

        const data: MeResponse = await response.json();

        if (cancelled) return;

        if (data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email,
            plan: data.user.plan ?? "free",
            user_metadata: {
              full_name: data.user.fullName,
              username: data.user.username,
              avatar_url: data.user.avatarUrl,
              role: data.user.role,
            },
          });
        } else {
          setUser(null);
        }
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
