import { NewSetClient } from "./client";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";

export default async function NewSetPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const t = createTranslator(await getServerLocale());

  return (
    <div className="page-shell py-4 sm:py-6">
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href="/sets" className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
            ← {t("nav.mySets")}
          </Link>
          <h3>{t("newSet.title")}</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: "var(--ink-mute)" }}>
            {t("sets.flashcardCreation")}
          </span>
        </div>
      </div>

      <NewSetClient />
    </div>
  );
}
