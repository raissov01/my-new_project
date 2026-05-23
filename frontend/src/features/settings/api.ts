"use server";

import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

export type FeatureQuota = {
  limit: number;     // 0 = ungated for this feature
  used: number;      // calls in the last 24h
  remaining: number; // -1 means unlimited (pro/trial), otherwise clamped at 0
};

export type BillingStatus = {
  plan: "free" | "pro";
  isPro: boolean;
  tier: "free" | "pro";
  inTrial: boolean;
  trialEndsAt?: string;
  checkoutURL: string;
  subStatus?: string;
  currentPeriodEnd?: string;
  features: Record<string, FeatureQuota>;
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
