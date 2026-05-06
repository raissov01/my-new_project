import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Brain, CheckCircle2, GraduationCap, Target } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getCurrentUser } from "@/server/auth";
import { listNUETTopics } from "@/server/integrations/go-backend/nuet";
import { RoadmapPlanTabs } from "./client";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  return {
    title: t("nuet.roadmap.metaTitle"),
    description: t("nuet.roadmap.metaDesc"),
    alternates: { canonical: "/nuet/roadmap" },
  };
}

export default async function NUETRoadmapPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const user = await getCurrentUser();

  const [mathTopics, ctTopics] = await Promise.all([
    listNUETTopics(user?.id ?? "", "math").catch(() => ({ items: [] })),
    listNUETTopics(user?.id ?? "", "critical_thinking").catch(() => ({ items: [] })),
  ]);

  return (
    <article className="page-shell py-6 sm:py-10">
      <header className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--bg-soft)] to-[var(--bg-base)] p-6 sm:p-10">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--text-muted)]">
          NUET ROADMAP
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
          {t("nuet.roadmap.title")}
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-[var(--text-secondary)] sm:text-base">
          {t("nuet.roadmap.subtitle")}
        </p>

        <div className="mt-6 grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:grid-cols-[auto_1fr]">
          <div className="flex items-start gap-2">
            <Target className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {t("nuet.roadmap.examFormat")}
            </p>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            {t("nuet.roadmap.examFormatDesc")}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/nuet/simulator"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <GraduationCap className="h-4 w-4" />
            {t("nuet.roadmap.startBtn")}
          </Link>
        </div>
      </header>

      <RoadmapPlanTabs />

      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              {t("nuet.roadmap.checklistTitle")}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {t("nuet.roadmap.checklistDesc")}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <TopicChecklistCard
            section="math"
            title={t("nuet.sectionMath")}
            topics={mathTopics.items}
          />
          <TopicChecklistCard
            section="critical_thinking"
            title={t("nuet.sectionCT")}
            topics={ctTopics.items}
          />
        </div>
      </section>
    </article>
  );
}

function TopicChecklistCard({
  section,
  title,
  topics,
}: {
  section: "math" | "critical_thinking";
  title: string;
  topics: Array<{ id: string; slug: string; title: string; description?: string }>;
}) {
  const Icon = section === "math" ? BookOpen : Brain;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-[var(--primary)]" />
        <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
        <span className="ml-auto rounded-full bg-[var(--bg-base)] px-2 py-0.5 text-[11px] font-mono text-[var(--text-muted)]">
          {topics.length}
        </span>
      </div>
      {topics.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">No topics seeded yet.</p>
      ) : (
        <ol className="space-y-2">
          {topics.map((topic, index) => (
            <li key={topic.id}>
              <Link
                href={`/nuet/topics/${topic.slug}`}
                className="group flex items-start gap-3 rounded-lg border border-transparent px-3 py-2 transition hover:border-[var(--border)] hover:bg-[var(--bg-base)]"
              >
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-base)] text-[10px] font-mono text-[var(--text-muted)]">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--primary)]">
                    {topic.title}
                  </span>
                  {topic.description ? (
                    <span className="mt-0.5 block truncate text-xs text-[var(--text-secondary)]">
                      {topic.description}
                    </span>
                  ) : null}
                </span>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100" />
              </Link>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
        <CheckCircle2 className="h-3 w-3" />
        Tap a topic to open its full explanation and practice set.
      </p>
    </div>
  );
}
