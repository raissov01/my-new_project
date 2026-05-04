import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getCurrentUser } from "@/server/auth";
import { getNUETPDFTest } from "@/server/integrations/go-backend/nuet";
import { NUETPDFTestClient } from "./test-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const user = await getCurrentUser();
  const { id } = await params;
  const test = await getNUETPDFTest(user?.id ?? "", id).catch(() => null);

  return {
    title: test ? `${test.name} | ${t("nuet.pdfTest.title")}` : t("nuet.pdfTest.metaTitle"),
    description: t("nuet.pdfTest.metaDesc"),
  };
}

export default async function NUETPDFTestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const user = await getCurrentUser();
  const { id } = await params;

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

  const test = await getNUETPDFTest(user.id, id).catch(() => null);
  if (!test) notFound();

  return (
    <div className="page-shell py-6 sm:py-10">
      <Link
        href="/nuet/pdf-tests"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("nuet.pdfTest.backToList")}
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">{test.name}</h1>
      <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">{t("nuet.pdfTest.detailSubtitle")}</p>

      <NUETPDFTestClient test={test} />
    </div>
  );
}
