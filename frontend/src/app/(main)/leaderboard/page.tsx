import { ChallengeDirectory } from "@/features/sets/components/challenge-directory";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";

export default async function LeaderboardPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      <div className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-lg)] sm:p-8">
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[var(--accent)] opacity-[0.05]" style={{ filter: "blur(60px)" }} />
        <p className="relative text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
          {t("challenge.hubEyebrow")}
        </p>
        <h1 className="relative mt-2 text-3xl font-extrabold tracking-[-0.03em] text-[var(--text-primary)] sm:text-4xl">
          {t("challenge.hubTitle")}
        </h1>
        <p className="relative mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
          {t("challenge.hubBody")}
        </p>
      </div>

      <div className="mt-8">
        <ChallengeDirectory variant="full" />
      </div>
    </div>
  );
}
