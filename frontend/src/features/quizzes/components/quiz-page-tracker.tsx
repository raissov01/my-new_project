"use client";

import { useEffect } from "react";
import { trackQuizUsageEvent } from "@/features/quizzes/analytics";

export function QuizPageTracker({ quizId }: { quizId: string }) {
  useEffect(() => {
    trackQuizUsageEvent({
      quizId,
      eventType: "quiz_page_opened",
      metadata: { path: window.location.pathname },
    });
  }, [quizId]);

  return null;
}
