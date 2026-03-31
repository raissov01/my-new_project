import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Pencil,
  GraduationCap,
  ArrowLeft,
  Layers,
  Zap,
  Flag,
  Clock3,
  ListChecks,
  PenLine,
  BarChart3,
  Trophy,
} from "lucide-react";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import {
  FlashcardList,
  DeleteSetButton,
  StudyRoutePrefetch,
} from "@/components/flashcards";
import { formatDate } from "@/lib/utils";
import { getSetProgress } from "@/app/(main)/sets/progress-actions";
import {
  buildSmartStudyDeck,
  isCardWeak,
  isCardDueToday,
  filterReviewCards,
  type CardWithProgress,
} from "@/lib/spaced-repetition";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";
import type { Database } from "@/types/database";

interface SetDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SetDetailPage({ params }: SetDetailPageProps) {
  const { id } = await params;
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const supabase = await createClient();
  const user = await getCurrentUser();

  // Fetch set + flashcards in parallel, then use card IDs for progress (avoids
  // getSetProgress re-fetching the same flashcard IDs)
  const [setResult, flashcardsResult] = await Promise.all([
    supabase.from("flashcard_sets").select("*").eq("id", id).single(),
    supabase
      .from("flashcards")
      .select("*")
      .eq("set_id", id)
      .order("position", { ascending: true }),
  ]);

  const set =
    setResult.data as Database["public"]["Tables"]["flashcard_sets"]["Row"] | null;
  if (!set) notFound();

  const isOwner = user?.id === set.user_id;
  const cards =
    (flashcardsResult.data as Database["public"]["Tables"]["flashcards"]["Row"][] | null) ??
    [];

  // Pass pre-fetched IDs so getSetProgress skips its flashcard query
  const progressMap = await getSetProgress(id, cards.map((c) => c.id));
  const cardsWithProgress: CardWithProgress[] = cards.map((card) => ({
    flashcard: card,
    progress: progressMap.get(card.id) ?? null,
  }));

  // Compute smart stats for this set
  const smartDeck = buildSmartStudyDeck(cardsWithProgress);
  const progressValues = Array.from(progressMap.values());
  const weakCount = progressValues.filter(isCardWeak).length;
  const dueCount = progressValues.filter(isCardDueToday).length;
  const reviewCount = filterReviewCards(cardsWithProgress).length;
  const primaryLabel =
    reviewCount > 0 ? t("set.reviewSession") : t("set.study");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {cards.length > 0 && <StudyRoutePrefetch setId={id} />}

      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("set.backToDashboard")}
      </Link>

      {/* Header */}
      <div className="mt-6 rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow-strong)] sm:p-8">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-5xl">
            {set.title}
          </h1>
          {set.description && (
            <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">
              {set.description}
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-[var(--text-secondary)]">
              <Layers className="h-4 w-4" />
              {cards.length} {cards.length === 1 ? t("set.card") : t("set.cards")}
            </span>
            {dueCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(99,91,255,0.18)] bg-indigo-500/10 px-3 py-1.5 text-indigo-400">
                <Zap className="h-4 w-4" />
                {dueCount} {t("set.dueToday")}
              </span>
            )}
            {weakCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/15 bg-amber-500/10 px-3 py-1.5 text-amber-400">
                <Flag className="h-4 w-4" />
                {weakCount} {t("set.difficult")}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-[var(--text-muted)]">
              <Clock3 className="h-4 w-4" />
              {t("set.created")} {formatDate(set.created_at, locale)}
            </span>
          </div>

          {cards.length > 0 && (
            <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <StudyModeButton href={buildStudyHref(id, reviewCount > 0 ? "review" : undefined, "flashcard")} icon={GraduationCap} label={primaryLabel} tone="primary" />
              <StudyModeButton href={buildStudyHref(id, reviewCount > 0 ? "review" : undefined, "quiz")} icon={ListChecks} label={t("study.quiz")} />
              <StudyModeButton href={buildStudyHref(id, reviewCount > 0 ? "review" : undefined, "write")} icon={PenLine} label={t("study.write")} />
              {smartDeck.summary.totalCount > 0 ? (
                <StudyModeButton href={`/sets/${id}/study?mode=smart`} icon={Zap} label={t("set.smartStudy")} />
              ) : (
                <StudyModeButton href={`/sets/${id}/study`} icon={Layers} label={t("study.flashcards")} />
              )}
            </div>
          )}

          {cards.length > 0 && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <StudyModeButton
                href={`/sets/${id}/challenge`}
                icon={Zap}
                label={t("challenge.startChallenge")}
                tone="secondary"
              />
              <StudyModeButton
                href={`/sets/${id}/ranking`}
                icon={Trophy}
                label={t("challenge.viewRanking")}
                tone="secondary"
              />
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {isOwner && (
              <Link
                href={`/sets/${id}/edit`}
                className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                <Pencil className="h-4 w-4" />
                {t("set.edit")}
              </Link>
            )}
            {isOwner && (
              <Link
                href={`/classes/challenges?setId=${id}`}
                className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                <Trophy className="h-4 w-4" />
                Create class challenge
              </Link>
            )}
            {isOwner && <DeleteSetButton setId={id} />}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-10 grid gap-8 xl:grid-cols-[0.78fr_1.22fr]">
        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow)]">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-400" />
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                {t("sets.stats")}
              </h2>
            </div>
            <div className="mt-5 grid gap-3">
              <StatItem label={t("set.cards")} value={String(cards.length)} />
              <StatItem label={t("set.dueToday")} value={String(dueCount)} />
              <StatItem label={t("set.weakCardsLabel")} value={String(weakCount)} />
              <StatItem label={t("set.cardsToReview")} value={String(reviewCount)} />
            </div>
          </div>

          {reviewCount > 0 && (
            <div className="rounded-[1.75rem] border border-[rgba(99,91,255,0.18)] bg-indigo-500/6 p-6 shadow-[var(--surface-shadow)]">
              <div className="flex items-center gap-2 text-sm font-semibold text-indigo-400">
                <Zap className="h-4 w-4" />
                {t("set.reviewToday")}
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {t("set.reviewTodaySubtitle")}
              </p>
              <Link
                href={`/sets/${id}/study?mode=review`}
                prefetch
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-400 hover:text-indigo-300"
              >
                {t("set.reviewSession")}
              </Link>
            </div>
          )}
        </div>

        <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow)]">
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            {t("set.flashcardsPreview")}
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {t("set.flashcardsPreviewSubtitle")}
          </p>

          <div className="mt-6">
            <FlashcardList
              flashcards={cards}
              progressMap={progressMap}
              labels={{
                empty: t("set.noFlashcards"),
                term: t("study.term"),
                definition: t("study.definition"),
                difficult: t("study.difficultMarked"),
                dueToday: t("set.dueToday"),
                mastered: t("stats.mastered"),
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StudyModeButton({
  href,
  icon: Icon,
  label,
  tone = "secondary",
}: {
  href: string;
  icon: typeof GraduationCap;
  label: string;
  tone?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      prefetch
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
        tone === "primary"
          ? "bg-[linear-gradient(135deg,var(--primary-from),var(--primary-to))] text-white shadow-[0_18px_34px_-24px_rgba(79,124,255,0.8)] hover:-translate-y-0.5"
          : "border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)]"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function buildStudyHref(
  id: string,
  mode?: "review",
  view?: "flashcard" | "quiz" | "write"
) {
  const params = new URLSearchParams();
  if (mode) params.set("mode", mode);
  if (view && view !== "flashcard") params.set("view", view);
  const query = params.toString();
  return query ? `/sets/${id}/study?${query}` : `/sets/${id}/study`;
}
