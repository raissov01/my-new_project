"use server";

import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

type StartAttemptPayload = {
  attemptType: "full_mock" | "pdf_test" | "topic_practice" | "section_practice";
  pdfTestId?: string;
  topicId?: string;
  section?: "full" | "math" | "critical_thinking";
};

type SaveAttemptPayload = {
  answers: Record<string, string>;
  timeTakenSecs: number;
};

type CompleteAttemptPayload = SaveAttemptPayload;

type PracticeAttemptPayload = {
  topicSlug: string;
  answers: Array<{
    questionId: string;
    choice: "A" | "B" | "C" | "D" | "E";
  }>;
};

type PDFTestAttemptPayload = {
  pdfTestId: string;
  answers: Array<"A" | "B" | "C" | "D" | "E" | "">;
};

export type NUETAttemptActionResult = {
  id: string;
  attemptType: "full_mock" | "pdf_test" | "topic_practice" | "section_practice";
  pdfTestId?: string;
  topicId?: string;
  section: "full" | "math" | "critical_thinking";
  status: "in_progress" | "completed" | "abandoned";
  answers?: string;
  correctMath: number;
  correctCt: number;
  scoreMath: number;
  scoreCt: number;
  scoreTotal: number;
  timeTakenSecs: number;
  violationCount: number;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  scoreAvailable: boolean;
  scoreReason?: string;
  evaluations?: Array<{
    question: number;
    section: "math" | "critical_thinking";
    expected: string;
    received: string;
    correct: boolean;
  }>;
};

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated.");
  }
  return user;
}

export async function startNUETAttempt(payload: StartAttemptPayload) {
  const user = await requireUser();

  return fetchBackendJson<NUETAttemptActionResult>({
    path: "/api/v1/nuet/attempts",
    userId: user.id,
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    timeoutMs: 20_000,
  });
}

export async function autosaveNUETAttempt(attemptId: string, payload: SaveAttemptPayload) {
  const user = await requireUser();

  return fetchBackendJson<{ saved: boolean }>({
    path: `/api/v1/nuet/attempts/${attemptId}/save`,
    userId: user.id,
    method: "PUT",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    timeoutMs: 20_000,
  });
}

export async function completeNUETAttempt(attemptId: string, payload: CompleteAttemptPayload) {
  const user = await requireUser();

  return fetchBackendJson<NUETAttemptActionResult>({
    path: `/api/v1/nuet/attempts/${attemptId}/complete`,
    userId: user.id,
    method: "PUT",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    timeoutMs: 30_000,
  });
}

export async function abandonNUETAttempt(attemptId: string) {
  const user = await requireUser();

  return fetchBackendJson<{ status: "abandoned" }>({
    path: `/api/v1/nuet/attempts/${attemptId}/abandon`,
    userId: user.id,
    method: "PUT",
    timeoutMs: 20_000,
  });
}

export async function submitNUETPracticeAttempt(payload: PracticeAttemptPayload) {
  const user = await requireUser();

  return fetchBackendJson<NUETAttemptActionResult>({
    path: "/api/v1/nuet/attempts/practice",
    userId: user.id,
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    timeoutMs: 30_000,
  });
}

export async function submitNUETPDFTestAttempt(payload: PDFTestAttemptPayload) {
  const user = await requireUser();

  return fetchBackendJson<NUETAttemptActionResult>({
    path: "/api/v1/nuet/attempts/pdf-test",
    userId: user.id,
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    timeoutMs: 30_000,
  });
}
