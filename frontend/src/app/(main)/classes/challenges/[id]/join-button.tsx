"use client";

import { useTransition } from "react";
import { joinClassChallenge } from "../actions";
import { useLocale } from "@/components/providers/locale-provider";

export function JoinChallengeButton({
  challengeId,
}: {
  challengeId: string;
}) {
  const { t } = useLocale();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await joinClassChallenge(challengeId);
          window.location.reload();
        })
      }
      className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
    >
      {isPending ? t("student.joiningChallenge") : t("student.joinChallenge")}
    </button>
  );
}
