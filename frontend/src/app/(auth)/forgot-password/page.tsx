"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, KeyRound } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiBaseUrl } from "@/lib/client/api";

export default function ForgotPasswordPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const resp = await fetch(`${getApiBaseUrl()}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await resp.json().catch(() => null);

      if (resp.ok) {
        setSuccessMessage(data?.message ?? t("forgot.successBody"));
        setTimeout(() => {
          router.push(`/reset-password?email=${encodeURIComponent(trimmedEmail)}`);
        }, 1200);
      } else {
        setErrorMessage(data?.error ?? t("forgot.genericError"));
      }
    } catch {
      setErrorMessage(t("forgot.genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="animate-scale-in rounded-[1.6rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow-strong)] sm:rounded-[2rem] sm:p-8">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-md shadow-indigo-500/20 sm:h-14 sm:w-14">
          <KeyRound className="h-7 w-7 text-white" />
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:mt-5 sm:text-2xl">
          {t("forgot.title")}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          {t("forgot.subtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3.5 sm:mt-7 sm:space-y-4">
        <Input
          id="forgot-email"
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

        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-500 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={submitting}
          disabled={submitting || !email.trim()}
        >
          {t("forgot.sendCodeBtn")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm leading-6 text-[var(--text-muted)] sm:mt-7">
        {t("forgot.rememberPassword")}{" "}
        <Link href="/login" className="font-medium text-[var(--text-primary)] transition-colors hover:text-indigo-400">
          {t("auth.logIn")}
        </Link>
      </p>
    </div>
  );
}
