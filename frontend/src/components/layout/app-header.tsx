"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useLocale } from "@/components/providers/locale-provider";
import { AvatarMenu } from "@/components/layout/avatar-menu";
import { NotificationBell } from "@/components/layout/notification-bell";

export function AppHeader() {
  const { user } = useAuth();
  const { t } = useLocale();

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        height: 60,
        background: "var(--paper)",
        borderBottom: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 20px",
      }}
    >
      {/* Search bar */}
      <div
        style={{
          flex: 1,
          maxWidth: 360,
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "var(--paper-2)",
          border: "1.5px solid var(--line)",
          borderRadius: 10,
          padding: "0 12px",
          height: 36,
          cursor: "text",
        }}
      >
        <Search size={14} style={{ color: "var(--ink-mute)", flexShrink: 0 }} />
        <span style={{ fontSize: 13.5, color: "var(--ink-mute)", flex: 1 }}>{t("header.search")}</span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: "var(--ink-mute)",
            background: "var(--paper-3)",
            border: "1px solid var(--line-strong)",
            borderRadius: 5,
            padding: "2px 5px",
            letterSpacing: ".06em",
            flexShrink: 0,
          }}
        >
          ⌘K
        </span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Notification bell */}
      {user ? <NotificationBell variant="appHeader" /> : null}

      {/* Account menu — opens dropdown with profile, settings, theme, language, logout */}
      {user ? (
        <div style={{ flexShrink: 0 }}>
          <AvatarMenu />
        </div>
      ) : (
        <Link
          href="/login"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--terra)",
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          {t("nav.logIn")}
        </Link>
      )}
    </header>
  );
}
