import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/server/auth";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";
import { CreateWithAIClient } from "./client";

export async function generateMetadata(): Promise<Metadata> {
  const t = createTranslator(await getServerLocale());
  return {
    title: `${t("quiz.ai.pageTitle")} — ${t("app.name")}`,
    description: t("quiz.ai.pageSubtitle"),
  };
}

export default async function CreateQuizWithAIPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const t = createTranslator(await getServerLocale());

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-xl)] sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">
          {t("quiz.ai.eyebrow")}
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
          {t("quiz.ai.pageTitle")}
        </h1>
        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
          {t("quiz.ai.pageSubtitle")}
        </p>
      </div>

      <div className="mt-8">
        <CreateWithAIClient />
      </div>
    </div>
  );
}
