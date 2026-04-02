"use client";

import { useEffect, useRef, useState } from "react";
import { QuizMode } from "@/features/study/components";
import { useStudySession } from "@/features/study/hooks/use-study-session";
import type { Flashcard } from "@/lib/shared/types/database";
import { useLocale } from "@/components/providers/locale-provider";

export function ClassChallengeClient({
  challengeId,
  flashcards,
}: {
  challengeId: string;
  flashcards: Flashcard[];
}) {
  const { t } = useLocale();
  const session = useStudySession(flashcards);
  const startedAtRef = useRef<number | null>(null);
  const [completionTime, setCompletionTime] = useState<number | null>(null);

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  function handleCompleted() {
    if (completionTime !== null) {
      return;
    }

    setCompletionTime(
      Math.max(1, Math.round((Date.now() - (startedAtRef.current ?? Date.now())) / 1000))
    );
  }

  function handleReset() {
    startedAtRef.current = Date.now();
    setCompletionTime(null);
    session.reset();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 sm:p-6">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
          {t("student.challengeModeEyebrow")}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
          {t("student.challengeModeTitle")}
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {t("student.challengeModeBody")}
        </p>
      </div>

      <QuizMode
        session={session}
        challengeResult={
          completionTime === null
            ? null
            : {
                type: "class",
                challengeId,
                completionTime,
                rankingHref: `/classes/challenges/${challengeId}/ranking`,
              }
        }
        onCompleted={handleCompleted}
        onReset={handleReset}
      />
    </div>
  );
}
