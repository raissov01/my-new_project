import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";
import { CreateQuizClient } from "./client";

export default async function CreateQuizPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const t = createTranslator(await getServerLocale());

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/quizzes"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("quiz.backToLibrary")}
      </Link>

      <div className="mt-6 rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-xl)] sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">
          {t("quiz.createEyebrow")}
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl md:text-5xl">
          {t("quiz.createTitle")}
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
          {t("quiz.createSubtitle")}
        </p>
      </div>

      <div className="mt-8">
        <CreateQuizClient />
      </div>
    </div>
  );
}
