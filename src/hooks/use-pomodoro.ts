"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  POMODORO_DEFAULTS,
  POMODORO_PRESETS,
  type PomodoroPreset,
  type PomodoroSettings,
  normalizePomodoroSettings,
} from "@/lib/pomodoro";

export type PomodoroPhase = "work" | "break" | "idle" | "finished";

export interface PomodoroState {
  preset: PomodoroPreset;
  phase: PomodoroPhase;
  secondsLeft: number;
  totalSeconds: number;
  isRunning: boolean;
  workMinutes: number;
  breakMinutes: number;
  cyclesCompleted: number;
  elapsedWorkSeconds: number;
  canEditSettings: boolean;

  setPreset: (preset: PomodoroPreset) => void;
  applySettings: (settings: PomodoroSettings) => void;
  resetSettingsToDefault: () => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  skipToBreak: () => void;
  skipBreak: () => void;
}

export function usePomodoro(
  initialSettings: PomodoroSettings = POMODORO_DEFAULTS,
  onWorkComplete?: () => void
): PomodoroState {
  const [settings, setSettings] = useState<PomodoroSettings>(
    normalizePomodoroSettings(initialSettings)
  );
  const [phase, setPhase] = useState<PomodoroPhase>("idle");
  const [secondsLeft, setSecondsLeft] = useState(
    normalizePomodoroSettings(initialSettings).workMinutes * 60
  );
  const [isRunning, setIsRunning] = useState(false);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [elapsedWorkSeconds, setElapsedWorkSeconds] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef(phase);
  const settingsRef = useRef(settings);

  const totalSeconds =
    phase === "break" ? settings.breakMinutes * 60 : settings.workMinutes * 60;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startBreak = useCallback(() => {
    clearTimer();
    const breakSecs = settingsRef.current.breakMinutes * 60;
    setPhase("break");
    setSecondsLeft(breakSecs);
    setIsRunning(true);
  }, [clearTimer]);

  const tick = useCallback(() => {
    setSecondsLeft((prev) => {
      if (prev <= 1) {
        clearTimer();
        if (phaseRef.current === "work") {
          setCyclesCompleted((c) => c + 1);
          onWorkComplete?.();
          startBreak();
          return 0;
        } else if (phaseRef.current === "break") {
          setPhase("finished");
          setIsRunning(false);
          return 0;
        }
        return 0;
      }
      return prev - 1;
    });
    if (phaseRef.current === "work") {
      setElapsedWorkSeconds((prev) => prev + 1);
    }
  }, [clearTimer, onWorkComplete, startBreak]);

  const startTimer = useCallback(() => {
    clearTimer();
    intervalRef.current = setInterval(tick, 1000);
  }, [clearTimer, tick]);

  const start = useCallback(() => {
    const workSecs = settingsRef.current.workMinutes * 60;
    setPhase("work");
    setSecondsLeft(workSecs);
    setIsRunning(true);
    setElapsedWorkSeconds(0);
    setCyclesCompleted(0);
  }, []);

  const pause = useCallback(() => {
    clearTimer();
    setIsRunning(false);
  }, [clearTimer]);

  const resume = useCallback(() => {
    setIsRunning(true);
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    setPhase("idle");
    setSecondsLeft(settingsRef.current.workMinutes * 60);
    setIsRunning(false);
    setElapsedWorkSeconds(0);
    setCyclesCompleted(0);
  }, [clearTimer]);

  const setPreset = useCallback(
    (newPreset: PomodoroPreset) => {
      if (newPreset === "custom") return;
      const nextSettings = normalizePomodoroSettings({
        preset: newPreset,
        ...POMODORO_PRESETS[newPreset],
      });
      setSettings(nextSettings);
      if (phase === "idle" || phase === "finished") {
        setSecondsLeft(nextSettings.workMinutes * 60);
        if (phase === "finished") {
          setPhase("idle");
        }
      }
    },
    [phase]
  );

  const applySettings = useCallback(
    (nextSettings: PomodoroSettings) => {
      const normalized = normalizePomodoroSettings(nextSettings);
      setSettings(normalized);
      if (phase === "idle" || phase === "finished") {
        setSecondsLeft(normalized.workMinutes * 60);
        if (phase === "finished") {
          setPhase("idle");
        }
      }
    },
    [phase]
  );

  const resetSettingsToDefault = useCallback(() => {
    applySettings(POMODORO_DEFAULTS);
  }, [applySettings]);

  const skipToBreak = useCallback(() => {
    if (phase === "work") {
      setCyclesCompleted((c) => c + 1);
      onWorkComplete?.();
      startBreak();
    }
  }, [phase, onWorkComplete, startBreak]);

  const skipBreak = useCallback(() => {
    if (phase === "break") {
      clearTimer();
      setPhase("finished");
      setIsRunning(false);
    }
  }, [phase, clearTimer]);

  // Manage the interval based on isRunning state
  useEffect(() => {
    if (isRunning) {
      startTimer();
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [isRunning, startTimer, clearTimer]);

  // Cleanup on unmount
  useEffect(() => clearTimer, [clearTimer]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  return {
    preset: settings.preset,
    phase,
    secondsLeft,
    totalSeconds,
    isRunning,
    workMinutes: settings.workMinutes,
    breakMinutes: settings.breakMinutes,
    cyclesCompleted,
    elapsedWorkSeconds,
    canEditSettings: phase === "idle" || phase === "finished" || !isRunning,
    setPreset,
    applySettings,
    resetSettingsToDefault,
    start,
    pause,
    resume,
    reset,
    skipToBreak,
    skipBreak,
  };
}
