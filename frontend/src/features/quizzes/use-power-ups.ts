"use client";

import { useCallback, useMemo, useState } from "react";

// PowerUpKey identifies one of the five supported abilities. Kept as a
// string-literal union so switch statements over it are exhaustively
// type-checked at compile time.
export type PowerUpKey =
  | "fifty_fifty"
  | "plus_time"
  | "double_score"
  | "skip"
  | "streak_shield";

export const ALL_POWER_UPS: PowerUpKey[] = [
  "fifty_fifty",
  "plus_time",
  "double_score",
  "skip",
  "streak_shield",
];

// Each attempt grants 3 random power-ups out of the 5 available. v2 will
// layer earn-by-streak on top; for now this is a flat random allocation.
const POWER_UPS_PER_ATTEMPT = 3;
// +10 sec power-up bumps the per-question countdown by this many seconds.
const PLUS_TIME_BONUS = 10;

function pickRandomPowerUps(): PowerUpKey[] {
  const copy = [...ALL_POWER_UPS];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, POWER_UPS_PER_ATTEMPT);
}

type ActiveEffects = {
  // 50:50 marks two wrong letters as eliminated for the current question
  // only. The play client reads eliminatedLetters and renders those options
  // grayed-out and non-clickable.
  eliminatedLetters: string[];
  // Score multiplier for the next correct answer. 1 by default; flipped to
  // 2 by Double Score and reset to 1 once consumed.
  scoreMultiplier: number;
  // Streak shield is armed for the rest of the session and consumed by the
  // first wrong answer, preserving the streak that would otherwise reset.
  streakShieldArmed: boolean;
};

const EMPTY_EFFECTS: ActiveEffects = {
  eliminatedLetters: [],
  scoreMultiplier: 1,
  streakShieldArmed: false,
};

// PowerUpAction is what activate() returns to the play client for the two
// power-ups whose effect is best applied imperatively from the caller
// (mutating timeLeft, advancing phase) rather than via shared state.
export type PowerUpAction = {
  addTime?: number;
  skipQuestion?: boolean;
};

// usePowerUps owns the per-attempt allocation, used set, active effects,
// and activation semantics. The play client calls activate() on click,
// consumeOnAnswer() after every answer, and resetPerQuestion() on
// transition (to clear per-question effects like eliminatedLetters).
export function usePowerUps(enabled: boolean) {
  // available is fixed for the attempt — the 3 random power-ups granted on
  // mount. useMemo keeps it stable; we explicitly avoid re-randomizing on
  // re-render so the HUD doesn't shuffle out from under the player.
  const available = useMemo<PowerUpKey[]>(() => {
    if (!enabled) return [];
    return pickRandomPowerUps();
  }, [enabled]);
  const [used, setUsed] = useState<PowerUpKey[]>([]);
  const [effects, setEffects] = useState<ActiveEffects>(EMPTY_EFFECTS);
  // Last activated key drives the centered overlay banner. The play client
  // sets a timeout to clear it via clearJustActivated().
  const [justActivated, setJustActivated] = useState<PowerUpKey | null>(null);

  const isAvailable = useCallback(
    (key: PowerUpKey) => available.includes(key) && !used.includes(key),
    [available, used]
  );

  const activate = useCallback(
    (
      key: PowerUpKey,
      // The play client passes the canonical correct letter (mcq only) so
      // we can build the eliminatedLetters set without leaking answers
      // outward through this hook's API.
      correctLetter: string | null | undefined
    ): PowerUpAction => {
      if (!enabled) return {};
      if (!available.includes(key)) return {};
      if (used.includes(key)) return {};

      setUsed((prev) => (prev.includes(key) ? prev : [...prev, key]));
      setJustActivated(key);

      switch (key) {
        case "fifty_fifty": {
          const wrong = ["a", "b", "c", "d"].filter(
            (l) => l !== correctLetter
          );
          // Fisher-Yates on the wrong-letter subset so 50:50 hides a
          // different pair on repeated tests of the same question.
          for (let i = wrong.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [wrong[i], wrong[j]] = [wrong[j], wrong[i]];
          }
          setEffects((p) => ({ ...p, eliminatedLetters: wrong.slice(0, 2) }));
          return {};
        }
        case "plus_time":
          return { addTime: PLUS_TIME_BONUS };
        case "double_score":
          setEffects((p) => ({ ...p, scoreMultiplier: 2 }));
          return {};
        case "skip":
          return { skipQuestion: true };
        case "streak_shield":
          setEffects((p) => ({ ...p, streakShieldArmed: true }));
          return {};
      }
    },
    [enabled, available, used]
  );

  // consumeOnAnswer runs after every answer. Returns the coin gain for
  // the play client's client-side counter (1 base, 2 with Double Score
  // armed; 0 on a wrong answer) and whether a wrong answer's streak loss
  // was eaten by the shield.
  const consumeOnAnswer = useCallback(
    (isCorrect: boolean): { coinsEarned: number; streakSaved: boolean } => {
      let coinsEarned = 0;
      let streakSaved = false;
      setEffects((prev) => {
        const next: ActiveEffects = { ...prev };
        if (isCorrect) {
          coinsEarned = next.scoreMultiplier;
          next.scoreMultiplier = 1;
        } else if (next.streakShieldArmed) {
          streakSaved = true;
          next.streakShieldArmed = false;
        }
        return next;
      });
      return { coinsEarned, streakSaved };
    },
    []
  );

  // resetPerQuestion clears effects scoped to the current question
  // (eliminatedLetters). Called by the play client when advancing.
  const resetPerQuestion = useCallback(() => {
    setEffects((prev) => ({ ...prev, eliminatedLetters: [] }));
  }, []);

  const clearJustActivated = useCallback(() => {
    setJustActivated(null);
  }, []);

  return {
    available,
    used,
    effects,
    justActivated,
    isAvailable,
    activate,
    consumeOnAnswer,
    resetPerQuestion,
    clearJustActivated,
  };
}
