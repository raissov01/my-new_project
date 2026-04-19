"use client";

import { useCallback, useRef, useState } from "react";

// PowerUpKey identifies one of the four supported abilities. Kept as a
// string-literal union so switch statements over it are exhaustively
// type-checked at compile time.
export type PowerUpKey =
  | "fifty_fifty"
  | "double_points"
  | "time_freeze"
  | "streak_saver";

export const POWER_UP_KEYS: PowerUpKey[] = [
  "fifty_fifty",
  "double_points",
  "time_freeze",
  "streak_saver",
];

// Grant rule: every STREAK_GRANT_STEP correct answers in a row, award one
// random power-up. At game start the hook seeds the inventory with 2 of each
// power-up (8 total) so the student can experiment with all abilities.
const STREAK_GRANT_STEP = 3;
const INITIAL_COUNT_PER_POWER_UP = 2;

type Inventory = Record<PowerUpKey, number>;

type ActiveEffects = {
  // 50/50 marks two of the four MCQ options as removed for the current
  // question only. The play client reads hiddenLetters and disables those
  // buttons.
  hiddenLetters: string[];
  // Double Points is consumed by the next correct answer: the coin gain
  // for that answer is multiplied. One-shot.
  doublePointsArmed: boolean;
  // Time Freeze pauses the countdown until the student answers the current
  // question. Cleared automatically on advance.
  timeFrozen: boolean;
  // Streak Saver is armed for the entire session (not per-question) and
  // consumed by the first wrong answer after activation. Also one-shot.
  streakSaverArmed: boolean;
};

const EMPTY_EFFECTS: ActiveEffects = {
  hiddenLetters: [],
  doublePointsArmed: false,
  timeFrozen: false,
  streakSaverArmed: false,
};

function randomKey(): PowerUpKey {
  return POWER_UP_KEYS[Math.floor(Math.random() * POWER_UP_KEYS.length)];
}

// usePowerUps owns the inventory, active effects, grant logic, and activation
// semantics. The play client calls grant() on each correct answer, activate()
// when the student clicks a power-up button, consumeOnAnswer() after every
// answer, and reset() on a new question (to clear per-question effects like
// hiddenLetters / timeFrozen).
export function usePowerUps(enabled: boolean) {
  const [inventory, setInventory] = useState<Inventory>(() => {
    if (!enabled) {
      return { fifty_fifty: 0, double_points: 0, time_freeze: 0, streak_saver: 0 };
    }
    return {
      fifty_fifty: INITIAL_COUNT_PER_POWER_UP,
      double_points: INITIAL_COUNT_PER_POWER_UP,
      time_freeze: INITIAL_COUNT_PER_POWER_UP,
      streak_saver: INITIAL_COUNT_PER_POWER_UP,
    };
  });
  const [effects, setEffects] = useState<ActiveEffects>(EMPTY_EFFECTS);
  // Counter so we don't grant twice for the same streak milestone. Refs
  // instead of state because the play client reads this inside callbacks
  // and doesn't need re-render on change.
  const lastGrantedStreakRef = useRef(0);

  const grant = useCallback(
    (currentStreak: number): PowerUpKey | null => {
      if (!enabled) return null;
      // Guard: each multiple-of-N streak grants exactly once.
      if (
        currentStreak < STREAK_GRANT_STEP ||
        currentStreak % STREAK_GRANT_STEP !== 0 ||
        currentStreak <= lastGrantedStreakRef.current
      ) {
        return null;
      }
      lastGrantedStreakRef.current = currentStreak;
      const key = randomKey();
      setInventory((prev) => ({ ...prev, [key]: prev[key] + 1 }));
      return key;
    },
    [enabled]
  );

  const activate = useCallback(
    (
      key: PowerUpKey,
      // The play client passes the canonical correct letter (mcq only) so
      // we can build a correct hiddenLetters set without leaking answers
      // to this hook's callers.
      correctLetter: string | null | undefined
    ): boolean => {
      if (!enabled) return false;
      if (inventory[key] <= 0) return false;
      // Don't stack multiple single-shot effects on the same question.
      if (key === "fifty_fifty" && effects.hiddenLetters.length > 0) return false;
      if (key === "double_points" && effects.doublePointsArmed) return false;
      if (key === "time_freeze" && effects.timeFrozen) return false;
      if (key === "streak_saver" && effects.streakSaverArmed) return false;

      setInventory((prev) => ({ ...prev, [key]: prev[key] - 1 }));
      setEffects((prev) => {
        switch (key) {
          case "fifty_fifty": {
            // Pick two wrong letters to hide. If no correct letter is known
            // (shouldn't happen for mcq) fall back to hiding a/b.
            const wrong = ["a", "b", "c", "d"].filter(
              (l) => l !== correctLetter
            );
            // Fisher-Yates on the wrong-letter subset so hidden letters
            // vary between activations.
            for (let i = wrong.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [wrong[i], wrong[j]] = [wrong[j], wrong[i]];
            }
            return { ...prev, hiddenLetters: wrong.slice(0, 2) };
          }
          case "double_points":
            return { ...prev, doublePointsArmed: true };
          case "time_freeze":
            return { ...prev, timeFrozen: true };
          case "streak_saver":
            return { ...prev, streakSaverArmed: true };
        }
      });
      return true;
    },
    [enabled, inventory, effects]
  );

  // consumeOnAnswer runs after every answer. It returns the amount of
  // "coins" the client should add to its client-side counter (1 base, 2
  // with Double Points armed). It also flips the streakSaver consumption
  // flag so the client can decide whether to reset the streak or preserve
  // it on a wrong answer.
  const consumeOnAnswer = useCallback(
    (isCorrect: boolean): { coinsEarned: number; streakSaved: boolean } => {
      let coinsEarned = 0;
      let streakSaved = false;
      setEffects((prev) => {
        const next: ActiveEffects = { ...prev };
        if (isCorrect) {
          coinsEarned = next.doublePointsArmed ? 2 : 1;
          next.doublePointsArmed = false;
        } else if (next.streakSaverArmed) {
          streakSaved = true;
          next.streakSaverArmed = false;
        }
        return next;
      });
      return { coinsEarned, streakSaved };
    },
    []
  );

  // resetPerQuestion clears effects that only apply to the current question
  // (hiddenLetters, timeFrozen). Called by the play client when advancing
  // to the next question.
  const resetPerQuestion = useCallback(() => {
    setEffects((prev) => ({
      ...prev,
      hiddenLetters: [],
      timeFrozen: false,
    }));
  }, []);

  return {
    inventory,
    effects,
    grant,
    activate,
    consumeOnAnswer,
    resetPerQuestion,
  };
}
