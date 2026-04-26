"use server";

import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { redirect } from "next/navigation";

export type PushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export async function savePushSubscription(sub: PushSubscriptionPayload): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await fetchBackendJson({
    path: "/api/v1/push/subscribe",
    userId: user.id,
    method: "POST",
    body: JSON.stringify(sub),
    headers: { "Content-Type": "application/json" },
  });

  return { ok: true };
}

export async function deletePushSubscription(endpoint: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await fetchBackendJson({
    path: "/api/v1/push/subscribe",
    userId: user.id,
    method: "DELETE",
    body: JSON.stringify({ endpoint }),
    headers: { "Content-Type": "application/json" },
  });

  return { ok: true };
}
