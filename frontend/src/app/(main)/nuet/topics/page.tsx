import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, Brain } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getCurrentUser } from "@/server/auth";
import { listNUETTopics, type NUETSection, type NUETTopic } from "@/server/integrations/go-backend/nuet";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  return {
    title: t("nuet.topicsMetaTitle"),
    description: t("nuet.topicsMetaDesc"),
    alternates: { canonical: "/nuet/topics" },
  };
}

export default async function NUETTopicsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: NUETSection }>;
}) {
  const params = await searchParams;
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const user = await getCurrentUser();

  const data: { items: NUETTopic[] } = await listNUETTopics(user?.id ?? "", params.section).catch(() => ({
    items: [] as NUETTopic[],
  }));

  const sections: Record<string, NUETTopic[]> = {};
  for (const topic of data.items) {
    (sections[topic.section] ||= []).push(topic);
  }

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
        {t("nuet.topicsTitle")}
      </h1>

      <div className="mt-4 flex gap-2">
        <Link
          href="/nuet/topics"
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            !params.section
              ? "border-[var(--primary)] bg-[var(--primary)] text-white"
              : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]"
          }`}
        >
          {t("nuet.filterAll")}
        </Link>
        <Link
          href="/nuet/topics?section=math"
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            params.section === "math"
              ? "border-[var(--primary)] bg-[var(--primary)] text-white"
              : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]"
          }`}
        >
          {t("nuet.sectionMath")}
        </Link>
        <Link
          href="/nuet/topics?section=critical_thinking"
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            params.section === "critical_thinking"
              ? "border-[var(--primary)] bg-[var(--primary)] text-white"
              : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]"
          }`}
        >
          {t("nuet.sectionCT")}
        </Link>
      </div>

      <div className="mt-6 space-y-8">
        {Object.entries(sections).map(([sectionKey, items]) => (
          <section key={sectionKey}>
            <div className="mb-3 flex items-center gap-2">
              {sectionKey === "math" ? (
                <BookOpen className="h-5 w-5 text-[var(--primary)]" />
              ) : (
                <Brain className="h-5 w-5 text-[var(--primary)]" />
              )}
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                {sectionKey === "math" ? t("nuet.sectionMath") : t("nuet.sectionCT")}
              </h2>
              <span className="text-sm text-[var(--text-muted)]">
                · {items.length} {t("nuet.topics")}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((topic) => (
                <Link
                  key={topic.slug}
                  href={`/nuet/topics/${topic.slug}`}
                  className="group rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 transition hover:border-[var(--primary)] hover:shadow-md"
                >
                  <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary)]">
                    {topic.title}
                  </h3>
                  {topic.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">
                      {topic.description}
                    </p>
                  ) : null}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
