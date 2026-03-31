"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, LogOut, Settings, UserCircle2 } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { useLocale } from "@/components/providers/locale-provider";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type ProfileSummary = {
  username: string;
  avatarUrl: string | null;
};

function getUserFallback(user: NonNullable<ReturnType<typeof useAuth>["user"]>) {
  const metadata =
    "user_metadata" in user && typeof user.user_metadata === "object"
      ? user.user_metadata
      : undefined;

  const username =
    typeof metadata?.username === "string" && metadata.username.trim()
      ? metadata.username.trim()
      : user.email?.split("@")[0] ?? "User";
  const avatarUrl =
    typeof metadata?.avatar_url === "string" && metadata.avatar_url.trim()
      ? metadata.avatar_url
      : null;

  return { username, avatarUrl };
}

export function AvatarMenu() {
  const { user } = useAuth();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const fallback = useMemo(() => (user ? getUserFallback(user) : null), [user]);

  useEffect(() => {
    if (!user || !open) {
      return;
    }

    const currentUserId = user.id;
    const supabase = createClient();
    const profilesTable = supabase.from("profiles") as never as {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{
            data: { username: string | null; avatar_url: string | null } | null;
          }>;
        };
      };
    };
    let isActive = true;

    async function loadProfile() {
      const { data } = await profilesTable
        .select("username, avatar_url")
        .eq("id", currentUserId)
        .maybeSingle();

      if (!isActive) {
        return;
      }

      setProfile({
        username: data?.username ?? fallback?.username ?? "User",
        avatarUrl: data?.avatar_url ?? fallback?.avatarUrl ?? null,
      });
    }

    void loadProfile();

    function handleProfileUpdated() {
      void loadProfile();
    }

    window.addEventListener("flashlearn-profile-updated", handleProfileUpdated);

    return () => {
      isActive = false;
      window.removeEventListener("flashlearn-profile-updated", handleProfileUpdated);
    };
  }, [fallback?.avatarUrl, fallback?.username, open, user]);

  // Lock scroll when bottom sheet is open on mobile
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  // Lock body on mobile when open
  useEffect(() => {
    if (!open) return;
    const isMobile = window.innerWidth < 1024;
    if (isMobile) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  if (!user) {
    return null;
  }

  const username = profile?.username ?? fallback?.username ?? "User";
  const avatarUrl = profile?.avatarUrl ?? fallback?.avatarUrl ?? null;

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
  }

  const menuContent = (
    <>
      <div className="rounded-[1.35rem] bg-[var(--bg-surface)] px-4 py-4">
        <div className="flex items-center gap-3">
          <ProfileAvatar username={username} avatarUrl={avatarUrl} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
              {username}
            </p>
            <p className="truncate text-xs text-[var(--text-secondary)]">
              {user.email}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <Link
          href="/profile"
          onClick={() => setOpen(false)}
          className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-surface)] active:bg-[var(--bg-surface)]"
        >
          <span className="flex items-center gap-3">
            <UserCircle2 className="h-4 w-4 text-indigo-500" />
            {t("nav.profile")}
          </span>
        </Link>

        <Link
          href="/settings"
          onClick={() => setOpen(false)}
          className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-surface)] active:bg-[var(--bg-surface)]"
        >
          <span className="flex items-center gap-3">
            <Settings className="h-4 w-4 text-sky-500" />
            {t("nav.settings")}
          </span>
        </Link>
      </div>

      <div className="mt-3 rounded-[1.35rem] border border-[var(--border)] bg-[var(--bg-surface)] p-3">
        <LanguageSwitcher variant="menu" />
      </div>

      <div className="mt-3">
        <ThemeToggle variant="menu" />
      </div>

      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="mt-3 flex w-full items-center justify-between rounded-2xl border border-red-500/10 bg-red-500/5 px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10 active:bg-red-500/15 disabled:opacity-60"
      >
        <span className="flex items-center gap-3">
          <LogOut className="h-4 w-4" />
          {loggingOut ? t("nav.loggingOut") : t("nav.logOut")}
        </span>
      </button>
    </>
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-1.5 py-1.5 shadow-sm transition-all hover:bg-[var(--bg-surface)]",
          open && "border-indigo-400/60 shadow-indigo-500/10"
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("nav.openAccountMenu")}
      >
        <ProfileAvatar
          username={username}
          avatarUrl={avatarUrl}
          size="xs"
          className="ring-2 ring-white/60 dark:ring-slate-900/50"
        />
        <ChevronDown
          className={cn(
            "mr-1 h-4 w-4 text-[var(--text-secondary)] transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Desktop dropdown */}
      {open && (
        <div className="animate-fade-in-up absolute right-0 top-[calc(100%+0.75rem)] z-50 hidden w-[min(22rem,calc(100vw-2rem))] rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-3 shadow-2xl shadow-slate-900/10 backdrop-blur lg:block">
          {menuContent}
        </div>
      )}

      {/* Mobile bottom sheet */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 bottom-0 animate-slide-up-sheet">
            <div className="max-h-[85vh] overflow-y-auto overscroll-contain rounded-t-[1.75rem] border-t border-[var(--border)] bg-[var(--bg-elevated)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
              {/* Drag handle */}
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--border)]" />
              {menuContent}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
