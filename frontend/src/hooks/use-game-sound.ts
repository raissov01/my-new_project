"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Sound key → file under /public/sounds/<file>.
// Missing files degrade silently (the play() catches the 404).
export type GameSound =
  | "lobby"
  | "ticktock"
  | "correct"
  | "wrong"
  | "streak"
  | "complete";

const SOURCES: Record<GameSound, string> = {
  lobby: "/sounds/lobby-loop.mp3",
  ticktock: "/sounds/ticktock.mp3",
  correct: "/sounds/correct.mp3",
  wrong: "/sounds/wrong.mp3",
  streak: "/sounds/streak.mp3",
  complete: "/sounds/complete.mp3",
};

const LOOPED: Partial<Record<GameSound, boolean>> = {
  lobby: true,
  ticktock: true,
};

const VOLUME_KEY = "soundVolume";
const MUTED_KEY = "soundMuted";
const DEFAULT_VOLUME = 0.5;

function readVolume(): number {
  if (typeof window === "undefined") return DEFAULT_VOLUME;
  try {
    const raw = window.localStorage.getItem(VOLUME_KEY);
    if (raw === null) return DEFAULT_VOLUME;
    const n = Number(raw);
    if (!Number.isFinite(n)) return DEFAULT_VOLUME;
    return Math.min(1, Math.max(0, n));
  } catch {
    return DEFAULT_VOLUME;
  }
}

function readMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTED_KEY) === "1";
  } catch {
    return false;
  }
}

// useGameSound centralises Quizizz-style audio for quizzes: lobby music,
// timer urgency, answer feedback, streak fanfares. Volume and mute are
// persisted to localStorage so preferences survive navigation.
//
// Browser autoplay policy: many browsers reject Audio.play() until the user
// has interacted with the document. We swallow the rejection on the very
// first attempt and replay once interactedRef flips, so callers don't need
// to track this themselves.
export function useGameSound() {
  const [volume, setVolumeState] = useState<number>(DEFAULT_VOLUME);
  const [muted, setMutedState] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState<boolean>(false);

  const poolRef = useRef<Partial<Record<GameSound, HTMLAudioElement>>>({});
  const pendingRef = useRef<Set<GameSound>>(new Set());
  const interactedRef = useRef<boolean>(false);

  // Hydrate persisted prefs after mount (localStorage is client-only).
  useEffect(() => {
    setVolumeState(readVolume());
    setMutedState(readMuted());
    setHydrated(true);
  }, []);

  // First user interaction unlocks playback. Replay anything that was
  // queued via play() before the unlock.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onInteract = () => {
      if (interactedRef.current) return;
      interactedRef.current = true;
      const queued = Array.from(pendingRef.current);
      pendingRef.current.clear();
      for (const sound of queued) {
        const el = poolRef.current[sound];
        if (!el) continue;
        try {
          el.currentTime = 0;
          void el.play().catch(() => {});
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("pointerdown", onInteract, { once: true });
    window.addEventListener("keydown", onInteract, { once: true });
    window.addEventListener("touchstart", onInteract, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
      window.removeEventListener("touchstart", onInteract);
    };
  }, []);

  // Push current volume/mute onto every cached element when they change.
  useEffect(() => {
    const pool = poolRef.current;
    const effective = muted ? 0 : volume;
    for (const key of Object.keys(pool) as GameSound[]) {
      const el = pool[key];
      if (!el) continue;
      el.volume = effective;
      // Some browsers ignore volume=0 for short clips; setting muted is
      // the unambiguous way to silence playback.
      el.muted = effective === 0;
    }
  }, [volume, muted]);

  const ensureEl = useCallback(
    (sound: GameSound): HTMLAudioElement | null => {
      if (typeof window === "undefined") return null;
      let el = poolRef.current[sound];
      if (!el) {
        el = new Audio(SOURCES[sound]);
        el.preload = "auto";
        el.loop = !!LOOPED[sound];
        const effective = muted ? 0 : volume;
        el.volume = effective;
        el.muted = effective === 0;
        // iOS Safari occasionally drops looped playback at the boundary.
        // Re-arm on `ended` for explicitly-looped tracks so background
        // music keeps going.
        if (LOOPED[sound]) {
          el.addEventListener("ended", () => {
            try {
              el!.currentTime = 0;
              void el!.play().catch(() => {});
            } catch {
              // ignore
            }
          });
        }
        poolRef.current[sound] = el;
      }
      return el;
    },
    [muted, volume]
  );

  const play = useCallback(
    (sound: GameSound) => {
      if (typeof window === "undefined") return;
      if (muted) return;
      const el = ensureEl(sound);
      if (!el) return;
      try {
        if (!LOOPED[sound]) {
          // Reset so rapid-fire events still trigger sound.
          el.currentTime = 0;
        } else if (!el.paused) {
          // Already looping — no-op.
          return;
        }
        const promise = el.play();
        if (promise && typeof promise.catch === "function") {
          promise.catch(() => {
            // Autoplay-policy rejection: queue for the first interaction.
            if (!interactedRef.current) {
              pendingRef.current.add(sound);
            }
          });
        }
      } catch {
        // ignore
      }
    },
    [ensureEl, muted]
  );

  const stop = useCallback((sound: GameSound) => {
    const el = poolRef.current[sound];
    if (!el) return;
    pendingRef.current.delete(sound);
    try {
      el.pause();
      el.currentTime = 0;
    } catch {
      // ignore
    }
  }, []);

  const stopAll = useCallback(() => {
    pendingRef.current.clear();
    for (const key of Object.keys(poolRef.current) as GameSound[]) {
      const el = poolRef.current[key];
      if (!el) continue;
      try {
        el.pause();
        el.currentTime = 0;
      } catch {
        // ignore
      }
    }
  }, []);

  const setVolume = useCallback((next: number) => {
    const clamped = Math.min(1, Math.max(0, next));
    setVolumeState(clamped);
    try {
      window.localStorage.setItem(VOLUME_KEY, String(clamped));
    } catch {
      // ignore
    }
  }, []);

  const setMuted = useCallback((next: boolean) => {
    setMutedState(next);
    try {
      window.localStorage.setItem(MUTED_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
    if (next) {
      // Pause anything currently playing so muting takes effect immediately.
      for (const key of Object.keys(poolRef.current) as GameSound[]) {
        const el = poolRef.current[key];
        if (!el || el.paused) continue;
        try {
          el.pause();
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const toggleMuted = useCallback(() => {
    setMutedState((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(MUTED_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      if (next) {
        for (const key of Object.keys(poolRef.current) as GameSound[]) {
          const el = poolRef.current[key];
          if (!el || el.paused) continue;
          try {
            el.pause();
          } catch {
            // ignore
          }
        }
      }
      return next;
    });
  }, []);

  return {
    play,
    stop,
    stopAll,
    volume,
    setVolume,
    muted,
    setMuted,
    toggleMuted,
    hydrated,
  };
}

export type UseGameSound = ReturnType<typeof useGameSound>;
