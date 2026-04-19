import type { Metadata } from "next";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { IELTSDashboardClient } from "./client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://studywithraissov.com";

export const metadata: Metadata = {
  title: "IELTS кабинеті",
  description: "Жеке IELTS прогресіңіз, band трендтері, әлсіз тараптар талдауы және жол картасы.",
  robots: { index: false, follow: false },
};

export default async function IELTSDashboardPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      <Breadcrumbs
        baseUrl={APP_URL}
        items={[
          { label: t("ielts.hubTitle"), href: "/ielts" },
          { label: t("ielts.dashboard.title") },
        ]}
      />
      <div className="mt-6 rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-xl)] sm:p-8">
        <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
          {t("ielts.hubTitle")}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
          {t("ielts.dashboard.dashboardSummary")}
        </p>
      </div>
      <div className="mt-8">
        <IELTSDashboardClient />
      </div>
    </div>
  );
}
