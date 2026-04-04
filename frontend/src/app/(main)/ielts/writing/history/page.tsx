import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { IELTSWritingHistoryClient } from "./client";

export default async function IELTSWritingHistoryPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow-strong)] sm:p-8">
        <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">{t("ielts.writingTitle")}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">Writing submission history with AI band estimates and feedback snapshots.</p>
      </div>
      <div className="mt-8">
        <IELTSWritingHistoryClient />
      </div>
    </div>
  );
}
