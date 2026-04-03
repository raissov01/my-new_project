import Link from "next/link";
import { redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  BookOpenText,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  LayoutDashboard,
  LibraryBig,
  MessageSquareQuote,
  Mic,
  NotebookPen,
  PenLine,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getAppHomePath, getCurrentUser } from "@/server/auth";

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(await getAppHomePath(user));
  }

  const locale = await getServerLocale();
  const t = createTranslator(locale);

  const heroStats = [
    { value: "12+", label: t("landing.heroStat1") },
    { value: "24/7", label: t("landing.heroStat2") },
    { value: "Role-based", label: t("landing.heroStat3") },
  ];

  const ecosystemCards: Array<{ title: string; body: string; icon: LucideIcon; tone: string }> = [
    { title: t("ielts.simulatorTitle"), body: t("ielts.simulatorBody"), icon: ClipboardCheck, tone: "from-indigo-500/20 to-blue-500/10" },
    { title: t("ielts.writingTitle"), body: t("ielts.writingBody"), icon: PenLine, tone: "from-emerald-500/18 to-teal-500/10" },
    { title: t("ielts.speakingTitle"), body: t("ielts.speakingBody"), icon: Mic, tone: "from-violet-500/18 to-fuchsia-500/10" },
    { title: t("ielts.materialsTitle"), body: t("ielts.materialsBody"), icon: BookOpenText, tone: "from-cyan-500/18 to-sky-500/10" },
    { title: t("ielts.tipsTitle"), body: t("ielts.tipsBody"), icon: Target, tone: "from-amber-500/18 to-orange-500/10" },
    { title: t("landing.ecoFlashcards"), body: t("landing.ecoFlashcardsBody"), icon: LibraryBig, tone: "from-blue-500/18 to-indigo-500/10" },
    { title: t("landing.ecoAI"), body: t("landing.ecoAIBody"), icon: Bot, tone: "from-fuchsia-500/18 to-purple-500/10" },
    { title: t("landing.ecoProgress"), body: t("landing.ecoProgressBody"), icon: BarChart3, tone: "from-sky-500/18 to-cyan-500/10" },
    { title: t("landing.ecoClasses"), body: t("landing.ecoClassesBody"), icon: Users, tone: "from-emerald-500/18 to-lime-500/10" },
    { title: t("landing.ecoChallenges"), body: t("landing.ecoChallengesBody"), icon: Trophy, tone: "from-indigo-500/18 to-violet-500/10" },
  ];

  const previewColumns = [
    {
      eyebrow: t("landing.prevLib"), title: t("landing.prevLibTitle"), body: t("landing.prevLibBody"),
      points: [t("landing.prevLibP1"), t("landing.prevLibP2"), t("landing.prevLibP3")],
    },
    {
      eyebrow: t("landing.prevClass"), title: t("landing.prevClassTitle"), body: t("landing.prevClassBody"),
      points: [t("landing.prevClassP1"), t("landing.prevClassP2"), t("landing.prevClassP3")],
    },
    {
      eyebrow: t("landing.prevAI"), title: t("landing.prevAITitle"), body: t("landing.prevAIBody"),
      points: [t("landing.prevAIP1"), t("landing.prevAIP2"), t("landing.prevAIP3")],
    },
  ];

  const platformMetrics = [
    { value: "500+", label: t("landing.metric1") },
    { value: "94%", label: t("landing.metric2") },
    { value: "18", label: t("landing.metric3") },
    { value: "3", label: t("landing.metric4") },
  ];

  const feedback = [
    { quote: t("landing.quote1"), person: t("landing.quote1Person") },
    { quote: t("landing.quote2"), person: t("landing.quote2Person") },
    { quote: t("landing.quote3"), person: t("landing.quote3Person") },
  ];

  const faqItems = [
    { question: t("landing.faq1Q"), answer: t("landing.faq1A") },
    { question: t("landing.faq2Q"), answer: t("landing.faq2A") },
    { question: t("landing.faq3Q"), answer: t("landing.faq3A") },
    { question: t("landing.faq4Q"), answer: t("landing.faq4A") },
  ];

  const sectionLinks: Array<{ href: string; label: string; short: string; icon: LucideIcon }> = [
    { href: "#hero", label: t("landing.navOverview"), short: "OV", icon: Compass },
    { href: "#ecosystem", label: t("landing.navEcosystem"), short: "EC", icon: Sparkles },
    { href: "#library", label: t("landing.navLibrary"), short: "LB", icon: LibraryBig },
    { href: "#proof", label: t("landing.navProof"), short: "PF", icon: BarChart3 },
    { href: "#faq", label: t("landing.navFAQ"), short: "FQ", icon: MessageSquareQuote },
  ];

  return (
    <div className="bg-gradient-main text-[var(--text-primary)]">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(99,91,255,0.28),transparent_42%)]" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 h-[24rem] bg-[radial-gradient(circle_at_bottom,rgba(45,212,191,0.12),transparent_42%)]" />

      <header className="sticky top-4 z-50 px-4 sm:px-5">
        <div className="page-shell">
          <div className="home-floating-nav flex flex-col gap-3 rounded-[1.7rem] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 lg:gap-4 lg:px-5">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <Link href="/" className="min-w-0">
                <BrandLogo compact className="min-w-0" />
              </Link>
            </div>

            <nav className="hidden min-w-0 items-center justify-center gap-1 rounded-full border border-white/6 bg-black/10 p-1 lg:flex">
              {sectionLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-white/6 hover:text-[var(--text-primary)]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="grid gap-2 sm:hidden">
              <Link href="/signup">
                <Button size="sm" className="w-full">
                  {t("landing.signUp")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>

              <div className="grid grid-cols-2 gap-2">
                <Link href="/login" className="min-w-0">
                  <Button variant="ghost" size="sm" className="w-full px-3">
                    {t("landing.logIn")}
                  </Button>
                </Link>
                <Link href="/sets" className="min-w-0">
                  <Button variant="outline" size="sm" className="w-full px-3">
                    {t("landing.navLibrary")}
                  </Button>
                </Link>
              </div>
            </div>

            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <Link href="/sets">
                <Button variant="outline" size="sm">
                  {t("landing.exploreLibrary")}
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  {t("landing.logIn")}
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">
                  {t("landing.signUp")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="home-shell-grid relative">
        <aside className="home-rail fixed left-5 top-1/2 z-40 hidden -translate-y-1/2 xl:flex">
          <div className="home-floating-nav flex flex-col gap-2 rounded-[1.8rem] p-2.5">
            {sectionLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  className="group relative flex h-11 w-11 items-center justify-center rounded-2xl border border-transparent bg-white/0 text-[var(--text-secondary)] transition-all hover:border-white/8 hover:bg-white/8 hover:text-[var(--text-primary)]"
                >
                  <Icon className="h-4.5 w-4.5" />
                  <span className="pointer-events-none absolute left-[calc(100%+0.75rem)] hidden rounded-full border border-white/10 bg-[var(--bg-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)] shadow-[var(--surface-shadow)] group-hover:block">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </aside>

        <main className="relative z-10">
          <section id="hero" className="page-shell pb-16 pt-8 sm:pb-20 sm:pt-10 lg:pb-24 lg:pt-14 xl:pl-28">
            <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-start lg:gap-8">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/6 px-3.5 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)] shadow-[var(--surface-shadow)]">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
                  {t("landing.heroEyebrow")}
                </div>

                <h1 className="mt-5 max-w-[12ch] text-4xl font-semibold tracking-[-0.065em] text-[var(--text-primary)] sm:text-5xl lg:text-6xl xl:text-7xl">
                  {t("landing.heroTitle")}
                </h1>

                <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base lg:text-lg lg:leading-8">
                  {t("landing.heroBody")}
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link href="/ielts">
                    <Button size="lg" className="w-full sm:w-auto">
                      {t("landing.startWorkspace")}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/flashcards">
                    <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                      {t("landing.exploreLibrary")}
                    </Button>
                  </Link>
                </div>

                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  {heroStats.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[1.4rem] border border-white/8 bg-white/5 px-4 py-4 shadow-[var(--surface-shadow)] backdrop-blur-sm"
                    >
                      <p className="text-lg font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                        {item.value}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="home-float-panel overflow-hidden rounded-[2rem] p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.24em] text-indigo-300/80">
                        {t("landing.platformMap")}
                      </p>
                      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                        {t("landing.platformMapTitle")}
                      </h2>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/8 px-3 py-2 text-xs font-medium text-[var(--text-secondary)]">
                      {t("landing.ecosystemMode")}
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <SnapshotCard
                      eyebrow={t("landing.studyEngine")}
                      title={t("landing.studyEngineTitle")}
                      points={[t("landing.studyEngineP1"), t("landing.studyEngineP2"), t("landing.studyEngineP3")]}
                    />
                    <SnapshotCard
                      eyebrow={t("landing.teachingLayer")}
                      title={t("landing.teachingLayerTitle")}
                      points={[t("landing.teachingLayerP1"), t("landing.teachingLayerP2"), t("landing.teachingLayerP3")]}
                    />
                    <SnapshotCard
                      eyebrow={t("landing.contentLayer")}
                      title={t("landing.contentLayerTitle")}
                      points={[t("landing.contentLayerP1"), t("landing.contentLayerP2"), t("landing.contentLayerP3")]}
                    />
                    <SnapshotCard
                      eyebrow={t("landing.aiLayer")}
                      title={t("landing.aiLayerTitle")}
                      points={[t("landing.aiLayerP1"), t("landing.aiLayerP2"), t("landing.aiLayerP3")]}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <CompactSignal label={t("landing.compactClasses")} value={t("landing.compactClassesVal")} />
                  <CompactSignal label={t("landing.compactLibrary")} value={t("landing.compactLibraryVal")} />
                  <CompactSignal label={t("landing.compactAI")} value={t("landing.compactAIVal")} />
                </div>
              </div>
            </div>
          </section>

          <section id="ecosystem" className="page-shell border-t border-white/6 py-16 sm:py-20 xl:pl-28">
            <SectionHeading eyebrow={t("landing.ecosystemEyebrow")} title={t("landing.ecosystemTitle")} body={t("landing.ecosystemBody")} />
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {ecosystemCards.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="group rounded-[1.7rem] border border-white/7 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5 shadow-[var(--surface-shadow)] transition-all duration-300 hover:-translate-y-1 hover:border-white/12 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))]">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-gradient-to-br ${item.tone} text-[var(--text-primary)]`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.body}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <section id="library" className="page-shell border-t border-white/6 py-16 sm:py-20 xl:pl-28">
            <SectionHeading eyebrow={t("landing.previewEyebrow")} title={t("landing.previewTitle")} body={t("landing.previewBody")} />
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {previewColumns.map((item) => (
                <div key={item.title} className="rounded-[1.9rem] border border-white/7 bg-[rgba(255,255,255,0.04)] p-5 shadow-[var(--surface-shadow)] backdrop-blur-sm sm:p-6">
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-indigo-300/80">{item.eyebrow}</p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{item.body}</p>
                  <ul className="mt-5 space-y-3">
                    {item.points.map((point) => (
                      <li key={point} className="flex items-start gap-3 text-sm leading-6 text-[var(--text-secondary)]">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section id="proof" className="page-shell border-t border-white/6 py-16 sm:py-20 xl:pl-28">
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <SectionHeading eyebrow={t("landing.proofEyebrow")} title={t("landing.proofTitle")} body={t("landing.proofBody")} />
              <div className="grid gap-4 sm:grid-cols-2">
                {platformMetrics.map((item) => (
                  <div key={item.label} className="rounded-[1.8rem] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.8),rgba(15,23,42,0.55))] p-5 shadow-[var(--surface-shadow-strong)]">
                    <p className="text-3xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] sm:text-4xl">{item.value}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="page-shell border-t border-white/6 py-16 sm:py-20 xl:pl-28">
            <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[2rem] border border-white/7 bg-[rgba(255,255,255,0.04)] p-6 shadow-[var(--surface-shadow)]">
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-indigo-300/80">{t("landing.feedbackEyebrow")}</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">{t("landing.feedbackTitle")}</h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">{t("landing.feedbackBody")}</p>
              </div>
              <div className="grid gap-4">
                {feedback.map((item) => (
                  <blockquote key={item.person} className="rounded-[1.8rem] border border-white/7 bg-[rgba(255,255,255,0.04)] p-5 shadow-[var(--surface-shadow)]">
                    <MessageSquareQuote className="h-5 w-5 text-indigo-300" />
                    <p className="mt-4 text-sm leading-7 text-[var(--text-primary)] sm:text-[15px]">&ldquo;{item.quote}&rdquo;</p>
                    <footer className="mt-4 text-sm font-medium text-[var(--text-secondary)]">{item.person}</footer>
                  </blockquote>
                ))}
              </div>
            </div>
          </section>

          <section id="faq" className="page-shell border-t border-white/6 py-16 sm:py-20 xl:pl-28">
            <SectionHeading eyebrow={t("landing.faqEyebrow")} title={t("landing.faqTitle")} body={t("landing.faqBody")} />
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {faqItems.map((item) => (
                <div key={item.question} className="rounded-[1.75rem] border border-white/7 bg-[rgba(255,255,255,0.04)] p-5 shadow-[var(--surface-shadow)]">
                  <h3 className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{item.question}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="page-shell pb-14 pt-2 sm:pb-20 xl:pl-28">
            <div className="rounded-[2rem] border border-white/8 bg-[linear-gradient(135deg,rgba(99,91,255,0.16),rgba(17,24,39,0.9)_48%,rgba(79,124,255,0.14))] p-6 shadow-[var(--surface-shadow-strong)] sm:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-indigo-300/80">{t("landing.ctaEyebrow")}</p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">{t("landing.ctaTitle")}</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">{t("landing.ctaBody")}</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link href="/signup">
                    <Button size="lg" className="w-full sm:w-auto">{t("landing.createAccount")}</Button>
                  </Link>
                  <Link href="/sets">
                    <Button size="lg" variant="secondary" className="w-full sm:w-auto">{t("landing.openLibrary")}</Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      <footer className="border-t border-white/6 bg-[rgba(8,12,24,0.65)] backdrop-blur-sm">
        <div className="page-shell py-10 xl:pl-28">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
            <div>
              <BrandLogo compact />
              <p className="mt-4 max-w-md text-sm leading-7 text-[var(--text-secondary)]">{t("landing.footerBody")}</p>
            </div>
            <FooterColumn
              title={t("landing.footerPlatform")}
              links={[
                { href: "/sets", label: t("landing.footerFlashcardLibrary") },
                { href: "/guide", label: t("landing.footerGuide") },
                { href: "/leaderboard", label: t("landing.footerRankings") },
              ]}
            />
            <FooterColumn
              title={t("landing.footerWorkspaces")}
              links={[
                { href: "/signup", label: t("landing.footerStudentDashboard") },
                { href: "/signup", label: t("landing.footerTeacherTools") },
                { href: "/signup", label: t("landing.footerAIImport") },
              ]}
            />
            <FooterColumn
              title={t("landing.footerAccess")}
              links={[
                { href: "/login", label: t("landing.logIn") },
                { href: "/signup", label: t("landing.signUp") },
                { href: "/sets", label: t("landing.footerGuestPreview") },
              ]}
            />
          </div>
          <div className="mt-8 border-t border-white/6 pt-6 text-sm text-[var(--text-muted)]">
            {t("landing.footerCopyright").replace("{year}", String(new Date().getFullYear()))}
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-indigo-300/80">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">{title}</h2>
      <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">{body}</p>
    </div>
  );
}

function SnapshotCard({ eyebrow, title, points }: { eyebrow: string; title: string; points: string[] }) {
  return (
    <div className="rounded-[1.6rem] border border-white/8 bg-[rgba(255,255,255,0.04)] p-4 shadow-[var(--surface-shadow)]">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">{eyebrow}</p>
      <h3 className="mt-3 text-base font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-2.5 text-sm leading-6 text-[var(--text-secondary)]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CompactSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.45rem] border border-white/8 bg-[rgba(255,255,255,0.04)] px-4 py-4 text-sm shadow-[var(--surface-shadow)]">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 font-medium text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<{ href: string; label: string }> }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      <ul className="mt-4 space-y-3">
        {links.map((item) => (
          <li key={item.label}>
            <Link href={item.href} className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
