import Link from "next/link";
import { ArrowLeft, BookOpen, BookOpenText, Headphones, Languages } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";

export default async function IELTSMaterialsPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  const categories = [
    { icon: BookOpen, title: t("ielts.matReading"), body: t("ielts.matReadingBody"), tone: "from-blue-500/18 to-indigo-500/10" },
    { icon: Headphones, title: t("ielts.matListening"), body: t("ielts.matListeningBody"), tone: "from-cyan-500/18 to-sky-500/10" },
    { icon: Languages, title: t("ielts.matVocabulary"), body: t("ielts.matVocabularyBody"), tone: "from-emerald-500/18 to-teal-500/10" },
    { icon: BookOpenText, title: t("ielts.matGrammar"), body: t("ielts.matGrammarBody"), tone: "from-amber-500/18 to-orange-500/10" },
  ];

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      <Link href="/ielts" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
        <ArrowLeft className="h-4 w-4" />
        {t("ielts.backToHub")}
      </Link>

      <div className="mt-6 rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow-strong)] sm:p-8">
        <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
          {t("ielts.materialsTitle")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">{t("ielts.materialsSubtitle")}</p>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div key={cat.title} className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--surface-shadow)] sm:p-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-gradient-to-br ${cat.tone} text-[var(--text-primary)]`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{cat.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{cat.body}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
