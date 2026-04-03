"use server";

import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

export type WritingResult = {
  id: string;
  overallBand: number;
  taskAchievement: number;
  coherence: number;
  lexicalResource: number;
  grammar: number;
  feedback: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    detailedFeedback: string;
  };
  wordCount: number;
  aiModel: string;
};

export type WritingHistoryItem = {
  id: string;
  taskType: string;
  prompt: string;
  overallBand: number;
  wordCount: number;
  createdAt: string;
};

export async function evaluateWriting(
  taskType: string,
  prompt: string,
  essay: string,
  timeTakenSecs?: number
): Promise<{ result?: WritingResult; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  try {
    const result = await fetchBackendJson<WritingResult>({
      path: "/api/v1/ielts/writing/evaluate",
      userId: user.id,
      method: "POST",
      body: JSON.stringify({ taskType, prompt, essay, timeTakenSecs }),
      headers: { "Content-Type": "application/json" },
      timeoutMs: 120_000,
    });
    return { result };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Evaluation failed.";
    return { error: msg };
  }
}

export async function getWritingHistory(): Promise<WritingHistoryItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  try {
    const resp = await fetchBackendJson<{ items: WritingHistoryItem[] }>({
      path: "/api/v1/ielts/writing/history",
      userId: user.id,
    });
    return resp.items ?? [];
  } catch {
    return [];
  }
}
