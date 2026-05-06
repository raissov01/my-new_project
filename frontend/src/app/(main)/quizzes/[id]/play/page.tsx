import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getQuizById } from "@/server/services/quizzes";
import { getServerLocale } from "@/server/i18n";
import { PlayQuizClient } from "./client";

interface PlayPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; limit?: string; part?: string }>;
}

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export default async function PlayQuizPage({ params, searchParams }: PlayPageProps) {
  const user = await getCurrentUser();
  const { id } = await params;
  const { from, limit, part } = await searchParams;

  const quiz = await getQuizById(id);
  if (!quiz) {
    // Private quiz or doesn't exist — guest is prompted to log in,
    // logged-in users see notFound (no access).
    if (!user) redirect(`/login?next=/quizzes/${encodeURIComponent(id)}/play`);
    notFound();
  }

  if (!quiz.questions || quiz.questions.length === 0) {
    redirect(`/quizzes/${id}`);
  }

  const locale = await getServerLocale();
  const totalQuestions = quiz.questions.length;
  const requestedFrom = parsePositiveInt(from);
  const requestedLimit = parsePositiveInt(limit);
  const startIndex = requestedFrom ? Math.min(requestedFrom - 1, totalQuestions - 1) : 0;
  const maxLimit = requestedLimit ? Math.min(requestedLimit, totalQuestions) : totalQuestions;
  const endIndex = Math.min(totalQuestions, startIndex + maxLimit);
  const slicedQuestions = quiz.questions.slice(startIndex, endIndex);
  const isPart = slicedQuestions.length > 0 && slicedQuestions.length < totalQuestions;
  const partLabel = isPart
    ? `Part ${parsePositiveInt(part) ?? Math.floor(startIndex / Math.max(1, maxLimit)) + 1} · Q${startIndex + 1}-${endIndex}`
    : undefined;
  const progressKey = isPart
    ? `${quiz.id}_q${startIndex + 1}-${endIndex}`
    : quiz.id;
  const playableQuiz = isPart
    ? {
        ...quiz,
        questions: slicedQuestions,
        questionCount: slicedQuestions.length,
      }
    : quiz;

  return (
    <PlayQuizClient
      quiz={playableQuiz}
      locale={locale}
      isGuest={!user}
      partLabel={partLabel}
      progressKey={progressKey}
    />
  );
}
