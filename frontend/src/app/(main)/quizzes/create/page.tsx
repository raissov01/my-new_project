import Link from "next/link";
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
    <div className="page-shell py-4 sm:py-6">
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href="/quizzes" className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
            ← {t("quiz.backToLibrary")}
          </Link>
          <h3 style={{ flex: 1 }}>{t("quiz.createTitle")}</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: "var(--ink-mute)" }}>
            {t("quiz.createEyebrow")}
          </span>
        </div>
      </div>

      <CreateQuizClient />
    </div>
  );
}
