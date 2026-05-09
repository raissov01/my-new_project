import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Brain, FileText, Flame, Globe2, GraduationCap, Library, Map, Play, ScrollText, ThumbsUp, Trophy } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getCurrentUser } from "@/server/auth";
import { listNUETTopics, getNUETDashboard, getNUETDailyChallenge, listNUETAttempts } from "@/server/integrations/go-backend/nuet";
import { NUETDailyChallengeWidget } from "./daily-challenge";
import { NUETInProgressCard } from "./in-progress-card";

// Walks completed mock attempts back from today, counting consecutive UTC
// days with at least one finish. Today not yet attempted is allowed (the
// streak is "still alive" until midnight) — we anchor on yesterday in that
// case so the user has the full day to keep it going.
function computeMockStreak(completedAtList: string[]): number {
  if (completedAtList.length === 0) return 0;
  const days = new Set<string>();
  for (const iso of completedAtList) {
    if (!iso) continue;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;
    days.add(d.toISOString().slice(0, 10));
  }
  if (days.size === 0) return 0;
  const today = new Date();
  const cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const todayKey = cursor.toISOString().slice(0, 10);
  if (!days.has(todayKey)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

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

  const [mathTopics, ctTopics, dashboard, daily, inProgress, mockHistory] = await Promise.all([
    listNUETTopics(user?.id ?? "", "math").catch(() => ({ items: [] })),
    listNUETTopics(user?.id ?? "", "critical_thinking").catch(() => ({ items: [] })),
    user ? getNUETDashboard(user.id).catch(() => null) : null,
    getNUETDailyChallenge(user?.id ?? "").catch(() => ({ date: "", questions: [] })),
    user
      ? listNUETAttempts(user.id, { status: "in_progress", limit: 5 }).catch(
          () => ({ attempts: [], total: 0, limit: 0, offset: 0 })
        )
      : null,
    user
      ? listNUETAttempts(user.id, {
          status: "completed",
          attemptType: "full_mock",
          limit: 50,
        }).catch(() => ({ attempts: [], total: 0, limit: 0, offset: 0 }))
      : null,
  ]);
  const mockStreak = mockHistory
    ? computeMockStreak(mockHistory.attempts.map((a) => a.completedAt ?? ""))
    : 0;
  const completedMockCount = mockHistory?.total ?? 0;

  const modules = [
    {
      icon: Map,
      titleKey: "nuet.mod.roadmap",
      descKey: "nuet.mod.roadmapDesc",
      meta: t("nuet.mod.roadmapMeta"),
      href: "/nuet/roadmap",
      tone: "orange" as const,
    },
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
    {
      icon: Globe2,
      titleKey: "nuet.mod.resources",
      descKey: "nuet.mod.resourcesDesc",
      meta: t("nuet.mod.resourcesMeta"),
      href: "/nuet/resources",
      tone: "green" as const,
    },
    {
      icon: ThumbsUp,
      titleKey: "nuet.mod.dismissed",
      descKey: "nuet.mod.dismissedDesc",
      meta: t("nuet.mod.dismissedMeta"),
      href: "/nuet/dismissed",
      tone: "purple" as const,
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

        {inProgress && inProgress.attempts.length > 0 ? (
          <Link
            href="/nuet/simulator"
            className="mt-6 flex items-start gap-3 rounded-xl border-2 border-[var(--primary)] bg-[var(--primary-soft)] p-4 transition hover:bg-[var(--primary)] hover:text-white"
          >
            <Play className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)] group-hover:text-white" />
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-[var(--text-primary)]">
                {t("nuet.heroResumeTitle")}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {t("nuet.heroResumeSub")}
              </p>
            </div>
            <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-[var(--primary)]" />
          </Link>
        ) : null}

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

        {mockStreak > 0 || completedMockCount > 0 ? (
          <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm text-orange-800">
            <Flame className="h-4 w-4 text-orange-600" />
            <span className="font-semibold">
              {mockStreak > 0
                ? t("nuet.mockStreak.active").replace("{n}", String(mockStreak))
                : t("nuet.mockStreak.dormant")}
            </span>
            <span className="text-xs text-orange-700">
              · {t("nuet.mockStreak.totalCompleted").replace("{n}", String(completedMockCount))}
            </span>
          </div>
        ) : null}

        {/* Quick stats — exam structure */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCell label={t("nuet.statSections")} value="2" />
          <StatCell label={t("nuet.statQuestions")} value="60" />
          <StatCell label={t("nuet.statDuration")} value="120 min" />
          <StatCell label={t("nuet.statMaxScore")} value="240" />
        </div>
      </section>

      {/* Pick up where you left off */}
      {inProgress && inProgress.attempts.length > 0 ? (
        <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                {t("nuet.inProgress.title")}
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {t("nuet.inProgress.subtitle")}
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {inProgress.attempts.map((attempt) => (
              <NUETInProgressCard
                key={attempt.id}
                attempt={attempt}
                locale={locale}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Daily challenge */}
      {daily.questions.length > 0 ? (
        <div className="mt-8">
          <NUETDailyChallengeWidget date={daily.date} questions={daily.questions} />
        </div>
      ) : null}

      {/* First-time tips: shown when the user has no in-progress and no
          completed mocks. Three bullet points covering the basics — start
          with a diagnostic, use practice + I-know-this for weak areas,
          come back daily. Server-rendered (no dismiss persistence) since
          the gate already disappears once the user finishes anything. */}
      {user && completedMockCount === 0 && (!inProgress || inProgress.attempts.length === 0) ? (
        <section className="mt-8 rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--primary-soft)] to-[var(--bg-surface)] p-5 sm:p-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
            {t("nuet.onboarding.eyebrow")}
          </p>
          <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
            {t("nuet.onboarding.title")}
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
            <li className="flex items-start gap-2">
              <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
              {t("nuet.onboarding.tip1")}
            </li>
            <li className="flex items-start gap-2">
              <Brain className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
              {t("nuet.onboarding.tip2")}
            </li>
            <li className="flex items-start gap-2">
              <Flame className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
              {t("nuet.onboarding.tip3")}
            </li>
          </ul>
        </section>
      ) : null}

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
