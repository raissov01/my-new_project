"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

export type IELTSMaterial = {
  id: string;
  title: string;
  description: string;
  content: string;
  category: "reading" | "writing" | "speaking" | "listening" | "vocabulary" | "grammar" | "general";
  type: "lesson" | "practice" | "tip" | "book" | "mock_test" | "feedback_prompt";
  difficulty: string;
  filePath: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type MaterialFormState = {
  error: string | null;
};

export async function getMaterials(
  category?: string,
  type?: string
): Promise<IELTSMaterial[]> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (type) params.set("type", type);
  const qs = params.toString();
  const path = `/api/v1/ielts/materials${qs ? `?${qs}` : ""}`;

  try {
    const resp = await fetchBackendJson<{ items: IELTSMaterial[] }>({
      path,
      userId: "anonymous",
    });
    return resp.items ?? [];
  } catch {
    return [];
  }
}

export async function createMaterial(
  title: string,
  content: string,
  category: string,
  type: string,
  sortOrder: number
): Promise<MaterialFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  try {
    await fetchBackendJson({
      path: "/api/v1/ielts/materials",
      userId: user.id,
      method: "POST",
      body: JSON.stringify({ title, content, category, type, sortOrder }),
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    return { error: msg || "Failed to create material." };
  }

  revalidatePath("/ielts/materials");
  revalidatePath("/ielts/admin");
  return { error: null };
}

export async function updateMaterial(
  id: string,
  title: string,
  content: string,
  category: string,
  type: string,
  sortOrder: number
): Promise<MaterialFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  try {
    await fetchBackendJson({
      path: `/api/v1/ielts/materials/${encodeURIComponent(id)}`,
      userId: user.id,
      method: "PUT",
      body: JSON.stringify({ title, content, category, type, sortOrder }),
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    return { error: msg || "Failed to update material." };
  }

  revalidatePath("/ielts/materials");
  revalidatePath("/ielts/admin");
  return { error: null };
}

export async function deleteMaterial(id: string): Promise<MaterialFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  try {
    await fetchBackendJson({
      path: `/api/v1/ielts/materials/${encodeURIComponent(id)}`,
      userId: user.id,
      method: "DELETE",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    return { error: msg || "Failed to delete material." };
  }

  revalidatePath("/ielts/materials");
  revalidatePath("/ielts/admin");
  return { error: null };
}
