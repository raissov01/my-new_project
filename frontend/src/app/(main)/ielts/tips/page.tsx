import Link from "next/link";
import { ArrowLeft, BookOpen, CheckCircle2, Headphones, Lightbulb, Mic, PenLine } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";

export default async function IELTSTipsPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  const sections = [
    { icon: Headphones, title: t("ielts.tipsListening"), tips: [t("ielts.tipsL1"), t("ielts.tipsL2"), t("ielts.tipsL3")] },
    { icon: BookOpen, title: t("ielts.tipsReading"), tips: [t("ielts.tipsR1"), t("ielts.tipsR2"), t("ielts.tipsR3")] },
    { icon: PenLine, title: t("ielts.tipsWriting"), tips: [t("ielts.tipsW1"), t("ielts.tipsW2"), t("ielts.tipsW3")] },
    { icon: Mic, title: t("ielts.tipsSpeaking"), tips: [t("ielts.tipsS1"), t("ielts.tipsS2"), t("ielts.tipsS3")] },
  ];

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      <Link href="/ielts" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
        <ArrowLeft className="h-4 w-4" />
        {t("ielts.backToHub")}
      </Link>

      <div className="mt-6 rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow-strong)] sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-[var(--text-primary)]">
            <Lightbulb className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
              {t("ielts.tipsTitle")}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("ielts.tipsSubtitle")}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--surface-shadow)] sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-soft)] text-indigo-400">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{section.title}</h3>
              </div>
              <ul className="mt-4 space-y-3">
                {section.tips.map((tip) => (
                  <li key={tip} className="flex items-start gap-2.5 text-sm leading-6 text-[var(--text-secondary)]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
