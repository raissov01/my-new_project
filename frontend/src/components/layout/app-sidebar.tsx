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
  LogOut,
  Menu,
  X,
  HelpCircle,
  Gamepad2,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useLocale } from "@/components/providers/locale-provider";
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
  const { t } = useLocale();
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

  const studyItems: NavItem[] = user
    ? [
        { href: homeHref, label: t("nav.home"), icon: Home },
        { href: "/flashcards", label: t("nav.flashcards"), icon: LibraryBig },
        { href: "/learn/map", label: t("nav.learn"), icon: Gamepad2 },
        { href: "/listen", label: t("nav.listen"), icon: Headphones },
        { href: "/tutor", label: t("nav.tutor"), icon: BotMessageSquare },
        { href: "/ielts", label: t("nav.ieltsPrep"), icon: BookMarked },
        { href: "/ielts/dashboard", label: t("nav.progress") || "Прогресс", icon: TrendingUp },
        { href: "/ielts/study-plan", label: t("ielts.studyPlanTitle") || "Жоспар", icon: CalendarDays },
      ]
    : [
        { href: "/", label: t("nav.home"), icon: Home, exact: true },
        { href: "/ielts", label: t("nav.ieltsPrep"), icon: BookMarked },
        { href: "/flashcards", label: t("nav.flashcards"), icon: LibraryBig },
        { href: "/guide", label: t("nav.guide"), icon: HelpCircle },
      ];

  const accountItems: NavItem[] = user
    ? [
        { href: "/profile", label: t("nav.profile") || "Профиль", icon: User },
        { href: "/upgrade", label: "Pro", icon: Crown },
        { href: "/guide", label: t("nav.guide"), icon: HelpCircle },
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
        {/* Study group */}
        <div className="nd-sidebar-group">
          <span className="nd-sidebar-group-label">ОҚУ</span>
          {studyItems.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              pathname={pathname}
              onClick={onLinkClick}
            />
          ))}
        </div>

        {/* Account group — authenticated only */}
        {user && accountItems.length > 0 && (
          <div className="nd-sidebar-group">
            <span className="nd-sidebar-group-label">АККАУНТ</span>
            {accountItems.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                pathname={pathname}
                onClick={onLinkClick}
              />
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
