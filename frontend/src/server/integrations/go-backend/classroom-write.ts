import "server-only";

import { fetchBackendJson } from "./server";

type CreateClassGroupPayload = {
  name: string;
  members: string;
};

type CreateClassGroupResponse = {
  groupId: string;
  joinCode: string;
};

export async function createClassGroupViaGo(
  userId: string,
  payload: CreateClassGroupPayload
): Promise<CreateClassGroupResponse> {
  return fetchBackendJson<CreateClassGroupResponse>({
    path: "/api/v1/classroom/groups",
    userId,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    timeoutMs: 10_000,
  });
}
