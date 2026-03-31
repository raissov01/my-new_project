import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSetProgress } from "@/app/(main)/sets/progress-actions";
import { getPomodoroPreferences } from "@/app/(main)/sets/pomodoro-actions";
import {
  sortForReviewSession,
  filterReviewCards,
  buildSmartStudyDeck,
  sortForSmartStudy,
  type CardWithProgress,
  type SmartStudySummary,
} from "@/lib/spaced-repetition";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";
import { StudyClient } from "./client";
import type { Database, StudyProgress } from "@/types/database";

interface StudyPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string; view?: string }>;
}

export default async function StudyPage({
  params,
  searchParams,
}: StudyPageProps) {
  const { id } = await params;
  const { mode, view } = await searchParams;
  const t = createTranslator(await getServerLocale());
  const supabase = await createClient();

  // Fetch set + cards + pomodoro in parallel, then pass card IDs to getSetProgress
  const [setResult, cardsResult, pomodoroSettings] = await Promise.all([
    supabase.from("flashcard_sets").select("id, title").eq("id", id).single(),
    supabase
      .from("flashcards")
      .select("*")
      .eq("set_id", id)
      .order("position", { ascending: true }),
    getPomodoroPreferences(),
  ]);

  const set =
    setResult.data as Pick<
      Database["public"]["Tables"]["flashcard_sets"]["Row"],
      "id" | "title"
    > | null;
  if (!set) notFound();

  const allFlashcards =
    (cardsResult.data as Database["public"]["Tables"]["flashcards"]["Row"][] | null) ?? [];

  // Pass pre-fetched card IDs so getSetProgress skips its flashcard query
  const progressMap = await getSetProgress(id, allFlashcards.map((c) => c.id));

  if (allFlashcards.length === 0) {
    return (
          <div className="mx-auto max-w-2xl px-4 py-10 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {set.title}
        </h1>
        <p className="mt-4 text-[var(--text-secondary)]">
          {t("set.noFlashcards")}
        </p>
        <Link
          href={`/sets/${id}/edit`}
          className="mt-4 inline-block text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700"
        >
          {t("set.editSetLink")}
        </Link>
      </div>
    );
  }

  // Build cards with progress for smart sorting/filtering
  const cardsWithProgress: CardWithProgress[] = allFlashcards.map((fc) => ({
    flashcard: fc,
    progress: (progressMap.get(fc.id) as StudyProgress) ?? null,
  }));

  const smartDeck = buildSmartStudyDeck(cardsWithProgress);
  let flashcardsToStudy = allFlashcards;
  let smartFlashcards = smartDeck.cards.map((c) => c.flashcard);
  let studyLabel = t("set.studyLabel");
  let initialSmartMode = mode === "smart";
  let smartSummary: SmartStudySummary = smartDeck.summary;
  let smartToggleEnabled = true;

  if (mode === "review") {
    const reviewCards = filterReviewCards(cardsWithProgress);
    const reviewDeck =
      reviewCards.length > 0
        ? sortForReviewSession(reviewCards)
        : sortForReviewSession(cardsWithProgress);
    flashcardsToStudy = reviewDeck.map((c) => c.flashcard);
    smartFlashcards = [];
    studyLabel = t("set.reviewSessionLabel");
    initialSmartMode = false;
    smartToggleEnabled = false;
    smartSummary = {
      dueCount: smartDeck.summary.dueCount,
      weakCount: smartDeck.summary.weakCount,
      newCount: smartDeck.summary.newCount,
      totalCount: reviewDeck.length,
    };
  } else {
    if (mode === "smart" && smartFlashcards.length === 0) {
      smartFlashcards = sortForSmartStudy(cardsWithProgress).map((c) => c.flashcard);
      smartSummary = {
        ...smartSummary,
        totalCount: smartFlashcards.length,
      };
    }
    flashcardsToStudy = allFlashcards;
    studyLabel = initialSmartMode ? t("set.smartStudyLabel") : t("set.studyLabel");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href={`/sets/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("set.backToSet")}
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          {set.title}
        </h1>
        {mode && (
          <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-700">
            {studyLabel}
          </span>
        )}
      </div>

      <div className="mt-6">
        <StudyClient
          flashcards={flashcardsToStudy}
          smartFlashcards={smartFlashcards}
          smartSummary={smartSummary}
          initialSmartMode={initialSmartMode}
          smartToggleEnabled={smartToggleEnabled}
          initialPomodoroSettings={pomodoroSettings}
          setId={id}
          initialMode={
            view === "quiz" || view === "write" || view === "flashcard"
              ? view
              : "flashcard"
          }
        />
      </div>
    </div>
  );
}
