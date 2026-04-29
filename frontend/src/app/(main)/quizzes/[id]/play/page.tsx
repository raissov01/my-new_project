import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getQuizById } from "@/server/services/quizzes";
import { getServerLocale } from "@/server/i18n";
import { PlayQuizClient } from "./client";

interface PlayPageProps {
  params: Promise<{ id: string }>;
}

export default async function PlayQuizPage({ params }: PlayPageProps) {
  const user = await getCurrentUser();
  const { id } = await params;

  const quiz = await getQuizById(id);
  if (!quiz) {
    // Private quiz or doesn't exist — require login
    if (!user) redirect("/login");
    notFound();
  }

  if (!quiz.questions || quiz.questions.length === 0) {
    redirect(`/quizzes/${id}`);
  }

  const locale = await getServerLocale();

  return <PlayQuizClient quiz={quiz} locale={locale} isGuest={!user} />;
}
