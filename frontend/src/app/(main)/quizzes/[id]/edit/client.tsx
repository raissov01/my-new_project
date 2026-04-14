"use client";

import { useRouter } from "next/navigation";
import { QuizForm } from "@/features/quizzes/components";
import type {
  CreateQuizInput,
  QuizFormState,
  QuizQuestionInput,
} from "@/app/(main)/quizzes/actions";
import { useLocale } from "@/components/providers/locale-provider";

interface EditQuizClientProps {
  quizId: string;
  initialTitle: string;
  initialDescription: string;
  initialSubject: string;
  initialIsPublic: boolean;
  initialTimePerQuestion: number;
  initialShuffleOptions: boolean;
  initialQuestions: QuizQuestionInput[];
}

export function EditQuizClient({
  quizId,
  initialTitle,
  initialDescription,
  initialSubject,
  initialIsPublic,
  initialTimePerQuestion,
  initialShuffleOptions,
  initialQuestions,
}: EditQuizClientProps) {
  const { t } = useLocale();
  const router = useRouter();

  async function submitQuiz(input: CreateQuizInput): Promise<QuizFormState> {
    const response = await fetch(`/api/quizzes/${quizId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;

    if (!response.ok) {
      return { error: data?.error ?? t("quiz.errCreateFailed") };
    }

    router.push(`/quizzes/${quizId}`);
    return { error: null };
  }

  return (
    <QuizForm
      initialTitle={initialTitle}
      initialDescription={initialDescription}
      initialSubject={initialSubject}
      initialIsPublic={initialIsPublic}
      initialTimePerQuestion={initialTimePerQuestion}
      initialShuffleOptions={initialShuffleOptions}
      initialQuestions={initialQuestions}
      submitLabel={t("form.saveChanges")}
      cancelHref={`/quizzes/${quizId}`}
      cancelLabel={t("quiz.cancel")}
      onSubmit={submitQuiz}
    />
  );
}
