import Link from "next/link";
import { ArrowLeft, Mic, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";

export default async function IELTSSpeakingPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  const parts = [
    { id: "part1", title: t("ielts.speakingPart1"), body: t("ielts.speakingPart1Body"), time: "4-5 min" },
    { id: "part2", title: t("ielts.speakingPart2"), body: t("ielts.speakingPart2Body"), time: "3-4 min" },
    { id: "part3", title: t("ielts.speakingPart3"), body: t("ielts.speakingPart3Body"), time: "4-5 min" },
  ];

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      <Link href="/ielts" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
        <ArrowLeft className="h-4 w-4" />
        {t("ielts.backToHub")}
      </Link>

      <div className="mt-6 rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow-strong)] sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 text-[var(--text-primary)]">
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

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {parts.map((part) => (
          <div key={part.id} className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--surface-shadow)] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">{part.title}</h3>
              <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">{part.time}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{part.body}</p>
            <div className="mt-5">
              <Button variant="outline" disabled className="opacity-60">{t("ielts.comingSoon")}</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
