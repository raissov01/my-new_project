import type { Metadata } from "next";
import Link from "next/link";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { IELTSDashboardClient } from "./client";

export const metadata: Metadata = {
  title: "IELTS кабинеті",
  description: "Жеке IELTS прогресіңіз, band трендтері, әлсіз тараптар талдауы және жол картасы.",
  robots: { index: false, follow: false },
};

export default async function IELTSDashboardPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  return (
    <div className="page-shell py-4 sm:py-6">
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href="/ielts" className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
            ← {t("ielts.hubTitle")}
          </Link>
          <h3>{t("ielts.dashboard.title")}</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: "var(--ink-mute)" }}>
            {t("ielts.dashboard.dashboardSummary")}
          </span>
        </div>
      </div>

      <IELTSDashboardClient />
    </div>
  );
}
