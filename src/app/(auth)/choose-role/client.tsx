"use client";

import { useState, useTransition } from "react";
import { AlertCircle, GraduationCap, ShieldCheck } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { saveRole } from "./actions";
import type { ProfileRole } from "@/types/database";

export function ChooseRoleClient() {
  const { t } = useLocale();
  const [selected, setSelected] = useState<ProfileRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleContinue() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await saveRole(selected);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="animate-scale-in rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-7 shadow-[var(--surface-shadow-strong)] sm:p-8">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">
          Onboarding
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
          {t("role.chooseTitle")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          {t("role.chooseSubtitle")}
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setSelected("student")}
          disabled={isPending}
          className={`group relative flex flex-col items-start rounded-[1.5rem] border p-6 text-left transition-all ${
            selected === "student"
              ? "border-[rgba(99,91,255,0.28)] bg-[rgba(99,91,255,0.08)] shadow-[var(--surface-shadow)]"
              : "border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]"
          }`}
        >
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
              selected === "student"
                ? "bg-indigo-500/15 text-indigo-400"
                : "bg-[var(--bg-elevated)] text-[var(--text-muted)] group-hover:text-indigo-400"
            }`}
          >
            <GraduationCap className="h-7 w-7" />
          </div>
          <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            {t("auth.roleStudent")}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {t("role.studentDescription")}
          </p>
          {selected === "student" && (
            <div className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-white shadow-md">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSelected("teacher")}
          disabled={isPending}
          className={`group relative flex flex-col items-start rounded-[1.5rem] border p-6 text-left transition-all ${
            selected === "teacher"
              ? "border-emerald-500/30 bg-emerald-500/6 shadow-[var(--surface-shadow)]"
              : "border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]"
          }`}
        >
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
              selected === "teacher"
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-[var(--bg-elevated)] text-[var(--text-muted)] group-hover:text-emerald-400"
            }`}
          >
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            {t("auth.roleTeacher")}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {t("role.teacherDescription")}
          </p>
          {selected === "teacher" && (
            <div className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
        </button>
      </div>

      <p className="mt-5 text-center text-xs text-[var(--text-muted)]">
        {t("role.changeableHint")}
      </p>

      {error && (
        <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-500 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button
        size="lg"
        className="mt-6 w-full"
        onClick={handleContinue}
        disabled={!selected || isPending}
        isLoading={isPending}
      >
        {t("role.continue")}
      </Button>
    </div>
  );
}
