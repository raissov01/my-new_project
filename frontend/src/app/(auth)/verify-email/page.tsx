"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Mail, PencilLine, X } from "lucide-react";
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

  const [email, setEmail] = useState(prefilledEmail);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Resend state — separate so resend feedback doesn't stomp on verify errors.
  const [resendPending, setResendPending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  // Change-email modal state. Requires password so we can authenticate the
  // unverified account before moving its pending verification to a new address.
  const [changeOpen, setChangeOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [changePassword, setChangePassword] = useState("");
  const [changePending, setChangePending] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);

  const codeInputRef = useRef<HTMLInputElement | null>(null);

  // When the page loads with an email in the query string, jump focus straight
  // to the code input so users can paste/type without extra clicks.
  useEffect(() => {
    if (prefilledEmail && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [prefilledEmail]);

  function handleCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Only allow digits, cap at 6 characters.
    const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const trimmedEmail = email.trim();
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
        // Auto-redirect to login after a short moment so users see the success state.
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
    const trimmedEmail = email.trim();
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

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (changePending) return;

    const trimmedOld = email.trim();
    const trimmedNew = newEmail.trim();
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

    try {
      const resp = await fetch(`${getApiBaseUrl()}/auth/change-verification-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldEmail: trimmedOld, newEmail: trimmedNew, password: changePassword }),
      });
      const data = await resp.json().catch(() => null);

      if (resp.ok) {
        setEmail(trimmedNew);
        setCode("");
        setErrorMessage(null);
        setResendMessage(data?.message ?? t("verify.changeEmailSuccess"));
        setResendError(null);
        setChangeOpen(false);
        setNewEmail("");
        setChangePassword("");
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

  // Success screen — brief, then auto-redirects.
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
        <Input
          id="verify-email"
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
          disabled={submitting}
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
          disabled={submitting || code.length !== 6}
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
        disabled={resendPending || !email.trim()}
        onClick={handleResend}
      >
        {t("verify.resendBtn")}
      </Button>

      <button
        type="button"
        onClick={() => {
          setChangeOpen(true);
          setChangeError(null);
        }}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-transparent px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)]"
      >
        <PencilLine className="h-4 w-4" />
        {t("verify.changeEmailBtn")}
      </button>

      {changeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-sm">
          <div className="animate-scale-in w-full max-w-md rounded-[1.6rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow-strong)] sm:rounded-[2rem] sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                  {t("verify.changeEmailTitle")}
                </h3>
                <p className="mt-1 text-sm leading-5 text-[var(--text-secondary)]">
                  {t("verify.changeEmailSubtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setChangeOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)]"
                aria-label={t("common.close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleChangeEmail} className="mt-5 space-y-3.5">
              <Input
                id="change-email-new"
                name="newEmail"
                type="email"
                label={t("verify.changeEmailNewLabel")}
                placeholder={t("auth.emailPlaceholder")}
                required
                autoComplete="email"
                disabled={changePending}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />

              <PasswordInput
                id="change-email-password"
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

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={changePending}
                  onClick={() => setChangeOpen(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  isLoading={changePending}
                  disabled={changePending || !newEmail.trim() || !changePassword}
                >
                  {t("verify.changeEmailSubmit")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
