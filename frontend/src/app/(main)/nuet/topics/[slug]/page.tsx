import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Brain, FileText, PlayCircle } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getCurrentUser } from "@/server/auth";
import { getNUETTopic, listNUETMaterials } from "@/server/integrations/go-backend/nuet";
import { MathText } from "@/components/nuet/math-text";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const user = await getCurrentUser();
  const topic = await getNUETTopic(user?.id ?? "", slug).catch(() => null);
  return {
    title: topic ? `${topic.title} — ${t("nuet.topicsMetaTitle")}` : t("nuet.topicsMetaTitle"),
    description: topic?.description ?? t("nuet.topicsMetaDesc"),
  };
}

export default async function NUETTopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const user = await getCurrentUser();

  const topic = await getNUETTopic(user?.id ?? "", slug).catch(() => null);
  if (!topic) notFound();

  // Topic-relevant materials: tag prefix matches our slug or topic key.
  // We pass a coarse-grained `topic` filter — the backend looks for tags
  // like topic_algebra, topic_geometry, etc. Slug→topic-key mapping is
  // approximate (best-effort).
  const topicKey = inferTopicKey(slug);
  const materials = user
    ? await listNUETMaterials(user.id, {
        section: topic.section,
        topic: topicKey,
        withFile: true,
        limit: 20,
      }).catch(() => ({ items: [], total: 0 }))
    : { items: [], total: 0 };

  const SectionIcon = topic.section === "math" ? BookOpen : Brain;

  return (
    <article className="page-shell py-6 sm:py-10">
      <Link
        href="/nuet/topics"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("nuet.backToTopics")}
      </Link>

      <header className="mt-4">
        <div className="flex items-center gap-2 text-xs">
          <SectionIcon className="h-4 w-4 text-[var(--primary)]" />
          <span className="font-mono uppercase tracking-widest text-[var(--text-muted)]">
            {topic.section === "math" ? t("nuet.sectionMath") : t("nuet.sectionCT")}
          </span>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-[var(--text-primary)]">
          {topic.title}
        </h1>
        {topic.description ? (
          <p className="mt-2 text-base text-[var(--text-secondary)]">
            {topic.description}
          </p>
        ) : null}
        <Link
          href={`/nuet/practice/${topic.slug}`}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <PlayCircle className="h-4 w-4" />
          {t("nuet.mod.practice")}
        </Link>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
            {t("nuet.topicExplanation")}
          </h2>
          <div className="prose prose-sm max-w-none text-[var(--text-primary)]">
            <MathText text={topic.explanation} as="div" />
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
              {t("nuet.relatedMaterials")}
            </h3>
            {materials.items.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">
                {t("nuet.noTopicMaterials")}
              </p>
            ) : (
              <ul className="space-y-2">
                {materials.items.slice(0, 8).map((m) => (
                  <li key={m.id}>
                    <a
                      href={`/api/v1/files/${encodeURI(m.filePath)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-start gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-[var(--bg-soft)]"
                    >
                      <FileText className="mt-0.5 h-3 w-3 shrink-0 text-[var(--text-muted)]" />
                      <span className="truncate">{m.fileName || t("nuet.untitledFile")}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}

// Heuristic: map a slug like "trigonometry-in-right-angled-triangle" to a
// short topic key matching the auto-tagger's "topic_*" tags. Returns "" if
// no obvious match (then no topic filter is applied).
function inferTopicKey(slug: string): string | undefined {
  const map: Record<string, string> = {
    algebra: "algebra",
    geometry: "geometry",
    trigonometry: "trigonometry",
    vectors: "vectors",
    probability: "probability",
    function: "functions",
    sequence: "sequences",
    statistics: "statistics",
  };
  for (const [needle, key] of Object.entries(map)) {
    if (slug.includes(needle)) return key;
  }
  return undefined;
}
