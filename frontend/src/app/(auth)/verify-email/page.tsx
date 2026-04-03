"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiBaseUrl } from "@/lib/client/api";

type VerifyState = "loading" | "success" | "error" | "expired" | "no-token";

export default function VerifyEmailPage() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<VerifyState>(token ? "loading" : "no-token");
  const [errorMessage, setErrorMessage] = useState("");

  // Resend state
  const [resendEmail, setResendEmail] = useState("");
  const [resendPending, setResendPending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    async function verify() {
      try {
        const resp = await fetch(
          `${getApiBaseUrl()}/auth/verify-email?token=${encodeURIComponent(token!)}`,
          { cache: "no-store" }
        );
        const data = await resp.json().catch(() => null);

        if (resp.ok) {
          setState("success");
        } else {
          const msg = data?.error ?? "";
          if (msg.toLowerCase().includes("expired")) {
            setState("expired");
          } else {
            setState("error");
          }
          setErrorMessage(msg || t("verify.invalidLink"));
        }
      } catch {
        setState("error");
        setErrorMessage(t("verify.genericError"));
      }
    }

    verify();
  }, [token, t]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    if (resendPending || !resendEmail.trim()) return;

    setResendPending(true);
    setResendMessage(null);
    setResendError(null);

    try {
      const resp = await fetch(`${getApiBaseUrl()}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail.trim() }),
      });
      const data = await resp.json().catch(() => null);

      if (resp.ok) {
        setResendMessage(data?.message ?? t("verify.resendSuccess"));
      } else {
        setResendError(data?.error ?? t("verify.genericError"));
      }
    } catch {
      setResendError(t("verify.genericError"));
    } finally {
      setResendPending(false);
    }
  }

  // Loading state
  if (state === "loading") {
    return (
      <div className="animate-scale-in rounded-[1.6rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 text-center shadow-[var(--surface-shadow-strong)] sm:rounded-[2rem] sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-md shadow-indigo-500/20 sm:h-14 sm:w-14">
          <Loader2 className="h-7 w-7 animate-spin text-white" />
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:mt-5 sm:text-2xl">
          {t("verify.verifying")}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          {t("verify.pleaseWait")}
        </p>
      </div>
    );
  }

  // Success state
  if (state === "success") {
    return (
      <div className="animate-confetti-pop rounded-[1.6rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 text-center shadow-[var(--surface-shadow-strong)] sm:rounded-[2rem] sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 shadow-md shadow-emerald-500/20 sm:h-14 sm:w-14">
          <CheckCircle2 className="h-7 w-7 text-white" />
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:mt-5 sm:text-2xl">
          {t("verify.successTitle")}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          {t("verify.successBody")}
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 px-8 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:shadow-lg hover:shadow-indigo-500/30 sm:min-h-12"
        >
          {t("verify.goToLogin")}
        </Link>
      </div>
    );
  }

  // Error / expired / no-token — show resend form
  return (
    <div className="animate-scale-in rounded-[1.6rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow-strong)] sm:rounded-[2rem] sm:p-8">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-md shadow-amber-500/20 sm:h-14 sm:w-14">
          {state === "no-token" ? (
            <Mail className="h-7 w-7 text-white" />
          ) : (
            <AlertCircle className="h-7 w-7 text-white" />
          )}
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:mt-5 sm:text-2xl">
          {state === "no-token" ? t("verify.checkEmailTitle") : state === "expired" ? t("verify.expiredTitle") : t("verify.errorTitle")}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          {state === "no-token"
            ? t("verify.checkEmailBody")
            : errorMessage || t("verify.errorBody")}
        </p>
      </div>

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

      <form onSubmit={handleResend} className="space-y-3.5 sm:space-y-4">
        <Input
          id="resend-email"
          name="email"
          type="email"
          label={t("auth.email")}
          placeholder={t("auth.emailPlaceholder")}
          required
          autoComplete="email"
          disabled={resendPending}
          value={resendEmail}
          onChange={(e) => setResendEmail(e.target.value)}
        />

        {resendError && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-500 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{resendError}</span>
          </div>
        )}

        {resendMessage && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{resendMessage}</span>
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" isLoading={resendPending} disabled={resendPending}>
          {t("verify.resendBtn")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm leading-6 text-[var(--text-muted)] sm:mt-7">
        {t("verify.alreadyVerified")}{" "}
        <Link href="/login" className="font-medium text-[var(--text-primary)] transition-colors hover:text-indigo-400">
          {t("auth.logIn")}
        </Link>
      </p>
    </div>
  );
}
