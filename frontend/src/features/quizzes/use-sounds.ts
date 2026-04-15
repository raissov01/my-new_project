"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Keys match file names under /public/sounds/<name>.mp3. Missing files are
// ignored silently so the feature degrades gracefully before the assets land.
export type QuizSound =
  | "correct"
  | "wrong"
  | "streak"
  | "tick"
  | "complete";

const SOURCES: Record<QuizSound, string> = {
  correct: "/sounds/correct.mp3",
  wrong: "/sounds/wrong.mp3",
  streak: "/sounds/streak.mp3",
  tick: "/sounds/tick.mp3",
  complete: "/sounds/complete.mp3",
};

const STORAGE_KEY = "quiz.soundEnabled";

function readInitialEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return true;
    return raw === "1";
  } catch {
    return true;
  }
}

// useQuizSounds returns a play() function and an on/off toggle backed by
// localStorage so the preference survives page navigation. Audio elements
// are constructed lazily on first play (not during SSR) and reused.
export function useQuizSounds() {
  const [enabled, setEnabledState] = useState<boolean>(true);
  const poolRef = useRef<Partial<Record<QuizSound, HTMLAudioElement>>>({});

  // Read the persisted preference once after mount so SSR renders a stable
  // default (enabled) and only the client may flip it. Reading localStorage
  // during render would crash SSR, and the useState initializer runs on the
  // server too — so this setState is the correct pattern, not an accident.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabledState(readInitialEnabled());
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // localStorage may be disabled in private browsing — fail quiet.
    }
  }, []);

  const toggle = useCallback(() => {
    setEnabledState((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const play = useCallback(
    (sound: QuizSound) => {
      if (!enabled) return;
      if (typeof window === "undefined") return;
      let el = poolRef.current[sound];
      if (!el) {
        el = new Audio(SOURCES[sound]);
        el.preload = "auto";
        el.volume = 0.55;
        poolRef.current[sound] = el;
      }
      try {
        // Reset so rapid-fire events (e.g. multiple correct answers) still
        // trigger the sound instead of being no-ops.
        el.currentTime = 0;
        void el.play().catch(() => {
          // Silently swallow autoplay-policy rejections and 404s so a missing
          // asset doesn't flood the console on every answer.
        });
      } catch {
        // Same — no logging, this is best-effort audio feedback.
      }
    },
    [enabled]
  );

  return { enabled, setEnabled, toggle, play };
}
