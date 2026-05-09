"use client";

import { useRef, useState, useTransition } from "react";
import { AlertCircle, Check, GraduationCap, ShieldCheck } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { saveRole } from "./actions";

type Role = "student" | "teacher";

const ROLE_ORDER: readonly Role[] = ["student", "teacher"] as const;

export function ChooseRoleClient() {
  const { t } = useLocale();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const studentRef = useRef<HTMLButtonElement | null>(null);
  const teacherRef = useRef<HTMLButtonElement | null>(null);

  function handleSelect(role: Role) {
    if (isPending) return;
    setSelectedRole(role);
  }

  function handleContinue() {
    if (!selectedRole || isPending) return;

    setError(null);
    startTransition(async () => {
      const result = await saveRole(selectedRole);
      if (result?.error) setError(result.error);
    });
  }

  function focusRole(role: Role) {
    if (role === "student") studentRef.current?.focus();
    else teacherRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, role: Role) {
    // ARIA radiogroup pattern: arrow keys move focus AND selection.
    if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const current = ROLE_ORDER.indexOf(role);
      const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
      const next = ROLE_ORDER[(current + (forward ? 1 : ROLE_ORDER.length - 1)) % ROLE_ORDER.length];
      handleSelect(next);
      focusRole(next);
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handleSelect(role);
    }
  }

  const isStudentSelected = selectedRole === "student";
  const isTeacherSelected = selectedRole === "teacher";

  return (
    <div className="animate-scale-in rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-xl)] sm:rounded-[var(--radius-2xl)] sm:p-8">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">
          {t("role.onboardingTag")}
        </p>
        <h1 id="role-heading" className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:mt-4 sm:text-3xl">
          {t("role.chooseTitle")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          {t("role.chooseSubtitle")}
        </p>
      </div>

      <div
        role="radiogroup"
        aria-labelledby="role-heading"
        className="mt-6 grid gap-3.5 sm:mt-8 sm:grid-cols-2 sm:gap-4"
      >
        <button
          ref={studentRef}
          type="button"
          role="radio"
          aria-checked={isStudentSelected}
          tabIndex={isStudentSelected || (selectedRole === null) ? 0 : -1}
          autoFocus
          onClick={() => handleSelect("student")}
          onKeyDown={(e) => handleKeyDown(e, "student")}
          disabled={isPending}
          className={`group relative flex w-full cursor-pointer flex-col items-start rounded-[var(--radius-2xl)] border-2 p-4 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 sm:p-6 ${
            isStudentSelected
              ? "border-[var(--primary)] bg-[var(--primary-soft)] shadow-[var(--shadow-lg)] ring-1 ring-[var(--primary)]/30"
              : "border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
          }`}
        >
          <div
            aria-hidden
            className={`absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 ${
              isStudentSelected
                ? "scale-100 bg-[var(--primary)] text-white shadow-[var(--shadow-lg)]"
                : "scale-0 bg-transparent text-transparent"
            }`}
          >
            <Check className="h-4 w-4" strokeWidth={3} />
          </div>

          <div
            aria-hidden
            className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200 sm:h-14 sm:w-14 ${
              isStudentSelected
                ? "bg-[var(--primary-soft)] text-[var(--primary)] shadow-sm"
                : "bg-[var(--bg-elevated)] text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
            }`}
          >
            <GraduationCap className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>

          <h3
            className={`mt-4 text-lg font-semibold tracking-[-0.03em] transition-colors duration-200 sm:mt-5 sm:text-xl ${
              isStudentSelected ? "text-[var(--primary)]" : "text-[var(--text-primary)]"
            }`}
          >
            {t("auth.roleStudent")}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {t("role.studentDescription")}
          </p>
        </button>

        <button
          ref={teacherRef}
          type="button"
          role="radio"
          aria-checked={isTeacherSelected}
          tabIndex={isTeacherSelected ? 0 : -1}
          onClick={() => handleSelect("teacher")}
          onKeyDown={(e) => handleKeyDown(e, "teacher")}
          disabled={isPending}
          className={`group relative flex w-full cursor-pointer flex-col items-start rounded-[var(--radius-2xl)] border-2 p-4 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 sm:p-6 ${
            isTeacherSelected
              ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_24px_-6px_rgba(16,185,129,0.35)] ring-1 ring-emerald-500/30"
              : "border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
          }`}
        >
          <div
            aria-hidden
            className={`absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 ${
              isTeacherSelected
                ? "scale-100 bg-emerald-500 text-white shadow-lg shadow-emerald-500/40"
                : "scale-0 bg-transparent text-transparent"
            }`}
          >
            <Check className="h-4 w-4" strokeWidth={3} />
          </div>

          <div
            aria-hidden
            className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200 sm:h-14 sm:w-14 ${
              isTeacherSelected
                ? "bg-emerald-500/20 text-emerald-400 shadow-sm"
                : "bg-[var(--bg-elevated)] text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
            }`}
          >
            <ShieldCheck className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>

          <h3
            className={`mt-4 text-lg font-semibold tracking-[-0.03em] transition-colors duration-200 sm:mt-5 sm:text-xl ${
              isTeacherSelected ? "text-emerald-400" : "text-[var(--text-primary)]"
            }`}
          >
            {t("auth.roleTeacher")}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {t("role.teacherDescription")}
          </p>
        </button>
      </div>

      <p className="mt-4 text-center text-xs leading-5 text-[var(--text-muted)] sm:mt-5">
        {t("role.changeableHint")}
      </p>

      {error && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-500 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button
        size="lg"
        className="mt-5 w-full sm:mt-6"
        onClick={handleContinue}
        disabled={!selectedRole || isPending}
        isLoading={isPending}
      >
        {t("role.continue")}
      </Button>
    </div>
  );
}
