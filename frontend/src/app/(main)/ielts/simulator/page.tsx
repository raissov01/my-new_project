import Link from "next/link";
import { ArrowLeft, BookOpen, Clock3, ClipboardCheck, Headphones, PenLine, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";

export default async function IELTSSimulatorPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  const sections = [
    { icon: Headphones, title: t("ielts.simListening"), duration: "30 min", questions: 40 },
    { icon: BookOpen, title: t("ielts.simReading"), duration: "60 min", questions: 40 },
    { icon: PenLine, title: t("ielts.simWriting"), duration: "60 min", questions: 2 },
    { icon: Target, title: t("ielts.simSpeaking"), duration: "11-14 min", questions: 3 },
  ];

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      <Link href="/ielts" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
        <ArrowLeft className="h-4 w-4" />
        {t("ielts.backToHub")}
      </Link>

      <div className="mt-6 rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow-strong)] sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/10 text-[var(--text-primary)]">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
              {t("ielts.simulatorTitle")}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("ielts.simulatorSubtitle")}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--surface-shadow)] sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--bg-soft)] text-indigo-400">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">{section.title}</h3>
                  <div className="mt-2 flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                    <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{section.duration}</span>
                    <span>{section.questions} {t("ielts.questions")}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <Button variant="outline" size="sm" disabled className="opacity-60">
                  {t("ielts.comingSoon")}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-[1.75rem] border border-dashed border-indigo-500/20 bg-indigo-500/5 p-6 text-center sm:p-8">
        <ClipboardCheck className="mx-auto h-8 w-8 text-indigo-400" />
        <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">{t("ielts.simComingSoonTitle")}</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--text-secondary)]">{t("ielts.simComingSoonBody")}</p>
      </div>
    </div>
  );
}
