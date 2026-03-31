"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { DEV_MODE } from "@/lib/dev-mode";
import {
  computeSmartStats,
  type SmartStudyStats,
} from "@/lib/spaced-repetition";
import {
  getAchievements,
  getLevelInfo,
  getLevelPresentation,
  getNewAchievements,
  calculatePointsEarned,
  type Achievement,
} from "@/lib/gamification";
import type { Database } from "@/types/database";
import { ADMIN_EMAIL } from "@/lib/admin-auth";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";

// ── Types ────────────────────────────────────────────────────────────────────

export type CardResult = {
  flashcardId: string;
  correct: boolean;
};

export type UserStats = {
  totalStudied: number;
  totalCorrect: number;
  totalIncorrect: number;
  accuracy: number;
  recentActivity: {
    date: string;
    count: number;
  }[];
  smart: SmartStudyStats;
  streakDays: number;
  points: number;
  xpLevel: number;
  xpProgress: number;
  xpCurrentLevelPoints: number;
  xpRequiredPoints: number;
  levelName: string;
  levelMeaning: string;
  levelReward: string;
  nextLevelReward: string;
  achievements: Achievement[];
  previousWeekStudied: number;
  currentWeekStudied: number;
  weeklyStudyDelta: number;
  lastActiveDate: string | null;
  studiedToday: boolean;
  streakAtRisk: boolean;
};

export type StudyReward = {
  pointsEarned: number;
  streakDays: number;
  unlockedAchievements: Achievement[];
  rewardMessages: string[];
  previousAccuracy: number;
  currentAccuracy: number;
  accuracyDelta: number;
  previousPoints: number;
  currentPoints: number;
  previousLevel: number;
  currentLevel: number;
  currentLevelName: string;
  currentLevelReward: string;
  nextLevelReward: string;
};

export type RecommendedSet = {
  setId: string;
  title: string;
  description: string | null;
  createdAt: string;
  cardCount: number;
  studiedCards: number;
  reviewCount: number;
  weakCount: number;
  dueCount: number;
  newCount: number;
  accuracy: number;
  recommendationScore: number;
  suggestedMode: "review" | "smart";
  estimatedMinutes: number;
  urgency: "high" | "medium" | "low";
};

export type WeakTopic = {
  setId: string;
  title: string;
  weakCount: number;
  dueCount: number;
  reviewCount: number;
  accuracy: number;
};

export type PersonalizedRecommendations = {
  todayFocus: RecommendedSet | null;
  recommendedSets: RecommendedSet[];
  continueLearning: RecommendedSet[];
  weakTopics: WeakTopic[];
  reviewCards: number;
  weakAreasCount: number;
  newOpportunities: number;
};

type TableError = { message: string } | null;

type StudyProgress = {
  id: string;
  user_id: string;
  flashcard_id: string;
  times_seen: number;
  times_correct: number;
  times_incorrect: number;
  is_weak: boolean;
  review_interval: number;
  next_review_at: string;
  last_reviewed_at: string | null;
  last_studied_at: string;
  created_at: string;
};

type UpsertStudyProgressRpc = (
  fn: "upsert_study_progress",
  args: Database["public"]["Functions"]["upsert_study_progress"]["Args"]
) => Promise<{ error: TableError }>;

type ProfilesTable = {
  update: (values: Database["public"]["Tables"]["profiles"]["Update"]) => {
    eq: (column: string, value: string) => Promise<{ error: TableError }>;
  };
};

type StudyProgressTable = {
  upsert: (
    values: Database["public"]["Tables"]["study_progress"]["Insert"],
    options?: { onConflict?: string }
  ) => Promise<{ error: TableError }>;
};

// ── Save session results ─────────────────────────────────────────────────────

export async function saveSessionResults(
  results: CardResult[]
): Promise<{ error: string | null; reward: StudyReward | null }> {
  const t = createTranslator(await getServerLocale());
  // DEV MODE: auth disabled — skip saving progress (no real user in DB)
  if (DEV_MODE) {
    return { error: null, reward: null };
  }

  const supabase = await createClient();
  const user = await getCurrentUser();
  const profilesTable = supabase.from("profiles") as never as ProfilesTable;
  const upsertStudyProgress = supabase.rpc as unknown as UpsertStudyProgressRpc;

  if (!user) {
    return { error: t("action.notAuthenticated"), reward: null };
  }

  if (user.email === ADMIN_EMAIL) {
    return { error: null, reward: null };
  }

  if (results.length === 0) {
    return { error: null, reward: null };
  }

  // Fetch profile + existing progress in parallel (no dependency)
  const [{ data: profileData }, { data: existingProgressData }] = await Promise.all([
    supabase
      .from("profiles")
      .select("streak_days, last_active_date, points")
      .eq("id", user.id)
      .single(),
    supabase
      .from("study_progress")
      .select("times_seen, times_correct, times_incorrect, is_weak, review_interval, next_review_at, last_reviewed_at, last_studied_at, created_at, id, user_id, flashcard_id")
      .eq("user_id", user.id),
  ]);
  const profile = profileData as Pick<
    Database["public"]["Tables"]["profiles"]["Row"],
    "streak_days" | "last_active_date" | "points"
  > | null;
  const existingProgress = existingProgressData as StudyProgress[] | null;

  const errors: string[] = [];

  await Promise.all(
    results.map(async (result) => {
      const { error } = await upsertStudyProgress("upsert_study_progress", {
        p_user_id: user.id,
        p_flashcard_id: result.flashcardId,
        p_correct: result.correct,
      });
      if (error) {
        errors.push(`${result.flashcardId}: ${error.message}`);
      }
    })
  );

  if (errors.length > 0) {
    return { error: `Failed to save ${errors.length} result(s).`, reward: null };
  }

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const previousStreak = profile?.streak_days ?? 0;
  const previousPoints = profile?.points ?? 0;
  const lastActiveDate = profile?.last_active_date ?? null;

  let streakDays = previousStreak;
  let streakAdvanced = false;

  if (lastActiveDate !== today) {
    streakDays = lastActiveDate === yesterday ? previousStreak + 1 : 1;
    streakAdvanced = true;
  }

  const correctResults = results.filter((result) => result.correct).length;
  const pointsEarned = calculatePointsEarned({
    totalResults: results.length,
    correctResults,
    difficultCount: results.length - correctResults,
    perfectRun: correctResults === results.length,
  });
  const points = previousPoints + pointsEarned;
  const previousLevel = getLevelInfo(previousPoints).level;
  const currentLevel = getLevelInfo(points).level;
  const currentLevelPresentation = getLevelPresentation(points, t);

  const { error: profileError } = await profilesTable
    .update({
      streak_days: streakDays,
      last_active_date: today,
      points,
    })
    .eq("id", user.id);

  if (profileError) {
    return { error: profileError.message, reward: null };
  }

  const prevStats = computeRewardStats(
    existingProgress ?? [],
    previousPoints,
    previousStreak,
    t
  );

  // Project the session results onto existing progress to compute next stats
  // instead of re-fetching all study_progress from the DB (was a duplicate query)
  const projectedProgress = projectSessionResults(existingProgress ?? [], results);
  const nextStats = computeRewardStats(
    projectedProgress,
    points,
    streakDays,
    t
  );
  const unlockedAchievements = getNewAchievements(
    prevStats.achievements.map((badge) => badge.id),
    nextStats.achievements.map((badge) => badge.id),
    t
  );

  const rewardMessages = [
    t("reward.xpEarned", { points: pointsEarned }),
    streakAdvanced
      ? streakDays === 1
        ? t("reward.dailyStreakStarted")
        : t("reward.streakActive", { days: streakDays })
      : t("reward.streakMaintained", { days: streakDays }),
    ...(streakAdvanced && [3, 7, 30].includes(streakDays)
      ? [t(`reward.streakMilestone${streakDays}`)]
      : []),
    ...unlockedAchievements.map((badge) =>
      t("reward.badgeUnlocked", { label: badge.label })
    ),
  ];

  revalidatePath("/dashboard");
  return {
    error: null,
    reward: {
      pointsEarned,
      streakDays,
      unlockedAchievements,
      rewardMessages,
      previousAccuracy: prevStats.accuracy,
      currentAccuracy: nextStats.accuracy,
      accuracyDelta: nextStats.accuracy - prevStats.accuracy,
      previousPoints,
      currentPoints: points,
      previousLevel,
      currentLevel,
      currentLevelName: currentLevelPresentation.name,
      currentLevelReward: currentLevelPresentation.reward,
      nextLevelReward: currentLevelPresentation.nextReward,
    },
  };
}

// ── Toggle weak status manually ──────────────────────────────────────────────

export async function toggleWeakCard(
  flashcardId: string,
  isWeak: boolean
): Promise<{ error: string | null }> {
  const t = createTranslator(await getServerLocale());
  if (DEV_MODE) return { error: null };

  const supabase = await createClient();
  const user = await getCurrentUser();
  const studyProgressTable =
    supabase.from("study_progress") as never as StudyProgressTable;

  if (!user) return { error: t("action.notAuthenticated") };
  if (user.email === ADMIN_EMAIL) return { error: null };

  // Upsert: if no progress row exists yet, create one
  const { error } = await studyProgressTable.upsert(
    {
      user_id: user.id,
      flashcard_id: flashcardId,
      is_weak: isWeak,
    },
    { onConflict: "user_id,flashcard_id" }
  );

  if (error) return { error: error.message };
  return { error: null };
}

// ── Fetch user stats for dashboard ───────────────────────────────────────────

export async function getUserStats(): Promise<UserStats> {
  const t = createTranslator(await getServerLocale());
  const emptyStats: SmartStudyStats = {
    dueToday: 0,
    weakCards: 0,
    mastered: 0,
    totalWithProgress: 0,
  };

  const empty: UserStats = {
    totalStudied: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    accuracy: 0,
    recentActivity: [],
    smart: emptyStats,
    streakDays: 0,
    points: 0,
    xpLevel: 1,
    xpProgress: 0,
    xpCurrentLevelPoints: 0,
    xpRequiredPoints: 100,
    levelName: t("level.nameBeginner"),
    levelMeaning: t("level.meaningBeginner"),
    levelReward: t("level.rewardBeginner"),
    nextLevelReward: t("level.rewardFocused"),
    achievements: [],
    previousWeekStudied: 0,
    currentWeekStudied: 0,
    weeklyStudyDelta: 0,
    lastActiveDate: null,
    studiedToday: false,
    streakAtRisk: false,
  };

  if (DEV_MODE) return empty;

  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) return empty;
  if (user.email === ADMIN_EMAIL) return empty;

  // Fetch progress + profile in parallel (no dependency between them)
  const [{ data: progress }, { data: profileData }] = await Promise.all([
    supabase
      .from("study_progress")
      .select("*")
      .eq("user_id", user.id),
    supabase
      .from("profiles")
      .select("streak_days, points, last_active_date")
      .eq("id", user.id)
      .single(),
  ]);
  const progressRows = progress as StudyProgress[] | null;
  const profile = profileData as Pick<
    Database["public"]["Tables"]["profiles"]["Row"],
    "streak_days" | "points" | "last_active_date"
  > | null;

  const points = profile?.points ?? 0;
  const streakDays = profile?.streak_days ?? 0;
  const lastActiveDate = profile?.last_active_date ?? null;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const studiedToday = lastActiveDate === today;
  const streakAtRisk = streakDays > 0 && lastActiveDate === yesterday;
  const levelInfo = getLevelInfo(points);
  const levelPresentation = getLevelPresentation(points, t);

  if (!progressRows || progressRows.length === 0) {
    return {
      ...empty,
      streakDays,
      points,
      xpLevel: levelInfo.level,
      xpProgress: levelInfo.progressPercent,
      xpCurrentLevelPoints: levelInfo.currentLevelPoints,
      xpRequiredPoints: levelInfo.requiredPoints,
      levelName: levelPresentation.name,
      levelMeaning: levelPresentation.meaning,
      levelReward: levelPresentation.reward,
      nextLevelReward: levelPresentation.nextReward,
      achievements: getAchievements({
        points,
        streakDays,
        totalStudied: 0,
        totalCorrect: 0,
      }, t),
      previousWeekStudied: 0,
      currentWeekStudied: 0,
      weeklyStudyDelta: 0,
      lastActiveDate,
      studiedToday,
      streakAtRisk,
    };
  }

  let totalStudied = 0;
  let totalCorrect = 0;
  let totalIncorrect = 0;

  const dayCounts = new Map<string, number>();

  for (const row of progressRows) {
    totalStudied += row.times_seen;
    totalCorrect += row.times_correct;
    totalIncorrect += row.times_incorrect;

    const day = row.last_studied_at.slice(0, 10);
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }

  const totalAttempts = totalCorrect + totalIncorrect;
  const accuracy =
    totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  // Recent activity (last 7 days)
  const recentActivity: { date: string; count: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    recentActivity.push({ date: key, count: dayCounts.get(key) ?? 0 });
  }

  let currentWeekStudied = 0;
  let previousWeekStudied = 0;
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const count = dayCounts.get(key) ?? 0;
    if (i < 7) {
      currentWeekStudied += count;
    } else {
      previousWeekStudied += count;
    }
  }

  // Smart study stats — progress rows are full StudyProgress type now
  const smart = computeSmartStats(progressRows);

  return {
    totalStudied,
    totalCorrect,
    totalIncorrect,
    accuracy,
    recentActivity,
    smart,
    streakDays,
    points,
    xpLevel: levelInfo.level,
    xpProgress: levelInfo.progressPercent,
    xpCurrentLevelPoints: levelInfo.currentLevelPoints,
    xpRequiredPoints: levelInfo.requiredPoints,
    levelName: levelPresentation.name,
    levelMeaning: levelPresentation.meaning,
    levelReward: levelPresentation.reward,
    nextLevelReward: levelPresentation.nextReward,
    achievements: getAchievements({
      points,
      streakDays,
      totalStudied,
      totalCorrect,
    }, t),
    previousWeekStudied,
    currentWeekStudied,
    weeklyStudyDelta: currentWeekStudied - previousWeekStudied,
    lastActiveDate,
    studiedToday,
    streakAtRisk,
  };
}

// ── Fetch progress for a set's cards (for tags/smart study) ──────────────────

/**
 * Accepts optional pre-fetched flashcardIds to skip a redundant query when
 * the caller already has the flashcards (e.g. set detail page, study page).
 */
export async function getSetProgress(
  setId: string,
  preloadedFlashcardIds?: string[]
): Promise<Map<string, StudyProgress>> {
  const emptyMap = new Map<string, StudyProgress>();
  if (DEV_MODE) return emptyMap;

  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) return emptyMap;
  if (user.email === ADMIN_EMAIL) return emptyMap;

  // Use preloaded IDs if available, otherwise fetch them
  let ids = preloadedFlashcardIds;
  if (!ids) {
    const { data: flashcardData } = await supabase
      .from("flashcards")
      .select("id")
      .eq("set_id", setId);
    const flashcards = flashcardData as { id: string }[] | null;
    if (!flashcards || flashcards.length === 0) return emptyMap;
    ids = flashcards.map((f) => f.id);
  }

  if (ids.length === 0) return emptyMap;

  const { data: progressData } = await supabase
    .from("study_progress")
    .select("*")
    .eq("user_id", user.id)
    .in("flashcard_id", ids);
  const progress = progressData as StudyProgress[] | null;

  const map = new Map<string, StudyProgress>();
  for (const row of progress ?? []) {
    map.set(row.flashcard_id, row);
  }
  return map;
}

/**
 * Projects session results onto existing progress rows to estimate post-upsert
 * stats without a second DB round-trip. Each result increments times_seen and
 * either times_correct or times_incorrect on the matching row (or creates a
 * synthetic row for new cards).
 */
function projectSessionResults(
  existing: StudyProgress[],
  results: CardResult[]
): StudyProgress[] {
  const byCard = new Map(existing.map((row) => [row.flashcard_id, { ...row }]));

  for (const result of results) {
    const row = byCard.get(result.flashcardId);
    if (row) {
      row.times_seen += 1;
      if (result.correct) row.times_correct += 1;
      else row.times_incorrect += 1;
    } else {
      // Synthetic row — computeRewardStats only reads times_seen/correct/incorrect
      byCard.set(result.flashcardId, {
        times_seen: 1,
        times_correct: result.correct ? 1 : 0,
        times_incorrect: result.correct ? 0 : 1,
      } as StudyProgress);
    }
  }

  return Array.from(byCard.values());
}

function computeRewardStats(
  progress: StudyProgress[],
  points: number,
  streakDays: number,
  t: (key: string, vars?: Record<string, string | number>) => string
) {
  let totalStudied = 0;
  let totalCorrect = 0;
  let totalIncorrect = 0;

  for (const row of progress) {
    totalStudied += row.times_seen;
    totalCorrect += row.times_correct;
    totalIncorrect += row.times_incorrect;
  }

  const totalAttempts = totalCorrect + totalIncorrect;
  const accuracy =
    totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  return {
    totalStudied,
    totalCorrect,
    accuracy,
    achievements: getAchievements({
      points,
      streakDays,
      totalStudied,
      totalCorrect,
    }, t),
  };
}

export async function getPersonalizedRecommendations(): Promise<PersonalizedRecommendations> {
  const empty: PersonalizedRecommendations = {
    todayFocus: null,
    recommendedSets: [],
    continueLearning: [],
    weakTopics: [],
    reviewCards: 0,
    weakAreasCount: 0,
    newOpportunities: 0,
  };

  if (DEV_MODE) return empty;

  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) return empty;
  if (user.email === ADMIN_EMAIL) return empty;

  const { data: sets } = await supabase
    .from("flashcard_sets")
    .select("id, title, description, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const ownedSets = (sets ?? []) as {
    id: string;
    title: string;
    description: string | null;
    created_at: string;
  }[];

  if (ownedSets.length === 0) return empty;

  // Fetch flashcards + all user progress in parallel.
  // Filtering progress by cardIds is done in JS to avoid a waterfall.
  const setIds = ownedSets.map((set) => set.id);
  const [{ data: flashcards }, { data: allProgressRows }] = await Promise.all([
    supabase
      .from("flashcards")
      .select("id, set_id")
      .in("set_id", setIds),
    supabase
      .from("study_progress")
      .select("*")
      .eq("user_id", user.id),
  ]);

  const cards = (flashcards ?? []) as { id: string; set_id: string }[];
  if (cards.length === 0) return empty;

  const cardIdSet = new Set(cards.map((card) => card.id));
  const progress = ((allProgressRows ?? []) as StudyProgress[]).filter(
    (row) => cardIdSet.has(row.flashcard_id)
  );
  const progressByCardId = new Map(progress.map((row) => [row.flashcard_id, row]));
  const cardsBySetId = new Map<string, { id: string; set_id: string }[]>();

  for (const card of cards) {
    const group = cardsBySetId.get(card.set_id) ?? [];
    group.push(card);
    cardsBySetId.set(card.set_id, group);
  }

  const recommendedSets: RecommendedSet[] = ownedSets.map((set) => {
    const setCards = cardsBySetId.get(set.id) ?? [];
    let studiedCards = 0;
    let reviewCount = 0;
    let weakCount = 0;
    let dueCount = 0;
    let newCount = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;

    for (const card of setCards) {
      const row = progressByCardId.get(card.id);
      if (!row) {
        newCount += 1;
        continue;
      }

      studiedCards += 1;
      totalCorrect += row.times_correct;
      totalIncorrect += row.times_incorrect;

      const weak = row.is_weak || (row.times_correct + row.times_incorrect > 0
        ? row.times_correct / (row.times_correct + row.times_incorrect) < 0.7
        : false);
      const due = new Date(row.next_review_at) <= new Date();

      if (weak) weakCount += 1;
      if (due) dueCount += 1;
      if (weak || due) reviewCount += 1;
    }

    const attempts = totalCorrect + totalIncorrect;
    const accuracy = attempts > 0 ? Math.round((totalCorrect / attempts) * 100) : 0;
    const recommendationScore =
      weakCount * 9 +
      dueCount * 7 +
      newCount * 4 +
      totalIncorrect * 2 +
      (accuracy > 0 && accuracy < 70 ? 6 : 0);
    const suggestedMode: "review" | "smart" =
      reviewCount > 0 || weakCount > 0 || dueCount > 0 ? "review" : "smart";
    const estimatedMinutes = Math.max(
      5,
      Math.min(
        35,
        reviewCount * 2 + weakCount * 2 + dueCount * 2 + Math.min(newCount, 5) + 4
      )
    );
    const urgency: "high" | "medium" | "low" =
      dueCount >= 4 || weakCount >= 4 || recommendationScore >= 40
        ? "high"
        : dueCount >= 1 || weakCount >= 1 || newCount >= 3
          ? "medium"
          : "low";

    return {
      setId: set.id,
      title: set.title,
      description: set.description,
      createdAt: set.created_at,
      cardCount: setCards.length,
      studiedCards,
      reviewCount,
      weakCount,
      dueCount,
      newCount,
      accuracy,
      recommendationScore,
      suggestedMode,
      estimatedMinutes,
      urgency,
    };
  });

  const sortedByPriority = [...recommendedSets]
    .filter((set) => set.cardCount > 0)
    .sort((a, b) => b.recommendationScore - a.recommendationScore || b.reviewCount - a.reviewCount)
    .slice(0, 3);

  const continueLearning = [...recommendedSets]
    .filter((set) => set.studiedCards > 0 || set.reviewCount > 0)
    .sort((a, b) => {
      const scoreA = a.reviewCount * 8 + a.studiedCards * 2 + a.newCount;
      const scoreB = b.reviewCount * 8 + b.studiedCards * 2 + b.newCount;
      return scoreB - scoreA;
    })
    .slice(0, 3);

  const weakTopics: WeakTopic[] = [...recommendedSets]
    .filter((set) => set.weakCount > 0 || (set.accuracy > 0 && set.accuracy < 70))
    .sort((a, b) => b.weakCount - a.weakCount || a.accuracy - b.accuracy)
    .slice(0, 4)
    .map((set) => ({
      setId: set.setId,
      title: set.title,
      weakCount: set.weakCount,
      dueCount: set.dueCount,
      reviewCount: set.reviewCount,
      accuracy: set.accuracy,
    }));

  const todayFocus =
    [...recommendedSets]
      .filter((set) => set.cardCount > 0)
      .sort(
        (a, b) =>
          b.recommendationScore - a.recommendationScore ||
          b.reviewCount - a.reviewCount ||
          b.weakCount - a.weakCount
      )[0] ?? null;

  return {
    todayFocus,
    recommendedSets: sortedByPriority,
    continueLearning,
    weakTopics,
    reviewCards: recommendedSets.reduce((sum, set) => sum + set.reviewCount, 0),
    weakAreasCount: recommendedSets.reduce((sum, set) => sum + set.weakCount, 0),
    newOpportunities: recommendedSets.reduce((sum, set) => sum + set.newCount, 0),
  };
}
