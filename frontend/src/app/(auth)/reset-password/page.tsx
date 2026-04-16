"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, LockKeyhole } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { getApiBaseUrl } from "@/lib/client/api";

function ResetPasswordContent() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledEmail = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(prefilledEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [resendPending, setResendPending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  const codeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (prefilledEmail && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [prefilledEmail]);

  function handleCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || code.length !== 6) {
      setErrorMessage(t("reset.codeHelper"));
      return;
    }

    if (password.length < 6) {
      setErrorMessage(t("reset.passwordTooShort"));
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(t("reset.passwordMismatch"));
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setResendMessage(null);
    setResendError(null);

    try {
      const resp = await fetch(`${getApiBaseUrl()}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, code, password }),
      });
      const data = await resp.json().catch(() => null);

      if (resp.ok) {
        setSuccessMessage(data?.message ?? t("reset.successBody"));
        setTimeout(() => router.push("/login"), 1500);
      } else {
        setErrorMessage(data?.error ?? t("reset.genericError"));
      }
    } catch {
      setErrorMessage(t("reset.genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || resendPending) return;

    setResendPending(true);
    setResendMessage(null);
    setResendError(null);

    try {
      const resp = await fetch(`${getApiBaseUrl()}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await resp.json().catch(() => null);

      if (resp.ok) {
        setResendMessage(data?.message ?? t("reset.resendSuccess"));
        setCode("");
        codeInputRef.current?.focus();
      } else {
        setResendError(data?.error ?? t("reset.genericError"));
      }
    } catch {
      setResendError(t("reset.genericError"));
    } finally {
      setResendPending(false);
    }
  }

  if (successMessage) {
    return (
      <div className="animate-confetti-pop rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 text-center shadow-[var(--shadow-xl)] sm:rounded-[var(--radius-2xl)] sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 shadow-[var(--shadow-md)] sm:h-14 sm:w-14">
          <CheckCircle2 className="h-7 w-7 text-white" />
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:mt-5 sm:text-2xl">
          {t("reset.successTitle")}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{successMessage}</p>
        <Link
          href="/login"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 px-8 text-sm font-semibold text-white shadow-[var(--shadow-md)] transition-all hover:shadow-[var(--shadow-lg)] sm:min-h-12"
        >
          {t("verify.goToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-scale-in rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-xl)] sm:rounded-[var(--radius-2xl)] sm:p-8">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-[var(--shadow-md)] sm:h-14 sm:w-14">
          <LockKeyhole className="h-7 w-7 text-white" />
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:mt-5 sm:text-2xl">
          {t("reset.title")}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          {t("reset.codeHelper")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3.5 sm:mt-7 sm:space-y-4">
        <Input
          id="reset-email"
          name="email"
          type="email"
          label={t("auth.email")}
          placeholder={t("auth.emailPlaceholder")}
          required
          autoComplete="email"
          disabled={submitting}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          ref={codeInputRef}
          id="reset-code"
          name="code"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          label={t("reset.codeLabel")}
          placeholder="000000"
          required
          autoComplete="one-time-code"
          disabled={submitting}
          value={code}
          onChange={handleCodeChange}
          className="text-center text-2xl font-semibold tracking-[0.5em]"
        />

        <PasswordInput
          id="reset-password"
          name="password"
          label={t("reset.newPasswordLabel")}
          placeholder={t("auth.passwordPlaceholder")}
          required
          autoComplete="new-password"
          disabled={submitting}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          showLabel={t("auth.showPassword")}
          hideLabel={t("auth.hidePassword")}
        />

        <PasswordInput
          id="reset-password-confirm"
          name="confirmPassword"
          label={t("reset.confirmPasswordLabel")}
          placeholder={t("auth.passwordPlaceholder")}
          required
          autoComplete="new-password"
          disabled={submitting}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          showLabel={t("auth.showPassword")}
          hideLabel={t("auth.hidePassword")}
        />

        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-500 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={submitting}
          disabled={submitting || code.length !== 6 || password.length < 6}
        >
          {t("reset.submitBtn")}
        </Button>
      </form>

      <div className="relative my-6 sm:my-7">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border)]" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[var(--bg-elevated)] px-3 text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">
            {t("verify.resendSection")}
          </span>
        </div>
      </div>

      {resendError && (
        <div className="mb-3 flex items-start gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-500 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{resendError}</span>
        </div>
      )}

      {resendMessage && (
        <div className="mb-3 flex items-start gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{resendMessage}</span>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        size="lg"
        isLoading={resendPending}
        disabled={resendPending || !email.trim()}
        onClick={handleResend}
      >
        {t("reset.resendBtn")}
      </Button>

      <p className="mt-6 text-center text-sm leading-6 text-[var(--text-muted)] sm:mt-7">
        {t("forgot.rememberPassword")}{" "}
        <Link href="/login" className="font-medium text-[var(--text-primary)] transition-colors hover:text-[var(--primary)]">
          {t("auth.logIn")}
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
