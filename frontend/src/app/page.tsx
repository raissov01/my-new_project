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
  LibraryBig,
  MessageSquareQuote,
  Mic,
  PenLine,
  Sparkles,
  Target,
  Trophy,
  Users,
  Zap,
  GraduationCap,
  Star,
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
    { value: "12+", label: t("landing.heroStat1"), icon: Zap },
    { value: "24/7", label: t("landing.heroStat2"), icon: Target },
    { value: "Role-based", label: t("landing.heroStat3"), icon: Users },
  ];

  const ecosystemCards: Array<{
    title: string;
    body: string;
    icon: LucideIcon;
    iconCls: string;
  }> = [
    { title: t("ielts.simulatorTitle"), body: t("ielts.simulatorBody"), icon: ClipboardCheck, iconCls: "bg-blue-500/10 text-blue-600 border border-blue-500/20" },
    { title: t("ielts.writingTitle"), body: t("ielts.writingBody"), icon: PenLine, iconCls: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
    { title: t("ielts.speakingTitle"), body: t("ielts.speakingBody"), icon: Mic, iconCls: "bg-violet-500/10 text-violet-600 border border-violet-500/20" },
    { title: t("ielts.materialsTitle"), body: t("ielts.materialsBody"), icon: BookOpenText, iconCls: "bg-cyan-500/10 text-cyan-600 border border-cyan-500/20" },
    { title: t("ielts.tipsTitle"), body: t("ielts.tipsBody"), icon: Target, iconCls: "bg-amber-500/10 text-amber-700 border border-amber-500/20" },
    { title: t("landing.ecoFlashcards"), body: t("landing.ecoFlashcardsBody"), icon: LibraryBig, iconCls: "bg-blue-500/10 text-blue-600 border border-blue-500/20" },
    { title: t("landing.ecoAI"), body: t("landing.ecoAIBody"), icon: Bot, iconCls: "bg-fuchsia-500/10 text-fuchsia-600 border border-fuchsia-500/20" },
    { title: t("landing.ecoProgress"), body: t("landing.ecoProgressBody"), icon: BarChart3, iconCls: "bg-sky-500/10 text-sky-600 border border-sky-500/20" },
    { title: t("landing.ecoClasses"), body: t("landing.ecoClassesBody"), icon: Users, iconCls: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" },
    { title: t("landing.ecoChallenges"), body: t("landing.ecoChallengesBody"), icon: Trophy, iconCls: "bg-orange-500/10 text-orange-600 border border-orange-500/20" },
  ];

  const previewColumns = [
    {
      eyebrow: t("landing.prevLib"),
      title: t("landing.prevLibTitle"),
      body: t("landing.prevLibBody"),
      points: [t("landing.prevLibP1"), t("landing.prevLibP2"), t("landing.prevLibP3")],
      borderCls: "border-l-[var(--primary)]",
      eyebrowCls: "text-[var(--primary)]",
    },
    {
      eyebrow: t("landing.prevClass"),
      title: t("landing.prevClassTitle"),
      body: t("landing.prevClassBody"),
      points: [t("landing.prevClassP1"), t("landing.prevClassP2"), t("landing.prevClassP3")],
      borderCls: "border-l-[var(--accent)]",
      eyebrowCls: "text-[var(--accent)]",
    },
    {
      eyebrow: t("landing.prevAI"),
      title: t("landing.prevAITitle"),
      body: t("landing.prevAIBody"),
      points: [t("landing.prevAIP1"), t("landing.prevAIP2"), t("landing.prevAIP3")],
      borderCls: "border-l-[var(--success)]",
      eyebrowCls: "text-[var(--success)]",
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

  const sectionLinks: Array<{ href: string; label: string; icon: LucideIcon }> = [
    { href: "#hero", label: t("landing.navOverview"), icon: Compass },
    { href: "#ecosystem", label: t("landing.navEcosystem"), icon: Sparkles },
    { href: "#library", label: t("landing.navLibrary"), icon: LibraryBig },
    { href: "#proof", label: t("landing.navProof"), icon: BarChart3 },
    { href: "#faq", label: t("landing.navFAQ"), icon: MessageSquareQuote },
  ];

  return (
    <div className="relative min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* Ambient warm gradient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="hero-gradient-orb absolute -top-40 left-1/4 h-[640px] w-[640px] bg-[var(--primary)]" />
        <div className="hero-gradient-orb absolute -top-24 right-1/4 h-[480px] w-[480px] bg-[var(--accent)]" style={{ opacity: 0.12 }} />
        <div className="hero-gradient-orb absolute bottom-1/4 left-1/3 h-[360px] w-[360px] bg-[#f59e0b]" style={{ opacity: 0.07 }} />
      </div>

      {/* Dot grid */}
      <div className="dot-grid" aria-hidden="true" />

      {/* ── Sticky Navigation ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6 sm:pt-4">
          <nav
            className="home-floating-nav flex items-center justify-between rounded-[var(--radius-xl)] px-4 py-2.5 sm:px-5 sm:py-3"
            aria-label="Main navigation"
          >
            <Link href="/" className="shrink-0" aria-label="StudyWithRaissov — home">
              <BrandLogo compact />
            </Link>

            <ul className="hidden items-center gap-0.5 lg:flex" role="list">
              {sectionLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex min-h-[44px] items-center rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Mobile CTAs */}
            <div className="flex items-center gap-2 sm:hidden">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="min-h-[44px]">
                  {t("landing.logIn")}
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="min-h-[44px] btn-breathe">
                  {t("landing.signUp")}
                </Button>
              </Link>
            </div>

            {/* Desktop CTAs */}
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/sets">
                <Button variant="ghost" size="sm">{t("landing.exploreLibrary")}</Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="sm">{t("landing.logIn")}</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="btn-breathe">
                  {t("landing.signUp")}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* ── Side Rail ─────────────────────────────────────────────────────── */}
      <aside
        className="fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 xl:flex"
        aria-label="Page section navigation"
      >
        <div className="flex flex-col gap-1.5 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-2 shadow-[var(--shadow-lg)]">
          {sectionLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className="group relative flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-all hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)]"
              >
                <Icon className="h-4 w-4" />
                <span className="pointer-events-none absolute left-[calc(100%+0.75rem)] hidden whitespace-nowrap rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] shadow-[var(--shadow-md)] group-hover:block">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </aside>

      <main className="relative z-10">
        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section
          id="hero"
          className="mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:pt-20 xl:pl-24"
        >
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-12">

            {/* Hero Left */}
            <div className="max-w-2xl">
              <div className="badge-primary">
                <GraduationCap className="h-3.5 w-3.5" />
                {t("landing.heroEyebrow")}
              </div>

              <h1
                className="mt-6 font-extrabold tracking-[-0.04em] text-[var(--text-primary)]"
                style={{ fontSize: "var(--text-hero)", lineHeight: "var(--text-hero-lh)" }}
              >
                {t("landing.heroTitle")}
              </h1>

              <p
                className="mt-5 max-w-xl leading-7 text-[var(--text-secondary)]"
                style={{ fontSize: "var(--text-body-lg)" }}
              >
                {t("landing.heroBody")}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/ielts">
                  <Button size="lg" className="w-full sm:w-auto btn-breathe">
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

              {/* Hero Stat Cards — Bento mini-grid */}
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {heroStats.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="bento-card flex items-start gap-3 p-4"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-soft)] text-[var(--primary)]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-lg font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                          {item.value}
                        </p>
                        <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{item.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hero Right — Liquid Glass Bento Panel */}
            <div className="space-y-4">
              <div className="bento-card-glass overflow-hidden">
                <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
                        {t("landing.platformMap")}
                      </p>
                      <h2
                        className="mt-1.5 font-bold tracking-[-0.03em] text-[var(--text-primary)]"
                        style={{ fontSize: "clamp(1.125rem, 2vw, 1.375rem)" }}
                      >
                        {t("landing.platformMapTitle")}
                      </h2>
                    </div>
                    <span className="badge-primary shrink-0 text-[11px]">
                      {t("landing.ecosystemMode")}
                    </span>
                  </div>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
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

        {/* ── Ecosystem ───────────────────────────────────────────────────── */}
        <section id="ecosystem" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 xl:pl-24">
          <div className="section-divider mb-16" />
          <SectionHeading
            eyebrow={t("landing.ecosystemEyebrow")}
            title={t("landing.ecosystemTitle")}
            body={t("landing.ecosystemBody")}
          />
          <div className="stagger-children mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {ecosystemCards.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="bento-card p-5">
                  <div className={`icon-accent ${item.iconCls}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* ── Library Preview ─────────────────────────────────────────────── */}
        <section id="library" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 xl:pl-24">
          <div className="section-divider mb-16" />
          <SectionHeading
            eyebrow={t("landing.previewEyebrow")}
            title={t("landing.previewTitle")}
            body={t("landing.previewBody")}
          />
          <div className="stagger-children mt-10 grid gap-5 lg:grid-cols-3">
            {previewColumns.map((item) => (
              <div
                key={item.title}
                className={`bento-card border-l-[3px] ${item.borderCls} p-5 sm:p-6`}
              >
                <p className={`text-xs font-semibold uppercase tracking-[0.1em] ${item.eyebrowCls}`}>
                  {item.eyebrow}
                </p>
                <h3
                  className="mt-3 font-bold tracking-[-0.03em] text-[var(--text-primary)]"
                  style={{ fontSize: "clamp(1.125rem, 2vw, 1.25rem)" }}
                >
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{item.body}</p>
                <ul className="mt-5 space-y-2.5">
                  {item.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-2.5 text-sm leading-6 text-[var(--text-secondary)]"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── Proof / Metrics ─────────────────────────────────────────────── */}
        <section id="proof" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 xl:pl-24">
          <div className="section-divider mb-16" />
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <SectionHeading
              eyebrow={t("landing.proofEyebrow")}
              title={t("landing.proofTitle")}
              body={t("landing.proofBody")}
            />
            <div className="stagger-children grid gap-4 sm:grid-cols-2">
              {platformMetrics.map((item) => (
                <div key={item.label} className="bento-card p-5 sm:p-6">
                  <p className="metric-number text-gradient">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials ────────────────────────────────────────────────── */}
        <section
          aria-labelledby="testimonials-heading"
          className="mx-auto max-w-7xl px-4 py-20 sm:px-6 xl:pl-24"
        >
          <div className="section-divider mb-16" />
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--accent)]">
                {t("landing.feedbackEyebrow")}
              </p>
              <h2
                id="testimonials-heading"
                className="mt-3 font-bold tracking-[-0.03em] text-[var(--text-primary)]"
                style={{ fontSize: "var(--text-h2)" }}
              >
                {t("landing.feedbackTitle")}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
                {t("landing.feedbackBody")}
              </p>
            </div>
            <div className="stagger-children grid gap-4">
              {feedback.map((item) => (
                <blockquote key={item.person} className="bento-card p-5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent-soft)]">
                    <Star className="h-4 w-4 text-[var(--accent)]" />
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[var(--text-primary)] sm:text-[15px]">
                    &ldquo;{item.quote}&rdquo;
                  </p>
                  <footer className="mt-4 text-sm font-semibold text-[var(--text-secondary)]">
                    {item.person}
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <section id="faq" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 xl:pl-24">
          <div className="section-divider mb-16" />
          <SectionHeading
            eyebrow={t("landing.faqEyebrow")}
            title={t("landing.faqTitle")}
            body={t("landing.faqBody")}
          />
          <div className="stagger-children mt-10 grid gap-4 lg:grid-cols-2">
            {faqItems.map((item) => (
              <div key={item.question} className="bento-card p-5">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  {item.question}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Final CTA ───────────────────────────────────────────────────── */}
        <section
          aria-label="Get started with StudyWithRaissov"
          className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 xl:pl-24"
        >
          <div className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-xl)] sm:p-10">
            {/* Ambient blobs */}
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[var(--primary)] blur-[88px]"
              style={{ opacity: 0.08 }}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-[var(--accent)] blur-[72px]"
              style={{ opacity: 0.07 }}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute bottom-8 right-1/3 h-48 w-48 rounded-full bg-[#10b981] blur-[56px]"
              style={{ opacity: 0.05 }}
              aria-hidden="true"
            />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--primary)]">
                  {t("landing.ctaEyebrow")}
                </p>
                <h2
                  className="mt-3 font-bold tracking-[-0.03em] text-[var(--text-primary)]"
                  style={{ fontSize: "var(--text-h2)" }}
                >
                  {t("landing.ctaTitle")}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                  {t("landing.ctaBody")}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                <Link href="/signup">
                  <Button size="lg" className="w-full sm:w-auto btn-breathe">
                    {t("landing.createAccount")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/sets">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                    {t("landing.openLibrary")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 xl:pl-24">
          <div className="grid gap-10 lg:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr]">
            <div>
              <BrandLogo compact />
              <p className="mt-4 max-w-sm text-sm leading-7 text-[var(--text-secondary)]">
                {t("landing.footerBody")}
              </p>
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
          <div className="section-divider mt-10" />
          <p className="mt-6 text-sm text-[var(--text-muted)]">
            {t("landing.footerCopyright").replace("{year}", String(new Date().getFullYear()))}
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────────────────────── */

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--primary)]">
        {eyebrow}
      </p>
      <h2
        className="mt-3 font-bold tracking-[-0.03em] text-[var(--text-primary)]"
        style={{ fontSize: "var(--text-h2)" }}
      >
        {title}
      </h2>
      <p
        className="mt-4 leading-7 text-[var(--text-secondary)] sm:leading-8"
        style={{ fontSize: "var(--text-body-lg)" }}
      >
        {body}
      </p>
    </div>
  );
}

function SnapshotCard({
  eyebrow,
  title,
  points,
}: {
  eyebrow: string;
  title: string;
  points: string[];
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-soft)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
        {eyebrow}
      </p>
      <h3 className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      <ul className="mt-3 space-y-2">
        {points.map((point) => (
          <li
            key={point}
            className="flex items-start gap-2 text-[13px] leading-5 text-[var(--text-secondary)]"
          >
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--success)]" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CompactSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3.5 shadow-[var(--shadow-xs)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)]"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
