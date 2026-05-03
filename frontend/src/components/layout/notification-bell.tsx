"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
};

type ListResponse = {
  items: Notification[];
  unreadCount: number;
};

// 60s feels live enough without burning rate limit. Bell also refetches on open.
const POLL_INTERVAL_MS = 60_000;

interface NotificationBellProps {
  variant: "navbar" | "appHeader";
}

export function NotificationBell({ variant }: NotificationBellProps) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=20", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      const data: ListResponse = await res.json();
      setItems(data.items ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch {
      // Silent — bell stays usable even when API hiccups.
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + polling.
  useEffect(() => {
    void fetchNotifications();
    const interval = setInterval(() => {
      void fetchNotifications();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Refetch when the dropdown opens — don't show stale data after a long idle.
  useEffect(() => {
    if (open) void fetchNotifications();
  }, [open, fetchNotifications]);

  // Click-outside + Escape to close.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((prev) => Math.max(0, prev - 1));
    try {
      await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Optimistic update; on failure we just lose the read state until next poll.
    }
  };

  const markAllRead = async () => {
    if (unread === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    try {
      await fetch("/api/notifications/read-all", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Same — optimistic.
    }
  };

  const handleItemClick = (n: Notification) => {
    if (!n.isRead) void markRead(n.id);
    if (n.link) setOpen(false);
  };

  // ── Trigger button ──────────────────────────────────────────
  const button =
    variant === "navbar" ? (
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/5 hover:text-white"
        aria-label={t("nav.notifications")}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--terra,#e26a3a)] px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("header.notifications")}
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          border: "1.5px solid var(--line)",
          background: open ? "var(--paper-3)" : "var(--paper-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "var(--ink-soft)",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <Bell size={16} />
        {unread > 0 ? (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              borderRadius: 999,
              background: "var(--terra)",
              border: "1.5px solid var(--paper)",
              color: "white",
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>
    );

  return (
    <div ref={containerRef} className="relative">
      {button}

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-[340px] overflow-hidden rounded-xl border border-[var(--line,#e5e5e5)] bg-[var(--paper,#fff)] shadow-lg"
        >
          <header className="flex items-center justify-between border-b border-[var(--line,#e5e5e5)] px-4 py-3">
            <span className="text-sm font-semibold text-[var(--ink,#222)]">
              {t("notifications.title")}
            </span>
            {unread > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--terra,#e26a3a)] hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {t("notifications.markAllRead")}
              </button>
            ) : null}
          </header>

          <div className="max-h-[400px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-[var(--ink-mute,#888)]">
                {loading ? t("notifications.loading") : t("notifications.empty")}
              </div>
            ) : (
              <ul className="divide-y divide-[var(--line,#eee)]">
                {items.map((n) => {
                  const content = (
                    <div
                      className={`flex gap-3 px-4 py-3 transition-colors hover:bg-[var(--paper-2,#fafafa)] ${
                        !n.isRead ? "bg-[var(--paper-2,#f5f5f5)]" : ""
                      }`}
                    >
                      <div className="mt-1 flex-shrink-0">
                        <span
                          className={`block h-2 w-2 rounded-full ${
                            !n.isRead ? "bg-[var(--terra,#e26a3a)]" : "bg-transparent"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--ink,#222)] line-clamp-2">
                          {n.title}
                        </p>
                        {n.body ? (
                          <p className="mt-0.5 text-xs text-[var(--ink-soft,#555)] line-clamp-2">
                            {n.body}
                          </p>
                        ) : null}
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-[var(--ink-mute,#999)]">
                          {formatRelativeTime(n.createdAt, locale)}
                        </p>
                      </div>
                      {!n.isRead ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void markRead(n.id);
                          }}
                          className="flex-shrink-0 self-start rounded p-1 text-[var(--ink-mute,#999)] hover:bg-[var(--paper-3,#eee)] hover:text-[var(--ink,#222)]"
                          aria-label={t("notifications.markRead")}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  );
                  return (
                    <li key={n.id}>
                      {n.link ? (
                        <Link
                          href={n.link}
                          onClick={() => handleItemClick(n)}
                          className="block"
                        >
                          {content}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleItemClick(n)}
                          className="block w-full text-left"
                        >
                          {content}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Tiny relative formatter — using Intl.RelativeTimeFormat for proper i18n.
function formatRelativeTime(iso: string, locale: string): string {
  try {
    const then = new Date(iso).getTime();
    const diffSec = Math.round((then - Date.now()) / 1000);
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    const abs = Math.abs(diffSec);
    if (abs < 60) return rtf.format(diffSec, "second");
    if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
    if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
    if (abs < 2592000) return rtf.format(Math.round(diffSec / 86400), "day");
    return new Date(iso).toLocaleDateString(locale);
  } catch {
    return iso;
  }
}
