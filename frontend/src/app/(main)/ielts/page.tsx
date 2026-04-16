import Link from "next/link";
import {
  BookOpenText,
  ClipboardCheck,
  GraduationCap,
  Lightbulb,
  Mic,
  PenLine,
  Target,
  BarChart3,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuestIELTSCta } from "@/features/auth/components/guest-ielts-cta";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";

export default async function IELTSHubPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  const modules = [
    {
      href: "/ielts/simulator",
      icon: ClipboardCheck,
      title: t("ielts.simulatorTitle"),
      body: t("ielts.simulatorBody"),
      color: "text-blue-500 bg-blue-500/10",
      badge: null,
      accent: "group-hover:border-l-blue-500",
    },
    {
      href: "/ielts/writing",
      icon: PenLine,
      title: t("ielts.writingTitle"),
      body: t("ielts.writingBody"),
      color: "text-emerald-500 bg-emerald-500/10",
      badge: null,
      accent: "group-hover:border-l-emerald-500",
    },
    {
      href: "/ielts/speaking",
      icon: Mic,
      title: t("ielts.speakingTitle"),
      body: t("ielts.speakingBody"),
      color: "text-violet-500 bg-violet-500/10",
      badge: null,
      accent: "group-hover:border-l-violet-500",
    },
    {
      href: "/ielts/materials",
      icon: BookOpenText,
      title: t("ielts.materialsTitle"),
      body: t("ielts.materialsBody"),
      color: "text-cyan-500 bg-cyan-500/10",
      badge: null,
      accent: "group-hover:border-l-cyan-500",
    },
    {
      href: "/ielts/dashboard",
      icon: BarChart3,
      title: "Dashboard",
      body: "Track recent attempts, weak skills, and your AI feedback history.",
      color: "text-[var(--primary)] bg-[var(--primary-soft)]",
      badge: null,
      accent: "group-hover:border-l-[var(--primary)]",
    },
    {
      href: "/ielts/study-plan",
      icon: CalendarDays,
      title: "Study plan",
      body: "Generate a structured plan from your target band and exam date.",
      color: "text-rose-500 bg-rose-500/10",
      badge: null,
      accent: "group-hover:border-l-rose-500",
    },
    {
      href: "/ielts/tips",
      icon: Lightbulb,
      title: t("ielts.tipsTitle"),
      body: t("ielts.tipsBody"),
      color: "text-amber-500 bg-amber-500/10",
      badge: null,
      accent: "group-hover:border-l-amber-500",
    },
  ];

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-lg)] sm:p-8">
        {/* Decorative gradient */}
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[var(--primary)] opacity-[0.06]" style={{ filter: "blur(60px)" }} />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-[var(--accent)] opacity-[0.04]" style={{ filter: "blur(60px)" }} />

        <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
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
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/ielts/simulator">
                <Button size="lg" className="w-full sm:w-auto">
                  <Target className="h-4 w-4" />
                  {t("ielts.startMockExam")}
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

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <HubSignal label={t("ielts.signalModules")} value="5" body={t("ielts.signalModulesBody")} accent="border-l-[var(--primary)]" />
            <HubSignal label={t("ielts.signalAI")} value="AI" body={t("ielts.signalAIBody")} accent="border-l-violet-500" />
            <HubSignal label={t("ielts.signalBand")} value="5-9" body={t("ielts.signalBandBody")} accent="border-l-[var(--accent)]" />
          </div>
        </div>
      </section>

      {/* Module cards */}
      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link key={mod.href} href={mod.href} className="group">
              <article className={`flex h-full flex-col rounded-[var(--radius-xl)] border border-[var(--border)] border-l-[3px] border-l-transparent ${mod.accent} bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)] sm:p-6`}>
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] ${mod.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {mod.badge && (
                    <span className="badge-gold text-[10px]">
                      {mod.badge}
                    </span>
                  )}
                </div>
                <h3 className="mt-4 text-base font-bold tracking-[-0.02em] text-[var(--text-primary)] group-hover:text-[var(--primary)]">
                  {mod.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-[var(--text-secondary)]">
                  {mod.body}
                </p>
              </article>
            </Link>
          );
        })}
      </section>

      <GuestIELTSCta />
    </div>
  );
}

function HubSignal({ label, value, body, accent }: { label: string; value: string; body: string; accent: string }) {
  return (
    <div className={`rounded-[var(--radius-lg)] border border-[var(--border)] border-l-[3px] ${accent} bg-[var(--bg-soft)] p-4`}>
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-[var(--text-primary)]">{value}</p>
      <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
    </div>
  );
}
