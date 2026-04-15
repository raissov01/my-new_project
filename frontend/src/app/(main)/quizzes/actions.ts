"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";

export type QuizQuestionType = "mcq" | "true_false" | "fill_blank" | "reorder";

export type QuizQuestionInput = {
  id?: string;
  questionText: string;
  questionType?: QuizQuestionType;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOption?: string;
  blankAnswer?: string;
  reorderItems?: string[];
  imageUrl?: string;
  explanation?: string;
};

export type CreateQuizInput = {
  title: string;
  description: string;
  subject: string;
  isPublic: boolean;
  timePerQuestion: number;
  shuffleOptions: boolean;
  questions: QuizQuestionInput[];
};

export type QuizFormState = {
  error: string | null;
};

function sanitizeQuestions(questions: QuizQuestionInput[]): QuizQuestionInput[] {
  return questions
    .map<QuizQuestionInput>((q) => {
      const type: QuizQuestionType = q.questionType ?? "mcq";
      const reorderItems = (q.reorderItems ?? [])
        .map((item) => (item ?? "").trim())
        .filter((item) => item.length > 0);
      return {
        id: q.id,
        questionText: (q.questionText ?? "").trim(),
        questionType: type,
        optionA: (q.optionA ?? "").trim(),
        optionB: (q.optionB ?? "").trim(),
        optionC: (q.optionC ?? "").trim(),
        optionD: (q.optionD ?? "").trim(),
        correctOption: (q.correctOption ?? "").trim().toLowerCase(),
        blankAnswer: (q.blankAnswer ?? "").trim(),
        reorderItems,
        imageUrl: (q.imageUrl ?? "").trim(),
        explanation: (q.explanation ?? "").trim(),
      };
    })
    .filter(
      (q) =>
        q.questionText ||
        q.optionA ||
        q.optionB ||
        q.optionC ||
        q.optionD ||
        q.blankAnswer ||
        (q.reorderItems && q.reorderItems.length > 0)
    );
}

function formatBackendError(message: string, t: (key: string) => string) {
  if (message.includes("aborted") || message.includes("AbortError")) {
    return t("quiz.errPublishTimeout");
  }
  if (message.includes("title is required")) return t("quiz.errTitleRequired");
  if (message.includes("at least")) return t("quiz.errAtLeastOneQuestion");
  if (message.includes("four options")) return t("quiz.errFourOptions");
  if (message.includes("correct option")) return t("quiz.errCorrectOption");
  if (message.includes("time per question")) return t("quiz.errTimePerQuestion");
  if (message.includes("access denied")) return t("action.accessDenied");
  if (message.includes("not found")) return t("quiz.errNotFound");
  return t("quiz.errCreateFailed");
}

export async function createQuiz(input: CreateQuizInput): Promise<QuizFormState> {
  const t = createTranslator(await getServerLocale());
  const user = await getCurrentUser();

  if (!user) return { error: t("action.notAuthenticated") };
  if (!input.title.trim()) return { error: t("quiz.errTitleRequired") };

  const questions = sanitizeQuestions(input.questions);
  if (questions.length === 0) return { error: t("quiz.errAtLeastOneQuestion") };

  let response: { id: string };
  try {
    response = await fetchBackendJson<{ id: string }>({
      path: "/api/v1/quizzes",
      userId: user.id,
      method: "POST",
      body: JSON.stringify({
        title: input.title.trim(),
        description: input.description.trim(),
        subject: input.subject.trim(),
        isPublic: input.isPublic,
        timePerQuestion: input.timePerQuestion,
        shuffleOptions: input.shuffleOptions,
        questions,
      }),
      headers: { "Content-Type": "application/json" },
      timeoutMs: 120_000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return { error: formatBackendError(message, t) };
  }

  revalidatePath("/quizzes");
  redirect(`/quizzes/${response.id}`);
}

export async function updateQuiz(
  quizId: string,
  input: CreateQuizInput
): Promise<QuizFormState> {
  const t = createTranslator(await getServerLocale());
  const user = await getCurrentUser();

  if (!user) return { error: t("action.notAuthenticated") };
  if (!input.title.trim()) return { error: t("quiz.errTitleRequired") };

  const questions = sanitizeQuestions(input.questions);
  if (questions.length === 0) return { error: t("quiz.errAtLeastOneQuestion") };

  try {
    await fetchBackendJson({
      path: `/api/v1/quizzes/${encodeURIComponent(quizId)}`,
      userId: user.id,
      method: "PUT",
      body: JSON.stringify({
        title: input.title.trim(),
        description: input.description.trim(),
        subject: input.subject.trim(),
        isPublic: input.isPublic,
        timePerQuestion: input.timePerQuestion,
        shuffleOptions: input.shuffleOptions,
        questions,
      }),
      headers: { "Content-Type": "application/json" },
      timeoutMs: 120_000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return { error: formatBackendError(message, t) };
  }

  revalidatePath("/quizzes");
  revalidatePath(`/quizzes/${quizId}`);
  redirect(`/quizzes/${quizId}`);
}
