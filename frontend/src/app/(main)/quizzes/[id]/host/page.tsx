import Link from "next/link";
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
    <div className="page-shell py-4 sm:py-6">
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href={`/quizzes/${id}`} className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
            ← Back
          </Link>
          <h3 style={{ flex: 1 }}>{quiz.title}</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: "var(--ink-mute)" }}>
            {t("quiz.hostLive")}
          </span>
        </div>
      </div>

      <HostLiveClient
        quizId={id}
        quizTitle={quiz.title}
        locale={locale}
      />
    </div>
  );
}
