"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Trophy } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { QuizMode } from "@/features/study/components";
import { useStudySession } from "@/features/study/hooks/use-study-session";
import type { Flashcard } from "@/lib/shared/types/database";

export function ChallengeClient({
  flashcards,
  setId,
  rankingHref,
}: {
  flashcards: Flashcard[];
  setId: string;
  rankingHref: string;
}) {
  const { t } = useLocale();
  const session = useStudySession(flashcards);
  const startedAtRef = useRef<number | null>(null);
  const [completionTime, setCompletionTime] = useState<number | null>(null);
  const challengeResult = useMemo(
    () =>
      completionTime === null
        ? null
        : {
            type: "set" as const,
            setId,
            rankingHref,
            completionTime,
          },
    [completionTime, rankingHref, setId]
  );

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  function handleChallengeCompleted() {
    if (completionTime !== null) {
      return;
    }

    const elapsedSeconds = Math.max(
      1,
      Math.round((Date.now() - (startedAtRef.current ?? Date.now())) / 1000)
    );
    setCompletionTime(elapsedSeconds);
  }

  function handleReset() {
    startedAtRef.current = Date.now();
    setCompletionTime(null);
    session.reset();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
              {t("challenge.mode")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              {t("challenge.accuracyFirst")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              {t("challenge.rankingDescription")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/sets/${setId}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-elevated)]"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("challenge.backToSet")}
            </Link>
            <Link
              href={rankingHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              <Trophy className="h-4 w-4" />
              {t("challenge.viewRanking")}
            </Link>
          </div>
        </div>
      </div>

      <QuizMode
        session={session}
        challengeResult={challengeResult}
        onCompleted={handleChallengeCompleted}
        onReset={handleReset}
      />
    </div>
  );
}
