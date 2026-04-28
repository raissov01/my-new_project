import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
    optionE: question.optionE,
    correctOption: question.correctOption ?? "a",
  }));

  return (
    <div className="page-shell py-4 sm:py-6">
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href={`/quizzes/${id}`} className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
            ← {t("quiz.backToQuiz")}
          </Link>
          <h3 style={{ flex: 1 }}>{t("quiz.editTitle")}</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: "var(--ink-mute)" }}>
            {t("quiz.editEyebrow")}
          </span>
        </div>
      </div>

      <EditQuizClient
        quizId={id}
        initialTitle={quiz.title}
        initialDescription={quiz.description ?? ""}
        initialSubject={quiz.subject ?? ""}
        initialIsPublic={quiz.isPublic}
        initialTimePerQuestion={quiz.timePerQuestion}
        initialShuffleOptions={quiz.shuffleOptions}
        initialShowAnswerAnimations={quiz.showAnswerAnimations ?? true}
        initialPowerUpsEnabled={quiz.powerUpsEnabled ?? true}
        initialTags={quiz.tags ?? []}
        initialQuestions={questions}
      />
    </div>
  );
}
