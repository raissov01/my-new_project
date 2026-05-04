import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getCurrentUser } from "@/server/auth";
import { listNUETAttempts } from "@/server/integrations/go-backend/nuet";
import { NUETHistoryClient } from "./client";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  return {
    title: t("nuet.history.metaTitle"),
    description: t("nuet.history.metaDesc"),
    alternates: { canonical: "/nuet/history" },
  };
}

export default async function NUETHistoryPage() {
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

  const data = await listNUETAttempts(user.id, { limit: 50 }).catch(() => ({
    attempts: [],
    total: 0,
    limit: 50,
    offset: 0,
  }));

  return (
    <div className="page-shell py-6 sm:py-10">
      <Link
        href="/nuet"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("nuet.backToHub")}
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
        {t("nuet.history.title")}
      </h1>
      <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">{t("nuet.history.subtitle")}</p>

      <div className="mt-8">
        <NUETHistoryClient attempts={data.attempts} locale={locale} />
      </div>
    </div>
  );
}
