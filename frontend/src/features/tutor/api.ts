"use server";

import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

export interface AIScenario {
  id: string;
  slug: string;
  title: string;
  description: string;
  level: string;
  category: string;
  icon?: string;
  estimatedMinutes: number;
  personaName?: string;
  studentGoal: string;
  successCriteria?: string[];
  vocabFocus?: string[];
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIConversation {
  id: string;
  userId: string;
  scenarioId: string;
  messages: ConversationMessage[];
  status: "active" | "completed" | "abandoned";
  finalScores?: GradeScores;
  startedAt: string;
  completedAt?: string;
}

export interface GradeScores {
  fluency: number;
  grammar: number;
  vocabulary: number;
  task: number;
  tips: string[];
}

export interface HistoryEntry {
  id: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  finalScores?: GradeScores;
  scenario: { slug: string; title: string; level: string; category: string; icon?: string };
}

export async function getScenarios(params?: {
  level?: string;
  category?: string;
}): Promise<AIScenario[]> {
  const user = await getCurrentUser();
  const qs = new URLSearchParams();
  if (params?.level) qs.set("level", params.level);
  if (params?.category) qs.set("category", params.category);
  const suffix = qs.toString() ? `?${qs}` : "";
  try {
    const data = await fetchBackendJson<{ scenarios: AIScenario[] }>({
      path: `/api/v1/tutor/scenarios${suffix}`,
      userId: user?.id ?? "",
    });
    return data.scenarios ?? [];
  } catch {
    return [];
  }
}

export async function getScenario(slug: string): Promise<AIScenario | null> {
  const user = await getCurrentUser();
  try {
    const data = await fetchBackendJson<{ scenario: AIScenario }>({
      path: `/api/v1/tutor/scenarios/${slug}`,
      userId: user?.id ?? "",
    });
    return data.scenario;
  } catch {
    return null;
  }
}

export async function startConversation(scenarioId: string): Promise<AIConversation | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  try {
    const data = await fetchBackendJson<{ conversation: AIConversation }>({
      path: "/api/v1/tutor/conversations",
      userId: user.id,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioId }),
    });
    return data.conversation;
  } catch {
    return null;
  }
}

export async function sendMessage(convId: string, text: string): Promise<string> {
  const user = await getCurrentUser();
  if (!user) return "";
  try {
    const data = await fetchBackendJson<{ reply: string }>({
      path: `/api/v1/tutor/conversations/${convId}/message`,
      userId: user.id,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    return data.reply ?? "";
  } catch {
    return "Sorry, I couldn't connect to the AI. Please try again.";
  }
}

export async function gradeConversation(convId: string): Promise<GradeScores | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  try {
    const data = await fetchBackendJson<{ scores: GradeScores }>({
      path: `/api/v1/tutor/conversations/${convId}/grade`,
      userId: user.id,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    return data.scores;
  } catch {
    return null;
  }
}

export async function getConversationHistory(): Promise<HistoryEntry[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  try {
    const data = await fetchBackendJson<{ history: HistoryEntry[] }>({
      path: "/api/v1/tutor/history",
      userId: user.id,
    });
    return data.history ?? [];
  } catch {
    return [];
  }
}
