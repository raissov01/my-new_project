"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { signup } from "@/app/(auth)/actions";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2 } from "lucide-react";

export function SignupForm() {
  const { t } = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedRole, setSelectedRole] = useState<"student" | "teacher">("student");

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

  if (message) {
    return (
      <div className="glass-card animate-confetti-pop rounded-2xl p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 shadow-md shadow-emerald-500/20">
          <CheckCircle2 className="h-7 w-7 text-white" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-[var(--text-primary)]">{t("auth.checkEmail")}</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{message}</p>
        <Link href="/login" className="mt-6 inline-block text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          {t("auth.backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-card animate-scale-in rounded-2xl p-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t("auth.createAccount")}</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("auth.startStudying")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input id="full_name" name="full_name" type="text" label={t("auth.fullName")} placeholder={t("auth.fullNamePlaceholder")} required autoComplete="name" disabled={isPending} />
        <Input id="username" name="username" type="text" label={t("auth.username")} placeholder={t("auth.usernamePlaceholder")} required autoComplete="username" disabled={isPending} />
        <Input id="email" name="email" type="email" label={t("auth.email")} placeholder={t("auth.emailPlaceholder")} required autoComplete="email" disabled={isPending} />
        <Input id="password" name="password" type="password" label={t("auth.password")} placeholder={t("auth.passwordNewPlaceholder")} required minLength={6} autoComplete="new-password" disabled={isPending} />

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-[var(--text-primary)]">
            {t("auth.role")}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={`block cursor-pointer rounded-2xl border bg-[var(--bg-surface)] p-4 transition-colors hover:border-indigo-400/50 ${selectedRole === "student" ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-[var(--border)]"}`}>
              <input
                type="radio"
                name="role"
                value="student"
                checked={selectedRole === "student"}
                onChange={() => setSelectedRole("student")}
                disabled={isPending}
                className="h-4 w-4 accent-indigo-600"
              />
              <p className="font-semibold text-[var(--text-primary)]">{t("auth.roleStudent")}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {t("auth.roleStudentBody")}
              </p>
            </label>
            <label className={`block cursor-pointer rounded-2xl border bg-[var(--bg-surface)] p-4 transition-colors hover:border-indigo-400/50 ${selectedRole === "teacher" ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-[var(--border)]"}`}>
              <input
                type="radio"
                name="role"
                value="teacher"
                checked={selectedRole === "teacher"}
                onChange={() => setSelectedRole("teacher")}
                disabled={isPending}
                className="h-4 w-4 accent-indigo-600"
              />
              <p className="font-semibold text-[var(--text-primary)]">{t("auth.roleTeacher")}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {t("auth.roleTeacherBody")}
              </p>
            </label>
          </div>
        </fieldset>

        {error && (
          <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" isLoading={isPending}>
          {t("auth.createAccountBtn")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="font-medium bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hover:opacity-80">
          {t("auth.logIn")}
        </Link>
      </p>
    </div>
  );
}
