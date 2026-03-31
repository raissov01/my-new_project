/**
 * Context-aware meme feedback message system.
 * Picks randomized, localized messages based on correctness, streak, and accuracy.
 * Includes a 5% chance for rare "special" reactions.
 */

export type FeedbackContext = {
  correct: boolean;
  streak: number;
  answered: number;
  total: number;
  accuracy: number; // 0-100
};

export type FeedbackResult = {
  message: string;
  isSpecial: boolean; // rare 5% chance
};

type PoolKey =
  | "correct"
  | "correctStreak"
  | "correctDominating"
  | "correctSpecial"
  | "incorrect"
  | "incorrectStruggling"
  | "incorrectSpecial";

/**
 * Translation keys for each pool. Each key maps to a translation string.
 * The numbers (1,2,3...) provide variety — we pick one at random.
 */
const POOLS: Record<PoolKey, string[]> = {
  correct: [
    "meme.correct.1",
    "meme.correct.2",
    "meme.correct.3",
    "meme.correct.4",
    "meme.correct.5",
    "meme.correct.6",
  ],
  correctStreak: [
    "meme.streak.1",
    "meme.streak.2",
    "meme.streak.3",
    "meme.streak.4",
  ],
  correctDominating: [
    "meme.dominating.1",
    "meme.dominating.2",
    "meme.dominating.3",
    "meme.dominating.4",
  ],
  correctSpecial: [
    "meme.special.correct.1",
    "meme.special.correct.2",
    "meme.special.correct.3",
  ],
  incorrect: [
    "meme.incorrect.1",
    "meme.incorrect.2",
    "meme.incorrect.3",
    "meme.incorrect.4",
    "meme.incorrect.5",
    "meme.incorrect.6",
  ],
  incorrectStruggling: [
    "meme.struggling.1",
    "meme.struggling.2",
    "meme.struggling.3",
    "meme.struggling.4",
  ],
  incorrectSpecial: [
    "meme.special.incorrect.1",
    "meme.special.incorrect.2",
    "meme.special.incorrect.3",
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Returns a meme feedback message key and whether it's a rare special reaction.
 */
export function getMemeFeedback(
  ctx: FeedbackContext,
  t: (key: string, vars?: Record<string, string | number>) => string
): FeedbackResult {
  const isSpecial = Math.random() < 0.05;

  if (ctx.correct) {
    // Special rare reaction
    if (isSpecial) {
      return { message: t(pickRandom(POOLS.correctSpecial)), isSpecial: true };
    }
    // Dominating: high accuracy + many answered
    if (ctx.accuracy >= 90 && ctx.answered >= 5) {
      return { message: t(pickRandom(POOLS.correctDominating)), isSpecial: false };
    }
    // Streak-based
    if (ctx.streak >= 3) {
      return {
        message: t(pickRandom(POOLS.correctStreak), { count: ctx.streak }),
        isSpecial: false,
      };
    }
    // Normal correct
    return { message: t(pickRandom(POOLS.correct)), isSpecial: false };
  }

  // Incorrect
  if (isSpecial) {
    return { message: t(pickRandom(POOLS.incorrectSpecial)), isSpecial: true };
  }
  // Struggling: low accuracy after several answers
  if (ctx.accuracy < 50 && ctx.answered >= 4) {
    return { message: t(pickRandom(POOLS.incorrectStruggling)), isSpecial: false };
  }
  // Normal incorrect
  return { message: t(pickRandom(POOLS.incorrect)), isSpecial: false };
}
