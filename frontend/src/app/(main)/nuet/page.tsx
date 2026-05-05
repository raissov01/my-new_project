import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Brain, FileText, GraduationCap, Library, ScrollText, Trophy } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getCurrentUser } from "@/server/auth";
import { listNUETTopics, getNUETDashboard } from "@/server/integrations/go-backend/nuet";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  return {
    title: t("nuet.metaTitle"),
    description: t("nuet.metaDesc"),
    alternates: { canonical: "/nuet" },
  };
}

export default async function NUETHubPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const user = await getCurrentUser();

  const [mathTopics, ctTopics, dashboard] = await Promise.all([
    listNUETTopics(user?.id ?? "", "math").catch(() => ({ items: [] })),
    listNUETTopics(user?.id ?? "", "critical_thinking").catch(() => ({ items: [] })),
    user ? getNUETDashboard(user.id).catch(() => null) : null,
  ]);

  const modules = [
    {
      icon: BookOpen,
      titleKey: "nuet.mod.topics",
      descKey: "nuet.mod.topicsDesc",
      meta: `${mathTopics.items.length + ctTopics.items.length} ${t("nuet.topics")}`,
      href: "/nuet/topics",
      tone: "blue" as const,
    },
    {
      icon: Brain,
      titleKey: "nuet.mod.practice",
      descKey: "nuet.mod.practiceDesc",
      meta: t("nuet.mod.practiceMeta"),
      href: "/nuet/practice",
      tone: "green" as const,
    },
    {
      icon: GraduationCap,
      titleKey: "nuet.mod.mockExam",
      descKey: "nuet.mod.mockExamDesc",
      meta: "60 MCQ · 120 min",
      href: "/nuet/simulator",
      tone: "orange" as const,
    },
    {
      icon: Library,
      titleKey: "nuet.mod.materials",
      descKey: "nuet.mod.materialsDesc",
      meta: dashboard ? `${dashboard.materialCount} ${t("nuet.files")}` : "",
      href: "/nuet/materials",
      tone: "purple" as const,
    },
    {
      icon: ScrollText,
      titleKey: "nuet.pdfTest.title",
      descKey: "nuet.pdfTest.subtitleShort",
      meta: "18 PDF",
      href: "/nuet/pdf-tests",
      tone: "blue" as const,
    },
  ];

  return (
    <div className="page-shell py-6 sm:py-10">
      {/* Hero */}
      <section className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--bg-soft)] to-[var(--bg-base)] p-6 sm:p-10">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--text-muted)]">
          {t("nuet.heroEyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
          {t("nuet.heroTitle")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--text-secondary)] sm:text-base">
          {t("nuet.heroSubtitle")}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/nuet/simulator"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <GraduationCap className="h-4 w-4" />
            {t("nuet.startMock")}
          </Link>
          <Link
            href="/nuet/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-soft)]"
          >
            <Trophy className="h-4 w-4" />
            {t("nuet.viewProgress")}
          </Link>
        </div>

        {/* Quick stats — exam structure */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCell label={t("nuet.statSections")} value="2" />
          <StatCell label={t("nuet.statQuestions")} value="60" />
          <StatCell label={t("nuet.statDuration")} value="120 min" />
          <StatCell label={t("nuet.statMaxScore")} value="240" />
        </div>
      </section>

      {/* Module grid */}
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          {t("nuet.modulesTitle")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {modules.map((m) => (
            <Link
              key={m.titleKey}
              href={m.href}
              className="group flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 transition hover:border-[var(--primary)] hover:shadow-md"
            >
              <ToneIcon icon={m.icon} tone={m.tone} />
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                {t(m.titleKey)}
              </h3>
              <p className="flex-1 text-sm text-[var(--text-secondary)]">
                {t(m.descKey)}
              </p>
              {m.meta ? (
                <p className="font-mono text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  {m.meta}
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      </section>

      {/* Sections preview */}
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <SectionPreview
          icon={FileText}
          title={t("nuet.sectionMath")}
          subtitle={`30 ${t("nuet.questions")} · 60 ${t("nuet.minutes")}`}
          topics={mathTopics.items.slice(0, 6)}
          allHref="/nuet/topics?section=math"
          locale={locale}
          t={t}
        />
        <SectionPreview
          icon={Brain}
          title={t("nuet.sectionCT")}
          subtitle={`30 ${t("nuet.questions")} · 60 ${t("nuet.minutes")}`}
          topics={ctTopics.items.slice(0, 6)}
          allHref="/nuet/topics?section=critical_thinking"
          locale={locale}
          t={t}
        />
      </section>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

const TONE_CLASSES = {
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  purple: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
} as const;

function ToneIcon({
  icon: Icon,
  tone,
}: {
  icon: typeof BookOpen;
  tone: keyof typeof TONE_CLASSES;
}) {
  return (
    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${TONE_CLASSES[tone]}`}>
      <Icon className="h-5 w-5" />
    </span>
  );
}

function SectionPreview({
  icon: Icon,
  title,
  subtitle,
  topics,
  allHref,
  t,
}: {
  icon: typeof FileText;
  title: string;
  subtitle: string;
  topics: Array<{ slug: string; title: string; description: string }>;
  allHref: string;
  locale: string;
  t: (key: string) => string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-[var(--primary)]" />
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">{title}</h3>
          <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {topics.length === 0 ? (
          <li className="text-sm text-[var(--text-muted)]">—</li>
        ) : (
          topics.map((topic) => (
            <li key={topic.slug}>
              <Link
                href={`/nuet/topics/${topic.slug}`}
                className="block rounded-lg px-3 py-2 text-sm transition hover:bg-[var(--bg-soft)]"
              >
                <span className="font-medium text-[var(--text-primary)]">{topic.title}</span>
                {topic.description ? (
                  <span className="ml-2 text-xs text-[var(--text-muted)] line-clamp-1">
                    {topic.description}
                  </span>
                ) : null}
              </Link>
            </li>
          ))
        )}
      </ul>
      <Link
        href={allHref}
        className="mt-3 inline-block text-sm font-medium text-[var(--primary)] hover:underline"
      >
        {t("nuet.viewAll")} →
      </Link>
    </div>
  );
}
