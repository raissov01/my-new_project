import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";
import { getQuizById } from "@/server/services/quizzes";
import { HostLiveClient } from "./client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function HostLivePage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const locale = await getServerLocale();
  const t = createTranslator(locale);

  const quiz = await getQuizById(id);
  if (!quiz) notFound();

  if (!quiz.isAuthor && !quiz.isPublic) {
    redirect(`/quizzes/${id}`);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <HostLiveClient
        quizId={id}
        quizTitle={quiz.title}
        locale={locale}
      />
    </div>
  );
}
