import { Mic, Sparkles } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { SpeakingPracticeClient } from "./client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://studywithraissov.com";

export default async function IELTSSpeakingPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      <Breadcrumbs
        baseUrl={APP_URL}
        items={[
          { label: t("ielts.hubTitle"), href: "/ielts" },
          { label: t("ielts.speakingTitle") },
        ]}
      />

      <div className="mt-6 rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-xl)] sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-surface)] text-[var(--text-primary)]">
            <Mic className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
              {t("ielts.speakingTitle")}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("ielts.speakingSubtitle")}</p>
          </div>
        </div>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3.5 py-2 text-xs font-medium text-violet-400">
          <Sparkles className="h-3.5 w-3.5" />
          {t("ielts.aiPoweredFeedback")}
        </div>
      </div>

      <div className="mt-8">
        <SpeakingPracticeClient />
      </div>
    </div>
  );
}
