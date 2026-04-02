"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import {
  type CreateClassGroupActionState,
  submitCreateClassGroup,
} from "@/app/(main)/classes/challenges/actions";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateClassForm() {
  const router = useRouter();
  const { t } = useLocale();
  const redirectedGroupIdRef = useRef<string | null>(null);
  const initialState: CreateClassGroupActionState = {
    status: "idle",
    error: null,
    success: null,
    groupId: null,
  };
  const [state, formAction, isPending] = useActionState(
    submitCreateClassGroup,
    initialState
  );

  useEffect(() => {
    if (
      state.status === "success" &&
      state.groupId &&
      redirectedGroupIdRef.current !== state.groupId
    ) {
      redirectedGroupIdRef.current = state.groupId;
      router.push(`/teacher/classes/${state.groupId}`);
    }
  }, [router, state.groupId, state.status]);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <Input
        name="name"
        required
        label={t("teacher.className")}
        placeholder={t("teacher.classNamePlaceholder")}
        disabled={isPending}
      />

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
          {t("teacher.inviteStudents")}
        </span>
        <textarea
          name="members"
          rows={6}
          placeholder={t("teacher.inviteStudentsPlaceholder")}
          disabled={isPending}
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] shadow-[var(--surface-shadow)] outline-none focus:border-[rgba(99,91,255,0.48)] focus:ring-4 focus:ring-[rgba(99,91,255,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
        />
      </label>

      {state.error ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-500 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      {state.success ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.success}</span>
        </div>
      ) : null}

      <Button type="submit" isLoading={isPending} disabled={isPending}>
        {t("teacher.createClass")}
      </Button>
    </form>
  );
}
