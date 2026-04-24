import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://studywithraissov.com";

export const metadata: Metadata = {
  title: "IELTS Оқу жаттығуы | StudyWithRaissov",
  description: "Cambridge мәтіндері мен сұрақтары бойынша IELTS Reading бөлімін жаттықтырыңыз.",
};

const PASSAGE_TYPES = [
  { key: "skimming", label: "Skimming & Scanning", desc: "Мәтінді жылдам шолу дағдысы" },
  { key: "tfng", label: "True / False / Not Given", desc: "Фактілерді анықтау дағдысы" },
  { key: "matching", label: "Matching Headings", desc: "Абзац тақырыптарын сәйкестендіру" },
  { key: "fill", label: "Fill in the Blank", desc: "Мәтіндегі бос орындарды толтыру" },
];

const TIPS = [
  "Сұрақтарды алдымен оқып, мәтінде не іздейтініңізді біліңіз.",
  "Жауапты word limit ескере отырып жазыңыз (NOT MORE THAN TWO WORDS).",
  "True/False/Not Given бойынша: мәтінде жоқ ақпарат = Not Given.",
  "60 минутқа 3 passage + 40 сұрақ — уақытты тең бөліңіз.",
];

export default async function IELTSReadingPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      <Breadcrumbs
        baseUrl={APP_URL}
        items={[
          { label: t("ielts.hubTitle"), href: "/ielts" },
          { label: t("ielts.readingTitle") },
        ]}
      />

      {/* Header */}
      <div className="mt-6 rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-xl)] sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-500">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
              {t("ielts.readingTitle")}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Cambridge мәтіндері мен сұрақтары бойынша бөлімді жаттықтырыңыз
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-6 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-soft)] px-3.5 py-1.5 text-sm text-[var(--text-secondary)]">
            <Clock className="h-4 w-4 text-cyan-500" />
            20 мин мини-жаттығу
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-soft)] px-3.5 py-1.5 text-sm text-[var(--text-secondary)]">
            <BookOpen className="h-4 w-4 text-cyan-500" />
            1 Passage · 13 сұрақ
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-soft)] px-3.5 py-1.5 text-sm text-[var(--text-secondary)]">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Автоматты бағалау
          </div>
        </div>
      </div>

      {/* Practice options grid */}
      <section className="mt-8">
        <h2 className="mb-4 text-xl font-bold tracking-[-0.02em] text-[var(--text-primary)]">
          Жаттығу форматы
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PASSAGE_TYPES.map((pt) => (
            <Link
              key={pt.key}
              href={`/ielts/simulator?section=reading&focus=${pt.key}`}
              className="group"
            >
              <div className="flex h-full flex-col rounded-[var(--radius-xl)] border border-[var(--border)] border-l-[3px] border-l-transparent bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-1 hover:border-l-cyan-500 hover:shadow-[var(--shadow-lg)]">
                <p className="font-bold text-[var(--text-primary)] group-hover:text-[var(--primary)]">
                  {pt.label}
                </p>
                <p className="mt-2 flex-1 text-sm text-[var(--text-secondary)]">{pt.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-[var(--text-muted)] group-hover:text-[var(--primary)]">
                  Бастау <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Full section practice */}
      <section className="mt-8 rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Толық Reading бөлімі
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              3 passage · 40 сұрақ · 60 минут · нақты IELTS форматы
            </p>
          </div>
          <Link href="/ielts/simulator?section=reading" className="shrink-0">
            <Button>
              <BookOpen className="h-4 w-4" />
              Толық жаттығу
            </Button>
          </Link>
        </div>
      </section>

      {/* Tips */}
      <section className="mt-8">
        <h2 className="mb-4 text-xl font-bold tracking-[-0.02em] text-[var(--text-primary)]">
          Reading кеңестері
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {TIPS.map((tip, i) => (
            <div
              key={i}
              className="flex gap-3 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-4"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-xs font-bold text-cyan-500">
                {i + 1}
              </span>
              <p className="text-sm leading-6 text-[var(--text-secondary)]">{tip}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
