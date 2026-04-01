import Link from "next/link";
import { GraduationCap, LibraryBig, Plus, Search, SlidersHorizontal, Sparkles, Target } from "lucide-react";
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

  const masteryCount = user
    ? sets.filter((set) => set.accuracy >= 80 && set.cardCount > 0).length
    : sets.length;
  const reviewReadyCount = user
    ? sets.filter((set) => set.reviewCount > 0 || set.weakCount > 0 || set.dueCount > 0).length
    : 0;

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      <section className="overflow-hidden rounded-[1.9rem] border border-white/8 bg-[linear-gradient(135deg,rgba(99,91,255,0.16),rgba(15,23,42,0.94)_42%,rgba(79,124,255,0.1))] p-4 shadow-[var(--surface-shadow-strong)] sm:rounded-[2.2rem] sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3.5 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              <LibraryBig className="h-3.5 w-3.5 text-indigo-300" />
              {t("nav.flashcardLibrary")}
            </div>
            <h1 className="mt-4 max-w-[12ch] text-3xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] sm:text-5xl">
              {t("sets.title")}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              {user ? t("sets.subtitle") : t("guest.librarySubtitle")}
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
              label={user ? "Library scale" : "Public sets"}
              value={sets.length}
              body={user ? "All your available decks in one calm workspace." : "Guests can preview open study resources before registering."}
            />
            <LibrarySignal
              label={user ? "Review ready" : "Visible now"}
              value={user ? reviewReadyCount : filtered.length}
              body={user ? "Sets that need attention, review, or weak-card recovery." : "Currently filtered results ready for exploration."}
            />
            <LibrarySignal
              label={user ? "High accuracy" : "Structured decks"}
              value={masteryCount}
              body={user ? "Sets already showing strong performance." : "Curated resources that reinforce platform quality."}
            />
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[1.7rem] border border-white/8 bg-[rgba(255,255,255,0.04)] p-4 shadow-[var(--surface-shadow)] backdrop-blur-sm sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[1.5fr_0.7fr_0.7fr_auto]">
          <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-[rgba(255,255,255,0.04)] px-4">
            <Search className="h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder={t("sets.searchPlaceholder")}
              className="h-12 w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
          </label>

          <label className="rounded-2xl border border-white/8 bg-[rgba(255,255,255,0.04)] px-4">
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

          <label className="rounded-2xl border border-white/8 bg-[rgba(255,255,255,0.04)] px-4">
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
            {query ? `Search matched "${q}" across your library.` : "Scan, filter, and jump into any deck from one premium workspace."}
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-[rgba(255,255,255,0.04)] px-3.5 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
          {user ? "Study ecosystem" : "Guest preview mode"}
        </div>
      </section>

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
        <div className="mt-8 rounded-[1.8rem] border border-dashed border-white/10 bg-[rgba(255,255,255,0.03)] px-6 py-16 text-center shadow-[var(--surface-shadow)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/8 bg-[rgba(255,255,255,0.04)] text-indigo-300">
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
    <div className="rounded-[1.45rem] border border-white/8 bg-[rgba(255,255,255,0.05)] p-4 shadow-[var(--surface-shadow)]">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
    </div>
  );
}
