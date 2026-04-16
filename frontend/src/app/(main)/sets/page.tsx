import Link from "next/link";
import { GraduationCap, LibraryBig, Plus, Search, SlidersHorizontal, Sparkles, Target } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";
import { Button } from "@/components/ui/button";
import { SetCard } from "@/features/sets/components";
import { AuthRequiredPrompt } from "@/features/auth/components/auth-required-prompt";
import { getPublicSetsOverview } from "@/server/services/sets-overview";

interface SetsPageProps {
  searchParams: Promise<{
    q?: string;
    filter?: string;
    sort?: string;
  }>;
}

export default async function SetsPage({ searchParams }: SetsPageProps) {
  const user = await getCurrentUser();
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const { q = "", filter = "all", sort = "recent" } = await searchParams;

  const sets = await getPublicSetsOverview();
  const query = q.trim().toLowerCase();

  let filtered = sets.filter((set) => {
    const matchesQuery =
      !query ||
      set.title.toLowerCase().includes(query) ||
      (set.description ?? "").toLowerCase().includes(query);

    if (!matchesQuery) return false;

    if (filter === "review" && user) {
      return set.reviewCount > 0 || set.weakCount > 0 || set.dueCount > 0;
    }

    if (filter === "recent" && user) {
      return Boolean(set.lastStudiedAt);
    }

    if (filter === "mastered" && user) {
      return set.accuracy >= 80 && set.cardCount > 0;
    }

    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sort === "title") return a.title.localeCompare(b.title);
    if (sort === "accuracy") return b.accuracy - a.accuracy;
    if (sort === "cards") return b.cardCount - a.cardCount;

    const aDate = a.lastStudiedAt ?? a.updatedAt ?? a.createdAt;
    const bDate = b.lastStudiedAt ?? b.updatedAt ?? b.createdAt;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  const quickStartSet = user
    ? sets.find((set) => set.reviewCount > 0 || set.weakCount > 0 || set.dueCount > 0) ??
      sets[0] ??
      null
    : sets[0] ?? null;
  const quickStartHref = quickStartSet
    ? user
      ? `/sets/${quickStartSet.id}/study${
          quickStartSet.reviewCount > 0 ||
          quickStartSet.weakCount > 0 ||
          quickStartSet.dueCount > 0
            ? "?mode=review"
            : ""
        }`
      : `/sets/${quickStartSet.id}`
    : "/sets";

  const masteryCount = user
    ? sets.filter((set) => set.accuracy >= 80 && set.cardCount > 0).length
    : sets.length;
  const reviewReadyCount = user
    ? sets.filter((set) => set.reviewCount > 0 || set.weakCount > 0 || set.dueCount > 0).length
    : 0;

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      <section className="overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-xl)] sm:rounded-[var(--radius-2xl)] sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              <LibraryBig className="h-3.5 w-3.5 text-[var(--primary)]" />
              {t("nav.flashcardLibrary")}
            </div>
            <h1 className="mt-4 max-w-[12ch] text-3xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] sm:text-5xl">
              {t("sets.title")}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              {user
                ? t("sets.librarySubtitleAuth")
                : t("guest.librarySubtitle")}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {user ? (
                <Link href="/collections">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    {t("nav.myCollections")}
                  </Button>
                </Link>
              ) : (
                <AuthRequiredPrompt
                  triggerLabel={t("nav.myCollections")}
                  title={t("guest.authRequiredTitle")}
                  description={t("guest.collectionsPrompt")}
                  signupLabel={t("guest.signUpToContinue")}
                  loginLabel={t("guest.logInToUnlock")}
                  cancelLabel={t("set.cancel")}
                  variant="outline"
                />
              )}

              <Link href={quickStartHref}>
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  <GraduationCap className="h-4 w-4" />
                  {user ? t("nav.startStudy") : t("guest.previewSet")}
                </Button>
              </Link>

              {user ? (
                <Link href="/sets/new">
                  <Button size="lg" className="w-full sm:w-auto">
                    <Plus className="h-4 w-4" />
                    {t("dashboard.createNewSet")}
                  </Button>
                </Link>
              ) : (
                <AuthRequiredPrompt
                  triggerLabel={t("dashboard.createNewSet")}
                  title={t("guest.authRequiredTitle")}
                  description={t("guest.createPrompt")}
                  signupLabel={t("guest.signUpToContinue")}
                  loginLabel={t("guest.logInToUnlock")}
                  cancelLabel={t("set.cancel")}
                  icon={<Plus className="h-4 w-4" />}
                />
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <LibrarySignal
              label={user ? t("sets.librarySignalTotal") : t("guest.publicSets")}
              value={sets.length}
              body={
                user
                  ? t("sets.librarySignalTotalBody")
                  : t("guest.libraryPreviewBody")
              }
            />
            <LibrarySignal
              label={user ? t("sets.librarySignalReview") : t("guest.visibleNow")}
              value={user ? reviewReadyCount : filtered.length}
              body={user ? t("sets.librarySignalReviewBody") : t("guest.visibleNowBody")}
            />
            <LibrarySignal
              label={user ? t("sets.librarySignalMastery") : t("guest.structuredDecks")}
              value={masteryCount}
              body={user ? t("sets.librarySignalMasteryBody") : t("guest.structuredDecksBody")}
            />
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-soft)] p-4 shadow-[var(--shadow-sm)] sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[1.5fr_0.7fr_0.7fr_auto]">
          <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4">
            <Search className="h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder={t("sets.searchPlaceholder")}
              className="h-12 w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
          </label>

          <label className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4">
            <span className="mb-1 block pt-2 text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {t("sets.filter")}
            </span>
            <select
              name="filter"
              defaultValue={filter}
              className="h-8 w-full bg-transparent text-sm text-[var(--text-primary)] outline-none"
            >
              <option value="all">{t("sets.filterAll")}</option>
              <option value="review">{t("sets.filterNeedsReview")}</option>
              <option value="recent">{t("sets.filterRecent")}</option>
              <option value="mastered">{t("sets.filterMastered")}</option>
            </select>
          </label>

          <label className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4">
            <span className="mb-1 block pt-2 text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {t("sets.sort")}
            </span>
            <select
              name="sort"
              defaultValue={sort}
              className="h-8 w-full bg-transparent text-sm text-[var(--text-primary)] outline-none"
            >
              <option value="recent">{t("sets.sortRecent")}</option>
              <option value="title">{t("sets.sortTitle")}</option>
              <option value="accuracy">{t("sets.sortAccuracy")}</option>
              <option value="cards">{t("sets.sortCards")}</option>
            </select>
          </label>

          <Button type="submit" variant="outline" className="h-12">
            <SlidersHorizontal className="h-4 w-4" />
            {t("sets.apply")}
          </Button>
        </div>
      </section>

      <section className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {filtered.length} {filtered.length === 1 ? t("dashboard.set") : t("dashboard.sets")}
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {query ? t("sets.searchMatched").replace("{q}", q) : t("sets.browseHint")}
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />
          {user ? t("sets.studyEcosystem") : t("guest.previewMode")}
        </div>
      </section>

      {filtered.length > 0 ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((set) => {
            const isOwner = Boolean(user && set.userId === user.id);
            return (
              <SetCard
                key={set.id}
                id={set.id}
                title={set.title}
                description={set.description}
                cardCount={set.cardCount}
                createdAt={set.createdAt}
                lastStudiedAt={set.lastStudiedAt}
                accuracy={"accuracy" in set ? set.accuracy : 0}
                locale={locale}
                showManageActions={isOwner}
                showSaveAction={Boolean(user) && !isOwner}
                requireAuthForStudy={!user}
              />
            );
          })}
        </div>
      ) : (
        <div className="mt-8 rounded-[var(--radius-2xl)] border border-dashed border-[var(--border)] bg-[var(--bg-soft)] px-6 py-16 text-center shadow-[var(--shadow-sm)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--primary)]">
            <Target className="h-5 w-5" />
          </div>
          <h2 className="mt-5 text-xl font-semibold text-[var(--text-primary)]">{t("sets.emptyTitle")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
            {t("sets.emptyBody")}
          </p>
        </div>
      )}
    </div>
  );
}

function LibrarySignal({
  label,
  value,
  body,
}: {
  label: string;
  value: number;
  body: string;
}) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-sm)]">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
    </div>
  );
}
