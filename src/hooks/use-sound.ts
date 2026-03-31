"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

const SOUND_STORAGE_KEY = "flashlearn_sounds_enabled";

function getSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(SOUND_STORAGE_KEY) !== "false";
}

// Tiny external store so all hook instances share the toggle state
let soundEnabled = typeof window !== "undefined" ? getSoundEnabled() : true;
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot() {
  return soundEnabled;
}
function getServerSnapshot() {
  return true;
}

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
  }
  listeners.forEach((cb) => cb());
}

/**
 * Synthesizes short feedback sounds via the Web Audio API.
 * No audio files required — works offline and has zero network cost.
 * Respects a global sound toggle stored in localStorage.
 */
export function useSound() {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ctxRef = useRef<AudioContext | null>(null);

  function getCtx(): AudioContext {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  }

  const playCorrect = useCallback(() => {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      // Two-note ascending chime: C5 -> E5
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch { /* silent */ }
  }, [enabled]);

  const playIncorrect = useCallback(() => {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      // Low descending buzz: E4 -> C4
      osc.type = "triangle";
      osc.frequency.setValueAtTime(329.63, ctx.currentTime);
      osc.frequency.setValueAtTime(261.63, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch { /* silent */ }
  }, [enabled]);

  /** Streak combo sound — pitch increases with streak count */
  const playStreak = useCallback((streak: number) => {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      // Layered: base note + harmonic, pitch rises with streak
      const baseFreq = 523.25 + Math.min(streak, 10) * 40;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc1.frequency.setValueAtTime(baseFreq * 1.25, ctx.currentTime + 0.08);
      osc1.frequency.setValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.16);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.08);
      osc2.frequency.setValueAtTime(baseFreq * 2, ctx.currentTime + 0.16);
      const vol = Math.min(0.08 + streak * 0.015, 0.2);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.4);
      osc2.start(ctx.currentTime + 0.08);
      osc2.stop(ctx.currentTime + 0.4);
    } catch { /* silent */ }
  }, [enabled]);

  /** Special rare reaction sound — satisfying reward fanfare */
  const playSpecial = useCallback(() => {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        const start = ctx.currentTime + i * 0.1;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
        osc.start(start);
        osc.stop(start + 0.35);
      });
    } catch { /* silent */ }
  }, [enabled]);

  return {
    enabled,
    setEnabled: setSoundEnabled,
    playCorrect,
    playIncorrect,
    playStreak,
    playSpecial,
  };
}
