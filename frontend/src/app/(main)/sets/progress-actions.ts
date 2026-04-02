"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { DEV_MODE } from "@/lib/shared/auth/dev-mode";
import { type SmartStudyStats } from "@/lib/shared/study/spaced-repetition";
import {
  getAchievements,
  getLevelPresentation,
  getNewAchievements,
  type Achievement,
} from "@/lib/shared/study/gamification";
import type { StudyProgress } from "@/lib/shared/types/database";
import { ADMIN_EMAIL } from "@/lib/shared/auth/admin";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";

// ── Types (kept for frontend compatibility) ─────────────────────────────────

export type CardResult = {
  flashcardId: string;
  correct: boolean;
};

export type UserStats = {
  totalStudied: number;
  totalCorrect: number;
  totalIncorrect: number;
  accuracy: number;
  recentActivity: { date: string; count: number }[];
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

// ── Helpers ─────────────────────────────────────────────────────────────────

async function requireUser() {
  const user = await getCurrentUser();
  if (!user || DEV_MODE) return null;
  if (user.email === ADMIN_EMAIL) return null;
  return user;
}

const EMPTY_STATS: UserStats = {
  totalStudied: 0,
  totalCorrect: 0,
  totalIncorrect: 0,
  accuracy: 0,
  recentActivity: [],
  smart: { dueToday: 0, weakCards: 0, mastered: 0, totalWithProgress: 0 },
  streakDays: 0,
  points: 0,
  xpLevel: 1,
  xpProgress: 0,
  xpCurrentLevelPoints: 0,
  xpRequiredPoints: 100,
  levelName: "Beginner",
  levelMeaning: "",
  levelReward: "",
  nextLevelReward: "",
  achievements: [],
  previousWeekStudied: 0,
  currentWeekStudied: 0,
  weeklyStudyDelta: 0,
  lastActiveDate: null,
  studiedToday: false,
  streakAtRisk: false,
};

// ── Save session results → Go backend ───────────────────────────────────────

export async function saveSessionResults(
  results: CardResult[]
): Promise<{ error: string | null; reward: StudyReward | null }> {
  if (DEV_MODE) return { error: null, reward: null };

  const user = await requireUser();
  if (!user) return { error: null, reward: null };
  if (results.length === 0) return { error: null, reward: null };

  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const beforeStats = await getUserStats();

  try {
    const resp = await fetchBackendJson<{
      error?: string;
      reward?: {
        pointsEarned: number;
        streakDays: number;
        previousPoints: number;
        currentPoints: number;
        previousLevel: number;
        currentLevel: number;
        levelName: string;
        accuracy: number;
      };
    }>({
      path: "/api/v1/progress/session",
      userId: user.id,
      method: "POST",
      body: JSON.stringify({ results }),
      headers: { "Content-Type": "application/json" },
    });

    revalidatePath("/dashboard");
    revalidatePath("/profile");

    if (!resp.reward) {
      return { error: resp.error ?? null, reward: null };
    }

    const correctResults = results.filter((result) => result.correct).length;
    const level = getLevelPresentation(resp.reward.currentPoints, t);
    const afterAchievements = getAchievements(
      {
        points: resp.reward.currentPoints,
        streakDays: resp.reward.streakDays,
        totalStudied: beforeStats.totalStudied + results.length,
        totalCorrect: beforeStats.totalCorrect + correctResults,
      },
      t
    );

    const reward: StudyReward = {
      pointsEarned: resp.reward.pointsEarned,
      streakDays: resp.reward.streakDays,
      unlockedAchievements: getNewAchievements(
        beforeStats.achievements.map((achievement) => achievement.id),
        afterAchievements.map((achievement) => achievement.id),
        t
      ),
      rewardMessages: [
        t("study.xpRewardMessage", { points: resp.reward.pointsEarned }),
        t("study.streakRewardMessage", { days: resp.reward.streakDays }),
      ],
      previousAccuracy: beforeStats.accuracy,
      currentAccuracy: resp.reward.accuracy,
      accuracyDelta: resp.reward.accuracy - beforeStats.accuracy,
      previousPoints: resp.reward.previousPoints,
      currentPoints: resp.reward.currentPoints,
      previousLevel: resp.reward.previousLevel,
      currentLevel: resp.reward.currentLevel,
      currentLevelName: level.name,
      currentLevelReward: level.reward,
      nextLevelReward: level.nextReward,
    };

    return { error: resp.error ?? null, reward };
  } catch (err) {
    console.error("[saveSessionResults] Go backend error:", err);
    return { error: "Failed to save session. Please try again.", reward: null };
  }
}

// ── Toggle weak card → Go backend ───────────────────────────────────────────

export async function toggleWeakCard(
  flashcardId: string,
  isWeak: boolean
): Promise<{ error: string | null }> {
  if (DEV_MODE) return { error: null };

  const user = await requireUser();
  if (!user) return { error: null };

  try {
    await fetchBackendJson({
      path: "/api/v1/progress/toggle-weak",
      userId: user.id,
      method: "POST",
      body: JSON.stringify({ flashcardId, isWeak }),
      headers: { "Content-Type": "application/json" },
    });
    return { error: null };
  } catch (err) {
    console.error("[toggleWeakCard] Go backend error:", err);
    return { error: "Failed to update card status." };
  }
}

// ── Get user stats → Go backend ─────────────────────────────────────────────

export async function getUserStats(): Promise<UserStats> {
  if (DEV_MODE) return EMPTY_STATS;

  const user = await requireUser();
  if (!user) return EMPTY_STATS;

  try {
    const locale = await getServerLocale();
    const t = createTranslator(locale);
    const raw = await fetchBackendJson<{
      totalStudied: number;
      totalCorrect: number;
      totalIncorrect: number;
      accuracy: number;
      recentActivity: { date: string; count: number }[];
      smart: SmartStudyStats;
      streakDays: number;
      points: number;
      xpLevel: number;
      xpProgress: number;
      levelName: string;
      studiedToday: boolean;
      streakAtRisk: boolean;
    }>({
      path: "/api/v1/progress/stats",
      userId: user.id,
    });

    const level = getLevelPresentation(raw.points, t);
    const achievements = getAchievements(
      {
        points: raw.points,
        streakDays: raw.streakDays,
        totalStudied: raw.totalStudied,
        totalCorrect: raw.totalCorrect,
      },
      t
    );
    const currentWeekStudied = (raw.recentActivity ?? []).reduce(
      (sum, day) => sum + day.count,
      0
    );
    const lastActiveDate =
      [...(raw.recentActivity ?? [])]
        .reverse()
        .find((day) => day.count > 0)?.date ?? null;

    return {
      totalStudied: raw.totalStudied,
      totalCorrect: raw.totalCorrect,
      totalIncorrect: raw.totalIncorrect,
      accuracy: raw.accuracy,
      recentActivity: raw.recentActivity ?? [],
      smart: raw.smart,
      streakDays: raw.streakDays,
      points: raw.points,
      xpLevel: level.level,
      xpProgress: level.progressPercent,
      xpCurrentLevelPoints: level.currentLevelPoints,
      xpRequiredPoints: level.requiredPoints,
      levelName: level.name,
      levelMeaning: level.meaning,
      levelReward: level.reward,
      nextLevelReward: level.nextReward,
      achievements,
      previousWeekStudied: 0,
      currentWeekStudied,
      weeklyStudyDelta: currentWeekStudied,
      lastActiveDate,
      studiedToday: raw.studiedToday,
      streakAtRisk: raw.streakAtRisk,
    };
  } catch (err) {
    console.error("[getUserStats] Go backend error:", err);
    return EMPTY_STATS;
  }
}

// ── Get set progress → Go backend ───────────────────────────────────────────

export async function getSetProgress(
  setId: string,
  _preloadedFlashcardIds?: string[]
): Promise<Map<string, StudyProgress>> {
  if (DEV_MODE) return new Map();

  const user = await requireUser();
  if (!user) return new Map();

  try {
    const data = await fetchBackendJson<Record<string, StudyProgress>>({
      path: `/api/v1/progress/set/${encodeURIComponent(setId)}`,
      userId: user.id,
    });

    const map = new Map<string, StudyProgress>();
    for (const [key, value] of Object.entries(data)) {
      map.set(key, value);
    }
    return map;
  } catch {
    // Fallback: return empty map if Go backend doesn't have this endpoint yet
    return new Map();
  }
}

// ── Get personalized recommendations → Go backend ───────────────────────────

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

  const user = await requireUser();
  if (!user) return empty;

  try {
    return await fetchBackendJson<PersonalizedRecommendations>({
      path: "/api/v1/progress/recommendations",
      userId: user.id,
    });
  } catch {
    return empty;
  }
}
