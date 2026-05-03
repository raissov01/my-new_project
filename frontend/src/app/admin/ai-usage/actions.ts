"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

export async function updateAICostCaps(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.user) return { ok: false, error: "unauthorized" };

  const userCap = Number(formData.get("dailyUserUsdCap") ?? "0");
  const globalCap = Number(formData.get("dailyGlobalUsdCap") ?? "0");

  if (!Number.isFinite(userCap) || !Number.isFinite(globalCap) || userCap < 0 || globalCap < 0) {
    return { ok: false, error: "caps must be non-negative numbers" };
  }

  try {
    await fetchBackendJson({
      path: "/api/v1/admin/ai-usage/settings",
      userId: auth.user.id,
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dailyUserUsdCap: userCap,
        dailyGlobalUsdCap: globalCap,
      }),
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "save failed" };
  }

  revalidatePath("/admin/ai-usage");
  return { ok: true };
}
