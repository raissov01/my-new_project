"use server";

import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

export type IELTSAttempt = {
  id: string;
  userId: string;
  attemptType: "full_mock" | "section_practice" | "writing_practice" | "speaking_practice";
  mockType: "cambridge_style" | "predictions";
  examSet: string;
  section: "full" | "reading" | "listening" | "writing" | "speaking";
  bandTarget: string;
  status: "in_progress" | "completed" | "abandoned";
  strictMode: boolean;
  answers?: string;
  sectionProgress?: string;
  violationCount: number;
  results?: string;
  timeTakenSecs: number;
  startedAt: string;
  completedAt?: string;
  lastSavedAt: string;
  createdAt: string;
};

type StartAttemptPayload = {
  attemptType: IELTSAttempt["attemptType"];
  mockType: IELTSAttempt["mockType"];
  examSet?: string;
  section: IELTSAttempt["section"];
  bandTarget: string;
  strictMode: boolean;
};

type AutoSavePayload = {
  answers: Record<string, string>;
  sectionProgress?: Record<string, boolean>;
  timeTakenSecs: number;
};

type CompleteAttemptPayload = {
  answers: Record<string, string>;
  timeTakenSecs: number;
  results: Record<string, unknown>;
};

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated.");
  }
  return user;
}

export async function startAttempt(payload: StartAttemptPayload) {
  const user = await requireUser();

  return fetchBackendJson<IELTSAttempt>({
    path: "/api/v1/ielts/attempts",
    userId: user.id,
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    timeoutMs: 30_000,
  });
}

export async function autosaveAttempt(attemptId: string, payload: AutoSavePayload) {
  const user = await requireUser();

  return fetchBackendJson<{ lastSavedAt: string }>({
    path: `/api/v1/ielts/attempts/${attemptId}/save`,
    userId: user.id,
    method: "PUT",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    timeoutMs: 20_000,
  });
}

export async function completeAttempt(attemptId: string, payload: CompleteAttemptPayload) {
  const user = await requireUser();

  return fetchBackendJson<IELTSAttempt>({
    path: `/api/v1/ielts/attempts/${attemptId}/complete`,
    userId: user.id,
    method: "PUT",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    timeoutMs: 30_000,
  });
}

export async function abandonAttempt(attemptId: string) {
  const user = await requireUser();

  return fetchBackendJson<{ status: "abandoned" }>({
    path: `/api/v1/ielts/attempts/${attemptId}/abandon`,
    userId: user.id,
    method: "PUT",
    timeoutMs: 20_000,
  });
}

export async function getAttempt(attemptId: string) {
  const user = await requireUser();

  return fetchBackendJson<IELTSAttempt>({
    path: `/api/v1/ielts/attempts/${attemptId}`,
    userId: user.id,
    timeoutMs: 20_000,
  });
}

export async function logAttemptViolation(
  attemptId: string,
  payload: { type: string; details?: string }
) {
  const user = await requireUser();

  return fetchBackendJson<{ id: string; violationCount: number }>({
    path: `/api/v1/ielts/attempts/${attemptId}/violations`,
    userId: user.id,
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    timeoutMs: 15_000,
  });
}

export async function listAttempts() {
  const user = await requireUser();

  return fetchBackendJson<{ attempts: IELTSAttempt[]; total: number; limit: number; offset: number }>({
    path: "/api/v1/ielts/attempts?limit=20",
    userId: user.id,
    timeoutMs: 20_000,
  });
}

export async function getIELTSDashboard() {
  const user = await requireUser();

  return fetchBackendJson<Record<string, unknown>>({
    path: "/api/v1/ielts/dashboard",
    userId: user.id,
    timeoutMs: 20_000,
  });
}

export async function getIELTSWeakness() {
  const user = await requireUser();

  return fetchBackendJson<Record<string, unknown>>({
    path: "/api/v1/ielts/dashboard/weakness",
    userId: user.id,
    timeoutMs: 20_000,
  });
}

export async function getStudyPlan() {
  const user = await requireUser();

  return fetchBackendJson<{ plan: Record<string, unknown> | null }>({
    path: "/api/v1/ielts/study-plan",
    userId: user.id,
    timeoutMs: 20_000,
  });
}

export async function generateStudyPlan(payload: Record<string, unknown>) {
  const user = await requireUser();

  return fetchBackendJson<{ plan: Record<string, unknown> }>({
    path: "/api/v1/ielts/study-plan",
    userId: user.id,
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    timeoutMs: 90_000,
  });
}

export async function completeStudyTask(payload: {
  planId: string;
  week: number;
  day: string;
  skill: string;
  activity: string;
  status: string;
  note?: string;
}) {
  const user = await requireUser();

  return fetchBackendJson<Record<string, unknown>>({
    path: "/api/v1/ielts/study-plan/task",
    userId: user.id,
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    timeoutMs: 15_000,
  });
}

export async function getTaskCompletions(planId: string) {
  const user = await requireUser();

  return fetchBackendJson<{ completions: Array<{ week: number; day: string; skill: string; status: string }> }>({
    path: `/api/v1/ielts/study-plan/tasks?planId=${planId}`,
    userId: user.id,
    timeoutMs: 15_000,
  });
}

export async function getRoadmapProgress() {
  const user = await requireUser();

  return fetchBackendJson<{
    progress: {
      planId: string;
      targetBand: string;
      currentBand: string;
      examDate: string | null;
      daysLeft: number;
      currentWeek: number;
      totalPlannedTasks: number;
      completedTasks: number;
      skippedTasks: number;
      completionPercent: number;
      readiness: string;
      weakSections: string[];
      prioritySkills: string[];
    } | null;
  }>({
    path: "/api/v1/ielts/study-plan/progress",
    userId: user.id,
    timeoutMs: 15_000,
  });
}