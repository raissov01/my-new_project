"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Bell, Clock3, Globe2, MoonStar, Sun, Volume2, VolumeX } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { savePomodoroPreferences } from "@/app/(main)/sets/pomodoro-actions";
import { useSound } from "@/hooks/use-sound";
import { useTheme } from "@/hooks/use-theme";
import {
  POMODORO_DEFAULTS,
  POMODORO_PRESETS,
  getPomodoroPresetFromValues,
  normalizePomodoroSettings,
  type PomodoroPreset,
  type PomodoroSettings,
} from "@/lib/pomodoro";
import type { Locale } from "@/lib/i18n/shared";

const REMINDER_STORAGE_KEY = "flashlearn_study_reminders";

const PRESETS: { key: Exclude<PomodoroPreset, "custom">; label: string }[] = [
  { key: "15/5", label: "15 / 5" },
  { key: "25/5", label: "25 / 5" },
  { key: "50/10", label: "50 / 10" },
];

export function PreferencesPanel({
  initialPomodoro,
}: {
  initialPomodoro: PomodoroSettings;
}) {
  const { locale, setLocale, t } = useLocale();
  const { theme, setTheme, mounted } = useTheme();
  const { enabled: soundEnabled, setEnabled: setSoundEnabled } = useSound();
  const [workMinutes, setWorkMinutes] = useState(String(initialPomodoro.workMinutes));
  const [breakMinutes, setBreakMinutes] = useState(String(initialPomodoro.breakMinutes));
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedPreset = useMemo(
    () => getPomodoroPresetFromValues(Number(workMinutes), Number(breakMinutes)),
    [breakMinutes, workMinutes]
  );

  useEffect(() => {
    const savedValue = window.localStorage.getItem(REMINDER_STORAGE_KEY);
    requestAnimationFrame(() => {
      setRemindersEnabled(savedValue === "true");
    });
  }, []);

  function handleThemeChange(nextTheme: "light" | "dark") {
    setTheme(nextTheme);
  }

  function handleLocaleChange(nextLocale: Locale) {
    setLocale(nextLocale);
  }

  function handlePresetSelect(nextPreset: Exclude<PomodoroPreset, "custom">) {
    const preset = POMODORO_PRESETS[nextPreset];
    setWorkMinutes(String(preset.workMinutes));
    setBreakMinutes(String(preset.breakMinutes));
    setStatus(null);
    setError(null);
  }

  function handleSavePomodoro() {
    const normalized = normalizePomodoroSettings({
      preset: selectedPreset,
      workMinutes: Number(workMinutes),
      breakMinutes: Number(breakMinutes),
    });

    startTransition(async () => {
      const result = await savePomodoroPreferences(normalized);
      if (result.error || !result.settings) {
        setError(result.error ?? t("common.networkError"));
        setStatus(null);
        return;
      }

      setWorkMinutes(String(result.settings.workMinutes));
      setBreakMinutes(String(result.settings.breakMinutes));
      setError(null);
      setStatus(t("settings.pomodoroSaved"));
    });
  }

  function handleResetPomodoro() {
    startTransition(async () => {
      const result = await savePomodoroPreferences(POMODORO_DEFAULTS);
      if (result.error || !result.settings) {
        setError(result.error ?? t("common.networkError"));
        setStatus(null);
        return;
      }

      setWorkMinutes(String(result.settings.workMinutes));
      setBreakMinutes(String(result.settings.breakMinutes));
      setError(null);
      setStatus(t("settings.preferencesSaved"));
    });
  }

  function handleReminderToggle() {
    const nextValue = !remindersEnabled;
    setRemindersEnabled(nextValue);
    window.localStorage.setItem(REMINDER_STORAGE_KEY, String(nextValue));
    setStatus(t("settings.preferencesSaved"));
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-600">
              <Globe2 className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                {t("settings.languageSelection")}
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                {t("settings.languageDescription")}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {(["kk", "ru", "en"] as const).map((option) => (
              <Button
                key={option}
                type="button"
                variant={locale === option ? "primary" : "outline"}
                onClick={() => handleLocaleChange(option)}
              >
                {t(`lang.${option}`)}
              </Button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-600">
              {mounted && theme === "dark" ? (
                <MoonStar className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                {t("settings.themeSelection")}
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                {t("settings.themeDescription")}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              type="button"
              variant={theme === "light" ? "primary" : "outline"}
              onClick={() => handleThemeChange("light")}
            >
              <Sun className="h-4 w-4" />
              {t("settings.light")}
            </Button>
            <Button
              type="button"
              variant={theme === "dark" ? "primary" : "outline"}
              onClick={() => handleThemeChange("dark")}
            >
              <MoonStar className="h-4 w-4" />
              {t("settings.dark")}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-600">
            <Clock3 className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {t("settings.defaultPomodoro")}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {t("settings.pomodoroDescription")}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={preset.key}
              type="button"
              size="sm"
              variant={selectedPreset === preset.key ? "primary" : "outline"}
              onClick={() => handlePresetSelect(preset.key)}
            >
              {preset.label}
            </Button>
          ))}
          <span className="inline-flex h-9 items-center rounded-xl border border-[var(--border)] px-3 text-sm text-[var(--text-secondary)]">
            {selectedPreset === "custom" ? t("pomodoro.custom") : selectedPreset}
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Input
            type="number"
            min={5}
            label={t("pomodoro.studyDuration")}
            value={workMinutes}
            onChange={(event) => setWorkMinutes(event.target.value)}
          />
          <Input
            type="number"
            min={1}
            label={t("pomodoro.breakDurationLabel")}
            value={breakMinutes}
            onChange={(event) => setBreakMinutes(event.target.value)}
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="button" onClick={handleSavePomodoro} isLoading={isPending}>
            {t("pomodoro.saveSettings")}
          </Button>
          <Button type="button" variant="outline" onClick={handleResetPomodoro}>
            {t("pomodoro.resetDefault")}
          </Button>
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-600">
            <Bell className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {t("settings.studyReminders")}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {t("settings.studyRemindersDescription")}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
          <div>
            <p className="font-medium text-[var(--text-primary)]">
              {t("settings.enableReminders")}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              {t("settings.remindersLocalOnly")}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={remindersEnabled}
            onClick={handleReminderToggle}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              remindersEnabled ? "bg-indigo-600" : "bg-[var(--border)]"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                remindersEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-purple-500/10 p-3 text-purple-600">
            {soundEnabled ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {t("settings.soundEffects")}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {t("settings.soundDescription")}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
          <div>
            <p className="font-medium text-[var(--text-primary)]">
              {t("settings.enableSounds")}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              {t("settings.soundsLocalOnly")}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={soundEnabled}
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              soundEnabled ? "bg-indigo-600" : "bg-[var(--border)]"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                soundEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {(status || error) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            error
              ? "border-red-200 bg-red-500/5 text-red-600"
              : "border-emerald-200 bg-emerald-500/5 text-emerald-700"
          }`}
        >
          {error ?? status}
        </div>
      )}
    </div>
  );
}
