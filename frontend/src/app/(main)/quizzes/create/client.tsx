"use client";

import { QuizForm } from "@/features/quizzes/components";
import { createQuiz } from "@/app/(main)/quizzes/actions";
import { useLocale } from "@/components/providers/locale-provider";

export function CreateQuizClient() {
  const { t } = useLocale();

  return (
    <QuizForm
      submitLabel={t("quiz.submitCreate")}
      cancelHref="/quizzes"
      cancelLabel={t("quiz.cancel")}
      initialIsPublic={false}
      initialTimePerQuestion={30}
      initialShuffleOptions={true}
      onSubmit={async (input) => createQuiz(input)}
    />
  );
}
