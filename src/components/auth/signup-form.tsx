"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, GraduationCap, ShieldCheck } from "lucide-react";
import { signup, socialLogin } from "@/app/(auth)/actions";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProfileRole } from "@/types/database";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853"/>
      <path d="M5.84 14.09A6.9 6.9 0 0 1 5.48 12c0-.72.13-1.42.36-2.09V7.07H2.18A11.02 11.02 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84Z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" fill="#EA4335"/>
    </svg>
  );
}

export function SignupForm() {
  const { t } = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedRole, setSelectedRole] = useState<ProfileRole>("student");
  const [socialPending, setSocialPending] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await signup(formData);
      if (result?.error) setError(result.error);
      else if (result?.message) setMessage(result.message);
    });
  }

  function handleSocial(provider: "google") {
    setError(null);
    setSocialPending(provider);
    startTransition(async () => {
      const result = await socialLogin(provider, selectedRole);
      if (result?.error) {
        setError(result.error);
        setSocialPending(null);
      }
    });
  }

  const isDisabled = isPending || !!socialPending;

  // Success message screen
  if (message) {
    return (
      <div className="glass-card animate-confetti-pop rounded-3xl p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 shadow-md shadow-emerald-500/20">
          <CheckCircle2 className="h-7 w-7 text-white" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-[var(--text-primary)]">{t("auth.checkEmail")}</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{message}</p>
        <Link href="/login" className="mt-6 inline-block text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400">
          {t("auth.backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-card animate-scale-in rounded-3xl p-7 sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t("auth.createAccount")}</h1>
        <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{t("auth.startStudying")}</p>
      </div>

      {/* Role selection — always visible, even for social login */}
      <fieldset className="mb-6 space-y-3">
        <legend className="text-sm font-medium text-[var(--text-primary)]">
          {t("auth.role")}
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all hover:border-indigo-400/50 ${
              selectedRole === "student"
                ? "border-indigo-500 bg-indigo-500/5 ring-2 ring-indigo-500/20"
                : "border-[var(--border)] bg-[var(--bg-surface)]"
            }`}
          >
            <input
              type="radio"
              name="role"
              value="student"
              checked={selectedRole === "student"}
              onChange={() => setSelectedRole("student")}
              disabled={isDisabled}
              className="sr-only"
            />
            <div className={`mt-0.5 rounded-xl p-2 ${selectedRole === "student" ? "bg-indigo-500/15 text-indigo-600" : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"}`}>
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">{t("auth.roleStudent")}</p>
              <p className="mt-0.5 text-xs leading-5 text-[var(--text-secondary)]">
                {t("auth.roleStudentBody")}
              </p>
            </div>
          </label>
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all hover:border-emerald-400/50 ${
              selectedRole === "teacher"
                ? "border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20"
                : "border-[var(--border)] bg-[var(--bg-surface)]"
            }`}
          >
            <input
              type="radio"
              name="role"
              value="teacher"
              checked={selectedRole === "teacher"}
              onChange={() => setSelectedRole("teacher")}
              disabled={isDisabled}
              className="sr-only"
            />
            <div className={`mt-0.5 rounded-xl p-2 ${selectedRole === "teacher" ? "bg-emerald-500/15 text-emerald-600" : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"}`}>
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">{t("auth.roleTeacher")}</p>
              <p className="mt-0.5 text-xs leading-5 text-[var(--text-secondary)]">
                {t("auth.roleTeacherBody")}
              </p>
            </div>
          </label>
        </div>
      </fieldset>

      {/* Social login buttons */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => handleSocial("google")}
          disabled={isDisabled}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition-all hover:bg-[var(--bg-surface)] hover:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <GoogleIcon className="h-5 w-5" />
          {socialPending === "google" ? "..." : t("auth.continueWithGoogle")}
        </button>
      </div>

      <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
        {t("auth.socialLoginHint")}
      </p>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border)]" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[var(--glass-bg)] px-3 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
            {t("auth.orContinueWith")}
          </span>
        </div>
      </div>

      {/* Email / password form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input id="full_name" name="full_name" type="text" label={t("auth.fullName")} placeholder={t("auth.fullNamePlaceholder")} required autoComplete="name" disabled={isDisabled} />
        <Input id="username" name="username" type="text" label={t("auth.username")} placeholder={t("auth.usernamePlaceholder")} required autoComplete="username" disabled={isDisabled} />
        <Input id="email" name="email" type="email" label={t("auth.email")} placeholder={t("auth.emailPlaceholder")} required autoComplete="email" disabled={isDisabled} />
        <Input id="password" name="password" type="password" label={t("auth.password")} placeholder={t("auth.passwordNewPlaceholder")} required minLength={6} autoComplete="new-password" disabled={isDisabled} />

        {/* Hidden role field for form submission */}
        <input type="hidden" name="role" value={selectedRole} />

        {error && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" isLoading={isPending} disabled={isDisabled}>
          {t("auth.createAccountBtn")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="font-medium text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400">
          {t("auth.logIn")}
        </Link>
      </p>
    </div>
  );
}
