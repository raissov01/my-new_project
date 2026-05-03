"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

export async function deleteOrphan(
  dir: string,
  name: string,
): Promise<{ ok: boolean; error?: string; bytes?: number }> {
  const auth = await requireAdmin();
  if (!auth.user) return { ok: false, error: "unauthorized" };

  try {
    const res = await fetchBackendJson<{ deleted: string; bytes: number }>({
      path: `/api/v1/admin/storage/orphans?dir=${encodeURIComponent(dir)}&name=${encodeURIComponent(name)}`,
      userId: auth.user.id,
      method: "DELETE",
    });
    revalidatePath("/admin/storage");
    return { ok: true, bytes: res.bytes };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "delete failed" };
  }
}

export async function bulkDeleteOrphans(
  dir: string,
  olderThanDays: number,
): Promise<{ ok: boolean; deleted?: number; bytesFreed?: number; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.user) return { ok: false, error: "unauthorized" };

  try {
    const res = await fetchBackendJson<{ deleted: number; bytesFreed: number }>({
      path: `/api/v1/admin/storage/orphans/bulk?dir=${encodeURIComponent(dir)}&olderThanDays=${olderThanDays}`,
      userId: auth.user.id,
      method: "POST",
      timeoutMs: 60_000,
    });
    revalidatePath("/admin/storage");
    return { ok: true, deleted: res.deleted, bytesFreed: res.bytesFreed };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "bulk delete failed" };
  }
}
