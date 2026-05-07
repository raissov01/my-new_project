import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getCurrentUser } from "@/server/auth";
import { getNUETTopic, listNUETQuestions } from "@/server/integrations/go-backend/nuet";
import { NUETPracticeClient } from "./practice-client";

const DRILL_OPTIONS = [
  { value: "5", limit: 5 },
  { value: "10", limit: 10 },
  { value: "20", limit: 20 },
  { value: "all", limit: 100 },
] as const;

type DrillValue = (typeof DRILL_OPTIONS)[number]["value"];

function resolveDrill(raw: string | undefined): {
  value: DrillValue;
  limit: number;
} {
  const match = DRILL_OPTIONS.find((option) => option.value === raw);
  if (match) return { value: match.value, limit: match.limit };
  return { value: "10", limit: 10 };
}

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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ n?: string | string[] }>;
}) {
  const { slug } = await params;
  const search = await searchParams;
  const rawN = Array.isArray(search.n) ? search.n[0] : search.n;
  const drill = resolveDrill(rawN);
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
    limit: drill.limit,
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

      <DrillSelector slug={slug} active={drill.value} t={t} />

      <NUETPracticeClient topic={topic} questions={questionData.items} />
    </div>
  );
}

function DrillSelector({
  slug,
  active,
  t,
}: {
  slug: string;
  active: DrillValue;
  t: ReturnType<typeof createTranslator>;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
        {t("nuet.practice.drillLengthLabel")}
      </span>
      {DRILL_OPTIONS.map((option) => {
        const isActive = option.value === active;
        const href =
          option.value === "10"
            ? `/nuet/practice/${slug}`
            : `/nuet/practice/${slug}?n=${option.value}`;
        const label =
          option.value === "all"
            ? t("nuet.practice.drillLengthAll")
            : t("nuet.practice.drillLengthN", { n: option.value });
        return (
          <Link
            key={option.value}
            href={href}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              isActive
                ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                : "border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-secondary)] hover:border-[var(--primary)]"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
