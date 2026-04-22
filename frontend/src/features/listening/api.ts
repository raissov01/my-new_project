"use server";

import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

export interface VocabItem { word: string; definition: string; example: string }

export interface ListeningQuestion {
  id: string;
  clipId: string;
  questionType: "comprehension" | "fill_blank" | "true_false" | "dictation";
  prompt: string;
  options?: string[];
  correctAnswer: unknown;
  timestampStart?: number;
  timestampEnd?: number;
}

export interface ListeningClip {
  id: string;
  title: string;
  level: string;
  topic: string;
  audioUrl: string;
  durationSeconds: number;
  transcript: string;
  source: string;
  sourceUrl?: string;
  license: string;
  sourcePodcast?: string;
  vocabulary?: VocabItem[] | string;
  createdAt: string;
}

export interface ClipWithQuestions {
  clip: ListeningClip;
  questions: ListeningQuestion[];
}

export async function getListeningClips(params?: {
  level?: string;
  topic?: string;
  source?: string;
}): Promise<ListeningClip[]> {
  const user = await getCurrentUser();
  const qs = new URLSearchParams();
  if (params?.level) qs.set("level", params.level);
  if (params?.topic) qs.set("topic", params.topic);
  if (params?.source) qs.set("source", params.source);
  const suffix = qs.toString() ? `?${qs}` : "";
  try {
    const data = await fetchBackendJson<{ clips: ListeningClip[] }>({
      path: `/api/v1/listening/clips${suffix}`,
      userId: user?.id ?? "",
    });
    return data.clips ?? [];
  } catch {
    return [];
  }
}

export async function getListeningClip(id: string): Promise<ClipWithQuestions | null> {
  const user = await getCurrentUser();
  try {
    return await fetchBackendJson<ClipWithQuestions>({
      path: `/api/v1/listening/clips/${id}`,
      userId: user?.id ?? "",
    });
  } catch {
    return null;
  }
}

export async function recordListeningProgress(
  clipId: string,
  score: number,
  completed: boolean
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await fetchBackendJson({
    path: "/api/v1/listening/progress",
    userId: user.id,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clipId, score, completed }),
  }).catch(() => {});
}
