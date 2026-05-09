import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Brain, Clock, PlayCircle } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getCurrentUser } from "@/server/auth";
import { getNUETLesson } from "@/server/integrations/go-backend/nuet";
import { parseLessonContent } from "@/lib/shared/nuet/lesson-schema";
import { LessonReaderClient } from "./reader-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const user = await getCurrentUser();
  const lesson = await getNUETLesson(user?.id ?? "", slug).catch(() => null);
  return {
    title: lesson
      ? `${lesson.title} — ${t("nuet.materialsTitle")}`
      : t("nuet.materialsTitle"),
    description: lesson?.summary ?? t("nuet.materialsMetaDesc"),
  };
}

export default async function NUETLessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const user = await getCurrentUser();

  const lesson = await getNUETLesson(user?.id ?? "", slug).catch(() => null);
  if (!lesson) notFound();

  const content = parseLessonContent(lesson.content);
  const SectionIcon = lesson.section === "math" ? BookOpen : Brain;

  return (
    <article className="page-shell py-6 sm:py-10">
      <Link
        href="/nuet/materials"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("nuet.lesson.backToLibrary")}
      </Link>

      <header className="mt-4">
        <div className="flex items-center gap-2 text-xs">
          <SectionIcon className="h-4 w-4 text-[var(--primary)]" />
          <span className="font-mono uppercase tracking-widest text-[var(--text-muted)]">
            {lesson.section === "math" ? t("nuet.sectionMath") : t("nuet.sectionCT")}
          </span>
          {lesson.minutes ? (
            <span className="inline-flex items-center gap-1 font-mono uppercase tracking-widest text-[var(--text-muted)]">
              <Clock className="h-3 w-3" />
              {`${lesson.minutes} ${t("nuet.lesson.min")}`}
            </span>
          ) : null}
        </div>
        <h1 className="mt-2 text-3xl font-bold text-[var(--text-primary)]">
          {lesson.title}
        </h1>
        {lesson.summary ? (
          <p className="mt-2 max-w-3xl text-base text-[var(--text-secondary)]">
            {lesson.summary}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/nuet/practice/${lesson.slug}`}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <PlayCircle className="h-4 w-4" />
            {t("nuet.lesson.practiceCTA")}
          </Link>
          <Link
            href={`/nuet/topics/${lesson.slug}`}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
          >
            {t("nuet.lesson.openTopic")}
          </Link>
        </div>
      </header>

      <LessonReaderClient
        chapters={content.chapters}
        practiceHref={`/nuet/practice/${lesson.slug}`}
      />
    </article>
  );
}
