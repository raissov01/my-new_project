import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  BookOpenText,
  Bot,
  CheckCircle2,
  Compass,
  LayoutDashboard,
  LibraryBig,
  MessageSquareQuote,
  NotebookPen,
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

const heroStats = [
  { value: "12+", label: "Connected study tools" },
  { value: "24/7", label: "Always-on learning workspace" },
  { value: "Role-based", label: "Teacher and student experiences" },
];

const ecosystemCards: Array<{
  title: string;
  body: string;
  icon: LucideIcon;
  tone: string;
}> = [
  {
    title: "Flashcards",
    body: "Structured decks for daily review, spaced repetition, and clean knowledge organization.",
    icon: BookOpenText,
    tone: "from-indigo-500/20 to-blue-500/10",
  },
  {
    title: "Quizzes",
    body: "Quick assessment flows that help students turn reading into measurable recall.",
    icon: Target,
    tone: "from-cyan-500/18 to-sky-500/10",
  },
  {
    title: "Public library",
    body: "A browsable learning catalog with resources, public sets, and classroom-ready materials.",
    icon: LibraryBig,
    tone: "from-violet-500/18 to-fuchsia-500/10",
  },
  {
    title: "Classes",
    body: "Teacher-led classrooms with invite codes, assignments, and private group structure.",
    icon: Users,
    tone: "from-emerald-500/18 to-teal-500/10",
  },
  {
    title: "Progress tracking",
    body: "Focused dashboards, accuracy metrics, and calm reporting for real learning momentum.",
    icon: BarChart3,
    tone: "from-blue-500/18 to-indigo-500/10",
  },
  {
    title: "Challenges",
    body: "Competitive study sessions ranked by accuracy, speed, and meaningful performance.",
    icon: Trophy,
    tone: "from-amber-500/18 to-orange-500/10",
  },
  {
    title: "AI study tools",
    body: "PDF and Word import, smart extraction, and future-ready generation workflows.",
    icon: Bot,
    tone: "from-fuchsia-500/18 to-purple-500/10",
  },
  {
    title: "Notes and summaries",
    body: "Turn raw material into condensed revision assets inside the same ecosystem.",
    icon: NotebookPen,
    tone: "from-sky-500/18 to-cyan-500/10",
  },
  {
    title: "Teacher control center",
    body: "Assign sets, manage class activity, and monitor challenge participation at a glance.",
    icon: ShieldCheck,
    tone: "from-emerald-500/18 to-lime-500/10",
  },
  {
    title: "Student dashboard",
    body: "A focused home base for assigned work, study streaks, rankings, and next actions.",
    icon: LayoutDashboard,
    tone: "from-indigo-500/18 to-violet-500/10",
  },
];

const previewColumns = [
  {
    eyebrow: "Public library",
    title: "Explore high-signal study material before signing up",
    body: "Open access to public decks, clean previews, and calm discovery for new visitors.",
    points: ["Browse public flashcards", "Preview deck details", "See open rankings and materials"],
  },
  {
    eyebrow: "Classes and challenges",
    title: "Move from personal study to class-based competition",
    body: "Classes, assignments, and private challenges sit in the same platform instead of scattered tools.",
    points: ["Teacher-managed classrooms", "Private leaderboards", "Assigned sets and challenge deadlines"],
  },
  {
    eyebrow: "AI workspace",
    title: "Build smarter study material from real documents",
    body: "Import source content, extract key ideas, and prepare for AI-assisted flashcard generation.",
    points: ["PDF and Word ingestion", "Smart term-definition extraction", "Future summary and notes flows"],
  },
];

const platformMetrics = [
  { value: "500+", label: "Decks prepared for active study" },
  { value: "94%", label: "Average challenge accuracy target" },
  { value: "18", label: "Classroom workflows in one product surface" },
  { value: "3 roles", label: "Guest, student, and teacher experience" },
];

const feedback = [
  {
    quote:
      "It feels like a real learning platform now, not just a place to store cards. I know what to do next each time I open it.",
    person: "Aruzhan, student",
  },
  {
    quote:
      "The class flow makes it easier to assign work and still keep students engaged through rankings and visible progress.",
    person: "Nursultan, teacher",
  },
  {
    quote:
      "The ecosystem is what matters: flashcards, classes, challenges, and AI tools all feel connected instead of bolted on.",
    person: "Dias, early tester",
  },
];

const faqItems = [
  {
    question: "Can I explore the platform before creating an account?",
    answer:
      "Yes. Guests can browse the homepage, guide, public library, and public set pages before committing to an account.",
  },
  {
    question: "What changes for teachers?",
    answer:
      "Teachers can create classes, assign flashcard sets, launch class-only challenges, and track learner activity in one workspace.",
  },
  {
    question: "Where does AI fit into the platform?",
    answer:
      "AI is designed as a study assistant layer for importing documents, generating decks, and helping convert material into revision assets.",
  },
  {
    question: "Is StudyWithRaissov only for flashcards?",
    answer:
      "No. Flashcards are one core tool, but the long-term product is a broader ecosystem for classes, progress, resources, quizzes, and smart study support.",
  },
];

const sectionLinks: Array<{ href: string; label: string; short: string; icon: LucideIcon }> = [
  { href: "#hero", label: "Overview", short: "OV", icon: Compass },
  { href: "#ecosystem", label: "Ecosystem", short: "EC", icon: Sparkles },
  { href: "#library", label: "Library", short: "LB", icon: LibraryBig },
  { href: "#proof", label: "Proof", short: "PF", icon: BarChart3 },
  { href: "#faq", label: "FAQ", short: "FQ", icon: MessageSquareQuote },
];

export default async function LandingPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

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
                    Library
                  </Button>
                </Link>
              </div>
            </div>

            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <Link href="/sets">
                <Button variant="outline" size="sm">
                  Explore library
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
                  Learning ecosystem for students and teachers
                </div>

                <h1 className="mt-5 max-w-[12ch] text-4xl font-semibold tracking-[-0.065em] text-[var(--text-primary)] sm:text-5xl lg:text-6xl xl:text-7xl">
                  One premium workspace for studying, teaching, and growing performance.
                </h1>

                <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base lg:text-lg lg:leading-8">
                  StudyWithRaissov is evolving into a connected education platform: flashcards,
                  quizzes, classes, rankings, AI tools, resources, summaries, and dashboards
                  designed to work as one calm ecosystem.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link href="/signup">
                    <Button size="lg" className="w-full sm:w-auto">
                      Start your workspace
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/sets">
                    <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                      Explore public library
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
                        Platform map
                      </p>
                      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                        A serious study stack, not a single isolated tool
                      </h2>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/8 px-3 py-2 text-xs font-medium text-[var(--text-secondary)]">
                      Ecosystem mode
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <SnapshotCard
                      eyebrow="Study engine"
                      title="Flashcards, quizzes, and challenge sessions"
                      points={["Daily review flow", "Accuracy-led rankings", "Calm focus UI"]}
                    />
                    <SnapshotCard
                      eyebrow="Teaching layer"
                      title="Classes, assignments, and teacher control"
                      points={["Private class spaces", "Assign decks by class", "Progress visibility"]}
                    />
                    <SnapshotCard
                      eyebrow="Content layer"
                      title="Library, notes, summaries, and resources"
                      points={["Public deck discovery", "Structured study materials", "Future summary workflow"]}
                    />
                    <SnapshotCard
                      eyebrow="Intelligence layer"
                      title="AI-assisted import and generation tools"
                      points={["PDF and Word ingestion", "Term-definition extraction", "Scalable AI foundation"]}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <CompactSignal label="Classes" value="Private + public flows" />
                  <CompactSignal label="Library" value="Open exploration mode" />
                  <CompactSignal label="AI" value="Import-ready architecture" />
                </div>
              </div>
            </div>
          </section>

          <section id="ecosystem" className="page-shell border-t border-white/6 py-16 sm:py-20 xl:pl-28">
            <SectionHeading
              eyebrow="Ecosystem"
              title="Every core learning surface belongs to the same product story"
              body="The homepage should feel like an ecosystem because the platform is designed to connect discovery, study, classrooms, AI, and measurable progress."
            />

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {ecosystemCards.map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className="group rounded-[1.7rem] border border-white/7 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5 shadow-[var(--surface-shadow)] transition-all duration-300 hover:-translate-y-1 hover:border-white/12 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))]"
                  >
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-gradient-to-br ${item.tone} text-[var(--text-primary)]`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {item.body}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          <section id="library" className="page-shell border-t border-white/6 py-16 sm:py-20 xl:pl-28">
            <SectionHeading
              eyebrow="Platform previews"
              title="The homepage now introduces a full learning environment"
              body="Instead of presenting one feature, the landing flow previews how public discovery, classroom collaboration, and AI study utilities connect together."
            />

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {previewColumns.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.9rem] border border-white/7 bg-[rgba(255,255,255,0.04)] p-5 shadow-[var(--surface-shadow)] backdrop-blur-sm sm:p-6"
                >
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-indigo-300/80">
                    {item.eyebrow}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                    {item.body}
                  </p>
                  <ul className="mt-5 space-y-3">
                    {item.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-start gap-3 text-sm leading-6 text-[var(--text-secondary)]"
                      >
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
              <SectionHeading
                eyebrow="Live metrics"
                title="A premium product should communicate movement, structure, and proof"
                body="These blocks frame StudyWithRaissov as a living platform with multiple active surfaces rather than a narrow flashcard utility."
              />

              <div className="grid gap-4 sm:grid-cols-2">
                {platformMetrics.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1.8rem] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.8),rgba(15,23,42,0.55))] p-5 shadow-[var(--surface-shadow-strong)]"
                  >
                    <p className="text-3xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] sm:text-4xl">
                      {item.value}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="page-shell border-t border-white/6 py-16 sm:py-20 xl:pl-28">
            <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[2rem] border border-white/7 bg-[rgba(255,255,255,0.04)] p-6 shadow-[var(--surface-shadow)]">
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-indigo-300/80">
                  Feedback
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                  Students and teachers should feel the platform thinking in systems
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
                  The new homepage leans into product trust: clear sections, stronger hierarchy,
                  and an ecosystem narrative that matches the ambition of the platform.
                </p>
              </div>

              <div className="grid gap-4">
                {feedback.map((item) => (
                  <blockquote
                    key={item.person}
                    className="rounded-[1.8rem] border border-white/7 bg-[rgba(255,255,255,0.04)] p-5 shadow-[var(--surface-shadow)]"
                  >
                    <MessageSquareQuote className="h-5 w-5 text-indigo-300" />
                    <p className="mt-4 text-sm leading-7 text-[var(--text-primary)] sm:text-[15px]">
                      “{item.quote}”
                    </p>
                    <footer className="mt-4 text-sm font-medium text-[var(--text-secondary)]">
                      {item.person}
                    </footer>
                  </blockquote>
                ))}
              </div>
            </div>
          </section>

          <section id="faq" className="page-shell border-t border-white/6 py-16 sm:py-20 xl:pl-28">
            <SectionHeading
              eyebrow="FAQ"
              title="A more open entry point, with enough depth to feel like a real platform"
              body="The product stays welcoming for guests, while still making it clear that classrooms, AI, and progress features unlock a deeper workspace."
            />

            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {faqItems.map((item) => (
                <div
                  key={item.question}
                  className="rounded-[1.75rem] border border-white/7 bg-[rgba(255,255,255,0.04)] p-5 shadow-[var(--surface-shadow)]"
                >
                  <h3 className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                    {item.question}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="page-shell pb-14 pt-2 sm:pb-20 xl:pl-28">
            <div className="rounded-[2rem] border border-white/8 bg-[linear-gradient(135deg,rgba(99,91,255,0.16),rgba(17,24,39,0.9)_48%,rgba(79,124,255,0.14))] p-6 shadow-[var(--surface-shadow-strong)] sm:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-indigo-300/80">
                    Start now
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
                    Build your study ecosystem, then expand it with classes, AI, and measurable growth.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                    Explore public material first, or create an account to start building decks,
                    joining class flows, and turning StudyWithRaissov into your daily workspace.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link href="/signup">
                    <Button size="lg" className="w-full sm:w-auto">
                      Create account
                    </Button>
                  </Link>
                  <Link href="/sets">
                    <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                      Open library
                    </Button>
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
              <p className="mt-4 max-w-md text-sm leading-7 text-[var(--text-secondary)]">
                StudyWithRaissov is growing into a premium learning ecosystem for public study,
                private classrooms, AI-supported workflows, and calm performance tracking.
              </p>
            </div>

            <FooterColumn
              title="Platform"
              links={[
                { href: "/sets", label: "Flashcard library" },
                { href: "/guide", label: "Guide" },
                { href: "/leaderboard", label: "Rankings" },
              ]}
            />
            <FooterColumn
              title="Workspaces"
              links={[
                { href: "/signup", label: "Student dashboard" },
                { href: "/signup", label: "Teacher tools" },
                { href: "/signup", label: "AI import flow" },
              ]}
            />
            <FooterColumn
              title="Access"
              links={[
                { href: "/login", label: t("landing.logIn") },
                { href: "/signup", label: t("landing.signUp") },
                { href: "/sets", label: "Guest preview" },
              ]}
            />
          </div>

          <div className="mt-8 border-t border-white/6 pt-6 text-sm text-[var(--text-muted)]">
            © {new Date().getFullYear()} StudyWithRaissov. Designed as a connected learning platform.
          </div>
        </div>
      </footer>
    </div>
  );
}

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
    <div className="max-w-3xl">
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-indigo-300/80">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
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
    <div className="rounded-[1.6rem] border border-white/8 bg-[rgba(255,255,255,0.04)] p-4 shadow-[var(--surface-shadow)]">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
        {eyebrow}
      </p>
      <h3 className="mt-3 text-base font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
        {title}
      </h3>
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
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 font-medium text-[var(--text-primary)]">{value}</p>
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
      <ul className="mt-4 space-y-3">
        {links.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
