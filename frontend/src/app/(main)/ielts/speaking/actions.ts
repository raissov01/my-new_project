"use server";

import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

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

export async function evaluateSpeaking(
  part: string,
  prompt: string,
  transcript: string
): Promise<{ result?: SpeakingResult; error?: string }> {
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
    const msg = err instanceof Error ? err.message : "Evaluation failed.";
    return { error: msg };
  }
}
