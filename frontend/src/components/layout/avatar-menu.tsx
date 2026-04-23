"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, LogOut, Settings, UserCircle2 } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { useLocale } from "@/components/providers/locale-provider";
import { ProfileAvatar } from "@/features/profile/components/profile-avatar";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { cn } from "@/lib/shared/utils";

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
  const containerRef = useRef<HTMLDivElement | null>(null);

  const fallback = useMemo(() => (user ? getUserFallback(user) : null), [user]);

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

  const username = fallback?.username ?? "User";
  const avatarUrl = fallback?.avatarUrl ?? null;

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
  }

  const menuContent = (
    <>
      <div className="rounded-[var(--radius-lg)] bg-[var(--bg-soft)] px-4 py-4">
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
          className="flex items-center justify-between rounded-[var(--radius-md)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-soft)] active:bg-[var(--bg-soft)]"
        >
          <span className="flex items-center gap-3">
            <UserCircle2 className="h-4 w-4 text-[var(--text-secondary)]" />
            {t("nav.profile")}
          </span>
        </Link>

        <Link
          href="/settings"
          onClick={() => setOpen(false)}
          className="flex items-center justify-between rounded-[var(--radius-md)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-soft)] active:bg-[var(--bg-soft)]"
        >
          <span className="flex items-center gap-3">
            <Settings className="h-4 w-4 text-[var(--text-secondary)]" />
            {t("nav.settings")}
          </span>
        </Link>
      </div>

      <div className="mt-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-soft)] p-3">
        <LanguageSwitcher variant="menu" />
      </div>

      <div className="mt-3">
        <ThemeToggle variant="menu" />
      </div>

      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="mt-3 flex w-full items-center justify-between rounded-[var(--radius-md)] border border-red-500/10 bg-red-500/5 px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10 active:bg-red-500/15 disabled:opacity-60 dark:text-red-400"
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
          "flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-1.5 py-1.5 shadow-sm transition-all hover:bg-[var(--bg-soft)]",
          open && "border-[var(--border-strong)]"
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("nav.openAccountMenu")}
      >
        <ProfileAvatar
          username={username}
          avatarUrl={avatarUrl}
          size="xs"
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
        <div
          className="animate-fade-in-up absolute right-0 top-[calc(100%+0.75rem)] z-50 hidden w-[min(22rem,calc(100vw-2rem))] rounded-[var(--radius-xl)] border p-3 shadow-[0_8px_32px_rgba(85,51,255,0.15)] lg:block"
          style={{
            background: "#0f0f1e",
            borderColor: "#2a1a5e",
            ["--bg-elevated" as string]: "#0f0f1e",
            ["--bg-soft" as string]: "rgba(255,255,255,0.05)",
            ["--border" as string]: "rgba(255,255,255,0.08)",
            ["--text-primary" as string]: "#ffffff",
            ["--text-secondary" as string]: "rgba(255,255,255,0.5)",
          }}
        >
          {menuContent}
        </div>
      )}

      {/* Mobile bottom sheet */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 animate-fade-in"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 bottom-0 animate-slide-up-sheet">
            <div
              className="max-h-[85vh] overflow-y-auto overscroll-contain rounded-t-[var(--radius-xl)] border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
              style={{
                background: "#0f0f1e",
                borderColor: "#2a1a5e",
                ["--bg-elevated" as string]: "#0f0f1e",
                ["--bg-soft" as string]: "rgba(255,255,255,0.05)",
                ["--border" as string]: "rgba(255,255,255,0.08)",
                ["--text-primary" as string]: "#ffffff",
                ["--text-secondary" as string]: "rgba(255,255,255,0.5)",
              }}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/10" />
              {menuContent}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
