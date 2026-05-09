import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Brain, Clock, ExternalLink, FileText, PlayCircle } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getCurrentUser } from "@/server/auth";
import {
  getNUETLesson,
  getNUETTopic,
  listNUETMaterials,
  listNUETQuestions,
} from "@/server/integrations/go-backend/nuet";
import { MathText } from "@/components/nuet/math-text";
import { PrintButton } from "@/components/nuet/print-button";
import { parseLessonContent } from "@/lib/shared/nuet/lesson-schema";
import { LessonReaderClient } from "@/components/nuet/lesson-reader";
import { TOPIC_LINKS } from "./recommended-links";

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
  const userId = user?.id ?? "";
  const [lesson, materials, examples] = await Promise.all([
    getNUETLesson(userId, slug).catch(() => null),
    listNUETMaterials(userId, {
      section: topic.section,
      topic: topicKey,
      withFile: true,
      limit: 20,
    }).catch(() => ({ items: [], total: 0 })),
    listNUETQuestions(userId, { topicSlug: topic.slug, limit: 5 }).catch(() => ({ items: [] })),
  ]);

  const SectionIcon = topic.section === "math" ? BookOpen : Brain;
  const lessonContent = lesson ? parseLessonContent(lesson.content) : null;
  const hasBook = lessonContent !== null && lessonContent.chapters.length > 0;

  return (
    <article className="page-shell py-6 sm:py-10">
      <Link
        href="/nuet/topics"
        className="print-hide inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
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
          {hasBook && lesson && lesson.minutes ? (
            <span className="inline-flex items-center gap-1 font-mono uppercase tracking-widest text-[var(--text-muted)]">
              <Clock className="h-3 w-3" />
              {`${lesson.minutes} ${t("nuet.lesson.min")}`}
            </span>
          ) : null}
        </div>
        <h1 className="mt-2 text-3xl font-bold text-[var(--text-primary)]">
          {topic.title}
        </h1>
        {(hasBook && lessonContent ? lessonContent.summary : topic.description) ? (
          <p className="mt-2 max-w-3xl text-base text-[var(--text-secondary)]">
            {hasBook && lessonContent ? lessonContent.summary : topic.description}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-3 print-hide">
          <Link
            href={`/nuet/practice/${topic.slug}`}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <PlayCircle className="h-4 w-4" />
            {t("nuet.mod.practice")}
          </Link>
          <PrintButton />
        </div>
      </header>

      {hasBook && lessonContent ? (
        <LessonReaderClient
          chapters={lessonContent.chapters}
          practiceHref={`/nuet/practice/${topic.slug}`}
        />
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <section className="print-paper rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
              <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
                {t("nuet.topicExplanation")}
              </h2>
              <div className="prose prose-sm max-w-none text-[var(--text-primary)]">
                <MathText text={cleanTopicExplanation(topic.explanation)} as="div" />
              </div>
            </section>

            <section className="print-hide rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                {t("nuet.topic.examplesTitle")}
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {t("nuet.topic.examplesDesc")}
              </p>
              {examples.items.length === 0 ? (
                <p className="mt-4 rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-base)] p-4 text-sm text-[var(--text-muted)]">
                  {t("nuet.topic.examplesEmpty")}
                </p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {examples.items.map((q, index) => (
                    <li key={q.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg-base)] p-4">
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        <span>{index + 1}. </span>
                        <MathText text={q.prompt} />
                      </div>
                      <ul className="mt-3 space-y-1.5">
                        {q.options.map((option, optionIndex) => {
                          const letter = String.fromCharCode(65 + optionIndex);
                          return (
                            <li
                              key={letter}
                              className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"
                            >
                              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[10px] font-mono text-[var(--text-muted)]">
                                {letter}
                              </span>
                              <span className="min-w-0 flex-1">
                                <MathText text={option} />
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                      <details className="group mt-3 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-sm">
                        <summary className="cursor-pointer list-none font-mono text-xs uppercase tracking-wide text-[var(--text-muted)] hover:text-[var(--primary)]">
                          {t("nuet.topic.showSolution")}
                        </summary>
                        <div className="mt-2 space-y-2">
                          <p className="text-xs text-[var(--text-muted)]">
                            {t("nuet.topic.correctAnswer")} <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">{q.answer}</span>
                          </p>
                          {q.explanation && q.explanation.trim() ? (
                            <div className="text-sm text-[var(--text-secondary)]">
                              <MathText text={q.explanation} as="div" />
                            </div>
                          ) : (
                            <p className="text-sm italic text-[var(--text-muted)]">
                              {t("nuet.review.noExplanation")}
                            </p>
                          )}
                        </div>
                      </details>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          <aside className="print-hide space-y-4">
            {TOPIC_LINKS[topic.slug] && TOPIC_LINKS[topic.slug].length > 0 ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
                <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                  {t("nuet.topic.recommendedLinks")}
                </h3>
                <ul className="space-y-2">
                  {TOPIC_LINKS[topic.slug].map((link) => (
                    <li key={link.url}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="group flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--bg-base)]"
                      >
                        <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--primary)]" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-medium text-[var(--text-primary)] group-hover:text-[var(--primary)]">
                            {link.label}
                          </span>
                          <span className="block text-[10px] font-mono uppercase tracking-wide text-[var(--text-muted)]">
                            {link.source}
                          </span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

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
      )}
    </article>
  );
}

// cleanTopicExplanation hides the HTML-comment marker that the
// enrich-nuet-topics CLI uses to delimit its appended study material.
// Replacing it with a thin horizontal rule keeps the section split
// visible without leaking the literal `<!-- ... -->` to readers.
function cleanTopicExplanation(text: string): string {
  return text.replace(/<!--\s*enriched-section\s*-->/g, "\n\n— — — — —\n\n");
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
