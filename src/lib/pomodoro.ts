export type PomodoroPreset = "15/5" | "25/5" | "50/10" | "custom";

export interface PomodoroSettings {
  preset: PomodoroPreset;
  workMinutes: number;
  breakMinutes: number;
}

export const POMODORO_DEFAULTS: PomodoroSettings = {
  preset: "25/5",
  workMinutes: 25,
  breakMinutes: 5,
};

export const POMODORO_LIMITS = {
  minWorkMinutes: 5,
  minBreakMinutes: 1,
} as const;

export const POMODORO_PRESETS: Record<
  Exclude<PomodoroPreset, "custom">,
  { workMinutes: number; breakMinutes: number }
> = {
  "15/5": { workMinutes: 15, breakMinutes: 5 },
  "25/5": { workMinutes: 25, breakMinutes: 5 },
  "50/10": { workMinutes: 50, breakMinutes: 10 },
};

export function getPomodoroPresetFromValues(
  workMinutes: number,
  breakMinutes: number
): PomodoroPreset {
  const match = Object.entries(POMODORO_PRESETS).find(
    ([, value]) =>
      value.workMinutes === workMinutes && value.breakMinutes === breakMinutes
  );

  return (match?.[0] as PomodoroPreset | undefined) ?? "custom";
}

export function normalizePomodoroSettings(
  settings?: Partial<PomodoroSettings> | null
): PomodoroSettings {
  const workMinutes = Number(settings?.workMinutes ?? POMODORO_DEFAULTS.workMinutes);
  const breakMinutes = Number(settings?.breakMinutes ?? POMODORO_DEFAULTS.breakMinutes);

  const safeWorkMinutes = Number.isFinite(workMinutes)
    ? Math.max(POMODORO_LIMITS.minWorkMinutes, Math.round(workMinutes))
    : POMODORO_DEFAULTS.workMinutes;
  const safeBreakMinutes = Number.isFinite(breakMinutes)
    ? Math.max(POMODORO_LIMITS.minBreakMinutes, Math.round(breakMinutes))
    : POMODORO_DEFAULTS.breakMinutes;

  return {
    preset:
      settings?.preset && settings.preset !== "custom"
        ? settings.preset
        : getPomodoroPresetFromValues(safeWorkMinutes, safeBreakMinutes),
    workMinutes: safeWorkMinutes,
    breakMinutes: safeBreakMinutes,
  };
}

export function validatePomodoroSettings(settings: {
  workMinutes: number;
  breakMinutes: number;
}) {
  return {
    workValid: Number.isFinite(settings.workMinutes) && settings.workMinutes >= POMODORO_LIMITS.minWorkMinutes,
    breakValid: Number.isFinite(settings.breakMinutes) && settings.breakMinutes >= POMODORO_LIMITS.minBreakMinutes,
  };
}
