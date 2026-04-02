"use client";

import { SetForm } from "@/features/sets/components";
import { updateSet, type FlashcardInput } from "@/app/(main)/sets/actions";
import { useLocale } from "@/components/providers/locale-provider";
import { useToast } from "@/components/ui/toast";

interface EditSetClientProps {
  setId: string;
  initialTitle: string;
  initialDescription: string;
  initialCards: FlashcardInput[];
  initialIsPublic: boolean;
  initialInvitedUsers: string;
}

export function EditSetClient({
  setId,
  initialTitle,
  initialDescription,
  initialCards,
  initialIsPublic,
  initialInvitedUsers,
}: EditSetClientProps) {
  const { t } = useLocale();
  const { toast } = useToast();

  return (
    <SetForm
      initialTitle={initialTitle}
      initialDescription={initialDescription}
      initialCards={initialCards}
      initialIsPublic={initialIsPublic}
      initialInvitedUsers={initialInvitedUsers}
      submitLabel={t("form.saveChanges")}
      cancelHref={`/sets/${setId}`}
      cancelLabel={t("set.cancel")}
      onSubmit={async (title, description, cards, visibility) => {
        const result = await updateSet(setId, title, description, cards, visibility);
        if (result?.error) {
          toast("error", result.error);
        }
        return result;
      }}
    />
  );
}
