"use client";

import { Scissors, Zap, Snowflake, Shield } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import type { PowerUpKey } from "../use-power-ups";

const META: Record<
  PowerUpKey,
  { labelKey: string; icon: React.ComponentType<{ className?: string }> }
> = {
  fifty_fifty: { labelKey: "quiz.powerUp.fiftyFifty", icon: Scissors },
  double_points: { labelKey: "quiz.powerUp.doublePoints", icon: Zap },
  time_freeze: { labelKey: "quiz.powerUp.timeFreeze", icon: Snowflake },
  streak_saver: { labelKey: "quiz.powerUp.streakSaver", icon: Shield },
};

const ORDER: PowerUpKey[] = [
  "fifty_fifty",
  "double_points",
  "time_freeze",
  "streak_saver",
];

interface PowerUpBarProps {
  inventory: Record<PowerUpKey, number>;
  // activeEffects tells the bar which power-ups are currently "lit" so the
  // student sees which ones are in effect on the current question.
  activeEffects: {
    hiddenLetters: string[];
    doublePointsArmed: boolean;
    timeFrozen: boolean;
    streakSaverArmed: boolean;
  };
  // disabled is true during the reveal phase — power-ups can only be
  // activated while actively answering.
  disabled: boolean;
  onActivate: (key: PowerUpKey) => void;
}

export function PowerUpBar({
  inventory,
  activeEffects,
  disabled,
  onActivate,
}: PowerUpBarProps) {
  const { t } = useLocale();

  const isActive = (key: PowerUpKey) => {
    switch (key) {
      case "fifty_fifty":
        return activeEffects.hiddenLetters.length > 0;
      case "double_points":
        return activeEffects.doublePointsArmed;
      case "time_freeze":
        return activeEffects.timeFrozen;
      case "streak_saver":
        return activeEffects.streakSaverArmed;
    }
  };

  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
      {ORDER.map((key) => {
        const count = inventory[key] ?? 0;
        const active = isActive(key);
        const available = count > 0 && !disabled && !active;
        const Icon = META[key].icon;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onActivate(key)}
            disabled={!available}
            title={t(META[key].labelKey)}
            className={`relative inline-flex h-12 min-w-[72px] items-center justify-center gap-1.5 rounded-[var(--radius-md)] border-2 px-3 text-xs font-semibold transition-all ${
              active
                ? "border-amber-400/60 bg-amber-500/15 text-amber-200 animate-success-glow"
                : available
                  ? "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:-translate-y-0.5 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                  : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-muted)] opacity-40"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{t(META[key].labelKey)}</span>
            {count > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-[var(--bg-base)] bg-[var(--primary)] px-1 text-[10px] font-bold text-white">
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
