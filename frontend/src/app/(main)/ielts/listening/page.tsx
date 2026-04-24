import type { Metadata } from "next";
import Link from "next/link";
import { Headphones, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://studywithraissov.com";

export const metadata: Metadata = {
  title: "IELTS Аудирование жаттығуы | StudyWithRaissov",
  description: "Cambridge аудио бөлімдері бойынша IELTS Listening бөлімін жаттықтырыңыз.",
};

const SECTION_TYPES = [
  { key: "s1", label: "Section 1", desc: "Күнделікті өмір диалогы (сұрақ-жауап форматы)" },
  { key: "s2", label: "Section 2", desc: "Монолог — кезекші немесе гид" },
  { key: "s3", label: "Section 3", desc: "Академиялық пікірталас (2-4 спикер)" },
  { key: "s4", label: "Section 4", desc: "Академиялық дәріс немесе баяндама" },
];

const TIPS = [
  "Тыңдамас бұрын сұрақтарды оқып, белгіленген сөздерге назар аударыңыз.",
  "Жауаптарды тыңдай отырып бірден жазыңыз — аудио қайталанбайды.",
  "Синонимдерге дайын болыңыз: аудиода 'purchase', жауапта 'buy' болуы мүмкін.",
  "Орфографияны тексеріңіз — қате жазылған жауап есептелмейді.",
];

export default async function IELTSListeningPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      <Breadcrumbs
        baseUrl={APP_URL}
        items={[
          { label: t("ielts.hubTitle"), href: "/ielts" },
          { label: t("ielts.listeningTitle") },
        ]}
      />

      {/* Header */}
      <div className="mt-6 rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-xl)] sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
            <Headphones className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
              {t("ielts.listeningTitle")}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Cambridge аудио бөлімдері бойынша жаттығыңыз
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-6 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-soft)] px-3.5 py-1.5 text-sm text-[var(--text-secondary)]">
            <Clock className="h-4 w-4 text-indigo-500" />
            10 мин мини-жаттығу
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-soft)] px-3.5 py-1.5 text-sm text-[var(--text-secondary)]">
            <Headphones className="h-4 w-4 text-indigo-500" />
            1 Section · 10 сұрақ
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
          Секция таңдаңыз
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {SECTION_TYPES.map((sec) => (
            <Link
              key={sec.key}
              href={`/ielts/simulator?section=listening&focus=${sec.key}`}
              className="group"
            >
              <div className="flex h-full flex-col rounded-[var(--radius-xl)] border border-[var(--border)] border-l-[3px] border-l-transparent bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-1 hover:border-l-indigo-500 hover:shadow-[var(--shadow-lg)]">
                <p className="font-bold text-[var(--text-primary)] group-hover:text-[var(--primary)]">
                  {sec.label}
                </p>
                <p className="mt-2 flex-1 text-sm text-[var(--text-secondary)]">{sec.desc}</p>
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
              Толық Listening бөлімі
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              4 section · 40 сұрақ · 40 минут · нақты IELTS форматы
            </p>
          </div>
          <Link href="/ielts/simulator?section=listening" className="shrink-0">
            <Button>
              <Headphones className="h-4 w-4" />
              Толық жаттығу
            </Button>
          </Link>
        </div>
      </section>

      {/* Tips */}
      <section className="mt-8">
        <h2 className="mb-4 text-xl font-bold tracking-[-0.02em] text-[var(--text-primary)]">
          Listening кеңестері
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {TIPS.map((tip, i) => (
            <div
              key={i}
              className="flex gap-3 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-4"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-bold text-indigo-500">
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
