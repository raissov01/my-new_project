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

export type NUETSimulatorQuestion = {
  id: string;
  number: number;
  section: "math" | "critical_thinking";
  difficulty: "beginner" | "medium" | "advanced";
  prompt: string;
  options: string[];
};

type SimulatorStartPayload = {
  section: "full" | "math" | "ct";
  strict: boolean;
};

export type NUETSimulatorStartResponse = {
  attempt: NUETAttemptActionResult;
  questions: NUETSimulatorQuestion[];
  durationMinutes: number;
  strictMode: boolean;
};

export type NUETSimulatorStartResult =
  | { ok: true; data: NUETSimulatorStartResponse }
  | { ok: false; error: string };

type SimulatorSavePayload = {
  answers: Record<string, string>;
  marked: string[];
  timeTakenSecs: number;
};

type SimulatorCompletePayload = SimulatorSavePayload;

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

export async function startNUETSimulator(payload: SimulatorStartPayload): Promise<NUETSimulatorStartResult> {
  try {
    const user = await requireUser();
    const data = await fetchBackendJson<NUETSimulatorStartResponse>({
      path: "/api/v1/nuet/simulator/start",
      userId: user.id,
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      timeoutMs: 30_000,
    });
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to start simulator" };
  }
}

export async function autosaveNUETSimulator(attemptId: string, payload: SimulatorSavePayload) {
  const user = await requireUser();

  return fetchBackendJson<{ saved: boolean; lastSavedAt: string }>({
    path: `/api/v1/nuet/simulator/${attemptId}/save`,
    userId: user.id,
    method: "PUT",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    timeoutMs: 20_000,
  });
}

export async function completeNUETSimulator(attemptId: string, payload: SimulatorCompletePayload) {
  const user = await requireUser();

  return fetchBackendJson<NUETAttemptActionResult>({
    path: `/api/v1/nuet/simulator/${attemptId}/complete`,
    userId: user.id,
    method: "PUT",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    timeoutMs: 30_000,
  });
}

export async function logNUETSimulatorViolation(
  attemptId: string,
  payload: { type: "tab_switch" | "fullscreen_exit" | "copy" | "paste" | "right_click" | "dev_tools" | "blur"; details?: string }
) {
  const user = await requireUser();

  return fetchBackendJson<{ id: string; violationCount: number; status: "in_progress" | "abandoned" | "completed" }>({
    path: `/api/v1/nuet/simulator/${attemptId}/violations`,
    userId: user.id,
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    timeoutMs: 20_000,
  });
}
