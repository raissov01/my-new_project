import "server-only";

import { cache } from "react";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { getCurrentUser } from "@/server/auth";

export type QuizOverview = {
  id: string;
  userId: string;
  authorName: string | null;
  title: string;
  description: string | null;
  subject: string | null;
  isPublic: boolean;
  timePerQuestion: number;
  shuffleOptions: boolean;
  createdAt: string;
  updatedAt: string;
  questionCount: number;
  attemptsCount: number;
  averagePercentage: number;
  bestPercentage: number | null;
};

export type QuizQuestionDTO = {
  id: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption?: string | null;
  orderIndex: number;
};

export type QuizDetail = {
  id: string;
  userId: string;
  authorName: string | null;
  title: string;
  description: string | null;
  subject: string | null;
  isPublic: boolean;
  timePerQuestion: number;
  shuffleOptions: boolean;
  createdAt: string;
  updatedAt: string;
  questions: QuizQuestionDTO[];
  questionCount: number;
  attemptsCount: number;
  averagePercentage: number;
  isAuthor: boolean;
};

export type QuizListFilters = {
  q?: string;
  subject?: string;
  sort?: "newest" | "played" | "rated";
};

function buildQuery(filters?: QuizListFilters): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.subject) params.set("subject", filters.subject);
  if (filters.sort) params.set("sort", filters.sort);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

const getQuizzesOverviewCached = cache(
  async (userId: string, query: string): Promise<QuizOverview[]> => {
    try {
      const response = await fetchBackendJson<{ items: QuizOverview[] }>({
        path: `/api/v1/quizzes/overview${query}`,
        userId,
      });
      return response.items ?? [];
    } catch {
      return [];
    }
  }
);

const getMyQuizzesCached = cache(
  async (userId: string, query: string): Promise<QuizOverview[]> => {
    try {
      const response = await fetchBackendJson<{ items: QuizOverview[] }>({
        path: `/api/v1/quizzes/mine${query}`,
        userId,
      });
      return response.items ?? [];
    } catch {
      return [];
    }
  }
);

export async function getQuizzesOverview(
  filters?: QuizListFilters
): Promise<QuizOverview[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return getQuizzesOverviewCached(user.id, buildQuery(filters));
}

export async function getMyQuizzes(
  filters?: QuizListFilters
): Promise<QuizOverview[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return getMyQuizzesCached(user.id, buildQuery(filters));
}

export async function getQuizById(quizId: string): Promise<QuizDetail | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  try {
    return await fetchBackendJson<QuizDetail>({
      path: `/api/v1/quizzes/${encodeURIComponent(quizId)}`,
      userId: user.id,
    });
  } catch {
    return null;
  }
}

export type AttemptAnswerResult = {
  questionId: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  selectedOption: string | null;
  correctOption: string;
  isCorrect: boolean;
  timeSpent: number;
  orderIndex: number;
};

export type AttemptResult = {
  id: string;
  quizId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeSpent: number;
  startedAt: string;
  completedAt: string;
  answers: AttemptAnswerResult[];
};

export async function getAttemptById(
  attemptId: string
): Promise<AttemptResult | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  try {
    return await fetchBackendJson<AttemptResult>({
      path: `/api/v1/quizzes/attempts/${encodeURIComponent(attemptId)}`,
      userId: user.id,
    });
  } catch {
    return null;
  }
}
