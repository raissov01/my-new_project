// Shared paywall types — safe to import from both client and server code.
// The matching server-only BackendError lives in server/integrations/go-backend/server.ts.

export type PaywallInfo = {
  error: "quota_exceeded";
  feature: string;
  limit: number;
  tier: "free";
  upgrade: string;
  message: string;
};

export function isPaywall(value: unknown): value is PaywallInfo {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v.error === "quota_exceeded" && typeof v.feature === "string";
}
