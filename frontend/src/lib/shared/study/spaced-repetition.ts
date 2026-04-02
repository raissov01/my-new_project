import type { StudyProgress, Flashcard } from "@/lib/shared/types/database";

// ── Interval schedule ────────────────────────────────────────────────────────
// Correct: 1 → 2 → 4 → 7 → 14 → 30 (capped)
// Incorrect: reset to 1

const INTERVAL_STEPS = [1, 2, 4, 7, 14, 30] as const;

export function nextInterval(currentInterval: number, correct: boolean): number {
  if (!correct) return 1;
  const idx = INTERVAL_STEPS.indexOf(currentInterval as (typeof INTERVAL_STEPS)[number]);
  if (idx === -1 || idx === INTERVAL_STEPS.length - 1) return 30;
  return INTERVAL_STEPS[idx + 1];
}

// ── Card classification ──────────────────────────────────────────────────────

export function isCardWeak(progress: StudyProgress): boolean {
  if (progress.is_weak) return true;
  const total = progress.times_correct + progress.times_incorrect;
  if (total === 0) return false;
  return progress.times_correct / total < 0.7;
}

export function isCardDueToday(progress: StudyProgress): boolean {
  const now = new Date();
  const dueDate = new Date(progress.next_review_at);
  return dueDate <= now;
}

export function cardAccuracy(progress: StudyProgress): number {
  const total = progress.times_correct + progress.times_incorrect;
  if (total === 0) return 0;
  return Math.round((progress.times_correct / total) * 100);
}

// ── Smart study sorting ──────────────────────────────────────────────────────
// Priority: 1) due & weak, 2) due, 3) weak, 4) never studied, 5) rest

export type CardWithProgress = {
  flashcard: Flashcard;
  progress: StudyProgress | null;
};

export type SmartStudySummary = {
  dueCount: number;
  weakCount: number;
  newCount: number;
  totalCount: number;
};

export function sortForSmartStudy(cards: CardWithProgress[]): CardWithProgress[] {
  return [...cards].sort((a, b) => {
    const scoreA = smartScore(a);
    const scoreB = smartScore(b);
    return scoreB - scoreA; // Higher score = higher priority
  });
}

export function sortForReviewSession(cards: CardWithProgress[]): CardWithProgress[] {
  return [...cards].sort((a, b) => {
    const scoreA = reviewScore(a);
    const scoreB = reviewScore(b);
    return scoreB - scoreA;
  });
}

function smartScore(card: CardWithProgress): number {
  const p = card.progress;
  if (!p) return 50; // Never studied — medium priority

  let score = 0;
  if (isCardDueToday(p)) score += 100;
  if (isCardWeak(p)) score += 80;
  // More overdue = higher priority
  const overdueDays = Math.max(
    0,
    (Date.now() - new Date(p.next_review_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  score += Math.min(overdueDays * 5, 50);
  return score;
}

function reviewScore(card: CardWithProgress): number {
  const p = card.progress;
  if (!p) return 0;

  let score = 0;
  const due = isCardDueToday(p);
  const weak = isCardWeak(p);
  const mistakesWeight = p.times_incorrect * 10;
  const overdueDays = Math.max(
    0,
    (Date.now() - new Date(p.next_review_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (weak) score += 140;
  if (due) score += 100;
  score += mistakesWeight;
  score += Math.min(overdueDays * 8, 60);

  return score;
}

// ── Filtering helpers ────────────────────────────────────────────────────────

export function filterWeakCards(cards: CardWithProgress[]): CardWithProgress[] {
  return cards.filter((c) => c.progress && isCardWeak(c.progress));
}

export function filterDueCards(cards: CardWithProgress[]): CardWithProgress[] {
  return cards.filter(
    (c) => c.progress && isCardDueToday(c.progress)
  );
}

export function filterReviewCards(cards: CardWithProgress[]): CardWithProgress[] {
  return cards.filter((c) => {
    if (!c.progress) return false;
    return isCardDueToday(c.progress) || isCardWeak(c.progress);
  });
}

export function filterUnstudied(cards: CardWithProgress[]): CardWithProgress[] {
  return cards.filter((c) => !c.progress);
}

export function buildSmartStudyDeck(cards: CardWithProgress[]) {
  const due = filterDueCards(cards);
  const weak = filterWeakCards(cards);
  const unstudied = filterUnstudied(cards);
  const merged = new Map<string, CardWithProgress>();

  for (const card of [...weak, ...due, ...unstudied]) {
    merged.set(card.flashcard.id, card);
  }

  const prioritized = sortForSmartStudy(Array.from(merged.values()));

  return {
    cards: prioritized,
    summary: {
      dueCount: due.length,
      weakCount: weak.length,
      newCount: unstudied.length,
      totalCount: prioritized.length,
    } satisfies SmartStudySummary,
  };
}

// ── Stats helpers ────────────────────────────────────────────────────────────

export type SmartStudyStats = {
  dueToday: number;
  weakCards: number;
  mastered: number;
  totalWithProgress: number;
};

export function computeSmartStats(
  progressRows: StudyProgress[]
): SmartStudyStats {
  let dueToday = 0;
  let weakCards = 0;
  let mastered = 0;

  for (const p of progressRows) {
    if (isCardDueToday(p)) dueToday++;
    if (isCardWeak(p)) weakCards++;
    if (p.review_interval >= 14 && !isCardWeak(p)) mastered++;
  }

  return {
    dueToday,
    weakCards,
    mastered,
    totalWithProgress: progressRows.length,
  };
}
