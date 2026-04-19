import type { Metadata } from "next";
import Link from "next/link";
import { LibraryBig, Layers3, Plus, Search, Sparkles, Target } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";
import { Button } from "@/components/ui/button";
import { SetCard } from "@/features/sets/components";
import { AuthRequiredPrompt } from "@/features/auth/components/auth-required-prompt";
import { getPublicSetsOverview, getUserSetsOverview } from "@/server/services/sets-overview";

export const metadata: Metadata = {
  title: "Флешкарта кітапханасы",
  description: "Платформадағы барлық ашық флешкарта жинақтарын қараңыз. IELTS, тіл үйрену, пән бойынша жинақтар.",
  alternates: { canonical: "/flashcards" },
  openGraph: {
    title: "Флешкарта кітапханасы — StudyWithRaissov",
    description: "Платформадағы барлық ашық флешкарта жинақтарын қараңыз.",
    url: "/flashcards",
    locale: "kk_KZ",
  },
  robots: { index: true, follow: true },
};

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
      {/* Header */}
      <div className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-lg)] sm:p-8">
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[var(--primary)] opacity-[0.05]" style={{ filter: "blur(60px)" }} />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="badge-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {t("flashcards.eyebrow")}
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.03em] text-[var(--text-primary)] sm:text-4xl">
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
          <div className="inline-flex rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-soft)] p-1">
            <Link
              href="/flashcards?tab=my"
              className={`inline-flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition-all ${
                showMy
                  ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Layers3 className="h-4 w-4" />
              {t("flashcards.myCollections")}
            </Link>
            <Link
              href="/flashcards?tab=library"
              className={`inline-flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition-all ${
                !showMy
                  ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <LibraryBig className="h-4 w-4" />
              {t("flashcards.publicLibrary")}
            </Link>
          </div>
        )}
        <form className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] px-4 shadow-[var(--shadow-xs)]">
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

      {/* Results count */}
      <div className="mt-4 text-sm font-medium text-[var(--text-secondary)]">
        {filtered.length} {filtered.length === 1 ? t("dashboard.set") : t("dashboard.sets")}
      </div>

      {filtered.length > 0 ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
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
        <div className="mt-8 rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[var(--bg-soft)] px-6 py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--bg-muted)]">
            <Target className="h-5 w-5 text-[var(--text-muted)]" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-[var(--text-primary)]">{t("sets.emptyTitle")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">{t("sets.emptyBody")}</p>
          <Link href="/sets/new" className="mt-6 inline-block">
            <Button>
              <Plus className="h-4 w-4" />
              {t("sets.createFirst")}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
