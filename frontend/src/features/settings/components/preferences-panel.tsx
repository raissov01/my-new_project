"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Bell, Clock3, Globe2, MoonStar, Sun, Volume2, VolumeX } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Input } from "@/components/ui/input";
import { savePomodoroPreferences } from "@/app/(main)/sets/pomodoro-actions";
import { useSound } from "@/features/study/hooks/use-sound";
import { useTheme } from "@/hooks/use-theme";
import {
  POMODORO_DEFAULTS,
  POMODORO_PRESETS,
  getPomodoroPresetFromValues,
  normalizePomodoroSettings,
  type PomodoroPreset,
  type PomodoroSettings,
} from "@/lib/shared/study/pomodoro";
import type { Locale } from "@/lib/shared/i18n";

const REMINDER_STORAGE_KEY = "flashlearn_study_reminders";

const PRESETS: { key: Exclude<PomodoroPreset, "custom">; label: string }[] = [
  { key: "15/5", label: "15 / 5" },
  { key: "25/5", label: "25 / 5" },
  { key: "50/10", label: "50 / 10" },
];

const cardStyle: React.CSSProperties = {
  background: "var(--paper-2)",
  border: "1px solid var(--line)",
  borderRadius: 16,
  padding: "20px 22px",
  marginBottom: 14,
};

const iconBoxStyle = (color: string): React.CSSProperties => ({
  width: 38, height: 38, borderRadius: 10,
  background: `${color}18`,
  display: "flex", alignItems: "center", justifyContent: "center",
  color, flexShrink: 0,
});

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      style={{
        position: "relative", display: "inline-flex", height: 28, width: 50,
        alignItems: "center", borderRadius: 999, transition: "background .2s",
        background: checked ? "var(--terra)" : "var(--line-strong)",
        border: "none", cursor: "pointer", flexShrink: 0, padding: 0,
      }}
    >
      <span style={{
        display: "inline-block", width: 20, height: 20, borderRadius: "50%",
        background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)",
        transform: checked ? "translateX(26px)" : "translateX(4px)",
        transition: "transform .2s",
      }} />
    </button>
  );
}

function PrefBtn({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 18px", borderRadius: 99, fontSize: 13, fontWeight: 600,
        cursor: "pointer", transition: "all .12s",
        background: active ? "var(--ink)" : "var(--paper-3)",
        color: active ? "var(--paper)" : "var(--ink-soft)",
        border: `1.5px solid ${active ? "var(--ink)" : "var(--line-strong)"}`,
      }}
    >
      {children}
    </button>
  );
}

export function PreferencesPanel({ initialPomodoro }: { initialPomodoro: PomodoroSettings }) {
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
    requestAnimationFrame(() => setRemindersEnabled(savedValue === "true"));
  }, []);

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
    const next = !remindersEnabled;
    setRemindersEnabled(next);
    window.localStorage.setItem(REMINDER_STORAGE_KEY, String(next));
    setStatus(t("settings.preferencesSaved"));
  }

  return (
    <div>
      {/* Language */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
          <div style={iconBoxStyle("#6366f1")}><Globe2 size={18} /></div>
          <div>
            <strong style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
              {t("settings.languageSelection")}
            </strong>
            <span style={{ fontSize: 12.5, color: "var(--ink-mute)" }}>
              {t("settings.languageDescription")}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(["kk", "ru", "en"] as const).map((option) => (
            <PrefBtn key={option} active={locale === option} onClick={() => setLocale(option)}>
              {t(`lang.${option}`)}
            </PrefBtn>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
          <div style={iconBoxStyle("#f59e0b")}>
            {mounted && theme === "dark" ? <MoonStar size={18} /> : <Sun size={18} />}
          </div>
          <div>
            <strong style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
              {t("settings.themeSelection")}
            </strong>
            <span style={{ fontSize: 12.5, color: "var(--ink-mute)" }}>
              {t("settings.themeDescription")}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <PrefBtn active={!mounted || theme === "light"} onClick={() => setTheme("light")}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Sun size={13} />{t("settings.light")}
            </span>
          </PrefBtn>
          <PrefBtn active={mounted && theme === "dark"} onClick={() => setTheme("dark")}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <MoonStar size={13} />{t("settings.dark")}
            </span>
          </PrefBtn>
        </div>
      </div>

      {/* Pomodoro */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
          <div style={iconBoxStyle("#10b981")}><Clock3 size={18} /></div>
          <div>
            <strong style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
              {t("settings.defaultPomodoro")}
            </strong>
            <span style={{ fontSize: 12.5, color: "var(--ink-mute)" }}>
              {t("settings.pomodoroDescription")}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {PRESETS.map((preset) => (
            <PrefBtn
              key={preset.key}
              active={selectedPreset === preset.key}
              onClick={() => {
                const p = POMODORO_PRESETS[preset.key];
                setWorkMinutes(String(p.workMinutes));
                setBreakMinutes(String(p.breakMinutes));
                setStatus(null); setError(null);
              }}
            >
              {preset.label}
            </PrefBtn>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <Input
            type="number" min={5} max={240} step={1}
            label={t("pomodoro.studyDuration")}
            value={workMinutes}
            onChange={(e) => setWorkMinutes(e.target.value)}
          />
          <Input
            type="number" min={1} max={60} step={1}
            label={t("pomodoro.breakDurationLabel")}
            value={breakMinutes}
            onChange={(e) => setBreakMinutes(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={handleSavePomodoro}
            disabled={isPending}
            className="nd-btn-primary"
            style={{ fontSize: 13, padding: "9px 18px" }}
          >
            {isPending ? "..." : t("pomodoro.saveSettings")}
          </button>
          <button
            type="button"
            onClick={handleResetPomodoro}
            disabled={isPending}
            className="nd-btn-soft"
            style={{ fontSize: 13, padding: "9px 18px" }}
          >
            {t("pomodoro.resetDefault")}
          </button>
        </div>
      </div>

      {/* Study Reminders */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={iconBoxStyle("#0ea5e9")}><Bell size={18} /></div>
            <div>
              <strong style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
                {t("settings.studyReminders")}
              </strong>
              <span style={{ fontSize: 12.5, color: "var(--ink-mute)" }}>
                {t("settings.remindersLocalOnly")}
              </span>
            </div>
          </div>
          <Toggle checked={remindersEnabled} onChange={handleReminderToggle} />
        </div>
      </div>

      {/* Sound Effects */}
      <div style={{ ...cardStyle, marginBottom: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={iconBoxStyle("#a855f7")}>
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </div>
            <div>
              <strong style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
                {t("settings.soundEffects")}
              </strong>
              <span style={{ fontSize: 12.5, color: "var(--ink-mute)" }}>
                {t("settings.soundsLocalOnly")}
              </span>
            </div>
          </div>
          <Toggle checked={soundEnabled} onChange={() => setSoundEnabled(!soundEnabled)} />
        </div>
      </div>

      {/* Status / Error */}
      {(status || error) && (
        <div style={{
          marginTop: 14, padding: "10px 16px", borderRadius: 12, fontSize: 13.5,
          border: error ? "1px solid rgba(220,38,38,.2)" : "1px solid rgba(16,185,129,.2)",
          background: error ? "rgba(220,38,38,.06)" : "rgba(16,185,129,.06)",
          color: error ? "var(--terra)" : "var(--green)",
        }}>
          {error ?? status}
        </div>
      )}
    </div>
  );
}
