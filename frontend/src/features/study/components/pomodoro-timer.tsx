"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Coffee,
  Settings2,
} from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { savePomodoroPreferences } from "@/app/(main)/sets/pomodoro-actions";
import type { PomodoroState } from "@/features/study/hooks/use-pomodoro";
import {
  POMODORO_DEFAULTS,
  POMODORO_PRESETS,
  getPomodoroPresetFromValues,
  normalizePomodoroSettings,
  type PomodoroPreset,
} from "@/lib/shared/study/pomodoro";

interface PomodoroTimerProps {
  pomodoro: PomodoroState;
}

const PRESETS: { key: Exclude<PomodoroPreset, "custom">; label: string }[] = [
  { key: "15/5", label: "15/5" },
  { key: "25/5", label: "25/5" },
  { key: "50/10", label: "50/10" },
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function PomodoroTimer({ pomodoro }: PomodoroTimerProps) {
  const { t } = useLocale();
  const {
    preset,
    phase,
    secondsLeft,
    totalSeconds,
    isRunning,
    start,
    pause,
    resume,
    reset,
    skipToBreak,
    skipBreak,
    applySettings,
    canEditSettings,
  } = pomodoro;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftWork, setDraftWork] = useState(String(pomodoro.workMinutes));
  const [draftBreak, setDraftBreak] = useState(String(pomodoro.breakMinutes));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const progress = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (progress / 100) * circumference;
  const currentLabel = `${pomodoro.workMinutes} / ${pomodoro.breakMinutes}`;

  const phaseColors = {
    idle: { ring: "#6366f1", bg: "from-indigo-500/10 to-purple-500/10", text: "text-indigo-600" },
    work: { ring: "#ef4444", bg: "from-red-500/10 to-orange-500/10", text: "text-red-600" },
    break: { ring: "#22c55e", bg: "from-green-500/10 to-emerald-500/10", text: "text-green-600" },
    finished: { ring: "#8b5cf6", bg: "from-purple-500/10 to-pink-500/10", text: "text-purple-600" },
  };

  const colors = phaseColors[phase];
  const draftPreset = useMemo(
    () => getPomodoroPresetFromValues(Number(draftWork), Number(draftBreak)),
    [draftWork, draftBreak]
  );

  function openSettings() {
    setDraftWork(String(pomodoro.workMinutes));
    setDraftBreak(String(pomodoro.breakMinutes));
    setError(null);
    setSettingsOpen(true);
  }

  function handlePresetSelect(nextPreset: Exclude<PomodoroPreset, "custom">) {
    const next = POMODORO_PRESETS[nextPreset];
    setDraftWork(String(next.workMinutes));
    setDraftBreak(String(next.breakMinutes));
    setError(null);
  }

  function handleSaveSettings() {
    const normalized = normalizePomodoroSettings({
      workMinutes: Number(draftWork),
      breakMinutes: Number(draftBreak),
      preset: draftPreset,
    });

    if (Number(draftWork) < 5) {
      setError(t("pomodoro.studyValidation"));
      return;
    }

    if (Number(draftBreak) < 1) {
      setError(t("pomodoro.breakValidation"));
      return;
    }

    startTransition(async () => {
      const result = await savePomodoroPreferences(normalized);
      if (result.error || !result.settings) {
        setError(result.error ?? t("common.networkError"));
        return;
      }

      applySettings(result.settings);
      setSettingsOpen(false);
      setError(null);
    });
  }

  function handleResetDefaults() {
    startTransition(async () => {
      const result = await savePomodoroPreferences(POMODORO_DEFAULTS);
      if (result.error || !result.settings) {
        setError(result.error ?? t("common.networkError"));
        return;
      }

      applySettings(result.settings);
      setDraftWork(String(result.settings.workMinutes));
      setDraftBreak(String(result.settings.breakMinutes));
      setError(null);
    });
  }

  return (
    <>
      <div className={`glass-card rounded-2xl bg-gradient-to-br ${colors.bg} p-5`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
          {phase === "break" ? (
            <Coffee className={`h-4 w-4 ${colors.text}`} />
          ) : (
            <Timer className={`h-4 w-4 ${colors.text}`} />
          )}
              <span className={`text-sm font-semibold ${colors.text}`}>
                {phase === "idle" && t("pomodoro.title")}
                {phase === "work" && t("pomodoro.focusTime")}
                {phase === "break" && t("pomodoro.breakTime")}
                {phase === "finished" && t("pomodoro.sessionDone")}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-white/60 px-3 py-1 font-medium text-[var(--text-primary)] dark:bg-white/10 dark:text-white">
                {currentLabel}
              </span>
              <span className="rounded-full bg-white/40 px-3 py-1 text-[var(--text-secondary)] dark:bg-white/5 dark:text-white/70">
                {preset === "custom" ? t("pomodoro.custom") : preset}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={openSettings}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
            aria-label={t("pomodoro.settings")}
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>

        {/* Timer display */}
        <div className="mt-5 flex items-center justify-center gap-6">
          <div className="relative">
            <svg className="h-28 w-28 -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="var(--border)"
                strokeWidth="5"
                opacity="0.3"
              />
              {phase !== "idle" && (
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke={colors.ring}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="transition-[stroke-dashoffset] duration-150 ease-linear"
                />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                {formatTime(secondsLeft)}
              </span>
              {phase !== "idle" && phase !== "finished" && (
                <span className="text-[10px] font-medium text-[var(--text-muted)]">
                  {phase === "work" ? t("pomodoro.focus") : t("pomodoro.rest")}
                </span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-2">
            {phase === "idle" && (
              <Button size="sm" onClick={start}>
                <Play className="h-3.5 w-3.5" />
                {t("pomodoro.start")}
              </Button>
            )}

            {phase === "work" && (
              <>
                {isRunning ? (
                  <Button size="sm" variant="outline" onClick={pause}>
                    <Pause className="h-3.5 w-3.5" />
                    {t("pomodoro.pause")}
                  </Button>
                ) : (
                  <Button size="sm" onClick={resume}>
                    <Play className="h-3.5 w-3.5" />
                    {t("pomodoro.resume")}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={skipToBreak}>
                  <SkipForward className="h-3.5 w-3.5" />
                  {t("pomodoro.skipToBreak")}
                </Button>
              </>
            )}

            {phase === "break" && (
              <>
                {isRunning ? (
                  <Button size="sm" variant="outline" onClick={pause}>
                    <Pause className="h-3.5 w-3.5" />
                    {t("pomodoro.pause")}
                  </Button>
                ) : (
                  <Button size="sm" onClick={resume}>
                    <Play className="h-3.5 w-3.5" />
                    {t("pomodoro.resume")}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={skipBreak}>
                  <SkipForward className="h-3.5 w-3.5" />
                  {t("pomodoro.skipBreak")}
                </Button>
              </>
            )}

            {phase === "finished" && (
              <Button size="sm" variant="outline" onClick={reset}>
                <RotateCcw className="h-3.5 w-3.5" />
                {t("pomodoro.restart")}
              </Button>
            )}

            {(phase === "work" || phase === "break") && (
              <Button size="sm" variant="ghost" onClick={reset}>
                <RotateCcw className="h-3.5 w-3.5" />
                {t("pomodoro.reset")}
              </Button>
            )}
          </div>
        </div>

        {!canEditSettings && (
          <p className="mt-4 text-xs text-[var(--text-muted)]">
            {t("pomodoro.appliesNextSession")}
          </p>
        )}
      </div>

      <Modal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title={t("pomodoro.settingsTitle")}
      >
        <div className="space-y-5">
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            {t("pomodoro.settingsDescription")}
          </p>

          <div className="space-y-3">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {t("pomodoro.presets")}
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePresetSelect(key)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                    draftPreset === key
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
                  }`}
                >
                  {label}
                </button>
              ))}
              <span className="inline-flex items-center rounded-xl bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-muted)]">
                {draftPreset === "custom" ? t("pomodoro.custom") : t("pomodoro.presetDetected")}
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="pomodoro-study"
              type="number"
              min={5}
              label={t("pomodoro.studyDuration")}
              value={draftWork}
              onChange={(e) => setDraftWork(e.target.value)}
            />
            <Input
              id="pomodoro-break"
              type="number"
              min={1}
              label={t("pomodoro.breakDurationLabel")}
              value={draftBreak}
              onChange={(e) => setDraftBreak(e.target.value)}
            />
          </div>

          <div className="rounded-xl bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            {t("pomodoro.currentSelection")}: {draftWork} / {draftBreak}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex flex-wrap justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={handleResetDefaults}
              disabled={isPending}
            >
              {t("pomodoro.resetDefault")}
            </Button>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSettingsOpen(false)}
                disabled={isPending}
              >
                {t("set.cancel")}
              </Button>
              <Button
                type="button"
                onClick={handleSaveSettings}
                isLoading={isPending}
              >
                {t("pomodoro.saveSettings")}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
