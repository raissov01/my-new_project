import Link from "next/link";
import { Home, Search } from "lucide-react";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";

export default async function NotFound() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--bg-base)] px-4 text-center">
      <p className="text-8xl font-bold tracking-tighter text-[var(--border)] sm:text-[10rem]">
        404
      </p>
      <h1 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:text-3xl">
        {t("notFound.title")}
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--text-secondary)]">
        {t("notFound.body")}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)]"
        >
          <Home className="h-4 w-4" />
          {t("notFound.goHome")}
        </Link>
        <Link
          href="/quizzes"
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-surface)]"
        >
          <Search className="h-4 w-4" />
          {t("notFound.goQuizzes")}
        </Link>
      </div>
    </div>
  );
}
