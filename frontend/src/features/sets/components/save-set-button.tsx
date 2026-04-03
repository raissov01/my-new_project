"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookmarkPlus, Check } from "lucide-react";
import { cloneSet } from "@/app/(main)/sets/actions";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface SaveSetButtonProps {
  setId: string;
  variant?: "ghost" | "outline" | "secondary";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function SaveSetButton({
  setId,
  variant = "ghost",
  size = "sm",
  className,
}: SaveSetButtonProps) {
  const { t } = useLocale();
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  function handleSave() {
    startTransition(async () => {
      const result = await cloneSet(setId);
      if (result?.error) {
        toast("error", result.error);
      } else if (result.newSetId) {
        toast("success", t("set.savedToCollections"));
        router.push(`/sets/${result.newSetId}`);
      }
    });
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSave}
      isLoading={isPending}
      disabled={isPending}
      className={className}
    >
      <BookmarkPlus className="mr-1.5 h-4 w-4" />
      {t("set.saveToCollections")}
    </Button>
  );
}
