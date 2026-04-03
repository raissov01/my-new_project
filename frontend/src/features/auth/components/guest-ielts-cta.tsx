"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";
import { useAuth } from "@/features/auth/hooks/use-auth";

export function GuestIELTSCta() {
  const { user, loading } = useAuth();
  const { t } = useLocale();

  if (loading) {
    return (
      <section className="mt-8 rounded-[1.75rem] border border-[var(--border)] bg-[rgba(255,255,255,0.04)] p-6 shadow-[var(--surface-shadow)] sm:p-8">
        <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-[var(--border)]" />
        <div className="mx-auto mt-4 h-8 w-56 animate-pulse rounded-xl bg-[var(--border)]" />
        <div className="mx-auto mt-3 h-4 w-full max-w-lg animate-pulse rounded-lg bg-[var(--border)]" />
        <div className="mx-auto mt-2 h-4 w-full max-w-md animate-pulse rounded-lg bg-[var(--border)]" />
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          <div className="h-11 w-full animate-pulse rounded-2xl bg-[var(--border)] sm:w-36" />
          <div className="h-11 w-full animate-pulse rounded-2xl bg-[var(--border)] sm:w-32" />
        </div>
      </section>
    );
  }

  if (user) {
    return null;
  }

  return (
    <section className="mt-8 rounded-[1.75rem] border border-indigo-500/15 bg-indigo-500/5 p-6 text-center sm:p-8">
      <Sparkles className="mx-auto h-8 w-8 text-indigo-400" />
      <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">
        {t("ielts.ctaTitle")}
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--text-secondary)]">
        {t("ielts.ctaBody")}
      </p>
      <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/signup">
          <Button size="lg">{t("landing.signUp")}</Button>
        </Link>
        <Link href="/login">
          <Button size="lg" variant="outline">
            {t("landing.logIn")}
          </Button>
        </Link>
      </div>
    </section>
  );
}
