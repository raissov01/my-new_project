"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Home,
  Plus,
  Menu,
  X,
  Ghost,
  HelpCircle,
  UserCircle2,
  Settings,
  LibraryBig,
  BookMarked,
  MessageSquareText,
  Gamepad2,
  ListChecks,
} from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useGhostMode } from "@/features/auth/hooks/use-ghost-mode";
import { Button } from "@/components/ui/button";
import { AvatarMenu } from "@/components/layout/avatar-menu";
import { BrandLogo } from "@/components/layout";
import { DEV_MODE } from "@/lib/shared/auth/dev-mode";


export function Navbar() {
  const { user, loading } = useAuth();
  const { t } = useLocale();
  const { isGhost, enableGhostMode } = useGhostMode();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const homeHref = user ? "/dashboard" : "/";

  const userNavItems = user
    ? [
        { href: homeHref, label: t("nav.home"), icon: Home, exact: false },
        { href: "/ielts", label: t("nav.ieltsPrep"), icon: BookMarked, exact: false },
        { href: "/learn", label: t("nav.learn"), icon: Gamepad2, exact: false },
        { href: "/chat", label: t("nav.aiChat"), icon: MessageSquareText, exact: false },
        { href: "/flashcards", label: t("nav.flashcards"), icon: LibraryBig, exact: false },
        { href: "/quizzes", label: t("nav.quizzes"), icon: ListChecks, exact: false },
        { href: "/guide", label: t("nav.guide"), icon: HelpCircle, exact: true },
      ]
    : [
        { href: "/", label: t("nav.home"), icon: Home, exact: true },
        { href: "/ielts", label: t("nav.ieltsPrep"), icon: BookMarked, exact: false },
        { href: "/flashcards", label: t("nav.flashcards"), icon: LibraryBig, exact: false },
        { href: "/quizzes", label: t("nav.quizzes"), icon: ListChecks, exact: false },
        { href: "/guide", label: t("nav.guide"), icon: HelpCircle, exact: true },
      ];

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [drawerOpen]);

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="page-shell">
          <div className="flex h-14 items-center justify-between gap-4">
            {/* Left: logo + nav */}
            <div className="flex min-w-0 items-center gap-6">
              <Link href={homeHref} className="shrink-0">
                <BrandLogo compact />
              </Link>

              <div className="hidden items-center gap-0.5 xl:flex">
                {userNavItems.map((item) => (
                  <DesktopNavLink
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    active={isActivePath(pathname, item.href, item.exact)}
                  />
                ))}
              </div>

              {DEV_MODE && (
                <span className="badge-accent text-[10px] uppercase tracking-[0.14em]">
                  {t("nav.dev")}
                </span>
              )}
            </div>

            {/* Right: auth */}
            <div className="hidden items-center gap-2 lg:flex">
              {loading ? (
                <>
                  <div className="h-8 w-24 animate-pulse rounded-[var(--radius-md)] bg-[var(--bg-soft)]" />
                  <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--bg-soft)]" />
                </>
              ) : user ? (
                <>
                  <Link href="/sets/new">
                    <Button variant="outline" size="sm">
                      <Plus className="h-3.5 w-3.5" />
                      {t("nav.newSet")}
                    </Button>
                  </Link>
                  <AvatarMenu />
                </>
              ) : !DEV_MODE ? (
                <>
                  {!isGhost && (
                    <button
                      onClick={enableGhostMode}
                      className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                    >
                      <Ghost className="h-4 w-4" />
                      {t("ghost.browseAsGuest")}
                    </button>
                  )}
                  <Link
                    href="/login"
                    className="rounded-[var(--radius-md)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                  >
                    {t("nav.logIn")}
                  </Link>
                  <Link href="/signup">
                    <Button size="sm">{t("nav.signUp")}</Button>
                  </Link>
                </>
              ) : null}
            </div>

            {/* Mobile hamburger */}
            <div className="flex items-center lg:hidden">
              <button
                className="tap-target flex items-center justify-center rounded-[var(--radius-md)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)] active:scale-95"
                onClick={() => setDrawerOpen(true)}
                aria-label={t("nav.toggleMenu")}
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/30 animate-fade-in"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-[min(18rem,85vw)] animate-slide-in-drawer">
            <div className="flex h-full w-full flex-col border-l border-[var(--border)] bg-[var(--bg-surface)]">
              {/* Drawer header */}
              <div className="flex h-14 items-center justify-between border-b border-[var(--border)] px-4">
                <BrandLogo compact />
                <button
                  className="tap-target flex items-center justify-center rounded-[var(--radius-md)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)] active:scale-95"
                  onClick={() => setDrawerOpen(false)}
                  aria-label={t("aria.closeMenu")}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer nav */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
                <div className="space-y-0.5">
                  {userNavItems.map((item) => (
                    <DrawerLink
                      key={item.href}
                      href={item.href}
                      icon={item.icon}
                      label={item.label}
                      active={isActivePath(pathname, item.href, item.exact)}
                      onClick={() => setDrawerOpen(false)}
                    />
                  ))}
                  {user && (
                    <>
                      <DrawerLink
                        href="/sets/new"
                        icon={Plus}
                        label={t("nav.newSet")}
                        active={pathname === "/sets/new"}
                        onClick={() => setDrawerOpen(false)}
                      />
                      <div className="my-2 h-px bg-[var(--border)]" />
                      <DrawerLink
                        href="/profile"
                        icon={UserCircle2}
                        label={t("nav.profile")}
                        active={pathname === "/profile"}
                        onClick={() => setDrawerOpen(false)}
                      />
                      <DrawerLink
                        href="/settings"
                        icon={Settings}
                        label={t("nav.settings")}
                        active={pathname === "/settings"}
                        onClick={() => setDrawerOpen(false)}
                      />
                    </>
                  )}
                </div>

                {!user && !DEV_MODE && (
                  <div className="mt-4 space-y-2">
                    {!isGhost && (
                      <Button
                        variant="ghost"
                        className="w-full gap-2"
                        onClick={() => { enableGhostMode(); setDrawerOpen(false); }}
                      >
                        <Ghost className="h-4 w-4" />
                        {t("ghost.browseAsGuest")}
                      </Button>
                    )}
                    <Link href="/login" onClick={() => setDrawerOpen(false)} className="block">
                      <Button variant="outline" className="w-full">{t("nav.logIn")}</Button>
                    </Link>
                    <Link href="/signup" onClick={() => setDrawerOpen(false)} className="block">
                      <Button className="w-full">{t("nav.signUp")}</Button>
                    </Link>
                  </div>
                )}
              </div>

              {user && (
                <div className="safe-bottom border-t border-[var(--border)] px-4 py-3">
                  <AvatarMenu />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function isActivePath(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function DesktopNavLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: typeof Home;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-[var(--bg-soft)] text-[var(--text-primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)]"
      }`}
    >
      <Icon className={`h-4 w-4 ${active ? "text-[var(--primary)]" : ""}`} />
      {label}
    </Link>
  );
}

function DrawerLink({
  href,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  href: string;
  icon: typeof Home;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-[42px] items-center gap-3 rounded-[var(--radius-lg)] px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-[var(--primary-soft)] text-[var(--primary)]"
          : "text-[var(--text-primary)] hover:bg-[var(--bg-soft)]"
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-[var(--primary)]" : "text-[var(--text-secondary)]"}`} />
      {label}
    </Link>
  );
}
