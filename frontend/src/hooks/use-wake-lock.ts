"use client";

import { useEffect, useRef } from "react";

// Subset of the Screen Wake Lock API surface we use. Avoids depending on
// lib.dom updates that aren't yet shipped in every TS version.
type WakeLockSentinel = {
  released: boolean;
  release(): Promise<void>;
  addEventListener(type: "release", listener: () => void): void;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> };
};

// useScreenWakeLock keeps the device screen on while `active` is true.
// Re-acquires the lock automatically when the tab regains visibility,
// since browsers release the lock on tab hide. Silent on platforms that
// do not implement the API.
export function useScreenWakeLock(active: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active) return;
    if (typeof navigator === "undefined") return;
    const nav = navigator as WakeLockNavigator;
    if (!nav.wakeLock) return;

    let cancelled = false;

    async function acquire() {
      try {
        const sentinel = await nav.wakeLock!.request("screen");
        if (cancelled) {
          await sentinel.release();
          return;
        }
        sentinelRef.current = sentinel;
        sentinel.addEventListener("release", () => {
          if (sentinelRef.current === sentinel) {
            sentinelRef.current = null;
          }
        });
      } catch {
        // ignore — user may have denied or browser too aggressive
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && !sentinelRef.current) {
        void acquire();
      }
    }

    void acquire();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (sentinel && !sentinel.released) {
        void sentinel.release();
      }
    };
  }, [active]);
}
