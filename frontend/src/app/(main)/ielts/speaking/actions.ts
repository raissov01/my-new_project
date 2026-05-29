"use server";

import { getCurrentUser } from "@/server/auth";
import {
  BackendError,
  fetchBackendJson,
  isPaywall,
  type PaywallInfo,
} from "@/server/integrations/go-backend/server";

export type ConvMessage = {
  role: "examiner" | "candidate";
  text: string;
};

export type ConversationTurnResult =
  | { reply: string }
  | { error: string }
  | { paywall: PaywallInfo };

export async function conversationTurn(
  mode: "general" | "ielts",
  part: string,
  history: ConvMessage[],
  message: string
): Promise<ConversationTurnResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  try {
    const result = await fetchBackendJson<{ reply: string }>({
      path: "/api/v1/ielts/speaking/conversation",
      userId: user.id,
      method: "POST",
      body: JSON.stringify({ mode, part, history, message }),
      headers: { "Content-Type": "application/json" },
      timeoutMs: 30_000,
    });
    return { reply: result.reply };
  } catch (err) {
    if (err instanceof BackendError && err.status === 402 && isPaywall(err.data)) {
      return { paywall: err.data };
    }
    const msg = err instanceof Error ? err.message : "Conversation failed.";
    return { error: msg };
  }
}

export type SpeakingResult = {
  id: string;
  overallBand: number;
  fluencyCoherence: number;
  lexicalResource: number;
  grammar: number;
  pronunciation: number;
  feedback: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    improvementPlan?: string[];
    bandExplanation?: string;
    detailedFeedback: string;
    modelAnswer?: string;
    rewrittenResponse?: string;
    grammarHighlights?: Array<{
      original: string;
      issue: string;
      suggestion: string;
      explanation: string;
    }>;
    vocabularyHighlights?: Array<{
      original: string;
      issue: string;
      suggestion: string;
      explanation: string;
    }>;
    followUpQuestion: string;
    followUpQuestions?: string[];
  };
  aiModel: string;
};

export type SpeakingHistoryItem = {
  id: string;
  part: string;
  prompt: string;
  transcript: string;
  overallBand: number;
  createdAt: string;
};

export async function evaluateSpeaking(
  part: string,
  prompt: string,
  transcript: string
): Promise<{ result?: SpeakingResult; error?: string; paywall?: PaywallInfo }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  try {
    const result = await fetchBackendJson<SpeakingResult>({
      path: "/api/v1/ielts/speaking/evaluate",
      userId: user.id,
      method: "POST",
      body: JSON.stringify({ part, prompt, transcript }),
      headers: { "Content-Type": "application/json" },
      timeoutMs: 120_000,
    });
    return { result };
  } catch (err) {
    if (err instanceof BackendError && err.status === 402 && isPaywall(err.data)) {
      return { paywall: err.data };
    }
    const msg = err instanceof Error ? err.message : "Evaluation failed.";
    return { error: msg };
  }
}

export type SpeakingDetails = {
  detailedFeedback: string;
  bandExplanation: string;
  modelAnswer: string;
  rewrittenResponse: string;
  improvementPlan: string[];
  grammarHighlights: SpeakingResult["feedback"]["grammarHighlights"];
  vocabularyHighlights: SpeakingResult["feedback"]["vocabularyHighlights"];
};

export async function fetchSpeakingDetails(
  sessionId: string
): Promise<{ details?: SpeakingDetails; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  try {
    const details = await fetchBackendJson<SpeakingDetails>({
      path: "/api/v1/ielts/speaking/details",
      userId: user.id,
      method: "POST",
      body: JSON.stringify({ sessionId }),
      headers: { "Content-Type": "application/json" },
      timeoutMs: 120_000,
    });
    return { details };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load details.";
    return { error: msg };
  }
}

export async function getSpeakingHistory(): Promise<SpeakingHistoryItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  try {
    const resp = await fetchBackendJson<{ items: SpeakingHistoryItem[] }>({
      path: "/api/v1/ielts/speaking/history",
      userId: user.id,
    });
    return resp.items ?? [];
  } catch {
    return [];
  }
}
