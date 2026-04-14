import Link from "next/link";
import { ListChecks, Plus, Search, SlidersHorizontal, Sparkles, Target } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";
import { Button } from "@/components/ui/button";
import { QuizCard } from "@/features/quizzes/components";
import { AuthRequiredPrompt } from "@/features/auth/components/auth-required-prompt";
import { getQuizzesOverview, type QuizListFilters } from "@/server/services/quizzes";

interface QuizzesPageProps {
  searchParams: Promise<{
    q?: string;
    subject?: string;
    sort?: "newest" | "played" | "rated";
  }>;
}

export default async function QuizzesPage({ searchParams }: QuizzesPageProps) {
  const user = await getCurrentUser();
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const { q = "", subject = "", sort = "newest" } = await searchParams;

  const filters: QuizListFilters = {
    q: q.trim() || undefined,
    subject: subject.trim() || undefined,
    sort,
  };

  const quizzes = user ? await getQuizzesOverview(filters) : [];

  const ownedCount = user
    ? quizzes.filter((quiz) => quiz.userId === user.id).length
    : 0;

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      <section className="overflow-hidden rounded-[1.9rem] border border-white/8 bg-[linear-gradient(135deg,rgba(99,91,255,0.16),rgba(15,23,42,0.94)_42%,rgba(79,124,255,0.1))] p-4 shadow-[var(--surface-shadow-strong)] sm:rounded-[2.2rem] sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3.5 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              <ListChecks className="h-3.5 w-3.5 text-indigo-300" />
              {t("quiz.navLabel")}
            </div>
            <h1 className="mt-4 max-w-[12ch] text-3xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] sm:text-4xl md:text-5xl">
              {t("quiz.libraryTitle")}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              {user
                ? t("quiz.librarySubtitleAuth")
                : t("quiz.librarySubtitleGuest")}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {user ? (
                <Link href="/quizzes/create">
                  <Button size="lg" className="w-full sm:w-auto">
                    <Plus className="h-4 w-4" />
                    {t("quiz.createNew")}
                  </Button>
                </Link>
              ) : (
                <AuthRequiredPrompt
                  triggerLabel={t("quiz.createNew")}
                  title={t("guest.authRequiredTitle")}
                  description={t("quiz.guestCreatePrompt")}
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
              label={t("quiz.signalTotal")}
              value={quizzes.length}
              body={t("quiz.signalTotalBody")}
            />
            <LibrarySignal
              label={t("quiz.signalMine")}
              value={ownedCount}
              body={t("quiz.signalMineBody")}
            />
            <LibrarySignal
              label={t("quiz.signalPublic")}
              value={quizzes.filter((quiz) => quiz.isPublic).length}
              body={t("quiz.signalPublicBody")}
            />
          </div>
        </div>
      </section>

      <form className="mt-6">
        <section className="rounded-[1.7rem] border border-white/8 bg-[rgba(255,255,255,0.04)] p-4 shadow-[var(--surface-shadow)] backdrop-blur-sm sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[1.5fr_0.7fr_0.7fr_auto]">
            <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-[rgba(255,255,255,0.04)] px-4">
              <Search className="h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder={t("quiz.searchPlaceholder")}
                className="h-12 w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </label>

            <label className="rounded-2xl border border-white/8 bg-[rgba(255,255,255,0.04)] px-4">
              <span className="mb-1 block pt-2 text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
                {t("quiz.filterSubject")}
              </span>
              <input
                type="text"
                name="subject"
                defaultValue={subject}
                placeholder={t("quiz.filterSubjectPlaceholder")}
                className="h-8 w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </label>

            <label className="rounded-2xl border border-white/8 bg-[rgba(255,255,255,0.04)] px-4">
              <span className="mb-1 block pt-2 text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
                {t("quiz.sort")}
              </span>
              <select
                name="sort"
                defaultValue={sort}
                className="h-8 w-full bg-transparent text-sm text-[var(--text-primary)] outline-none"
              >
                <option value="newest">{t("quiz.sortNewest")}</option>
                <option value="played">{t("quiz.sortPlayed")}</option>
                <option value="rated">{t("quiz.sortRated")}</option>
              </select>
            </label>

            <Button type="submit" variant="outline" className="h-12">
              <SlidersHorizontal className="h-4 w-4" />
              {t("quiz.apply")}
            </Button>
          </div>
        </section>
      </form>

      <section className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {quizzes.length}{" "}
            {quizzes.length === 1 ? t("quiz.quiz") : t("quiz.quizzes")}
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {q ? t("quiz.searchMatched").replace("{q}", q) : t("quiz.browseHint")}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-[rgba(255,255,255,0.04)] px-3.5 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
          {user ? t("quiz.liveMode") : t("quiz.previewMode")}
        </div>
      </section>

      {!user ? (
        <EmptyState
          title={t("quiz.guestEmptyTitle")}
          body={t("quiz.guestEmptyBody")}
        />
      ) : quizzes.length > 0 ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {quizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              locale={locale}
              isOwner={quiz.userId === user.id}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={t("quiz.emptyTitle")}
          body={t("quiz.emptyBody")}
        />
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
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-8 rounded-[1.8rem] border border-dashed border-white/10 bg-[rgba(255,255,255,0.03)] px-6 py-16 text-center shadow-[var(--surface-shadow)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/8 bg-[rgba(255,255,255,0.04)] text-indigo-300">
        <Target className="h-5 w-5" />
      </div>
      <h2 className="mt-5 text-xl font-semibold text-[var(--text-primary)]">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
        {body}
      </p>
    </div>
  );
}
