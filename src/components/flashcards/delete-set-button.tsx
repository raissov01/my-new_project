"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteSet } from "@/app/(main)/sets/actions";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface DeleteSetButtonProps {
  setId: string;
}

export function DeleteSetButton({ setId }: DeleteSetButtonProps) {
  const { t } = useLocale();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSet(setId);
      if (result?.error) {
        toast("error", result.error);
        setConfirming(false);
      }
    });
  }

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(true)}
        className="text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
      >
        <Trash2 className="mr-1.5 h-4 w-4" />
        {t("set.delete")}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-red-600 dark:text-red-400">
        {t("set.deleteQuestion")}
      </span>
      <Button
        variant="danger"
        size="sm"
        onClick={handleDelete}
        isLoading={isPending}
      >
        {t("set.confirm")}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(false)}
        disabled={isPending}
      >
        {t("set.cancel")}
      </Button>
    </div>
  );
}
