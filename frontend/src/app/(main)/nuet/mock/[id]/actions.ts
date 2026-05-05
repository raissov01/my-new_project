"use server";

import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

export type NUETMockQuestion = {
  id: string;
  number: number;
  section: "math" | "critical_thinking";
  difficulty: "beginner" | "medium" | "advanced";
  prompt: string;
  options: string[];
};

export type NUETMockAttempt = {
  id: string;
  attemptType: "full_mock" | "pdf_test" | "topic_practice" | "section_practice";
  pdfTestId?: string;
  pdfTestName?: string;
  section: "full" | "math" | "critical_thinking";
  status: "in_progress" | "completed" | "abandoned";
  strictMode: boolean;
  answers?: string;
  questionSet?: string;
  results?: string;
  correctMath: number;
  correctCt: number;
  scoreMath: number;
  scoreCt: number;
  scoreTotal: number;
  timeTakenSecs: number;
  violationCount: number;
  startedAt: string;
  completedAt?: string;
  lastSavedAt?: string;
  createdAt: string;
  scoreAvailable: boolean;
  scoreReason?: string;
  evaluations?: Array<{
    question: number;
    questionId?: string;
    section: "math" | "critical_thinking";
    prompt?: string;
    explanation?: string;
    expected: string;
    received: string;
    correct: boolean;
  }>;
};

export type NUETMockStartResponse = {
  attempt: NUETMockAttempt;
  testName: string;
  questions: NUETMockQuestion[];
  durationMinutes: number;
};

export type NUETMockResultItem = {
  questionId: string;
  expected: "A" | "B" | "C" | "D" | "E" | "";
  given: "A" | "B" | "C" | "D" | "E" | "";
  correct: boolean;
  explanation: string;
};

export type NUETMockCompleteResponse = {
  attempt: NUETMockAttempt;
  results: NUETMockResultItem[];
};

type SavePayload = {
  answers: Record<string, string>;
  timeTakenSecs: number;
};

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated.");
  }
  return user;
}

export async function startNUETMockAttempt(testId: string) {
  const user = await requireUser();
  return fetchBackendJson<NUETMockStartResponse>({
    path: `/api/v1/nuet/mock/${encodeURIComponent(testId)}/start`,
    userId: user.id,
    method: "POST",
    timeoutMs: 45_000,
  });
}

export async function saveNUETMockAttempt(attemptId: string, payload: SavePayload) {
  const user = await requireUser();
  return fetchBackendJson<{ saved: boolean; lastSavedAt: string }>({
    path: `/api/v1/nuet/mock/attempts/${encodeURIComponent(attemptId)}/save`,
    userId: user.id,
    method: "PUT",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    timeoutMs: 20_000,
  });
}

export async function completeNUETMockAttempt(attemptId: string, payload: SavePayload) {
  const user = await requireUser();
  return fetchBackendJson<NUETMockCompleteResponse>({
    path: `/api/v1/nuet/mock/attempts/${encodeURIComponent(attemptId)}/complete`,
    userId: user.id,
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    timeoutMs: 45_000,
  });
}
