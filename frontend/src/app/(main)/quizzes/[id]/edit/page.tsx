import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";
import { getQuizById } from "@/server/services/quizzes";
import { EditQuizClient } from "./client";

interface EditQuizPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditQuizPage({ params }: EditQuizPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  if (!user) {
    redirect("/login");
  }

  const quiz = await getQuizById(id);
  if (!quiz) {
    notFound();
  }

  if (!quiz.isAuthor) {
    redirect(`/quizzes/${id}`);
  }

  const questions = quiz.questions.map((question) => ({
    id: question.id,
    questionText: question.questionText,
    optionA: question.optionA,
    optionB: question.optionB,
    optionC: question.optionC,
    optionD: question.optionD,
    correctOption: question.correctOption ?? "a",
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href={`/quizzes/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("quiz.backToQuiz")}
      </Link>

      <div className="mt-6 rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow-strong)] sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">
          {t("quiz.editEyebrow")}
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl md:text-5xl">
          {t("quiz.editTitle")}
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
          {t("quiz.editSubtitle")}
        </p>
      </div>

      <div className="mt-8">
        <EditQuizClient
          quizId={id}
          initialTitle={quiz.title}
          initialDescription={quiz.description ?? ""}
          initialSubject={quiz.subject ?? ""}
          initialIsPublic={quiz.isPublic}
          initialTimePerQuestion={quiz.timePerQuestion}
          initialShuffleOptions={quiz.shuffleOptions}
          initialShowAnswerAnimations={quiz.showAnswerAnimations ?? true}
          initialQuestions={questions}
        />
      </div>
    </div>
  );
}
