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
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const quiz = await getQuizById(id);
  if (!quiz) {
    notFound();
  }

  if (!quiz.questions || quiz.questions.length === 0) {
    redirect(`/quizzes/${id}`);
  }

  const locale = await getServerLocale();

  return <PlayQuizClient quiz={quiz} locale={locale} />;
}
