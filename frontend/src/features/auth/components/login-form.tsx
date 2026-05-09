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
      } catch (err) {
        // Next.js redirect() throws an error tagged with digest "NEXT_REDIRECT"
        // — that's the success path, rethrow so Next handles the navigation.
        // Anything else is a real failure and must be shown to the user.
        if (
          err &&
          typeof err === "object" &&
          "digest" in err &&
          typeof (err as { digest?: unknown }).digest === "string" &&
          (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
        ) {
          throw err;
        }
        setError(t("action.genericError"));
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
    <div>
      <div className="mb-6">
        <h2 className="mb-1.5 text-[26px] font-extrabold tracking-[-0.02em] text-[var(--ink)]">
          {t("auth.welcomeBack")}
        </h2>
        <p className="text-[14.5px] text-[var(--ink-mute)]">
          {t("auth.logInContinue")}
        </p>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => handleSocial("google")}
          disabled={isDisabled}
          className="flex h-11 w-full items-center justify-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-4 text-sm font-semibold text-[var(--text-primary)] shadow-[var(--shadow-xs)] transition-all hover:bg-[var(--bg-soft)] hover:shadow-[var(--shadow-sm)] disabled:cursor-not-allowed disabled:opacity-60 sm:h-12"
        >
          <GoogleIcon className="h-5 w-5" />
          {socialPending === "google" ? t("auth.connectingGoogle") : t("auth.continueWithGoogle")}
        </button>
      </div>

      <div className="relative my-6 sm:my-7">
        <div className="absolute inset-0 flex items-center">
          <div className="section-divider w-full" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[var(--bg-elevated)] px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            {t("auth.orContinueWith")}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4" aria-busy={isDisabled}>
        <Input
          id="email"
          name="email"
          type="email"
          label={t("auth.email")}
          placeholder={t("auth.emailPlaceholder")}
          required
          autoComplete="email"
          autoFocus
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

        <div className="flex items-center justify-between -mt-1">
          <label className="flex cursor-pointer items-center gap-2 select-none">
            <input
              type="checkbox"
              name="rememberMe"
              className="h-4 w-4 rounded border border-[var(--border)] accent-[var(--primary)]"
              disabled={isDisabled}
            />
            <span className="text-sm text-[var(--text-secondary)]">{t("auth.rememberMe")}</span>
          </label>
          <Link
            href="/forgot-password"
            className="rounded-sm text-sm font-medium text-[var(--primary)] transition-colors hover:text-[var(--primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          >
            {t("auth.forgotPassword")}
          </Link>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border border-red-200 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)] dark:border-red-500/20 dark:text-red-300"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" isLoading={isPending} disabled={isDisabled}>
          {t("auth.logIn")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--text-muted)] sm:mt-7">
        {t("auth.noAccount")}{" "}
        <Link href="/signup" className="font-semibold text-[var(--primary)] transition-colors hover:text-[var(--primary-hover)]">
          {t("auth.signUp")}
        </Link>
      </p>
    </div>
  );
}
