"use server";

import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

export type BillingStatus = {
  plan: "free" | "pro";
  isPro: boolean;
  checkoutURL: string;
  subStatus?: string;
  currentPeriodEnd?: string;
};

export async function getBillingStatus(): Promise<BillingStatus | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  try {
    return await fetchBackendJson<BillingStatus>({
      path: "/api/v1/billing/status",
      userId: user.id,
    });
  } catch {
    return null;
  }
}
