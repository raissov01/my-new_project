"use client";

import { QuizForm } from "@/features/quizzes/components";
import { updateQuiz, type QuizQuestionInput } from "@/app/(main)/quizzes/actions";
import { useLocale } from "@/components/providers/locale-provider";
import { useToast } from "@/components/ui/toast";

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
  const { toast } = useToast();

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
      onSubmit={async (input) => {
        const result = await updateQuiz(quizId, input);
        if (result?.error) {
          toast("error", result.error);
        }
        return result;
      }}
    />
  );
}
