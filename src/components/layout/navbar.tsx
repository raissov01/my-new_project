"use client";

import Link from "next/link";
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
} from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { AvatarMenu } from "@/components/layout/avatar-menu";
import { BrandLogo } from "@/components/layout";
import { DEV_MODE } from "@/lib/dev-mode";

export function Navbar() {
  const { user, loading } = useAuth();
  const { t } = useLocale();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const homeHref = user ? "/dashboard" : "/";

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
      <nav className="sticky top-0 z-40 glass border-b border-[var(--glass-border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between sm:h-16">
            {/* Logo + nav links */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href={homeHref}
            className="flex items-center gap-2 text-lg font-bold sm:text-xl"
          >
            <BrandLogo compact />
          </Link>
              <Link
                href={homeHref}
                className="hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3.5 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] sm:inline-flex"
              >
                <Home className="h-4 w-4" />
                {t("nav.home")}
              </Link>
              {user && (
                <Link
                  href="/guide"
                  className="hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3.5 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] sm:inline-flex"
                >
                  <HelpCircle className="h-4 w-4" />
                  {t("nav.guide")}
                </Link>
              )}
              {DEV_MODE && (
                <span className="rounded-full bg-gradient-to-r from-amber-400/20 to-orange-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 sm:px-2.5 sm:text-[11px]">
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
                    href="/dashboard#study-today"
                    className="click-scale inline-flex h-10 items-center rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 text-sm font-medium text-[var(--text-primary)] transition-all hover:bg-[var(--bg-surface)]"
                  >
                    <GraduationCap className="mr-1.5 h-4 w-4" />
                    {t("nav.startStudy")}
                  </Link>
                  <Link
                    href="/sets/new"
                    className="click-scale inline-flex h-10 items-center rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 text-sm font-medium text-white shadow-sm shadow-blue-500/20 transition-all hover:shadow-md hover:shadow-blue-500/25"
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
                      <Link
                        href="/login"
                        className="click-scale rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-surface)]"
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
                className="rounded-xl p-2.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface)] active:scale-95"
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
          <div className="absolute inset-y-0 right-0 flex w-full max-w-[min(20rem,85vw)] animate-slide-in-drawer">
            <div className="flex h-full w-full flex-col bg-[var(--bg-elevated)] shadow-2xl">
              {/* Drawer header */}
              <div className="flex h-14 items-center justify-between border-b border-[var(--border)] px-4 sm:h-16 sm:px-5">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {t("nav.toggleMenu")}
                </span>
                <button
                  className="rounded-xl p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface)] active:scale-95"
                  onClick={() => setDrawerOpen(false)}
                  aria-label={t("aria.closeMenu")}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer body */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
                <div className="space-y-1">
                  <DrawerLink
                    href={homeHref}
                    icon={Home}
                    label={t("nav.home")}
                    onClick={() => setDrawerOpen(false)}
                  />
                  {user && (
                    <>
                      <DrawerLink
                        href="/dashboard#study-today"
                        icon={GraduationCap}
                        label={t("nav.startStudy")}
                        onClick={() => setDrawerOpen(false)}
                      />
                      <DrawerLink
                        href="/sets/new"
                        icon={Plus}
                        label={t("nav.newSet")}
                        onClick={() => setDrawerOpen(false)}
                      />
                      <DrawerLink
                        href="/guide"
                        icon={HelpCircle}
                        label={t("nav.guide")}
                        onClick={() => setDrawerOpen(false)}
                      />

                      <div className="my-3 border-t border-[var(--border)]" />

                      <DrawerLink
                        href="/profile"
                        icon={UserCircle2}
                        label={t("nav.profile")}
                        onClick={() => setDrawerOpen(false)}
                      />
                      <DrawerLink
                        href="/settings"
                        icon={Settings}
                        label={t("nav.settings")}
                        onClick={() => setDrawerOpen(false)}
                      />
                    </>
                  )}
                </div>

                {!user && !DEV_MODE && (
                  <div className="mt-4 space-y-2">
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
                <div className="border-t border-[var(--border)] px-4 py-4 sm:px-5">
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

function DrawerLink({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  icon: typeof Home;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-surface)] active:bg-[var(--bg-surface)]"
    >
      <Icon className="h-5 w-5 text-[var(--text-secondary)]" />
      {label}
    </Link>
  );
}
