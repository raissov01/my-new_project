import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BookOpen, PenLine, Mic, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://studywithraissov.com";

const VALID_LEVELS = ["6", "7", "8"] as const;
type BandLevel = (typeof VALID_LEVELS)[number];

type BandContent = {
  label: string;
  color: string;
  tagColor: string;
  descriptionKey: string;
  vocabulary: string[];
  grammarFocus: string[];
  writingTipKey: string;
  speakingTipKey: string;
  commonMistakes: string[];
};

const BAND_CONTENT: Record<BandLevel, BandContent> = {
  "6": {
    label: "Band 6",
    color: "text-cyan-500 bg-cyan-500/10",
    tagColor: "border-l-cyan-500",
    descriptionKey: "ielts.band.descBand6",
    vocabulary: [
      "nevertheless", "furthermore", "consequently", "subsequently",
      "aforementioned", "primarily", "predominantly", "approximately",
      "significantly", "considerably",
    ],
    grammarFocus: [
      "Complex sentences with relative clauses",
      "Passive voice (active → passive transformation)",
      "Comparison structures (as … as, more … than)",
    ],
    writingTipKey: "ielts.band.writingTipBand6",
    speakingTipKey: "ielts.band.speakingTipBand6",
    commonMistakes: [
      "Article errors (a/an/the)",
      "Subject-verb agreement in complex sentences",
      "Overusing 'because' instead of 'since', 'as', 'due to'",
    ],
  },
  "7": {
    label: "Band 7",
    color: "text-blue-500 bg-blue-500/10",
    tagColor: "border-l-blue-500",
    descriptionKey: "ielts.band.descBand7",
    vocabulary: [
      "albeit", "hitherto", "notwithstanding", "ostensibly", "pervasive",
      "ubiquitous", "exacerbate", "mitigate", "contentious", "pivotal",
    ],
    grammarFocus: [
      "Mixed conditionals (Type 2+3)",
      "Inversion for emphasis (Not only … but also, Never have I …)",
      "Nominalization (to investigate → investigation)",
    ],
    writingTipKey: "ielts.band.writingTipBand7",
    speakingTipKey: "ielts.band.speakingTipBand7",
    commonMistakes: [
      "Tense consistency errors in complex narratives",
      "Misuse of gerunds vs infinitives",
      "Vague pronouns ('it', 'this') without clear referent",
    ],
  },
  "8": {
    label: "Band 8",
    color: "text-violet-500 bg-violet-500/10",
    tagColor: "border-l-violet-500",
    descriptionKey: "ielts.band.descBand8",
    vocabulary: [
      "antithetical", "dichotomous", "epistemological", "paradigm shift",
      "corroborate", "refute", "substantiate", "ameliorate", "precipitate",
      "multifaceted",
    ],
    grammarFocus: [
      "Ellipsis and substitution for cohesion",
      "Advanced hedging language (It would appear that, There is reason to believe)",
      "Cleft sentences (It is X that …, What Y does is …)",
    ],
    writingTipKey: "ielts.band.writingTipBand8",
    speakingTipKey: "ielts.band.speakingTipBand8",
    commonMistakes: [
      "Lexical repetition (use synonyms and paraphrase)",
      "Overcomplicating simple ideas (clarity > complexity)",
      "Insufficient task achievement in Writing Task 1 overview statement",
    ],
  },
};

type Props = { params: Promise<{ level: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { level } = await params;
  if (!VALID_LEVELS.includes(level as BandLevel)) return {};
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  return {
    title: t("ielts.band.metaTitle", { level }),
    description: t("ielts.band.metaDesc", { level }),
  };
}

export default async function BandLevelPage({ params }: Props) {
  const { level } = await params;
  if (!VALID_LEVELS.includes(level as BandLevel)) notFound();

  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const content = BAND_CONTENT[level as BandLevel];

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      <Breadcrumbs
        baseUrl={APP_URL}
        items={[
          { label: t("ielts.hubTitle"), href: "/ielts" },
          { label: `Band ${level} жолы` },
        ]}
      />

      {/* Header */}
      <div
        className={`mt-6 rounded-[var(--radius-2xl)] border border-[var(--border)] border-l-[4px] ${content.tagColor} bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-xl)] sm:p-8`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${content.color}`}>
              {content.label}
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.03em] text-[var(--text-primary)] sm:text-4xl">
              Band {level} мақсатты жолы
            </h1>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
              {t(content.descriptionKey)}
            </p>
          </div>
        </div>

        {/* Adjacent band navigation */}
        <div className="mt-6 flex flex-wrap gap-2">
          {VALID_LEVELS.filter((l) => l !== level).map((l) => (
            <Link key={l} href={`/ielts/band/${l}`}>
              <button className="rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)]">
                Band {l} жолы →
              </button>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* Vocabulary */}
        <section className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-6">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Vocabulary — Band {level} сөздері
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {content.vocabulary.map((word) => (
              <span
                key={word}
                className="rounded-full border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-1 text-sm font-medium text-[var(--text-primary)]"
              >
                {word}
              </span>
            ))}
          </div>
          <p className="mt-4 text-xs text-[var(--text-muted)]">
            Осы сөздерді Writing Task 2 және Speaking Part 3-те пайдаланыңыз.
          </p>
        </section>

        {/* Grammar focus */}
        <section className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-6">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Grammar фокус
            </h2>
          </div>
          <ul className="space-y-3">
            {content.grammarFocus.map((g, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-500">
                  {i + 1}
                </span>
                <span className="text-sm text-[var(--text-secondary)]">{g}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Writing tip */}
        <section className="rounded-[var(--radius-2xl)] border border-[var(--border)] border-l-[3px] border-l-emerald-500 bg-[var(--bg-surface)] p-6">
          <div className="mb-3 flex items-center gap-2">
            <PenLine className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Writing кеңесі</h2>
          </div>
          <p className="text-sm leading-7 text-[var(--text-secondary)]">{t(content.writingTipKey)}</p>
          <div className="mt-4">
            <Link href="/ielts/writing">
              <Button variant="secondary" size="sm">
                <PenLine className="h-4 w-4" />
                Writing жаттығуы
              </Button>
            </Link>
          </div>
        </section>

        {/* Speaking tip */}
        <section className="rounded-[var(--radius-2xl)] border border-[var(--border)] border-l-[3px] border-l-violet-500 bg-[var(--bg-surface)] p-6">
          <div className="mb-3 flex items-center gap-2">
            <Mic className="h-5 w-5 text-violet-500" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Speaking кеңесі</h2>
          </div>
          <p className="text-sm leading-7 text-[var(--text-secondary)]">{t(content.speakingTipKey)}</p>
          <div className="mt-4">
            <Link href="/ielts/speaking">
              <Button variant="secondary" size="sm">
                <Mic className="h-4 w-4" />
                Speaking жаттығуы
              </Button>
            </Link>
          </div>
        </section>
      </div>

      {/* Common mistakes */}
      <section className="mt-8 rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-6">
        <h2 className="mb-4 text-lg font-bold text-[var(--text-primary)]">
          Band {level}-ден жоғарыға шығу үшін жою керек қателер
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {content.commonMistakes.map((m, i) => (
            <div
              key={i}
              className="flex gap-3 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-soft)] p-4"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-xs font-bold text-red-500">
                ✕
              </span>
              <p className="text-sm text-[var(--text-secondary)]">{m}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA: go practice */}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/ielts/simulator">
          <Button>
            Mock емтихан бастау
          </Button>
        </Link>
        <Link href="/ielts">
          <Button variant="secondary">
            <ArrowLeft className="h-4 w-4" />
            IELTS хабына оралу
          </Button>
        </Link>
      </div>
    </div>
  );
}
