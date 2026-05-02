"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Activity,
  CheckCircle2,
  Eye,
  PlayCircle,
  XCircle,
  HelpCircle,
  RotateCw,
  Pause,
  Play,
  Wifi,
  WifiOff,
} from "lucide-react";

interface LiveEvent {
  id: string;
  event_type: string;
  created_at: string;
  session_id: string | null;
  user_id: string | null;
  username: string | null;
  email: string | null;
  quiz_id: string | null;
  quiz_title: string | null;
  ip_address: string | null;
}

type WSMessage =
  | { type: "hello"; sent_at: string }
  | { type: "ping"; sent_at: string }
  | { type: "event"; event: LiveEvent };

const MAX_EVENTS = 200;
const RANGES = [5, 15, 30, 60] as const;

const EVENT_META: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  quiz_page_opened: {
    label: "Opened",
    icon: Eye,
    color: "#6366f1",
    bg: "rgba(99,102,241,0.10)",
  },
  quiz_started: {
    label: "Started",
    icon: PlayCircle,
    color: "#10b981",
    bg: "rgba(16,185,129,0.10)",
  },
  question_answered: {
    label: "Answered",
    icon: CheckCircle2,
    color: "#0ea5e9",
    bg: "rgba(14,165,233,0.10)",
  },
  quiz_finished: {
    label: "Finished",
    icon: CheckCircle2,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.10)",
  },
  quiz_abandoned: {
    label: "Abandoned",
    icon: XCircle,
    color: "#ef4444",
    bg: "rgba(239,68,68,0.10)",
  },
};

function fallbackMeta(type: string) {
  return { label: type, icon: HelpCircle, color: "#6b7280", bg: "rgba(107,114,128,0.10)" };
}

function relativeTime(iso: string, now: number): string {
  const t = new Date(iso).getTime();
  const diff = Math.max(0, Math.floor((now - t) / 1000));
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ${diff % 60}s ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
}

function actorLabel(e: LiveEvent): { label: string; isGuest: boolean } {
  if (e.username) return { label: e.username, isGuest: false };
  if (e.email) return { label: e.email, isGuest: false };
  if (e.session_id) return { label: `guest · ${e.session_id.slice(0, 8)}`, isGuest: true };
  return { label: "anonymous", isGuest: true };
}

type ConnState = "connecting" | "open" | "closed";

export function LiveFeedClient() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [minutes, setMinutes] = useState<(typeof RANGES)[number]>(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [connState, setConnState] = useState<ConnState>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  // Initial backfill via the polling endpoint — gives us events from
  // before we connected. After this, the WebSocket pushes live updates.
  const fetchInitial = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/quizizz/analytics/live?minutes=${minutes}&limit=200`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as LiveEvent[];
      setEvents(data ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [minutes]);

  // Cutoff for trimming events older than the selected range. Recomputed
  // on each render so the moving window keeps tightening as time passes.
  const cutoffMs = now - minutes * 60_000;

  // WebSocket lifecycle: connect once, reconnect with backoff on close.
  useEffect(() => {
    if (paused) return;

    let attempt = 0;
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${proto}//${window.location.host}/api/v1/admin/live-ws`;
      setConnState("connecting");

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        attempt = 0;
        setConnState("open");
      };

      ws.onmessage = (msg) => {
        let parsed: WSMessage;
        try {
          parsed = JSON.parse(msg.data) as WSMessage;
        } catch {
          return;
        }
        if (parsed.type === "event") {
          setEvents((prev) => {
            // De-dupe (the same event ID could arrive via the initial
            // backfill and also via the WS race window).
            if (prev.some((e) => e.id === parsed.event.id)) return prev;
            return [parsed.event, ...prev].slice(0, MAX_EVENTS);
          });
        }
      };

      ws.onerror = () => {
        // Don't surface an error toast; onclose will run and trigger a reconnect.
      };

      ws.onclose = () => {
        wsRef.current = null;
        setConnState("closed");
        if (cancelled) return;
        // Exponential backoff: 1s, 2s, 4s, 8s … capped at 15s.
        const delay = Math.min(1000 * 2 ** attempt, 15_000);
        attempt += 1;
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      };
    }

    fetchInitial();
    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current != null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [paused, fetchInitial]);

  // Tick the clock so relative times update and the cutoff slides.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const visibleEvents = events.filter(
    (e) => new Date(e.created_at).getTime() >= cutoffMs,
  );
  const guestCount = visibleEvents.filter((e) => !e.user_id).length;
  const userCount = visibleEvents.length - guestCount;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <nav className="flex gap-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-1">
          {RANGES.map((r) => {
            const active = r === minutes;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setMinutes(r)}
                className={
                  "rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold transition-colors " +
                  (active
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]")
                }
                aria-pressed={active}
              >
                {r}m
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <ConnectionBadge state={connState} paused={paused} />
          <span className="tabular-nums">
            {visibleEvents.length} events · {userCount} signed-in · {guestCount} guest
          </span>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="ml-2 inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-soft)]"
            aria-pressed={paused}
          >
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            onClick={fetchInitial}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-soft)]"
            title="Re-fetch the last N minutes from the database"
          >
            <RotateCw className={"h-3.5 w-3.5 " + (loading ? "animate-spin" : "")} />
            Backfill
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-[var(--radius-md)] border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && visibleEvents.length === 0 && !error && (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-10 text-center">
          <Activity className="mx-auto h-8 w-8 text-[var(--text-secondary)]" />
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            No events in the last {minutes} minutes.
          </p>
        </div>
      )}

      {visibleEvents.length > 0 && (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)]">
          <ul className="divide-y divide-[var(--border)]">
            {visibleEvents.map((e) => {
              const meta = EVENT_META[e.event_type] ?? fallbackMeta(e.event_type);
              const Icon = meta.icon;
              const actor = actorLabel(e);
              return (
                <li
                  key={e.id}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--bg-soft)]"
                >
                  <span
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    style={{ background: meta.bg, color: meta.color }}
                    aria-hidden="true"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    {meta.label}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[var(--text-primary)]">
                    <span className="font-medium">{actor.label}</span>
                    {actor.isGuest && (
                      <span className="ml-1.5 rounded-full bg-[var(--bg-soft)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                        guest
                      </span>
                    )}
                    {e.quiz_title && (
                      <span className="text-[var(--text-secondary)]">
                        {" "}
                        on{" "}
                        <span className="text-[var(--text-primary)]">{e.quiz_title}</span>
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-[var(--text-secondary)]">
                    {relativeTime(e.created_at, now)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function ConnectionBadge({ state, paused }: { state: ConnState; paused: boolean }) {
  if (paused) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        paused
      </span>
    );
  }
  if (state === "open") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </span>
        <Wifi className="h-2.5 w-2.5" />
        live
      </span>
    );
  }
  if (state === "connecting") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
        <Wifi className="h-2.5 w-2.5" />
        connecting…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
      <WifiOff className="h-2.5 w-2.5" />
      offline · retrying
    </span>
  );
}
