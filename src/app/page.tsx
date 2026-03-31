import Link from "next/link";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const t = createTranslator(await getServerLocale());

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-surface)] px-5 py-12 sm:px-4">
      <h1 className="text-center text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
        {t("landing.title")}
      </h1>
      <p className="mt-3 text-center text-base text-[var(--text-secondary)] sm:text-lg">
        {t("landing.subtitle")}
      </p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4">
        <Link href="/login" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">{t("landing.logIn")}</Button>
        </Link>
        <Link href="/signup" className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto">{t("landing.signUp")}</Button>
        </Link>
      </div>
    </div>
  );
}
