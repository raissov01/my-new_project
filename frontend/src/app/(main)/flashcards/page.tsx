import Link from "next/link";
import { GraduationCap, LibraryBig, Layers3, Plus, Search, Sparkles, Target } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";
import { Button } from "@/components/ui/button";
import { SetCard } from "@/features/sets/components";
import { AuthRequiredPrompt } from "@/features/auth/components/auth-required-prompt";
import { getPublicSetsOverview, getUserSetsOverview } from "@/server/services/sets-overview";

interface FlashcardsPageProps {
  searchParams: Promise<{
    tab?: string;
    q?: string;
  }>;
}

export default async function FlashcardsPage({ searchParams }: FlashcardsPageProps) {
  const user = await getCurrentUser();
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const { tab = user ? "my" : "library", q = "" } = await searchParams;

  const showMy = tab === "my" && Boolean(user);
  const sets = showMy ? await getUserSetsOverview() : await getPublicSetsOverview();
  const query = q.trim().toLowerCase();

  const filtered = query
    ? sets.filter((s) => s.title.toLowerCase().includes(query) || (s.description ?? "").toLowerCase().includes(query))
    : sets;

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow-strong)] sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3.5 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
              {t("flashcards.eyebrow")}
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] sm:text-4xl">
              {t("flashcards.title")}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              {t("flashcards.subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
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

      {/* Tab switcher + search */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {user && (
          <div className="inline-flex rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-1">
            <Link
              href="/flashcards?tab=my"
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                showMy
                  ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[var(--surface-shadow)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Layers3 className="h-4 w-4" />
              {t("flashcards.myCollections")}
            </Link>
            <Link
              href="/flashcards?tab=library"
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                !showMy
                  ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[var(--surface-shadow)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <LibraryBig className="h-4 w-4" />
              {t("flashcards.publicLibrary")}
            </Link>
          </div>
        )}
        <form className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4">
          <Search className="h-4 w-4 text-[var(--text-muted)]" />
          <input type="hidden" name="tab" value={tab} />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t("sets.searchPlaceholder")}
            className="h-11 w-full min-w-0 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] sm:w-64"
          />
        </form>
      </div>

      {/* Results */}
      <div className="mt-4 text-sm text-[var(--text-secondary)]">
        {filtered.length} {filtered.length === 1 ? t("dashboard.set") : t("dashboard.sets")}
      </div>

      {filtered.length > 0 ? (
        <div className="mt-4 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((set) => {
            const isOwner = Boolean(user && "userId" in set && set.userId === user.id);
            return (
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
                showManageActions={isOwner}
                showSaveAction={Boolean(user) && !isOwner && !showMy}
                requireAuthForStudy={!user}
              />
            );
          })}
        </div>
      ) : (
        <div className="mt-8 rounded-[1.8rem] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] px-6 py-16 text-center">
          <Target className="mx-auto h-8 w-8 text-[var(--text-muted)]" />
          <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">{t("sets.emptyTitle")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">{t("sets.emptyBody")}</p>
        </div>
      )}
    </div>
  );
}
