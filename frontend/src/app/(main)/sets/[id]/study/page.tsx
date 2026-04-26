import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { getSetProgress } from "@/app/(main)/sets/progress-actions";
import { getPomodoroPreferences } from "@/app/(main)/sets/pomodoro-actions";
import {
  sortForReviewSession,
  filterReviewCards,
  buildSmartStudyDeck,
  sortForSmartStudy,
  type CardWithProgress,
  type SmartStudySummary,
} from "@/lib/shared/study/spaced-repetition";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { StudyClient } from "./client";
import type { StudyProgress } from "@/lib/shared/types/database";
import { getSetDetail } from "@/server/services/sets";

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
  const [t, user] = await Promise.all([
    getServerLocale().then(createTranslator),
    getCurrentUser(),
  ]);
  const [setDetail, pomodoroSettings] = await Promise.all([
    getSetDetail(id, user?.id),
    getPomodoroPreferences(),
  ]);
  if (!setDetail) notFound();

  const set = { id: setDetail.id, title: setDetail.title };
  const allFlashcards = setDetail.flashcards;

  // Pass pre-fetched card IDs so getSetProgress skips its flashcard query
  const progressMap = await getSetProgress(id, allFlashcards.map((c) => c.id));

  if (allFlashcards.length === 0) {
    return (
      <div className="page-shell py-4 sm:py-6">
        <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
          <div className="nd-mock-bar">
            <Link href={`/sets/${id}`} className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
              <ArrowLeft className="h-4 w-4" style={{ display: "inline", marginRight: 6 }} />
              {t("set.backToSet")}
            </Link>
            <h3>{set.title}</h3>
          </div>
        </div>
        <div style={{ border: "1px dashed var(--line)", borderRadius: 16, padding: "48px 24px", textAlign: "center" }}>
          <p style={{ color: "var(--ink-mute)", marginBottom: 16 }}>{t("set.noFlashcards")}</p>
          <Link
            href={`/sets/${id}/edit`}
            style={{ fontSize: 13, fontWeight: 500, color: "var(--terra)" }}
          >
            {t("set.editSetLink")}
          </Link>
        </div>
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
    <div className="page-shell py-4 sm:py-6">
      {/* nd-mock-shell header */}
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href={`/sets/${id}`} className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
            <ArrowLeft className="h-4 w-4" style={{ display: "inline", marginRight: 6 }} />
            {t("set.backToSet")}
          </Link>
          <h3>{t("set.studyLabel")}</h3>
          {mode && (
            <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-mute)", fontSize: 12 }}>
              {studyLabel}
            </span>
          )}
        </div>
      </div>

      {/* Session card */}
      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px", marginBottom: 18 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>{set.title}</h2>
        {mode && (
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "var(--ink-mute)" }}>
            {studyLabel}
          </span>
        )}
      </div>

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
  );
}
