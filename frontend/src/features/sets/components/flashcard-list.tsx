import { Flag, Clock, CheckCircle2 } from "lucide-react";
import type { Flashcard, StudyProgress } from "@/lib/shared/types/database";
import { isCardWeak, isCardDueToday, cardAccuracy } from "@/lib/shared/study/spaced-repetition";

type FlashcardListLabels = {
  empty: string;
  term: string;
  definition: string;
  difficult: string;
  dueToday: string;
  mastered: string;
};

interface FlashcardListProps {
  flashcards: Flashcard[];
  progressMap?: Map<string, StudyProgress>;
  labels: FlashcardListLabels;
}

export function FlashcardList({ flashcards, progressMap, labels }: FlashcardListProps) {
  if (flashcards.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-[var(--text-muted)]">
        {labels.empty}
      </p>
    );
  }

  return (
    <div className="space-y-3 stagger-children">
      {flashcards.map((card, index) => {
        const progress = progressMap?.get(card.id);
        const weak = progress && isCardWeak(progress);
        const due = progress ? isCardDueToday(progress) : false;
        const mastered = progress && progress.review_interval >= 14 && !weak;
        const accuracy = progress ? cardAccuracy(progress) : null;

        return (
          <div
            key={card.id}
            className={`glass-card hover-lift flex rounded-2xl transition-all ${
              weak
                ? "ring-1 ring-amber-400/30"
                : due
                  ? "ring-1 ring-indigo-400/30"
                  : ""
            }`}
          >
            <div className="flex w-12 shrink-0 items-center justify-center rounded-l-2xl text-sm font-bold text-[var(--text-muted)]">
              {index + 1}
            </div>
            <div className="flex flex-1 flex-col border-l border-[var(--border)]">
              <div className="grid flex-1 gap-px sm:grid-cols-2">
                <div className="px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">{labels.term}</p>
                  <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{card.term}</p>
                </div>
                <div className="border-t border-[var(--border)] px-5 py-4 sm:border-l sm:border-t-0">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">{labels.definition}</p>
                  <p className="mt-1 text-sm text-[var(--text-primary)]">{card.definition}</p>
                </div>
              </div>

              {(weak || due || mastered || accuracy !== null) && (
                <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] px-5 py-2">
                  {weak && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      <Flag className="h-3 w-3" /> {labels.difficult}
                    </span>
                  )}
                  {due && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                      <Clock className="h-3 w-3" /> {labels.dueToday}
                    </span>
                  )}
                  {mastered && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> {labels.mastered}
                    </span>
                  )}
                  {accuracy !== null && (
                    <span className="text-[11px] text-[var(--text-muted)]">{accuracy}%</span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
