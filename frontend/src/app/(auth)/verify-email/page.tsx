"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Mail } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { getApiBaseUrl } from "@/lib/client/api";

function VerifyEmailContent() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledEmail = searchParams.get("email") ?? "";

  // `currentEmail` is the address the backend is actively holding a pending
  // verification for. `email` is what's in the input — they diverge while the
  // user is editing, then snap back together after a successful save.
  const [currentEmail, setCurrentEmail] = useState(prefilledEmail);
  const [email, setEmail] = useState(prefilledEmail);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Resend state — separate so resend feedback doesn't stomp on verify errors.
  const [resendPending, setResendPending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  // Inline change-email state. Shown only when the user edits the email field
  // away from `currentEmail` — we ask for password so an attacker can't hijack
  // the unverified account by guessing the email alone.
  const [changePassword, setChangePassword] = useState("");
  const [changePending, setChangePending] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);

  const codeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (prefilledEmail && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [prefilledEmail]);

  const emailDirty = email.trim().toLowerCase() !== currentEmail.trim().toLowerCase() && email.trim().length > 0;

  function handleCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (emailDirty) {
      setErrorMessage(t("verify.saveEmailFirst"));
      return;
    }

    const trimmedEmail = currentEmail.trim();
    if (!trimmedEmail || code.length !== 6) {
      setErrorMessage(t("verify.codeHelper"));
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setResendMessage(null);
    setResendError(null);

    try {
      const resp = await fetch(`${getApiBaseUrl()}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, code }),
      });
      const data = await resp.json().catch(() => null);

      if (resp.ok) {
        setSuccessMessage(data?.message ?? t("verify.successBody"));
        setTimeout(() => router.push("/login"), 1500);
      } else {
        setErrorMessage(data?.error ?? t("verify.genericError"));
      }
    } catch {
      setErrorMessage(t("verify.genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    const trimmedEmail = currentEmail.trim();
    if (!trimmedEmail || resendPending) return;

    setResendPending(true);
    setResendMessage(null);
    setResendError(null);

    try {
      const resp = await fetch(`${getApiBaseUrl()}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await resp.json().catch(() => null);

      if (resp.ok) {
        setResendMessage(data?.message ?? t("verify.resendSuccess"));
        setCode("");
        codeInputRef.current?.focus();
      } else {
        setResendError(data?.error ?? t("verify.genericError"));
      }
    } catch {
      setResendError(t("verify.genericError"));
    } finally {
      setResendPending(false);
    }
  }

  async function handleSaveEmail() {
    if (changePending) return;

    const trimmedOld = currentEmail.trim();
    const trimmedNew = email.trim();
    if (!trimmedOld || !trimmedNew || !changePassword) {
      setChangeError(t("verify.changeEmailRequired"));
      return;
    }
    if (trimmedOld.toLowerCase() === trimmedNew.toLowerCase()) {
      setChangeError(t("verify.changeEmailSame"));
      return;
    }

    setChangePending(true);
    setChangeError(null);
    setErrorMessage(null);
    setResendError(null);

    try {
      const resp = await fetch(`${getApiBaseUrl()}/auth/change-verification-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldEmail: trimmedOld, newEmail: trimmedNew, password: changePassword }),
      });
      const data = await resp.json().catch(() => null);

      if (resp.ok) {
        setCurrentEmail(trimmedNew);
        setEmail(trimmedNew);
        setCode("");
        setChangePassword("");
        setResendMessage(data?.message ?? t("verify.changeEmailSuccess"));
        codeInputRef.current?.focus();
      } else {
        setChangeError(data?.error ?? t("verify.genericError"));
      }
    } catch {
      setChangeError(t("verify.genericError"));
    } finally {
      setChangePending(false);
    }
  }

  function handleCancelEmailEdit() {
    setEmail(currentEmail);
    setChangePassword("");
    setChangeError(null);
  }

  if (successMessage) {
    return (
      <div className="animate-confetti-pop rounded-[1.6rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 text-center shadow-[var(--surface-shadow-strong)] sm:rounded-[2rem] sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 shadow-md shadow-emerald-500/20 sm:h-14 sm:w-14">
          <CheckCircle2 className="h-7 w-7 text-white" />
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:mt-5 sm:text-2xl">
          {t("verify.successTitle")}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{successMessage}</p>
        <Link
          href="/login"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 px-8 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:shadow-lg hover:shadow-indigo-500/30 sm:min-h-12"
        >
          {t("verify.goToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-scale-in rounded-[1.6rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow-strong)] sm:rounded-[2rem] sm:p-8">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-md shadow-indigo-500/20 sm:h-14 sm:w-14">
          <Mail className="h-7 w-7 text-white" />
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:mt-5 sm:text-2xl">
          {t("verify.checkEmailTitle")}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          {t("verify.codeHelper")}
        </p>
      </div>

      <form onSubmit={handleVerify} className="mt-6 space-y-3.5 sm:mt-7 sm:space-y-4">
        <div>
          <Input
            id="verify-email"
            name="email"
            type="email"
            label={t("auth.email")}
            placeholder={t("auth.emailPlaceholder")}
            required
            autoComplete="email"
            disabled={submitting || changePending}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setChangeError(null);
            }}
          />
          <p className="mt-1.5 px-1 text-xs leading-5 text-[var(--text-muted)]">
            {emailDirty ? t("verify.emailEditHint") : t("verify.emailEditable")}
          </p>
        </div>

        {emailDirty && (
          <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-soft)] p-4">
            <p className="text-sm leading-5 text-[var(--text-secondary)]">
              {t("verify.changeEmailSubtitle")}
            </p>
            <PasswordInput
              id="verify-change-password"
              name="changePassword"
              label={t("auth.password")}
              placeholder={t("auth.passwordPlaceholder")}
              required
              autoComplete="current-password"
              disabled={changePending}
              value={changePassword}
              onChange={(e) => setChangePassword(e.target.value)}
              showLabel={t("auth.showPassword")}
              hideLabel={t("auth.hidePassword")}
            />

            {changeError && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-500 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{changeError}</span>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full sm:flex-1"
                disabled={changePending}
                onClick={handleCancelEmailEdit}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                size="lg"
                className="w-full sm:flex-1"
                isLoading={changePending}
                disabled={changePending || !email.trim() || !changePassword}
                onClick={handleSaveEmail}
              >
                {t("verify.changeEmailSubmit")}
              </Button>
            </div>
          </div>
        )}

        <Input
          ref={codeInputRef}
          id="verify-code"
          name="code"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          label={t("verify.codeLabel")}
          placeholder="000000"
          required
          autoComplete="one-time-code"
          disabled={submitting || emailDirty}
          value={code}
          onChange={handleCodeChange}
          className="text-center text-2xl font-semibold tracking-[0.5em]"
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
          disabled={submitting || code.length !== 6 || emailDirty}
        >
          {t("verify.verifyBtn")}
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
        disabled={resendPending || !currentEmail.trim() || emailDirty}
        onClick={handleResend}
      >
        {t("verify.resendBtn")}
      </Button>

      <p className="mt-6 text-center text-sm leading-6 text-[var(--text-muted)] sm:mt-7">
        {t("verify.alreadyVerified")}{" "}
        <Link href="/login" className="font-medium text-[var(--text-primary)] transition-colors hover:text-indigo-400">
          {t("auth.logIn")}
        </Link>
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
