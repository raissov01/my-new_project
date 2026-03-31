"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { login } from "@/app/(auth)/actions";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const { t } = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="glass-card animate-scale-in rounded-2xl p-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t("auth.welcomeBack")}</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {t("auth.logInContinue")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input id="email" name="email" type="email" label={t("auth.email")} placeholder={t("auth.emailPlaceholder")} required autoComplete="email" disabled={isPending} />
        <Input id="password" name="password" type="password" label={t("auth.password")} placeholder={t("auth.passwordPlaceholder")} required autoComplete="current-password" disabled={isPending} />

        {error && (
          <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" isLoading={isPending}>
          {t("auth.logIn")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
        {t("auth.noAccount")}{" "}
        <Link href="/signup" className="font-medium bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hover:opacity-80">
          {t("auth.signUp")}
        </Link>
      </p>
    </div>
  );
}
