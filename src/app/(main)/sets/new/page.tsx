import { NewSetClient } from "./client";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function NewSetPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const t = createTranslator(await getServerLocale());
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/sets"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("nav.mySets")}
      </Link>

      <div className="mt-6 rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 sm:p-8 shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">{t("newSet.title")}</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {t("newSet.subtitle")}
        </p>
      </div>

      <div className="mt-8">
        <NewSetClient />
      </div>
    </div>
  );
}
