"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  type UpdatePasswordState,
  updatePassword,
} from "@/app/(main)/settings/actions";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";

const initialState: UpdatePasswordState = { status: "idle" };

export function PasswordChangeForm() {
  const { t } = useLocale();
  const [state, formAction, isPending] = useActionState(updatePassword, initialState);

  return (
    <form action={formAction} className="space-y-3.5">
      <PasswordInput
        name="password"
        label={t("settings.newPassword")}
        error={state.passwordError ? t("settings.passwordTooShort") : undefined}
        disabled={isPending}
        required
        showLabel={t("auth.showPassword")}
        hideLabel={t("auth.hidePassword")}
      />
      <PasswordInput
        name="confirm_password"
        label={t("settings.confirmPassword")}
        error={state.confirmError ? t("settings.passwordsMismatch") : undefined}
        disabled={isPending}
        required
        showLabel={t("auth.showPassword")}
        hideLabel={t("auth.hidePassword")}
      />
      {state.error && (
        <p className="text-sm text-red-500" role="alert">
          {t("settings.passwordUpdateFailed")}
        </p>
      )}
      {state.status === "success" && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {t("settings.passwordUpdated")}
        </div>
      )}
      <Button type="submit" isLoading={isPending} disabled={isPending}>
        {t("settings.updatePassword")}
      </Button>
    </form>
  );
}
