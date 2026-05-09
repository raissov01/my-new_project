import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, Brain, Clock } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getCurrentUser } from "@/server/auth";
import {
  listNUETLessons,
  type NUETLessonSummary,
} from "@/server/integrations/go-backend/nuet";
import { RetryButton } from "@/components/nuet/retry-button";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  return {
    title: t("nuet.materialsMetaTitle"),
    description: t("nuet.materialsMetaDesc"),
    alternates: { canonical: "/nuet/materials" },
  };
}

type SearchParams = {
  section?: "math" | "critical_thinking";
};

export default async function NUETMaterialsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const user = await getCurrentUser();

  const data = await listNUETLessons(user?.id ?? "", params.section).catch(
    () => ({ items: [] as NUETLessonSummary[], total: 0 })
  );

  const sectionFilters = [
    { key: undefined as undefined | "math" | "critical_thinking", label: t("nuet.filterAll") },
    { key: "math" as const, label: t("nuet.sectionMath") },
    { key: "critical_thinking" as const, label: t("nuet.sectionCT") },
  ];

  // Group lessons by section so each band has its own header. Backend
  // returns them already sorted by (section, orderIndex) so we can take
  // them in order as we iterate.
  const mathLessons = data.items.filter((l) => l.section === "math");
  const ctLessons = data.items.filter((l) => l.section === "critical_thinking");

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
        {t("nuet.materialsTitle")}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
        {t("nuet.materialsLibrarySubtitle").replace("{count}", String(data.total))}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
          {t("nuet.filterSection")}
        </span>
        {sectionFilters.map((f) => (
          <Link
            key={f.key ?? "all"}
            href={f.key ? `/nuet/materials?section=${f.key}` : "/nuet/materials"}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition ${
              params.section === f.key
                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {data.items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">{t("nuet.noMaterials")}</p>
          <div className="mt-3 flex justify-center">
            <RetryButton label={t("nuet.materialsRetry")} />
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {(!params.section || params.section === "math") && mathLessons.length > 0 ? (
            <LessonBand
              icon={BookOpen}
              label={t("nuet.sectionMath")}
              lessons={mathLessons}
              t={t}
            />
          ) : null}
          {(!params.section || params.section === "critical_thinking") &&
          ctLessons.length > 0 ? (
            <LessonBand
              icon={Brain}
              label={t("nuet.sectionCT")}
              lessons={ctLessons}
              t={t}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function LessonBand({
  icon: Icon,
  label,
  lessons,
  t,
}: {
  icon: typeof BookOpen;
  label: string;
  lessons: NUETLessonSummary[];
  t: (key: string) => string;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-[var(--primary)]" />
        <h2 className="font-mono text-xs uppercase tracking-widest text-[var(--text-muted)]">
          {label}
        </h2>
        <span className="font-mono text-xs text-[var(--text-muted)]">
          · {lessons.length}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lessons.map((l) => (
          <LessonCard key={l.id} lesson={l} t={t} />
        ))}
      </div>
    </section>
  );
}

function LessonCard({
  lesson,
  t,
}: {
  lesson: NUETLessonSummary;
  t: (key: string) => string;
}) {
  return (
    <Link
      href={`/nuet/topics/${lesson.slug}`}
      className="group flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 transition hover:border-[var(--primary)]"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary)]">
          {lesson.title}
        </h3>
        {lesson.minutes ? (
          <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
            <Clock className="h-3 w-3" />
            {`${lesson.minutes} ${t("nuet.lesson.min")}`}
          </span>
        ) : null}
      </div>
      <p className="line-clamp-3 text-xs leading-5 text-[var(--text-secondary)]">
        {lesson.summary}
      </p>
      <span className="mt-auto inline-flex items-center text-xs font-semibold text-[var(--primary)]">
        {t("nuet.lesson.openBook")} →
      </span>
    </Link>
  );
}
