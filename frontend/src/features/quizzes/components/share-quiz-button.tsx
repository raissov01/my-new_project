"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";
import { ShareQuizModal } from "./share-quiz-modal";

// Small client wrapper so the parent server component can render a share
// button without becoming a client component itself. Holds the open/closed
// state of the modal.
export function ShareQuizButton({
  quizId,
  quizTitle,
}: {
  quizId: string;
  quizTitle: string;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={() => setOpen(true)}
      >
        <Share2 className="h-4 w-4" />
        {t("quiz.share.button")}
      </Button>
      <ShareQuizModal
        quizId={quizId}
        quizTitle={quizTitle}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
