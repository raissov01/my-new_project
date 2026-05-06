"use client";

import { Scissors, Zap, Clock, SkipForward, Shield } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import type { PowerUpKey } from "../use-power-ups";

const META: Record<
  PowerUpKey,
  {
    labelKey: string;
    tooltipKey: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  fifty_fifty: {
    labelKey: "quiz.powerUp.fiftyFifty",
    tooltipKey: "quiz.powerUp.tooltip.fiftyFifty",
    icon: Scissors,
  },
  plus_time: {
    labelKey: "quiz.powerUp.plusTime",
    tooltipKey: "quiz.powerUp.tooltip.plusTime",
    icon: Clock,
  },
  double_score: {
    labelKey: "quiz.powerUp.doubleScore",
    tooltipKey: "quiz.powerUp.tooltip.doubleScore",
    icon: Zap,
  },
  skip: {
    labelKey: "quiz.powerUp.skip",
    tooltipKey: "quiz.powerUp.tooltip.skip",
    icon: SkipForward,
  },
  streak_shield: {
    labelKey: "quiz.powerUp.streakShield",
    tooltipKey: "quiz.powerUp.tooltip.streakShield",
    icon: Shield,
  },
};

interface PowerUpBarProps {
  // available is the fixed 3 randomly-granted power-ups for this attempt.
  available: PowerUpKey[];
  // used is the set of already-consumed power-ups; their button stays
  // visible but goes inert.
  used: PowerUpKey[];
  // activeEffects tells the bar which power-ups are currently "lit" so the
  // student sees which ones are in effect on the current question.
  activeEffects: {
    eliminatedLetters: string[];
    scoreMultiplier: number;
    streakShieldArmed: boolean;
  };
  // disabled is true during the reveal phase — power-ups can only be
  // activated while actively answering.
  disabled: boolean;
  onActivate: (key: PowerUpKey) => void;
}

export function PowerUpBar({
  available,
  used,
  activeEffects,
  disabled,
  onActivate,
}: PowerUpBarProps) {
  const { t } = useLocale();

  const isActive = (key: PowerUpKey) => {
    switch (key) {
      case "fifty_fifty":
        return activeEffects.eliminatedLetters.length > 0;
      case "double_score":
        return activeEffects.scoreMultiplier > 1;
      case "streak_shield":
        return activeEffects.streakShieldArmed;
      case "plus_time":
      case "skip":
        // Single-shot, fire-and-forget: never reads as "active" on the bar.
        return false;
    }
  };

  if (available.length === 0) return null;

  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
      {available.map((key) => {
        const isUsed = used.includes(key);
        const active = isActive(key);
        const clickable = !isUsed && !disabled && !active;
        const Icon = META[key].icon;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onActivate(key)}
            disabled={!clickable}
            title={t(META[key].tooltipKey)}
            aria-label={t(META[key].labelKey)}
            className={`relative inline-flex h-12 min-w-[72px] items-center justify-center gap-1.5 rounded-[var(--radius-md)] border-2 px-3 text-xs font-semibold transition-all ${
              active
                ? "border-amber-400/60 bg-amber-500/15 text-amber-200 animate-success-glow"
                : clickable
                  ? "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:-translate-y-0.5 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                  : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-muted)] opacity-40"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{t(META[key].labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}

interface PowerUpActivationOverlayProps {
  // activated is the key whose banner is showing. null hides the overlay.
  activated: PowerUpKey | null;
}

// Centered banner shown for ~1s when a power-up activates. The play client
// sets a setTimeout to clear `justActivated` after the same duration.
export function PowerUpActivationOverlay({
  activated,
}: PowerUpActivationOverlayProps) {
  const { t } = useLocale();
  if (!activated) return null;
  const label = t(META[activated].labelKey);
  const Icon = META[activated].icon;
  return (
    <div
      key={activated}
      aria-live="polite"
      className="pointer-events-none fixed inset-0 z-[150] flex items-center justify-center"
    >
      <div className="animate-quiz-countdown rounded-full border-2 border-amber-400/60 bg-gradient-to-br from-amber-500/30 via-orange-500/25 to-rose-500/30 px-8 py-4 text-center text-white shadow-[0_20px_60px_-20px_rgba(251,191,36,0.5)] backdrop-blur-md">
        <div className="flex items-center justify-center gap-3">
          <Icon className="h-6 w-6 text-amber-200" />
          <span className="text-lg font-black tracking-wide sm:text-xl">
            {t("quiz.powerUp.activated").replace("{name}", label)}
          </span>
        </div>
      </div>
    </div>
  );
}
