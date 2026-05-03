"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

export async function runJobNow(name: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.user) return { ok: false, error: "unauthorized" };

  try {
    await fetchBackendJson({
      path: `/api/v1/admin/jobs/${encodeURIComponent(name)}/run`,
      userId: auth.user.id,
      method: "POST",
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "trigger failed" };
  }

  revalidatePath("/admin/jobs");
  return { ok: true };
}
