import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  BookOpenText,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  Headphones,
  Lightbulb,
  Mic,
  PenLine,
  Target,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuestIELTSCta } from "@/features/auth/components/guest-ielts-cta";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getIELTSScoreHistory } from "@/server/services/ielts-score-history";
import { AIFeedbackSignal } from "@/components/ielts/AIFeedbackInfoModal";
import { IELTSOnboardingModal } from "@/components/ielts/IELTSOnboardingModal";
import { SkillScoreBar } from "@/components/ielts/SkillScoreBar";

// BUG-014: descriptive SEO metadata
export const metadata: Metadata = {
  title: "IELTS дайындық | StudyWithRaissov",
  description:
    "IELTS-ке толықтай дайындалыңыз: Cambridge mock тесттер, AI writing/speaking бағалау, Band 5-9 дайындық, жеке study plan.",
  alternates: { canonical: "/ielts" },
  openGraph: {
    title: "IELTS дайындық — StudyWithRaissov",
    description:
      "IELTS-ке толықтай дайындалыңыз: Cambridge mock тесттер, AI writing/speaking бағалау, Band 5-9 дайындық.",
    url: "/ielts",
    locale: "kk_KZ",
  },
  robots: { index: true, follow: true },
};

type ModuleItem = {
  href: string;
  icon: React.ElementType;
  title: string;
  body: string;
  color: string;
  accent: string;
};

export default async function IELTSHubPage() {
  const [locale, scoreHistory] = await Promise.all([
    getServerLocale(),
    getIELTSScoreHistory(),
  ]);
  const t = createTranslator(locale);

  // BUG-004: smart CTA — guide new users to study plan first
  const hasActivity = scoreHistory.length > 0;

  const featuredModule: ModuleItem = {
    href: "/ielts/simulator",
    icon: ClipboardCheck,
    title: t("ielts.simulatorTitle"),
    body: t("ielts.simulatorBody"),
    color: "text-blue-500 bg-blue-500/10",
    accent: "group-hover:border-l-blue-500",
  };

  // BUG-006: Reading and Listening practice cards added
  const skillModules: ModuleItem[] = [
    {
      href: "/ielts/reading",
      icon: BookOpen,
      title: t("ielts.readingTitle"),
      body: t("ielts.readingBody"),
      color: "text-cyan-500 bg-cyan-500/10",
      accent: "group-hover:border-l-cyan-500",
    },
    {
      href: "/ielts/listening",
      icon: Headphones,
      title: t("ielts.listeningTitle"),
      body: t("ielts.listeningBody"),
      color: "text-indigo-500 bg-indigo-500/10",
      accent: "group-hover:border-l-indigo-500",
    },
    {
      href: "/ielts/writing",
      icon: PenLine,
      title: t("ielts.writingTitle"),
      body: t("ielts.writingBody"),
      color: "text-emerald-500 bg-emerald-500/10",
      accent: "group-hover:border-l-emerald-500",
    },
    {
      href: "/ielts/speaking",
      icon: Mic,
      title: t("ielts.speakingTitle"),
      body: t("ielts.speakingBody"),
      color: "text-violet-500 bg-violet-500/10",
      accent: "group-hover:border-l-violet-500",
    },
  ];

  // BUG-003: Dashboard → "IELTS прогресс", Study plan → "Оқу жоспары" (Kazakh)
  const toolModules: ModuleItem[] = [
    {
      href: "/ielts/materials",
      icon: BookOpenText,
      title: t("ielts.materialsTitle"),
      body: t("ielts.materialsBody"),
      color: "text-teal-500 bg-teal-500/10",
      accent: "group-hover:border-l-teal-500",
    },
    {
      href: "/ielts/dashboard",
      icon: BarChart3,
      title: t("ielts.progressTitle"),
      body: t("ielts.progressBody"),
      color: "text-[var(--primary)] bg-[var(--primary-soft)]",
      accent: "group-hover:border-l-[var(--primary)]",
    },
    {
      href: "/ielts/study-plan",
      icon: CalendarDays,
      title: t("ielts.studyPlanTitle"),
      body: t("ielts.studyPlanBody"),
      color: "text-rose-500 bg-rose-500/10",
      accent: "group-hover:border-l-rose-500",
    },
    {
      href: "/ielts/tips",
      icon: Lightbulb,
      title: t("ielts.tipsTitle"),
      body: t("ielts.tipsBody"),
      color: "text-amber-500 bg-amber-500/10",
      accent: "group-hover:border-l-amber-500",
    },
  ];

  // BUG-001: total count is now dynamic
  const allModules = [featuredModule, ...skillModules, ...toolModules];

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-lg)] sm:p-8">
        <div
          className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[var(--primary)] opacity-[0.06]"
          style={{ filter: "blur(60px)" }}
        />
        <div
          className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-[var(--accent)] opacity-[0.04]"
          style={{ filter: "blur(60px)" }}
        />

        <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          {/* Left: copy + CTAs */}
          <div>
            <div className="badge-primary">
              <GraduationCap className="h-3.5 w-3.5" />
              {t("ielts.hubEyebrow")}
            </div>
            <h1 className="mt-4 max-w-[14ch] text-3xl font-extrabold tracking-[-0.03em] text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
              {t("ielts.hubTitle")}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              {t("ielts.hubSubtitle")}
            </p>

            {/* BUG-004: CTA routes based on user activity */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href={hasActivity ? "/ielts/simulator" : "/ielts/study-plan"}>
                <Button size="lg" className="w-full sm:w-auto">
                  <Target className="h-4 w-4" />
                  {hasActivity ? t("ielts.startMockExam") : t("ielts.createStudyPlan")}
                </Button>
              </Link>
              <Link href="/ielts/writing">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  <PenLine className="h-4 w-4" />
                  {t("ielts.practiceWriting")}
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: BUG-002 — band chart illustration + signal badges */}
          <div className="flex flex-col gap-3">
            <BandScoreIllustration />
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-1 lg:gap-3">
              {/* BUG-001: value = allModules.length (dynamic) */}
              <HubSignal
                label={t("ielts.signalModules")}
                value={String(allModules.length)}
                body={t("ielts.signalModulesBody")}
                accent="border-l-[var(--primary)]"
              />
              {/* BUG-009: clickable AI signal opens rubric modal */}
              <AIFeedbackSignal
                label={t("ielts.signalAI")}
                value="AI"
                body={t("ielts.signalAIBody")}
                accent="border-l-violet-500"
              />
              <HubSignal
                label={t("ielts.signalBand")}
                value="5–9"
                body={t("ielts.signalBandBody")}
                accent="border-l-[var(--accent)]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── BUG-005: Featured simulator card (full-width, prominent) ─────── */}
      <section className="mt-8">
        <FeaturedModuleCard mod={featuredModule} />
      </section>

      {/* ── 4 Skill cards ─────────────────────────────────────────────────── */}
      <section className="mt-8">
        {/* BUG-015: section heading */}
        <h2 className="mb-4 text-xl font-bold tracking-[-0.02em] text-[var(--text-primary)]">
          {t("ielts.skillsSectionTitle")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {skillModules.map((mod) => (
            <ModuleCard key={mod.href} mod={mod} />
          ))}
        </div>
        {/* BUG-008: last mock score summary */}
        <SkillScoreBar scoreHistory={scoreHistory} />
      </section>

      {/* ── BUG-007: Band roadmap strip ───────────────────────────────────── */}
      <BandRoadmapStrip />

      {/* ── 4 Tool cards ──────────────────────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="mb-4 text-xl font-bold tracking-[-0.02em] text-[var(--text-primary)]">
          {t("ielts.toolsSectionTitle")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {toolModules.map((mod) => (
            <ModuleCard key={mod.href} mod={mod} />
          ))}
        </div>
      </section>

      <GuestIELTSCta />

      {/* BUG-010: first-visit onboarding modal (client, checks localStorage) */}
      <IELTSOnboardingModal />
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function HubSignal({
  label,
  value,
  body,
  accent,
}: {
  label: string;
  value: string;
  body: string;
  accent: string;
}) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] border border-[var(--border)] border-l-[3px] ${accent} bg-[var(--bg-soft)] p-4`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
    </div>
  );
}

// BUG-002: hero illustration — band score progression chart
function BandScoreIllustration() {
  const bands = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];
  const maxH = 72;
  const bw = 16;
  const gap = 5;
  const totalW = bands.length * (bw + gap) - gap;

  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-soft)] p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
        Band прогресс
      </p>
      <svg
        viewBox={`0 0 ${totalW} ${maxH + 18}`}
        className="w-full"
        aria-label="Band score progression from 5 to 9"
      >
        {bands.map((band, i) => {
          const h = Math.round(((i + 1) / bands.length) * maxH);
          const x = i * (bw + gap);
          const y = maxH - h;
          const active = band >= 7;
          return (
            <g key={band}>
              <rect
                x={x}
                y={y}
                width={bw}
                height={h}
                rx="3"
                fill={active ? "#5533ff" : "#3d3d5c"}
                opacity={active ? 0.85 : 0.35}
              />
              {band % 1 === 0 && (
                <text
                  x={x + bw / 2}
                  y={maxH + 13}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#888"
                >
                  {band}
                </text>
              )}
            </g>
          );
        })}
        {/* "Target" label on Band 7 bar */}
        <text
          x={4 * (bw + gap) + bw / 2}
          y={maxH - Math.round((5 / 9) * maxH) - 5}
          textAnchor="middle"
          fontSize="8"
          fill="#5533ff"
          fontWeight="bold"
        >
          ★
        </text>
      </svg>
      <p className="mt-2 text-[10px] text-[var(--text-muted)]">
        Band 7+ зонасы белгіленген
      </p>
    </div>
  );
}

// BUG-005: featured full-width card for Simulator
function FeaturedModuleCard({ mod }: { mod: ModuleItem }) {
  const Icon = mod.icon;
  return (
    <Link href={mod.href} className="group block">
      <article
        className={`
          flex flex-col gap-4 rounded-[var(--radius-xl)] border border-[var(--border)]
          border-l-[3px] border-l-blue-500
          bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-sm)]
          transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]
          sm:flex-row sm:items-center sm:justify-between
        `}
      >
        <div className="flex items-start gap-4 sm:items-center">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${mod.color}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-blue-500">
              Cambridge · 44 тест
            </div>
            <h3 className="text-lg font-bold tracking-[-0.02em] text-[var(--text-primary)] group-hover:text-[var(--primary)]">
              {mod.title}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{mod.body}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:pl-6">
          <span className="text-sm text-[var(--text-muted)]">Бастау</span>
          <ChevronRight className="h-5 w-5 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5" />
        </div>
      </article>
    </Link>
  );
}

// Reusable module card
function ModuleCard({ mod }: { mod: ModuleItem }) {
  const Icon = mod.icon;
  return (
    <Link key={mod.href} href={mod.href} className="group">
      <article
        className={`
          flex h-full flex-col rounded-[var(--radius-xl)] border border-[var(--border)]
          border-l-[3px] border-l-transparent ${mod.accent}
          bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)]
          transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]
          sm:p-6
        `}
      >
        <div className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] ${mod.color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-base font-bold tracking-[-0.02em] text-[var(--text-primary)] group-hover:text-[var(--primary)]">
          {mod.title}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-6 text-[var(--text-secondary)]">{mod.body}</p>
      </article>
    </Link>
  );
}

// BUG-007: Band roadmap strip linking to /ielts/band/[level]
function BandRoadmapStrip() {
  const bands = [
    { level: "6", label: "Band 6 жолы", desc: "Орташа деңгей", color: "border-l-cyan-400 hover:border-l-cyan-500" },
    { level: "7", label: "Band 7 жолы", desc: "Жақсы деңгей", color: "border-l-blue-500 hover:border-l-blue-600" },
    { level: "8", label: "Band 8 жолы", desc: "Өте жақсы деңгей", color: "border-l-violet-500 hover:border-l-violet-600" },
  ];

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-xl font-bold tracking-[-0.02em] text-[var(--text-primary)]">
        Band мақсатты жолдары
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {bands.map((b) => (
          <Link key={b.level} href={`/ielts/band/${b.level}`} className="group">
            <div
              className={`
                flex items-center justify-between rounded-[var(--radius-xl)]
                border border-[var(--border)] border-l-[3px] ${b.color}
                bg-[var(--bg-surface)] px-5 py-4 shadow-[var(--shadow-sm)]
                transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]
              `}
            >
              <div>
                <p className="font-bold text-[var(--text-primary)] group-hover:text-[var(--primary)]">{b.label}</p>
                <p className="text-sm text-[var(--text-secondary)]">{b.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
