import Link from "next/link";
import { Plus, Search, SlidersHorizontal, GraduationCap } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { getServerLocale } from "@/lib/i18n/server";
import { createTranslator } from "@/lib/i18n/shared";
import { Button } from "@/components/ui/button";
import { SetCard } from "@/components/flashcards";
import { AuthRequiredPrompt } from "@/components/auth/auth-required-prompt";
import { getPublicSetsOverview, getUserSetsOverview } from "@/lib/sets-overview";

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

  const sets = user ? await getUserSetsOverview() : await getPublicSetsOverview();
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow-strong)] sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">
            {t("nav.flashcardLibrary")}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-5xl">
            {t("sets.title")}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
            {user ? t("sets.subtitle") : t("guest.librarySubtitle")}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {user ? (
            <Link href="/collections">
              <Button size="lg" variant="outline">
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
            <Button size="lg" variant="outline">
              <GraduationCap className="h-4 w-4" />
              {user ? t("nav.startStudy") : t("guest.previewSet")}
            </Button>
          </Link>
          {user ? (
            <Link href="/sets/new">
              <Button size="lg">
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
      </div>

      <form className="mt-8 rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--surface-shadow)]">
        <div className="grid gap-4 lg:grid-cols-[1.6fr_0.7fr_0.7fr_auto]">
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
            <span className="mb-1 block pt-2 text-xs font-medium text-[var(--text-muted)]">
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
            <span className="mb-1 block pt-2 text-xs font-medium text-[var(--text-muted)]">
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
      </form>

      <div className="mt-8 flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">
          {filtered.length} {filtered.length === 1 ? t("dashboard.set") : t("dashboard.sets")}
        </p>
      </div>

      {filtered.length > 0 ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((set) => (
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
              showManageActions={Boolean(user)}
              requireAuthForStudy={!user}
            />
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-[1.75rem] border border-dashed border-[var(--border)] bg-[var(--bg-elevated)] px-6 py-16 text-center shadow-[var(--surface-shadow)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            {t("sets.emptyTitle")}
          </h2>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            {t("sets.emptyBody")}
          </p>
        </div>
      )}
    </div>
  );
}
