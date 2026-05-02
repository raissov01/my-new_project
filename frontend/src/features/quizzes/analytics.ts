"use client";

export type QuizUsageEventType =
  | "quiz_page_opened"
  | "quiz_started"
  | "question_answered"
  | "quiz_finished"
  | "quiz_abandoned"
  | "heartbeat";

type QuizUsageEventPayload = {
  quizId: string;
  eventType: QuizUsageEventType;
  attemptId?: string | null;
  questionId?: string | null;
  metadata?: Record<string, unknown> | null;
};

// localStorage key for the anonymous-but-persistent session ID. We keep the
// same storage as before so existing browsers' IDs migrate seamlessly into the
// new field name on the server side. (The value is identical; only the wire
// field renamed from `anonymousId` → `sessionId`.)
const SESSION_KEY = "quizizz_session_id";
const LEGACY_ANON_KEY = "quizizz_anon_id";

/**
 * Returns a stable anonymous session ID stored in localStorage. The value
 * persists across login/logout so the server-side dedup CTE can stitch a
 * user's anonymous events to their authenticated events later.
 *
 * Returns "" if localStorage is unavailable; the server will treat empty
 * session IDs as null.
 */
export function getOrCreateSessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    // Migrate the legacy quizizz_anon_id key if present so we don't lose
    // session continuity for users who already have analytics state.
    const legacy = localStorage.getItem(LEGACY_ANON_KEY);
    if (legacy) {
      localStorage.setItem(SESSION_KEY, legacy);
      return legacy;
    }
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return "";
  }
}

/**
 * Fire a Quizizz usage event. Best-effort: failures never throw and never
 * surface to the caller — analytics MUST NOT break the quiz flow.
 *
 * Convenience overloads cover the two call shapes the spec requests:
 *   trackQuizizzEvent(eventType, quizId, metadata?)        // positional
 *   trackQuizizzEvent({ eventType, quizId, ... })          // payload object
 */
export function trackQuizizzEvent(
  eventType: QuizUsageEventType,
  quizId: string,
  metadata?: Record<string, unknown> | null,
): void;
export function trackQuizizzEvent(payload: QuizUsageEventPayload): void;
export function trackQuizizzEvent(
  arg1: QuizUsageEventType | QuizUsageEventPayload,
  arg2?: string,
  arg3?: Record<string, unknown> | null,
): void {
  const payload: QuizUsageEventPayload =
    typeof arg1 === "string"
      ? { eventType: arg1, quizId: arg2 ?? "", metadata: arg3 ?? null }
      : arg1;

  if (!payload.quizId) return;

  const body = JSON.stringify({
    ...payload,
    sessionId: getOrCreateSessionId(),
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/quizizz/events", blob)) return;
    }
  } catch {
    // Fall back to fetch below.
  }

  void fetch("/api/quizizz/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

// Legacy alias — keeps existing callsites (e.g. quiz player page) compiling
// without touching them. New code should call `trackQuizizzEvent` directly.
export const trackQuizUsageEvent = (payload: QuizUsageEventPayload) =>
  trackQuizizzEvent(payload);
