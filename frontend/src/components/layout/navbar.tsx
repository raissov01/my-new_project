"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Plus,
  Menu,
  X,
  Ghost,
  HelpCircle,
  LibraryBig,
  BookMarked,
  MessageSquareText,
  Gamepad2,
  ListChecks,
  Headphones,
  BotMessageSquare,
  Newspaper,
  Pickaxe,
  ChevronDown,
} from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useGhostMode } from "@/features/auth/hooks/use-ghost-mode";
import { Button } from "@/components/ui/button";
import { AvatarMenu } from "@/components/layout/avatar-menu";
import { BrandLogo } from "@/components/layout";
import { DEV_MODE } from "@/lib/shared/auth/dev-mode";
import { StreakBadge } from "@/components/gamification/StreakBadge";

// ── Types ─────────────────────────────────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function isActivePath(pathname: string, href: string, exact = false): boolean {
  if (exact) return pathname === href;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// ── Desktop primary nav link ──────────────────────────────────────────────────

function PrimaryLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActivePath(pathname, item.href, item.exact);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`
        relative flex h-14 items-center gap-1.5 px-3 text-sm font-medium
        transition-colors duration-200
        ${active
          ? "text-white after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[2px] after:rounded-full after:bg-[#5533ff] after:content-['']"
          : "text-white/60 hover:text-white hover:bg-white/5 rounded-md"
        }
      `}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  );
}

// ── Tools dropdown ────────────────────────────────────────────────────────────

function ToolsDropdown({ items, pathname }: { items: NavItem[]; pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAnyActive = items.some((i) => isActivePath(pathname, i.href, i.exact));

  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  // click outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => { cancelClose(); setOpen(true); }}
      onMouseLeave={scheduleClose}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className={`
          relative flex h-14 items-center gap-1 px-3 text-sm font-medium
          transition-colors duration-200 select-none
          ${isAnyActive
            ? "text-white after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[2px] after:rounded-full after:bg-[#5533ff] after:content-['']"
            : "text-white/60 hover:text-white hover:bg-white/5 rounded-md"
          }
        `}
      >
        Құралдар
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown panel */}
      <div
        className={`
          absolute left-0 top-full z-50 mt-1 w-52 origin-top-left
          rounded-xl border border-[#2a1a5e] bg-[#0f0f1e]
          shadow-[0_8px_32px_rgba(85,51,255,0.15)]
          transition-all duration-200
          ${open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"}
        `}
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
      >
        <div className="p-1.5">
          {items.map((item) => {
            const active = isActivePath(pathname, item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`
                  flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium
                  transition-colors duration-200
                  ${active
                    ? "bg-[#5533ff]/20 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                  }
                `}
              >
                <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-[#7c5cfc]" : ""}`} />
                {item.label}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#5533ff]" />}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Drawer link ───────────────────────────────────────────────────────────────

function DrawerLink({ item, pathname, onClick }: { item: NavItem; pathname: string; onClick: () => void }) {
  const active = isActivePath(pathname, item.href, item.exact);
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`
        flex min-h-[46px] items-center gap-3 rounded-xl px-4 py-2.5
        text-sm font-medium transition-colors duration-200
        ${active
          ? "bg-[#5533ff]/20 text-white"
          : "text-white/70 hover:bg-white/5 hover:text-white"
        }
      `}
    >
      <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-[#7c5cfc]" : "text-white/40"}`} />
      {item.label}
      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#5533ff]" />}
    </Link>
  );
}

// ── Main Navbar ───────────────────────────────────────────────────────────────

export function Navbar() {
  const { user, loading } = useAuth();
  const { t } = useLocale();
  const { isGhost, enableGhostMode } = useGhostMode();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const userRole = (user as { user_metadata?: { role?: string } } | null)?.user_metadata?.role;
  const homeHref = user
    ? userRole === "teacher"
      ? "/teacher/dashboard"
      : "/student/dashboard"
    : "/";

  // ── Nav item definitions ────────────────────────────────────────────────

  const primaryItems: NavItem[] = user
    ? [
        { href: homeHref, label: t("nav.home"), icon: Home, exact: false },
        { href: "/learn/map", label: t("nav.learn"), icon: Gamepad2, exact: false },
        { href: "/listen", label: t("nav.listen"), icon: Headphones, exact: false },
        { href: "/tutor", label: t("nav.tutor"), icon: BotMessageSquare, exact: false },
        { href: "/flashcards", label: t("nav.flashcards"), icon: LibraryBig, exact: false },
      ]
    : [
        { href: "/", label: t("nav.home"), icon: Home, exact: true },
        { href: "/ielts", label: t("nav.ieltsPrep"), icon: BookMarked, exact: false },
        { href: "/flashcards", label: t("nav.flashcards"), icon: LibraryBig, exact: false },
      ];

  const toolsItems: NavItem[] = [
    { href: "/quizzes", label: t("nav.quizzes"), icon: ListChecks, exact: false },
    { href: "/chat", label: t("nav.aiChat"), icon: MessageSquareText, exact: false },
    { href: "/daily-news", label: t("nav.dailyNews"), icon: Newspaper, exact: false },
    { href: "/mining", label: t("nav.mining"), icon: Pickaxe, exact: false },
  ];

  // All items for the mobile drawer (flat list with divider between groups)
  const allDrawerItems = user
    ? [...primaryItems, ...toolsItems, { href: "/guide", label: t("nav.guide"), icon: HelpCircle, exact: true }]
    : [...primaryItems, { href: "/guide", label: t("nav.guide"), icon: HelpCircle, exact: true }];

  // ── Body scroll lock ────────────────────────────────────────────────────

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerOpen(false); };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [drawerOpen]);

  return (
    <>
      {/* ── Nav bar ──────────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-40 border-b border-white/[0.06]"
        style={{
          background: "#0a0a18",
          // force CSS vars so BrandLogo + any var(--text-*) renders white inside the dark nav
          ["--text-primary" as string]: "#ffffff",
          ["--text-secondary" as string]: "rgba(255,255,255,0.6)",
        }}
      >
        <div className="page-shell">
          <div className="flex h-14 items-center gap-1">

            {/* Logo */}
            <Link href={homeHref} className="mr-3 shrink-0">
              <BrandLogo compact className="[&_p]:text-white" />
            </Link>

            {/* Primary links — desktop */}
            <div className="hidden items-center xl:flex">
              {primaryItems.map((item) => (
                <PrimaryLink key={item.href} item={item} pathname={pathname} />
              ))}
              {/* Tools dropdown — only for authenticated users */}
              {user && <ToolsDropdown items={toolsItems} pathname={pathname} />}
            </div>

            {DEV_MODE && (
              <span className="ml-2 hidden rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[#7c5cfc] ring-1 ring-[#7c5cfc]/30 xl:inline">
                Dev
              </span>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Right side — desktop */}
            <div className="hidden items-center gap-1 lg:flex">
              {/* IELTS secondary link — authenticated only */}
              {user && (
                <Link
                  href="/ielts"
                  className={`flex h-14 items-center gap-1.5 px-3 text-sm font-medium transition-colors duration-200
                    ${isActivePath(pathname, "/ielts", false)
                      ? "text-white"
                      : "text-white/60 hover:text-white"
                    }`}
                >
                  <BookMarked className="h-4 w-4" />
                  <span className="hidden xl:inline">{t("nav.ieltsPrep")}</span>
                </Link>
              )}
              {/* Guide link */}
              <Link
                href="/guide"
                className={`flex h-14 items-center gap-1.5 px-3 text-sm font-medium transition-colors duration-200
                  ${isActivePath(pathname, "/guide", true)
                    ? "text-white"
                    : "text-white/60 hover:text-white"
                  }`}
              >
                <HelpCircle className="h-4 w-4" />
                <span className="hidden xl:inline">{t("nav.guide")}</span>
              </Link>

              {loading ? (
                <>
                  <div className="h-8 w-24 animate-pulse rounded-lg bg-white/5" />
                  <div className="h-8 w-8 animate-pulse rounded-full bg-white/5" />
                </>
              ) : user ? (
                <>
                  {(user as { streakDays?: number }).streakDays !== undefined && (
                    <StreakBadge streak={(user as { streakDays?: number }).streakDays ?? 0} />
                  )}
                  {(() => {
                    const isIelts = pathname.startsWith("/ielts");
                    const ctaHref = isIelts ? "/ielts/simulator" : "/sets/new";
                    const ctaLabel = isIelts ? t("nav.newMock") : t("nav.newSet");
                    return (
                      <Link href={ctaHref}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {ctaLabel}
                        </Button>
                      </Link>
                    );
                  })()}
                  <AvatarMenu />
                </>
              ) : !DEV_MODE ? (
                <>
                  {!isGhost && (
                    <button
                      onClick={enableGhostMode}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-white/50 transition-colors hover:bg-white/5 hover:text-white/80"
                    >
                      <Ghost className="h-4 w-4" />
                      {t("ghost.browseAsGuest")}
                    </button>
                  )}
                  <Link
                    href="/login"
                    className="rounded-lg px-3 py-1.5 text-sm text-white/60 transition-colors hover:text-white"
                  >
                    {t("nav.logIn")}
                  </Link>
                  <Link href="/signup">
                    <Button
                      size="sm"
                      className="bg-[#5533ff] text-white hover:bg-[#4422ee]"
                    >
                      {t("nav.signUp")}
                    </Button>
                  </Link>
                </>
              ) : null}
            </div>

            {/* Mobile hamburger */}
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/5 hover:text-white lg:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-label={t("nav.toggleMenu")}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile drawer ────────────────────────────────────────────────── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden
          ${drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`
          fixed inset-y-0 right-0 z-50 flex w-full max-w-[min(20rem,90vw)] flex-col
          border-l border-white/[0.06] lg:hidden
          transition-transform duration-300 ease-out
          ${drawerOpen ? "translate-x-0" : "translate-x-full"}
        `}
        style={{
          background: "#0a0a18",
          ["--text-primary" as string]: "#ffffff",
          ["--text-secondary" as string]: "rgba(255,255,255,0.6)",
        }}
      >
        {/* Drawer header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] px-4">
          <BrandLogo compact className="[&_p]:text-white" />
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/5 hover:text-white"
            onClick={() => setDrawerOpen(false)}
            aria-label={t("aria.closeMenu")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          {/* Primary group */}
          <div className="space-y-0.5">
            {primaryItems.map((item) => (
              <DrawerLink
                key={item.href}
                item={item}
                pathname={pathname}
                onClick={() => setDrawerOpen(false)}
              />
            ))}
          </div>

          {/* Tools group */}
          {user && toolsItems.length > 0 && (
            <>
              <div className="my-3 flex items-center gap-2">
                <div className="h-px flex-1 bg-white/[0.06]" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-white/25">
                  Құралдар
                </span>
                <div className="h-px flex-1 bg-white/[0.06]" />
              </div>
              <div className="space-y-0.5">
                {toolsItems.map((item) => (
                  <DrawerLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    onClick={() => setDrawerOpen(false)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Bottom group */}
          <div className="my-3 h-px bg-white/[0.06]" />
          <div className="space-y-0.5">
            <DrawerLink
              item={{ href: "/guide", label: t("nav.guide"), icon: HelpCircle, exact: true }}
              pathname={pathname}
              onClick={() => setDrawerOpen(false)}
            />
            {user && (
              <DrawerLink
                item={{ href: "/sets/new", label: t("nav.newSet"), icon: Plus, exact: true }}
                pathname={pathname}
                onClick={() => setDrawerOpen(false)}
              />
            )}
          </div>

          {/* Auth buttons for guests */}
          {!user && !DEV_MODE && (
            <div className="mt-4 space-y-2 px-1">
              {!isGhost && (
                <Button
                  variant="ghost"
                  className="w-full gap-2 text-white/60 hover:bg-white/5 hover:text-white"
                  onClick={() => { enableGhostMode(); setDrawerOpen(false); }}
                >
                  <Ghost className="h-4 w-4" />
                  {t("ghost.browseAsGuest")}
                </Button>
              )}
              <Link href="/login" onClick={() => setDrawerOpen(false)} className="block">
                <Button variant="outline" className="w-full border-white/10 text-white/80 hover:bg-white/5">
                  {t("nav.logIn")}
                </Button>
              </Link>
              <Link href="/signup" onClick={() => setDrawerOpen(false)} className="block">
                <Button className="w-full bg-[#5533ff] hover:bg-[#4422ee] text-white">
                  {t("nav.signUp")}
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Drawer footer — avatar */}
        {user && (
          <div className="safe-bottom shrink-0 border-t border-white/[0.06] px-4 py-3">
            <AvatarMenu />
          </div>
        )}
      </div>
    </>
  );
}
