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

// startStudyPlanGeneration enqueues a study-plan generation job on the backend
// and returns the job ID immediately. The actual LLM call runs in a backend
// goroutine; the client polls pollStudyPlanJob() for completion. This avoids
// upstream proxy / Next.js server-action timeouts on long LLM responses.
export async function startStudyPlanGeneration(
  payload: Record<string, unknown>
): Promise<{ jobId: string; error?: never } | { jobId?: never; error: string }> {
  const user = await requireUser();

  try {
    const data = await fetchBackendJson<{ jobId: string; status: string }>({
      path: "/api/v1/ielts/study-plan",
      userId: user.id,
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      timeoutMs: 15_000,
    });
    return { jobId: data.jobId };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to start study plan generation",
    };
  }
}

// pollStudyPlanJob fetches the current status of a generation job. The client
// should call this every few seconds until status is "done" or "failed".
export async function pollStudyPlanJob(
  jobId: string
): Promise<
  | { status: "pending" | "running"; plan?: never; error?: never }
  | { status: "done"; plan: Record<string, unknown>; error?: never }
  | { status: "failed"; plan?: never; error: string }
  | { status: "error"; plan?: never; error: string }
> {
  const user = await requireUser();

  try {
    const data = await fetchBackendJson<{
      jobId: string;
      status: "pending" | "running" | "done" | "failed";
      plan?: Record<string, unknown>;
      error?: string;
    }>({
      path: `/api/v1/ielts/study-plan/jobs/${encodeURIComponent(jobId)}`,
      userId: user.id,
      timeoutMs: 15_000,
    });

    if (data.status === "done" && data.plan) {
      return { status: "done", plan: data.plan };
    }
    if (data.status === "failed") {
      return { status: "failed", error: data.error ?? "Generation failed" };
    }
    if (data.status === "pending" || data.status === "running") {
      return { status: data.status };
    }
    return { status: "error", error: "Unexpected job status" };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "Failed to poll study plan job",
    };
  }
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

export async function getPlanHistory() {
  const user = await requireUser();
  return fetchBackendJson<{ plans: Array<Record<string, unknown>> }>({
    path: "/api/v1/ielts/study-plan/history",
    userId: user.id,
    timeoutMs: 15_000,
  });
}

export async function submitReflection(payload: {
  planId: string;
  week: number;
  completed: string;
  difficult: string;
  improved: string;
  slowedDown: string;
  nextWeek: string;
}) {
  const user = await requireUser();
  return fetchBackendJson<Record<string, unknown>>({
    path: "/api/v1/ielts/study-plan/reflection",
    userId: user.id,
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    timeoutMs: 30_000,
  });
}

export async function getReflections(planId: string) {
  const user = await requireUser();
  return fetchBackendJson<{ reflections: Array<Record<string, unknown>> }>({
    path: `/api/v1/ielts/study-plan/reflections?planId=${planId}`,
    userId: user.id,
    timeoutMs: 15_000,
  });
}

export async function checkAdaptive() {
  const user = await requireUser();
  return fetchBackendJson<{
    status: string;
    level: number;
    message: string;
    currentWeek: number;
    lastWeek: { planned: number; completed: number; completionRate: number };
    twoWeeksAgo: { planned: number; completed: number; completionRate: number };
  }>({
    path: "/api/v1/ielts/study-plan/adaptive",
    userId: user.id,
    timeoutMs: 15_000,
  });
}