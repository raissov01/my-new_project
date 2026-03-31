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
    <div className="glass-card animate-scale-in rounded-3xl p-7 sm:p-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {t("role.chooseTitle")}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {t("role.chooseSubtitle")}
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {/* Student card */}
        <button
          type="button"
          onClick={() => setSelected("student")}
          disabled={isPending}
          className={`group relative flex flex-col items-center rounded-2xl border p-6 text-center transition-all ${
            selected === "student"
              ? "border-indigo-500 bg-indigo-500/5 ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-500/10"
              : "border-[var(--border)] bg-[var(--bg-surface)] hover:border-indigo-400/50 hover:shadow-md"
          }`}
        >
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-3xl transition-colors ${
              selected === "student"
                ? "bg-indigo-500/15 text-indigo-600"
                : "bg-[var(--bg-elevated)] text-[var(--text-muted)] group-hover:text-indigo-500"
            }`}
          >
            <GraduationCap className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-[var(--text-primary)]">
            {t("auth.roleStudent")}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {t("role.studentDescription")}
          </p>
          {selected === "student" && (
            <div className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
        </button>

        {/* Teacher card */}
        <button
          type="button"
          onClick={() => setSelected("teacher")}
          disabled={isPending}
          className={`group relative flex flex-col items-center rounded-2xl border p-6 text-center transition-all ${
            selected === "teacher"
              ? "border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-500/10"
              : "border-[var(--border)] bg-[var(--bg-surface)] hover:border-emerald-400/50 hover:shadow-md"
          }`}
        >
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-3xl transition-colors ${
              selected === "teacher"
                ? "bg-emerald-500/15 text-emerald-600"
                : "bg-[var(--bg-elevated)] text-[var(--text-muted)] group-hover:text-emerald-500"
            }`}
          >
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-[var(--text-primary)]">
            {t("auth.roleTeacher")}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {t("role.teacherDescription")}
          </p>
          {selected === "teacher" && (
            <div className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
        {t("role.changeableHint")}
      </p>

      {error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
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
