"use client";

import { useEffect, useMemo, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClientSafe } from "@/lib/supabase/client";
import { DEV_MODE, DEV_USER } from "@/lib/dev-mode";
import { ADMIN_COOKIE_NAME, ADMIN_EMAIL, ADMIN_USER } from "@/lib/admin-auth";

function hasAdminSessionCookie() {
  if (typeof document === "undefined") {
    return false;
  }

  return document.cookie
    .split("; ")
    .some((entry) => entry.startsWith(`${ADMIN_COOKIE_NAME}=`));
}

export function useAuth() {
  const adminSession = hasAdminSessionCookie();
  const [user, setUser] = useState<User | null>(
    DEV_MODE
      ? (DEV_USER as unknown as User)
      : adminSession
        ? (ADMIN_USER as unknown as User)
        : null
  );
  const [loading, setLoading] = useState(!(DEV_MODE || adminSession));

  const supabase = useMemo(
    () => (DEV_MODE || adminSession ? null : createClientSafe()),
    [adminSession]
  );

  useEffect(() => {
    if (DEV_MODE || !supabase) return;

    let mounted = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted) {
        setUser(user);
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (user?.email === ADMIN_EMAIL) {
    return { user, loading: false };
  }

  return { user, loading };
}
