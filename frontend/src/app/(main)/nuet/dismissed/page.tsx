import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getCurrentUser } from "@/server/auth";
import { listDismissedNUETQuestions } from "@/server/integrations/go-backend/nuet";
import { DismissedListClient } from "./client";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  return {
    title: t("nuet.dismissed.metaTitle"),
    description: t("nuet.dismissed.metaDesc"),
  };
}

export default async function NUETDismissedPage() {
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

  const data = await listDismissedNUETQuestions(user.id).catch(() => ({
    items: [],
    total: 0,
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
        {t("nuet.dismissed.title")}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
        {t("nuet.dismissed.subtitle").replace("{n}", String(data.total))}
      </p>

      <DismissedListClient initialItems={data.items ?? []} />
    </div>
  );
}
