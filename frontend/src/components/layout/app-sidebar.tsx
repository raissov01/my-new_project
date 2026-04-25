"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LibraryBig,
  BotMessageSquare,
  Headphones,
  BookMarked,
  CalendarDays,
  User,
  Crown,
  Settings,
  LogOut,
  Menu,
  X,
  HelpCircle,
  Gamepad2,
  TrendingUp,
  ListChecks,
  Newspaper,
  Pickaxe,
  MessageSquareText,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useLocale } from "@/components/providers/locale-provider";
import { useTheme } from "@/hooks/use-theme";
import { LOCALES } from "@/lib/shared/i18n";
import { logout } from "@/app/(auth)/actions";
import { BrandLogo } from "@/components/layout/brand-logo";
import { ProfileAvatar } from "@/features/profile/components/profile-avatar";

// ── Types ──────────────────────────────────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function isActivePath(pathname: string, href: string, exact = false): boolean {
  if (exact) return pathname === href;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// ── Sidebar nav link ───────────────────────────────────────────────────────────

function SidebarLink({
  item,
  pathname,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  onClick?: () => void;
}) {
  const active = isActivePath(pathname, item.href, item.exact);
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`nd-sidebar-link${active ? " active" : ""}`}
    >
      <item.icon />
      {item.label}
    </Link>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AppSidebar() {
  const { user } = useAuth();
  const { t, locale, setLocale } = useLocale();
  const { theme, toggle: toggleTheme, mounted: themeMounted } = useTheme();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const userMeta = user?.user_metadata as
    | { role?: string; username?: string; avatar_url?: string | null; full_name?: string }
    | undefined;
  const userRole = userMeta?.role;

  const homeHref = user
    ? userRole === "teacher"
      ? "/teacher/dashboard"
      : "/student/dashboard"
    : "/";

  const username =
    (userMeta?.username as string | undefined) ||
    (userMeta?.full_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "User";

  const avatarUrl = (userMeta?.avatar_url as string | null | undefined) ?? null;

  // ── Nav groups ─────────────────────────────────────────────────────────────

  const mainItems: NavItem[] = user
    ? [
        { href: homeHref, label: t("nav.home"), icon: Home },
        { href: "/ielts", label: t("nav.ieltsPrep"), icon: BookMarked },
        { href: "/flashcards", label: t("nav.flashcards"), icon: LibraryBig },
        { href: "/chat", label: t("nav.aiChat"), icon: MessageSquareText },
      ]
    : [
        { href: "/", label: t("nav.home"), icon: Home, exact: true },
        { href: "/ielts", label: t("nav.ieltsPrep"), icon: BookMarked },
        { href: "/flashcards", label: t("nav.flashcards"), icon: LibraryBig },
        { href: "/guide", label: t("nav.guide"), icon: HelpCircle },
      ];

  const toolItems: NavItem[] = user
    ? [
        { href: "/learn/map", label: t("nav.learn"), icon: Gamepad2 },
        { href: "/listen", label: t("nav.listen"), icon: Headphones },
        { href: "/tutor", label: t("nav.tutor"), icon: BotMessageSquare },
        { href: "/quizzes", label: t("nav.quizzes"), icon: ListChecks },
        { href: "/daily-news", label: t("nav.dailyNews"), icon: Newspaper },
        { href: "/mining", label: t("nav.mining"), icon: Pickaxe },
      ]
    : [];

  const progressItems: NavItem[] = user
    ? [
        { href: "/ielts/dashboard", label: t("nav.progress"), icon: TrendingUp },
        { href: "/ielts/study-plan", label: t("ielts.studyPlanTitle"), icon: CalendarDays },
      ]
    : [];

  const accountItems: NavItem[] = user
    ? [
        { href: "/profile", label: t("nav.profile") || "Профиль", icon: User },
        { href: "/settings", label: t("nav.settings") || "Баптаулар", icon: Settings },
        { href: "/upgrade", label: "Pro", icon: Crown },
        { href: "/guide", label: t("nav.guide"), icon: HelpCircle },
        { href: "/about", label: t("nav.about") || "Біз туралы", icon: HelpCircle },
        { href: "/blog", label: t("nav.blog") || "Блог", icon: Newspaper },
        { href: "/contact", label: t("nav.contact") || "Байланыс", icon: MessageSquareText },
      ]
    : [];

  // ── Body scroll lock when drawer open ─────────────────────────────────────

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [drawerOpen]);

  // ── Sidebar content (shared between desktop aside + mobile drawer) ─────────

  const SidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <>
      <nav className="nd-sidebar-nav">
        {/* Main group */}
        <div className="nd-sidebar-group">
          <span className="nd-sidebar-group-label">{t("nav.groupMain") || "НЕГІЗГІ"}</span>
          {mainItems.map((item) => (
            <SidebarLink key={item.href} item={item} pathname={pathname} onClick={onLinkClick} />
          ))}
        </div>

        {/* Tools group — authenticated only */}
        {user && toolItems.length > 0 && (
          <div className="nd-sidebar-group">
            <span className="nd-sidebar-group-label">{t("nav.groupTools") || "ҚҰРАЛДАР"}</span>
            {toolItems.map((item) => (
              <SidebarLink key={item.href} item={item} pathname={pathname} onClick={onLinkClick} />
            ))}
          </div>
        )}

        {/* Progress group — authenticated only */}
        {user && progressItems.length > 0 && (
          <div className="nd-sidebar-group">
            <span className="nd-sidebar-group-label">{t("nav.groupProgress") || "ПРОГРЕСС"}</span>
            {progressItems.map((item) => (
              <SidebarLink key={item.href} item={item} pathname={pathname} onClick={onLinkClick} />
            ))}
          </div>
        )}

        {/* Account group — authenticated only */}
        {user && accountItems.length > 0 && (
          <div className="nd-sidebar-group">
            <span className="nd-sidebar-group-label">{t("nav.groupAccount") || "АККАУНТ"}</span>
            {accountItems.map((item) => (
              <SidebarLink key={item.href} item={item} pathname={pathname} onClick={onLinkClick} />
            ))}
          </div>
        )}

        {/* Guest auth links */}
        {!user && (
          <div className="nd-sidebar-group">
            <span className="nd-sidebar-group-label">КІРУ</span>
            <Link
              href="/login"
              onClick={onLinkClick}
              className="nd-sidebar-link"
            >
              {t("nav.logIn")}
            </Link>
            <Link
              href="/signup"
              onClick={onLinkClick}
              className="nd-sidebar-link"
            >
              {t("nav.signUp")}
            </Link>
          </div>
        )}
      </nav>

      {/* Theme + Language row */}
      <div className="flex items-center gap-1 px-3 py-2 border-t" style={{ borderColor: "var(--line)" }}>
        {/* Lang buttons */}
        <div className="flex gap-0.5">
          {LOCALES.map((code) => (
            <button
              key={code}
              onClick={() => setLocale(code)}
              className={`rounded-md px-2 py-1 text-[11px] font-bold transition-colors ${
                locale === code
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)]"
              }`}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
        {/* Theme toggle */}
        {themeMounted && (
          <button
            onClick={toggleTheme}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-[var(--ink-soft)] transition-colors hover:bg-[var(--paper-2)] hover:text-[var(--ink)]"
            aria-label={theme === "dark" ? t("theme.switchToLight") : t("theme.switchToDark")}
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        )}
      </div>

      {/* Footer — user info + logout */}
      {user && (
        <div className="nd-sidebar-footer">
          <ProfileAvatar
            username={username}
            avatarUrl={avatarUrl}
            size="xs"
          />
          <div className="nd-sidebar-footer-info">
            <div className="nd-sidebar-footer-name">{username}</div>
            <div className="nd-sidebar-footer-role">
              {userRole ?? "student"}
            </div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="nd-sidebar-logout"
              title={t("nav.logOut") || "Шығу"}
            >
              <LogOut size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* ── Desktop sidebar (lg+) ──────────────────────────────────────────── */}
      <aside className="nd-sidebar">
        <div className="nd-sidebar-logo">
          <BrandLogo compact />
        </div>
        <SidebarContent />
      </aside>

      {/* ── Mobile top bar (< lg) ─────────────────────────────────────────── */}
      <div className="nd-sidebar-topbar lg:hidden">
        <BrandLogo compact />
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--paper-2)]"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={20} style={{ color: "var(--ink)" }} />
        </button>
      </div>

      {/* ── Mobile drawer backdrop ─────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* ── Mobile drawer panel ────────────────────────────────────────────── */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 flex w-[220px] flex-col
          border-r transition-transform duration-300 ease-out lg:hidden
          ${drawerOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{
          background: "var(--paper)",
          borderColor: "var(--line)",
        }}
      >
        {/* Drawer header */}
        <div
          className="flex h-[54px] shrink-0 items-center justify-between border-b px-4"
          style={{ borderColor: "var(--line)" }}
        >
          <BrandLogo compact />
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--paper-2)]"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} style={{ color: "var(--ink-soft)" }} />
          </button>
        </div>

        {/* Drawer body — reuse same content */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          <SidebarContent onLinkClick={() => setDrawerOpen(false)} />
        </div>
      </div>
    </>
  );
}
