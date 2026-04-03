"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { login } from "@/app/(auth)/actions";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { getApiBaseUrl } from "@/lib/client/api";

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

type LoginFormProps = {
  initialError?: string | null;
};

export function LoginForm({ initialError = null }: LoginFormProps) {
  const { t } = useLocale();
  const [error, setError] = useState<string | null>(initialError);
  const [isPending, startTransition] = useTransition();
  const [socialPending, setSocialPending] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSocialPending(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const result = await login(formData);
        if (result?.error) setError(result.error);
      } catch {
        // redirect() throws NEXT_REDIRECT on success — expected
      } finally {
        setSocialPending(null);
      }
    });
  }

  function handleSocial(provider: "google") {
    setError(null);
    setSocialPending(provider);
    window.location.assign(`${getApiBaseUrl()}/auth/${provider}`);
  }

  const isDisabled = isPending || !!socialPending;

  return (
    <div className="animate-scale-in rounded-[1.6rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--surface-shadow-strong)] sm:rounded-[2rem] sm:p-8">
      <div className="mb-6 text-center sm:mb-8">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] sm:h-12 sm:w-12">
          <GoogleIcon className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:mt-5 sm:text-3xl">
          {t("auth.welcomeBack")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          {t("auth.logInContinue")}
        </p>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => handleSocial("google")}
          disabled={isDisabled}
          className="flex min-h-11 w-full items-center justify-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 text-sm font-medium text-[var(--text-primary)] shadow-[var(--surface-shadow)] transition-all hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-12"
        >
          <GoogleIcon className="h-5 w-5" />
          {socialPending === "google" ? "..." : t("auth.continueWithGoogle")}
        </button>
      </div>

      <div className="relative my-6 sm:my-7">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border)]" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[var(--bg-elevated)] px-3 text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">
            {t("auth.orContinueWith")}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
        <Input
          id="email"
          name="email"
          type="email"
          label={t("auth.email")}
          placeholder={t("auth.emailPlaceholder")}
          required
          autoComplete="email"
          disabled={isDisabled}
        />
        <PasswordInput
          id="password"
          name="password"
          label={t("auth.password")}
          placeholder={t("auth.passwordPlaceholder")}
          required
          autoComplete="current-password"
          disabled={isDisabled}
          showLabel={t("auth.showPassword")}
          hideLabel={t("auth.hidePassword")}
        />

        {error && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-500 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" isLoading={isPending} disabled={isDisabled}>
          {t("auth.logIn")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm leading-6 text-[var(--text-muted)] sm:mt-7">
        {t("auth.noAccount")}{" "}
        <Link href="/signup" className="font-medium text-[var(--text-primary)] transition-colors hover:text-indigo-400">
          {t("auth.signUp")}
        </Link>
      </p>
    </div>
  );
}
