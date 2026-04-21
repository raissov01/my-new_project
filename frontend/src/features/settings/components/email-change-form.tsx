"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  type UpdateEmailState,
  updateEmail,
} from "@/app/(main)/settings/actions";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: UpdateEmailState = { status: "idle" };

export function EmailChangeForm({ defaultEmail }: { defaultEmail: string }) {
  const { t } = useLocale();
  const [state, formAction, isPending] = useActionState(updateEmail, initialState);

  return (
    <form action={formAction} className="mt-5 space-y-3.5">
      <Input
        name="email"
        type="email"
        label={t("settings.changeEmail")}
        defaultValue={defaultEmail}
        error={
          state.emailError === "email-required"
            ? t("settings.emailRequired")
            : state.error
              ? t("settings.emailUpdateFailed")
              : undefined
        }
        disabled={isPending}
        required
      />
      {state.status === "success" && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {t("settings.emailUpdated")}
        </div>
      )}
      <Button type="submit" isLoading={isPending} disabled={isPending}>
        {t("settings.updateEmail")}
      </Button>
    </form>
  );
}
