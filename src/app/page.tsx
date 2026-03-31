import Link from "next/link";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  FileText,
  GraduationCap,
  Layers3,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";

const featureItems = [
  {
    icon: Layers3,
    title: "Flashcard workspace",
    body: "Таза кітапхана, жинақтарды оңай басқару және күнделікті қайталауға ыңғайлы оқу ағыны.",
  },
  {
    icon: Trophy,
    title: "Class challenges",
    body: "Сынып ішіндегі жеке рейтингтер, дәлдікке негізделген жарыс және нақты оқу нәтижесіне байланған бәсеке.",
  },
  {
    icon: Users,
    title: "Teacher mode",
    body: "Класс құру, кодпен қосу, тапсырма беру, прогресті көру және студенттерге құрылымды оқу ортасын ашу.",
  },
  {
    icon: Brain,
    title: "AI-ready foundation",
    body: "PDF, Word және болашақ интеллектуалды генерация мүмкіндіктеріне дайын архитектура мен интерфейс.",
  },
  {
    icon: FileText,
    title: "Import flows",
    body: "CSV импорт, материалдан карточка құру және контентті бір өнімдік ағынға жинау.",
  },
  {
    icon: Target,
    title: "Progress visibility",
    body: "Студент пен мұғалім үшін түсінікті метрикалар, нақты прогресс және жеңіл сканерленетін dashboard.",
  },
];

export default async function LandingPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  return (
    <div className="bg-gradient-main">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--glass-bg)] backdrop-blur-xl">
        <div className="page-shell flex h-14 items-center justify-between gap-3 sm:h-16">
          <Link href="/" className="inline-flex items-center">
            <BrandLogo compact />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                {t("landing.logIn")}
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">{t("landing.signUp")}</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="page-shell pb-14 pt-8 sm:pb-20 sm:pt-12 lg:pb-28 lg:pt-16">
          <div className="grid gap-5 sm:gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:gap-8">
            <div className="max-w-3xl">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] shadow-[var(--surface-shadow)] sm:px-4 sm:text-sm">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                Modern platform for focused learning
              </div>
              <h1 className="mt-5 max-w-[14ch] text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:mt-6 sm:max-w-[13ch] sm:text-5xl lg:mt-8 lg:text-7xl">
                StudyWithRaissov helps students learn with more structure and less noise.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--text-secondary)] sm:mt-5 sm:text-base sm:leading-7 lg:text-lg lg:leading-8">
                Flashcards, assignments, class challenges, and future AI tools are brought
                together into one clean workspace for students and teachers.
              </p>
              <div className="mt-6 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:gap-3">
                <Link href="/signup">
                  <Button size="lg" className="w-full sm:w-auto">
                    Бастау
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                    Аккаунтқа кіру
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:gap-4">
              <div className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--surface-shadow-strong)] sm:rounded-[1.75rem] sm:p-6">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">
                  Product snapshot
                </p>
                <div className="mt-4 grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4">
                  <Metric value="Flashcards" label="Organized library" />
                  <Metric value="Challenges" label="Meaningful rankings" />
                  <Metric value="Teachers" label="Class management" />
                  <Metric value="AI-ready" label="Prepared import flow" />
                </div>
              </div>
              <div className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-[var(--surface-shadow)] sm:rounded-[1.75rem] sm:p-6">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">
                  Built for clarity
                </p>
                <ul className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
                  <Benefit text="Студентке жеңіл, мұғалімге басқаруға ыңғайлы." />
                  <Benefit text="Таза dark UI, жоғары контраст және комфортты spacing." />
                  <Benefit text="Жаңа мүмкіндіктер қосуға ыңғайлы scalable foundation." />
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
            <StatCard value="20+" label="Students per class MVP" />
            <StatCard value="AI" label="Ready import architecture" />
            <StatCard value="Role-based" label="Teacher and student flows" />
            <StatCard value="Vercel" label="Production deployment ready" />
          </div>
        </section>

        <section className="border-t border-[var(--border)]">
          <div className="page-shell py-14 sm:py-20 lg:py-24">
            <div className="max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">
                Core product areas
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:mt-4 sm:text-4xl">
                Clean building blocks for a serious education product
              </h2>
            </div>

            <div className="mt-6 grid gap-3 sm:mt-8 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featureItems.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--surface-shadow)] transition-transform hover:-translate-y-1 sm:rounded-[1.5rem] sm:p-6"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--bg-soft)] text-indigo-400 sm:h-12 sm:w-12">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:mt-5 sm:text-xl">
                    {item.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-6 text-[var(--text-secondary)] sm:mt-3 sm:leading-7">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--border)] bg-[var(--bg-surface)]">
          <div className="page-shell py-14 sm:py-20 lg:py-24">
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              <AudienceCard
                title="For students"
                body="Keep assigned sets, class competitions, and personal progress in one quiet, productive workspace."
                points={[
                  "Join classes by code",
                  "Study assigned flashcards",
                  "See your rank inside private challenges",
                ]}
              />
              <AudienceCard
                title="For teachers"
                body="Create classes, manage students, assign sets, and track progress without juggling disconnected tools."
                points={[
                  "Create and manage classes",
                  "Assign decks and challenges",
                  "View rankings and class progress",
                ]}
              />
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--border)]">
          <div className="page-shell py-14 sm:py-20 lg:py-24">
            <div className="rounded-[1.6rem] border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-7 shadow-[var(--surface-shadow-strong)] sm:rounded-[2rem] sm:px-10 sm:py-12">
              <div className="max-w-3xl">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">
                  Ready to launch
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:mt-4 sm:text-4xl">
                  Start with a clean foundation and grow into AI-powered learning tools.
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:mt-4 sm:text-base sm:leading-8">
                  The interface is built to stay calm, organized, and scalable as you add
                  PDF import, auto-generated flashcards, and richer classroom workflows.
                </p>
              </div>
              <div className="mt-6 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:gap-3">
                <Link href="/signup">
                  <Button size="lg" className="w-full sm:w-auto">
                    Тегін тіркелу
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Жүйеге кіру
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="page-shell flex flex-col gap-5 py-8 text-sm text-[var(--text-secondary)] lg:flex-row lg:items-center lg:justify-between">
          <div>
            <BrandLogo compact />
            <p className="mt-3 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
              Modern learning workspace for students and teachers.
            </p>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            © {new Date().getFullYear()} StudyWithRaissov. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-3.5 sm:p-4">
      <p className="text-sm font-semibold text-[var(--text-primary)] sm:text-base">{value}</p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{label}</p>
    </div>
  );
}

function Benefit({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3 text-sm leading-6 text-[var(--text-secondary)]">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
      <span>{text}</span>
    </li>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--surface-shadow)] sm:rounded-[1.4rem] sm:p-5">
      <p className="text-xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:text-2xl">
        {value}
      </p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{label}</p>
    </div>
  );
}

function AudienceCard({
  title,
  body,
  points,
}: {
  title: string;
  body: string;
  points: string[];
}) {
  return (
    <div className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--surface-shadow)] sm:rounded-[1.75rem] sm:p-7">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--bg-soft)] text-indigo-400 sm:h-12 sm:w-12">
        {title === "For students" ? (
          <GraduationCap className="h-5 w-5" />
        ) : (
          <Users className="h-5 w-5" />
        )}
      </div>
      <h3 className="mt-4 text-xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:mt-5 sm:text-2xl">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:leading-7">{body}</p>
      <ul className="mt-5 space-y-3 sm:mt-6">
        {points.map((point) => (
          <Benefit key={point} text={point} />
        ))}
      </ul>
    </div>
  );
}
