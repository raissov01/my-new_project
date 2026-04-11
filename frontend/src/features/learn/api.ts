"use server";

import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

// ── Types ──

export type PlacementQuestion = {
  level: string;
  type: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

export type Placement = {
  id: string;
  userId: string;
  level: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  completedAt: string;
};

export type EngSimLesson = {
  id: string;
  unitId: string;
  sortOrder: number;
  title: string;
  lessonType: string;
  bestStars: number;
  attempts: number;
  bestAccuracy: number;
  isCompleted: boolean;
};

export type EngSimUnit = {
  id: string;
  level: string;
  sortOrder: number;
  title: string;
  description: string;
  ieltsSkill: string;
  iconEmoji: string;
  color: string;
  lessons: EngSimLesson[];
  totalStars: number;
  maxStars: number;
  isUnlocked: boolean;
};

export type UserProgress = {
  id: string;
  userId: string;
  currentLevel: string;
  totalXp: number;
  hearts: number;
  heartsRefillAt: string | null;
  currentStreak: number;
  longestStreak: number;
  lessonsCompleted: number;
};

export type Exercise = {
  type: "fill_blank" | "grammar_choice" | "word_order";
  prompt: string;
  data: any;
};

// ── Server Actions ──

export async function getPlacement() {
  const user = await getCurrentUser();
  if (!user) return null;
  try {
    const res = await fetchBackendJson<{ placement: Placement | null }>({
      path: "/api/v1/engsim/placement",
      userId: user.id,
    });
    return res.placement;
  } catch {
    return null;
  }
}

export async function startPlacement() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return fetchBackendJson<{ questions?: any; alreadyDone?: boolean; placement?: Placement }>({
    path: "/api/v1/engsim/placement/start",
    userId: user.id,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
    timeoutMs: 120_000,
  });
}

export async function submitPlacement(data: {
  answers: number[];
  totalQuestions: number;
  correctAnswers: number;
  levelScores: Record<string, number>;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return fetchBackendJson<{ placement: Placement; level: string }>({
    path: "/api/v1/engsim/placement/submit",
    userId: user.id,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function getMap() {
  const user = await getCurrentUser();
  if (!user) return { units: [] };
  return fetchBackendJson<{ units: EngSimUnit[] }>({
    path: "/api/v1/engsim/map",
    userId: user.id,
  });
}

export async function getProgress() {
  const user = await getCurrentUser();
  if (!user) return null;
  try {
    const res = await fetchBackendJson<{ progress: UserProgress }>({
      path: "/api/v1/engsim/progress",
      userId: user.id,
    });
    return res.progress;
  } catch {
    return null;
  }
}

export async function startLesson(lessonId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return fetchBackendJson<{ session: any; exercises: any }>({
    path: `/api/v1/engsim/lessons/${lessonId}/start`,
    userId: user.id,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
    timeoutMs: 120_000,
  });
}

export async function submitAnswer(lessonId: string, data: {
  sessionId: string;
  exerciseIndex: number;
  isCorrect: boolean;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return fetchBackendJson<{ recorded: boolean; heartsRemaining: number }>({
    path: `/api/v1/engsim/lessons/${lessonId}/answer`,
    userId: user.id,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function completeLesson(lessonId: string, data: {
  sessionId: string;
  timeTakenSecs: number;
  comboMax: number;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return fetchBackendJson<{
    stars: number;
    xpEarned: number;
    accuracy: number;
    comboMax: number;
    totalXP: number;
    streak: number;
  }>({
    path: `/api/v1/engsim/lessons/${lessonId}/complete`,
    userId: user.id,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
