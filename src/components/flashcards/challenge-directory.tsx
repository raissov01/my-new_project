import Link from "next/link";
import { ArrowRight, Globe2, Lock, Trophy } from "lucide-react";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";
import { getAccessibleChallengeSets } from "@/lib/set-access";

export async function ChallengeDirectory({
  variant = "full",
}: {
  variant?: "preview" | "full";
}) {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const sets = await getAccessibleChallengeSets(variant === "preview" ? 4 : 24);

  return (
    <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">
            {t("challenge.rankings")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            {variant === "preview" ? t("challenge.pickChallenge") : t("challenge.availableChallenges")}
          </h2>
        </div>
        {variant === "preview" && (
          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700"
          >
            {t("challenge.viewAll")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {sets.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] px-5 py-10 text-center text-sm text-[var(--text-secondary)]">
          {t("challenge.noSets")}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {sets.map((set) => (
            <article
              key={set.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    {set.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {set.description ?? t("challenge.rankingDescription")}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                    set.isPublic
                      ? "bg-emerald-500/10 text-emerald-700"
                      : "bg-amber-500/10 text-amber-700"
                  }`}
                >
                  {set.isPublic ? (
                    <Globe2 className="h-3.5 w-3.5" />
                  ) : (
                    <Lock className="h-3.5 w-3.5" />
                  )}
                  {set.isPublic ? t("challenge.publicRanking") : t("challenge.privateRanking")}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <Trophy className="h-4 w-4 text-amber-500" />
                {set.cardCount} {t("challenge.cardsInChallenge")}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/sets/${set.id}/challenge`}
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                >
                  {t("challenge.startChallenge")}
                </Link>
                <Link
                  href={`/sets/${set.id}/ranking`}
                  className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-surface)]"
                >
                  {t("challenge.viewRanking")}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
