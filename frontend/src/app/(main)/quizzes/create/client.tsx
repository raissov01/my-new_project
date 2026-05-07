"use client";

import { useRouter } from "next/navigation";
import { QuizForm } from "@/features/quizzes/components";
import { useLocale } from "@/components/providers/locale-provider";
import type { CreateQuizInput, QuizFormState } from "@/app/(main)/quizzes/actions";

export function CreateQuizClient() {
  const { t } = useLocale();
  const router = useRouter();

  async function submitQuiz(input: CreateQuizInput): Promise<QuizFormState> {
    const response = await fetch("/api/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const data = (await response.json().catch(() => null)) as
      | { id?: string; error?: string }
      | null;

    if (!response.ok) {
      return { error: data?.error ?? t("quiz.errCreateFailed") };
    }

    if (!data?.id) {
      return { error: t("quiz.errCreateFailed") };
    }

    router.push(`/quizzes/${data.id}`);
    return { error: null };
  }

  return (
    <QuizForm
      submitLabel={t("quiz.submitCreate")}
      cancelHref="/quizzes"
      cancelLabel={t("quiz.cancel")}
      initialIsPublic={true}
      initialTimePerQuestion={30}
      initialShuffleOptions={false}
      onSubmit={submitQuiz}
    />
  );
}
