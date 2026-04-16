import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Clock3, FolderKanban, GraduationCap, LibraryBig, Plus } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";
import { Button } from "@/components/ui/button";
import { SetCard } from "@/features/sets/components";
import { getUserSetsOverview } from "@/server/services/sets-overview";

export default async function CollectionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const sets = await getUserSetsOverview();

  const recentSets = sets.slice(0, 6);
  const reviewCount = sets.filter(
    (set) => set.reviewCount > 0 || set.weakCount > 0 || set.dueCount > 0
  ).length;
  const studiedCount = sets.filter((set) => Boolean(set.lastStudiedAt)).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-xl)] sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">
            {t("nav.myCollections")}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-5xl">
            {t("collections.title")}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
            {t("collections.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/sets">
            <Button size="lg" variant="outline">
              <LibraryBig className="h-4 w-4" />
              {t("nav.flashcardLibrary")}
            </Button>
          </Link>
          <Link href="/sets/new">
            <Button size="lg">
              <Plus className="h-4 w-4" />
              {t("dashboard.createNewSet")}
            </Button>
          </Link>
        </div>
      </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <CollectionStatCard
          icon={FolderKanban}
          label={t("collections.totalCollections")}
          value={String(sets.length)}
        />
        <CollectionStatCard
          icon={Clock3}
          label={t("collections.needsReview")}
          value={String(reviewCount)}
        />
        <CollectionStatCard
          icon={GraduationCap}
          label={t("collections.startedCollections")}
          value={String(studiedCount)}
        />
      </div>

      <div className="mt-8 rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              {t("collections.recentTitle")}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {t("collections.recentSubtitle")}
            </p>
          </div>
          <Link href="/sets" className="inline-flex">
            <Button variant="outline">
              {t("collections.openLibrary")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {recentSets.length > 0 ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {recentSets.map((set) => (
              <SetCard
                key={set.id}
                id={set.id}
                title={set.title}
                description={set.description}
                cardCount={set.cardCount}
                createdAt={set.createdAt}
                lastStudiedAt={set.lastStudiedAt}
                accuracy={set.accuracy}
                locale={locale}
              />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[1.5rem] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] px-6 py-14 text-center">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {t("collections.emptyTitle")}
            </h3>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              {t("collections.emptyBody")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CollectionStatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FolderKanban;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--bg-soft)] text-[var(--primary)]">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm text-[var(--text-secondary)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
