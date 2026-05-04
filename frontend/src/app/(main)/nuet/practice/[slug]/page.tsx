import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getCurrentUser } from "@/server/auth";
import { getNUETTopic, listNUETQuestions } from "@/server/integrations/go-backend/nuet";
import { NUETPracticeClient } from "./practice-client";

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
    title: topic ? `${topic.title} — ${t("nuet.mod.practice")}` : t("nuet.mod.practice"),
    description: topic?.description ?? t("nuet.mod.practiceDesc"),
  };
}

export default async function NUETPracticeTopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="page-shell py-10">
        <p>{t("nuet.signInRequired")}</p>
        <Link href="/login" className="mt-4 inline-block text-[var(--primary)] hover:underline">
          {t("auth.signIn")}
        </Link>
      </div>
    );
  }

  const topic = await getNUETTopic(user.id, slug).catch(() => null);
  if (!topic) notFound();

  const questionData = await listNUETQuestions(user.id, {
    topicSlug: slug,
    limit: 20,
  }).catch(() => ({ items: [] }));

  return (
    <div className="page-shell py-6 sm:py-10">
      <Link
        href="/nuet/practice"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("nuet.mod.practice")}
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
        {topic.title}
      </h1>
      {topic.description ? (
        <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
          {topic.description}
        </p>
      ) : null}

      <NUETPracticeClient topic={topic} questions={questionData.items} />
    </div>
  );
}
