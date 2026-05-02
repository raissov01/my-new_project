"use client";

import { useEffect } from "react";
import { trackQuizUsageEvent } from "@/features/quizzes/analytics";

interface Props {
  quizId: string;
  inviteToken?: string | null;
}

export function QuizPageTracker({ quizId, inviteToken }: Props) {
  useEffect(() => {
    trackQuizUsageEvent({
      quizId,
      eventType: "quiz_page_opened",
      metadata: {
        path: window.location.pathname,
        ...(inviteToken ? { inviteToken } : {}),
      },
    });
  }, [quizId, inviteToken]);

  return null;
}
