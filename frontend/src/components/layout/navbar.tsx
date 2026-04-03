"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Home,
  Plus,
  Menu,
  X,
  GraduationCap,
  HelpCircle,
  UserCircle2,
  Settings,
  LibraryBig,
  BookMarked,
} from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { AvatarMenu } from "@/components/layout/avatar-menu";
import { BrandLogo } from "@/components/layout";
import { DEV_MODE } from "@/lib/shared/auth/dev-mode";
import { AuthRequiredPrompt } from "@/features/auth/components/auth-required-prompt";

export function Navbar() {
  const { user, loading } = useAuth();
  const { t } = useLocale();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const homeHref = user ? "/dashboard" : "/";

  const userNavItems = user
    ? [
        { href: homeHref, label: t("nav.home"), icon: Home, exact: false },
        {
          href: "/ielts",
          label: t("nav.ieltsPrep"),
          icon: BookMarked,
          exact: false,
        },
        {
          href: "/flashcards",
          label: t("nav.flashcards"),
          icon: LibraryBig,
          exact: false,
        },
        { href: "/guide", label: t("nav.guide"), icon: HelpCircle, exact: true },
      ]
    : [
        { href: "/", label: t("nav.home"), icon: Home, exact: true },
        {
          href: "/ielts",
          label: t("nav.ieltsPrep"),
          icon: BookMarked,
          exact: false,
        },
        {
          href: "/flashcards",
          label: t("nav.flashcards"),
          icon: LibraryBig,
          exact: false,
        },
        { href: "/guide", label: t("nav.guide"), icon: HelpCircle, exact: true },
      ];

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // Close drawer on Escape
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
      <nav className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--glass-bg)] backdrop-blur-xl">
        <div className="page-shell">
          <div className="flex h-14 items-center justify-between gap-3 sm:h-16 sm:gap-4">
            {/* Logo + nav links */}
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
              <Link
                href={homeHref}
                className="shrink-0 rounded-2xl px-0.5 py-1 sm:px-1"
              >
                <BrandLogo compact />
              </Link>
              <div className="hidden items-center gap-1 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-1 xl:flex">
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
                <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-400">
                  {t("nav.dev")}
                </span>
              )}
            </div>

            {/* Desktop actions */}
            <div className="hidden items-center gap-3 lg:flex">
              {loading ? (
                <>
                  <div className="h-10 w-28 animate-pulse rounded-xl bg-[var(--border)]" />
                  <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--border)]" />
                </>
              ) : user ? (
                <>
                  <Link
                    href="/ielts"
                    className="inline-flex h-11 items-center rounded-2xl bg-[linear-gradient(135deg,var(--primary-from),var(--primary-to))] px-4 text-sm font-medium text-white shadow-[0_18px_34px_-24px_rgba(79,124,255,0.8)] transition-transform hover:-translate-y-0.5"
                  >
                    <GraduationCap className="mr-1.5 h-4 w-4" />
                    {t("nav.ieltsPrep")}
                  </Link>
                  <Link
                    href="/sets/new"
                    className="inline-flex h-11 items-center rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 text-sm font-medium text-[var(--text-primary)] shadow-[var(--surface-shadow)] transition-all hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)]"
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    {t("nav.newSet")}
                  </Link>
                  <AvatarMenu />
                </>
              ) : (
                <>
                  {!DEV_MODE ? (
                    <>
                      <Link href="/ielts">
                        <Button variant="outline">{t("nav.ieltsPrep")}</Button>
                      </Link>
                      <Link
                        href="/login"
                        className="rounded-2xl px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                      >
                        {t("nav.logIn")}
                      </Link>
                      <Link href="/signup">
                        <Button>{t("nav.signUp")}</Button>
                      </Link>
                    </>
                  ) : null}
                </>
              )}
            </div>

            {/* Mobile: hamburger only */}
            <div className="flex items-center lg:hidden">
              <button
                className="tap-target rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-2 text-[var(--text-secondary)] shadow-[var(--surface-shadow)] transition-colors hover:text-[var(--text-primary)] active:scale-95 sm:p-2.5"
                onClick={() => setDrawerOpen(true)}
                aria-label={t("nav.toggleMenu")}
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile slide-in drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer panel */}
          <div className="absolute inset-y-0 right-0 flex w-full max-w-[min(19rem,88vw)] animate-slide-in-drawer sm:max-w-[min(20rem,85vw)]">
            <div className="flex h-full w-full flex-col border-l border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--surface-shadow-strong)]">
              {/* Drawer header */}
              <div className="flex h-14 items-center justify-between border-b border-[var(--border)] px-4 sm:h-16 sm:px-5">
                <BrandLogo compact />
                <button
                  className="tap-target rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] active:scale-95"
                  onClick={() => setDrawerOpen(false)}
                  aria-label={t("aria.closeMenu")}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer body */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
                <div className="space-y-1.5">
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

                      <div className="my-4 border-t border-[var(--border)]" />

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
                  <div className="mt-5 space-y-2.5">
                    <Link
                      href="/login"
                      onClick={() => setDrawerOpen(false)}
                      className="block"
                    >
                      <Button variant="outline" className="w-full">
                        {t("nav.logIn")}
                      </Button>
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setDrawerOpen(false)}
                      className="block"
                    >
                      <Button className="w-full">{t("nav.signUp")}</Button>
                    </Link>
                  </div>
                )}
              </div>

              {/* Drawer footer - avatar menu area */}
              {user && (
                <div className="safe-bottom border-t border-[var(--border)] px-4 py-4 sm:px-5">
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
      className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium tracking-[-0.01em] transition-all ${
        active
          ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[var(--surface-shadow)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
      }`}
    >
      <Icon className="h-4 w-4" />
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
      className={`flex min-h-11 items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-all active:bg-[var(--bg-surface)] ${
        active
          ? "border-[rgba(99,91,255,0.28)] bg-[rgba(99,91,255,0.08)] text-[var(--text-primary)]"
          : "border-transparent text-[var(--text-primary)] hover:border-[var(--border)] hover:bg-[var(--bg-surface)]"
      }`}
    >
      <Icon className={`h-5 w-5 ${active ? "text-indigo-400" : "text-[var(--text-secondary)]"}`} />
      {label}
    </Link>
  );
}
