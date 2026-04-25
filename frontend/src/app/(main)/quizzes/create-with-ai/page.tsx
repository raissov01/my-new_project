import Link from "next/link";
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
    <div className="page-shell py-4 sm:py-6">
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href="/quizzes" className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
            ← Back
          </Link>
          <h3 style={{ flex: 1 }}>{t("quiz.ai.pageTitle")}</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: "var(--ink-mute)" }}>
            {t("quiz.ai.eyebrow")}
          </span>
        </div>
      </div>

      <CreateWithAIClient />
    </div>
  );
}
