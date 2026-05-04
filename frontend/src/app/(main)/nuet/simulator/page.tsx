import type { Metadata } from "next";
import Link from "next/link";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getCurrentUser } from "@/server/auth";
import { NUETSimulatorClient } from "./client";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  return {
    title: t("nuet.simulator.metaTitle"),
    description: t("nuet.simulator.metaDesc"),
    alternates: { canonical: "/nuet/simulator" },
  };
}

export default async function NUETSimulatorPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="page-shell py-10">
        <p>{t("nuet.signInRequired")}</p>
        <Link href="/login" className="mt-4 inline-block text-[var(--primary)] hover:underline">
          {t("auth.signIn")}
        </Link>
      </div>
    );
  }

  return (
    <div className="page-shell py-6 sm:py-8">
      <div className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--bg-soft)] to-[var(--bg-surface)] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/nuet" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              {t("nuet.backToHub")}
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
              {t("nuet.simulator.title")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
              {t("nuet.simulator.subtitle")}
            </p>
          </div>
          <div className="rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-4 py-2 font-mono text-xs uppercase tracking-widest text-[var(--text-muted)]">
            60 MCQ · 120 min
          </div>
        </div>
      </div>

      <NUETSimulatorClient />
    </div>
  );
}
