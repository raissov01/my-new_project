"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Activity,
  ListChecks,
  Users,
  ClipboardCheck,
  ScrollText,
  HeartPulse,
  Gauge,
  ArrowLeft,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { logout } from "@/app/(auth)/actions";
import { ProfileAvatar } from "@/features/profile/components/profile-avatar";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
};

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarLink({
  item,
  pathname,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  onClick?: () => void;
}) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`nd-sidebar-link${active ? " active" : ""}`}
    >
      <item.icon />
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge && (
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: ".06em",
            padding: "2px 6px",
            borderRadius: 999,
            background: "var(--paper-3)",
            color: "var(--ink-mute)",
            textTransform: "uppercase",
          }}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function AdminSidebar() {
  const { user } = useAuth();
  const { theme: _theme } = useTheme();
  void _theme;
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const userMeta = user?.user_metadata as
    | { username?: string; avatar_url?: string | null; full_name?: string }
    | undefined;

  const username =
    (userMeta?.username as string | undefined) ||
    (userMeta?.full_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Admin";

  const avatarUrl = (userMeta?.avatar_url as string | null | undefined) ?? null;

  const overviewItems: NavItem[] = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/live", label: "Live activity", icon: Activity },
    { href: "/admin/system", label: "System", icon: HeartPulse },
    { href: "/admin/api-metrics", label: "API metrics", icon: Gauge },
  ];

  const manageItems: NavItem[] = [
    { href: "/admin/quizzes", label: "Quizzes", icon: ListChecks },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/review-questions", label: "Review queue", icon: ClipboardCheck },
    { href: "/admin/audit-log", label: "Audit log", icon: ScrollText },
  ];

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

  const SidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <>
      <nav className="nd-sidebar-nav">
        <div className="nd-sidebar-group">
          <span className="nd-sidebar-group-label">OVERVIEW</span>
          {overviewItems.map((item) => (
            <SidebarLink key={item.href} item={item} pathname={pathname} onClick={onLinkClick} />
          ))}
        </div>

        <div className="nd-sidebar-group">
          <span className="nd-sidebar-group-label">MANAGE</span>
          {manageItems.map((item) => (
            <SidebarLink key={item.href} item={item} pathname={pathname} onClick={onLinkClick} />
          ))}
        </div>

        <div className="nd-sidebar-group">
          <Link
            href="/quizzes"
            onClick={onLinkClick}
            className="nd-sidebar-link"
          >
            <ArrowLeft />
            Back to app
          </Link>
        </div>
      </nav>

      {user && (
        <div className="nd-sidebar-footer">
          <ProfileAvatar username={username} avatarUrl={avatarUrl} size="xs" />
          <div className="nd-sidebar-footer-info">
            <div className="nd-sidebar-footer-name">{username}</div>
            <div className="nd-sidebar-footer-role">superadmin</div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="nd-sidebar-logout"
              title="Log out"
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
      <aside className="nd-sidebar">
        <div className="nd-sidebar-logo">
          <Link
            href="/admin/dashboard"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              color: "var(--ink)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                padding: "3px 7px",
                borderRadius: 6,
                background: "var(--terra)",
                color: "#fff",
                letterSpacing: ".08em",
              }}
            >
              ADMIN
            </span>
            <span style={{ fontSize: 14 }}>StudyWithRaissov</span>
          </Link>
        </div>
        <SidebarContent />
      </aside>

      <div className="nd-sidebar-topbar lg:hidden">
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            padding: "3px 7px",
            borderRadius: 6,
            background: "var(--terra)",
            color: "#fff",
            letterSpacing: ".08em",
          }}
        >
          ADMIN
        </span>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--paper-2)]"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={20} style={{ color: "var(--ink)" }} />
        </button>
      </div>

      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

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
        <div
          className="flex h-[54px] shrink-0 items-center justify-between border-b px-4"
          style={{ borderColor: "var(--line)" }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              padding: "3px 7px",
              borderRadius: 6,
              background: "var(--terra)",
              color: "#fff",
              letterSpacing: ".08em",
            }}
          >
            ADMIN
          </span>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--paper-2)]"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} style={{ color: "var(--ink-soft)" }} />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto">
          <SidebarContent onLinkClick={() => setDrawerOpen(false)} />
        </div>
      </div>
    </>
  );
}
