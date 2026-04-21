"use client";

import { useActionState, useEffect, useRef } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  type JoinClassByCodeState,
  joinClassByCode,
} from "@/app/(main)/classes/challenges/actions";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: JoinClassByCodeState = { status: "idle" };

export function JoinClassForm() {
  const { t } = useLocale();
  const [state, formAction, isPending] = useActionState(joinClassByCode, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className="mt-6 space-y-4">
      <div>
        <Input
          name="join_code"
          label={t("student.classCode")}
          placeholder={t("student.classCodePlaceholder")}
          className="uppercase tracking-[0.18em]"
          error={
            state.error === "code-required"
              ? t("validation.required")
              : state.error === "invalid-code"
                ? t("student.invalidClassCode")
                : undefined
          }
          disabled={isPending}
        />
        {state.status === "success" && (
          <div className="mt-1.5 flex items-center gap-1.5 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {t("student.joinedSuccess")}
          </div>
        )}
      </div>
      <Button type="submit" isLoading={isPending} disabled={isPending}>
        {t("student.joinClass")}
      </Button>
    </form>
  );
}
