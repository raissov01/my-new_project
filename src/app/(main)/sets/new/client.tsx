"use client";

import { SetForm } from "@/components/flashcards";
import { createSet } from "@/app/(main)/sets/actions";
import { useLocale } from "@/components/providers/locale-provider";
import { useToast } from "@/components/ui/toast";

export function NewSetClient() {
  const { t } = useLocale();
  const { toast } = useToast();

  return (
    <SetForm
      importVariant="cta"
      submitLabel={t("form.createSet")}
      cancelHref="/sets"
      cancelLabel={t("set.cancel")}
      initialIsPublic
      onSubmit={async (title, description, cards, visibility) => {
        const result = await createSet(title, description, cards, visibility);
        if (result?.error) {
          toast("error", result.error);
        }
        return result;
      }}
    />
  );
}
