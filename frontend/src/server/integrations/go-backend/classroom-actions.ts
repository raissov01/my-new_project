import "server-only";

import { fetchBackendJson } from "./server";

export async function joinClassByCodeViaGo(userId: string, joinCode: string) {
  return fetchBackendJson<{ groupId: string }>({
    path: "/api/v1/classroom/join-by-code",
    userId,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ joinCode }),
    timeoutMs: 10_000,
  });
}

export async function assignClassSetViaGo(
  userId: string,
  payload: { groupId: string; setId: string; deadline: string | null }
) {
  return fetchBackendJson<{ status: string }>({
    path: "/api/v1/classroom/assign-set",
    userId,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    timeoutMs: 10_000,
  });
}

export async function assignClassQuizViaGo(
  userId: string,
  payload: { groupId: string; quizId: string; deadline: string | null }
) {
  return fetchBackendJson<{ status: string }>({
    path: "/api/v1/classroom/assign-quiz",
    userId,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    timeoutMs: 10_000,
  });
}

export async function createClassChallengeViaGo(
  userId: string,
  payload: { groupId: string; setId: string; title: string; deadline: string | null }
) {
  return fetchBackendJson<{ challengeId: string }>({
    path: "/api/v1/classroom/challenges",
    userId,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    timeoutMs: 10_000,
  });
}

export async function joinClassChallengeViaGo(userId: string, challengeId: string) {
  return fetchBackendJson<{ status: string }>({
    path: "/api/v1/classroom/challenges/join",
    userId,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ challengeId }),
    timeoutMs: 10_000,
  });
}
