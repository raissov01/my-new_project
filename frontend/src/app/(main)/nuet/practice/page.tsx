import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Brain, GraduationCap, PlayCircle } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getCurrentUser } from "@/server/auth";
import { listNUETTopics, type NUETTopic } from "@/server/integrations/go-backend/nuet";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  return {
    title: `${t("nuet.mod.practice")} | StudyWithRaissov`,
    description: t("nuet.mod.practiceDesc"),
    alternates: { canonical: "/nuet/practice" },
  };
}

export default async function NUETPracticePage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const user = await getCurrentUser();

  const data = await listNUETTopics(user?.id ?? "").catch(() => ({ items: [] as NUETTopic[] }));
  const mathTopics = data.items.filter((item) => item.section === "math");
  const ctTopics = data.items.filter((item) => item.section === "critical_thinking");

  return (
    <div className="page-shell py-6 sm:py-10">
      <Link
        href="/nuet"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("nuet.backToHub")}
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
        {t("nuet.mod.practice")}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
        {t("nuet.mod.practiceDesc")}
      </p>

      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--bg-soft)] to-[var(--bg-surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
              Practice mode
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
              Topic practice is now live with a starter bank, and we can keep expanding it topic by topic.
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
              Pick a topic to open a short graded set, or use the PDF simulator when you want a full timed mock.
            </p>
          </div>
          <Link
            href="/nuet/pdf-tests"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <GraduationCap className="h-4 w-4" />
            {t("nuet.startMock")}
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <TopicColumn
          icon={<BookOpen className="h-5 w-5 text-[var(--primary)]" />}
          title={t("nuet.sectionMath")}
          topics={mathTopics}
        />
        <TopicColumn
          icon={<Brain className="h-5 w-5 text-[var(--primary)]" />}
          title={t("nuet.sectionCT")}
          topics={ctTopics}
        />
      </div>
    </div>
  );
}

function TopicColumn({
  icon,
  title,
  topics,
}: {
  icon: ReactNode;
  title: string;
  topics: NUETTopic[];
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
      </div>
      <div className="mt-4 space-y-2">
        {topics.map((topic) => (
          <Link
            key={topic.slug}
            href={`/nuet/practice/${topic.slug}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3 text-sm text-[var(--text-primary)] transition hover:border-[var(--primary)]"
          >
            <span>{topic.title}</span>
            <PlayCircle className="h-4 w-4 text-[var(--primary)]" />
          </Link>
        ))}
      </div>
    </section>
  );
}
