import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import {
  getAttemptById,
  getQuizById,
  type QuizDetail,
} from "@/server/services/quizzes";
import { getServerLocale } from "@/server/i18n";
import { PlayQuizClient } from "../play/client";

interface PracticePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ attempt?: string }>;
}

export default async function PracticeQuizPage({
  params,
  searchParams,
}: PracticePageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const { attempt: attemptId } = await searchParams;
  if (!attemptId) {
    redirect(`/quizzes/${encodeURIComponent(id)}`);
  }

  const [quiz, attempt] = await Promise.all([
    getQuizById(id),
    getAttemptById(attemptId),
  ]);
  if (!quiz || !attempt) {
    notFound();
  }

  // Collect the question IDs the student answered incorrectly in this
  // attempt. Skipped questions count as wrong — practice mode should
  // re-surface them too.
  const wrongIds = new Set(
    attempt.answers.filter((a) => !a.isCorrect).map((a) => a.questionId)
  );

  const filteredQuestions = quiz.questions.filter((q) => wrongIds.has(q.id));

  // If the student got everything right, there's nothing to practice.
  // Bounce them back to the results screen.
  if (filteredQuestions.length === 0) {
    redirect(
      `/quizzes/${encodeURIComponent(id)}/results?attempt=${encodeURIComponent(attemptId)}`
    );
  }

  const practiceQuiz: QuizDetail = {
    ...quiz,
    questions: filteredQuestions,
    questionCount: filteredQuestions.length,
  };

  const locale = await getServerLocale();
  const returnHref = `/quizzes/${encodeURIComponent(id)}/results?attempt=${encodeURIComponent(attemptId)}`;

  return (
    <PlayQuizClient
      quiz={practiceQuiz}
      locale={locale}
      mode="practice"
      returnHref={returnHref}
    />
  );
}
