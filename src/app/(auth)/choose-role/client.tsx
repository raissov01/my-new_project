"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Check, GraduationCap, ShieldCheck } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { saveRole } from "./actions";

type Role = "student" | "teacher";

export function ChooseRoleClient() {
  const { t } = useLocale();
  const [selected, setSelected] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSelect(role: Role) {
    if (isPending) return;
    setSelected(role);
    if (process.env.NODE_ENV !== "production") {
      console.log("[choose-role] Selected:", role);
    }
  }

  function handleContinue() {
    if (!selected || isPending) return;

    if (process.env.NODE_ENV !== "production") {
      console.log("[choose-role] Submitting role:", selected);
    }

    setError(null);
    startTransition(async () => {
      const result = await saveRole(selected);
      if (result?.error) setError(result.error);
    });
  }

  const isStudent = selected === "student";
  const isTeacher = selected === "teacher";

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
        {/* ── Student card ──────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => handleSelect("student")}
          disabled={isPending}
          className={`group relative flex w-full cursor-pointer flex-col items-start rounded-[1.5rem] border-2 p-6 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70 ${
            isStudent
              ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_24px_-6px_rgba(99,91,255,0.35)] ring-1 ring-indigo-500/30"
              : "border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
          }`}
        >
          {/* Checkmark badge */}
          <div
            className={`absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 ${
              isStudent
                ? "scale-100 bg-indigo-500 text-white shadow-lg shadow-indigo-500/40"
                : "scale-0 bg-transparent text-transparent"
            }`}
          >
            <Check className="h-4 w-4" strokeWidth={3} />
          </div>

          {/* Icon */}
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-200 ${
              isStudent
                ? "bg-indigo-500/20 text-indigo-400 shadow-sm"
                : "bg-[var(--bg-elevated)] text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
            }`}
          >
            <GraduationCap className="h-7 w-7" />
          </div>

          {/* Text */}
          <h3
            className={`mt-5 text-xl font-semibold tracking-[-0.03em] transition-colors duration-200 ${
              isStudent ? "text-indigo-400" : "text-[var(--text-primary)]"
            }`}
          >
            {t("auth.roleStudent")}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {t("role.studentDescription")}
          </p>
        </button>

        {/* ── Teacher card ──────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => handleSelect("teacher")}
          disabled={isPending}
          className={`group relative flex w-full cursor-pointer flex-col items-start rounded-[1.5rem] border-2 p-6 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70 ${
            isTeacher
              ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_24px_-6px_rgba(16,185,129,0.35)] ring-1 ring-emerald-500/30"
              : "border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
          }`}
        >
          {/* Checkmark badge */}
          <div
            className={`absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 ${
              isTeacher
                ? "scale-100 bg-emerald-500 text-white shadow-lg shadow-emerald-500/40"
                : "scale-0 bg-transparent text-transparent"
            }`}
          >
            <Check className="h-4 w-4" strokeWidth={3} />
          </div>

          {/* Icon */}
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-200 ${
              isTeacher
                ? "bg-emerald-500/20 text-emerald-400 shadow-sm"
                : "bg-[var(--bg-elevated)] text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
            }`}
          >
            <ShieldCheck className="h-7 w-7" />
          </div>

          {/* Text */}
          <h3
            className={`mt-5 text-xl font-semibold tracking-[-0.03em] transition-colors duration-200 ${
              isTeacher ? "text-emerald-400" : "text-[var(--text-primary)]"
            }`}
          >
            {t("auth.roleTeacher")}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {t("role.teacherDescription")}
          </p>
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
