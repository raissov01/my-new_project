import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Globe2, Lock } from "lucide-react";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";
import { ChallengeRanking } from "@/components/flashcards/challenge-ranking";
import { getChallengeRanking } from "@/app/(main)/sets/challenge-actions";

interface RankingPageProps {
  params: Promise<{ id: string }>;
}

export default async function RankingPage({ params }: RankingPageProps) {
  const { id } = await params;
  const t = createTranslator(await getServerLocale());
  const ranking = await getChallengeRanking(id);

  if (!ranking) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href={`/sets/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("challenge.backToSet")}
      </Link>

      <div className="mt-6 rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
              ranking.set.is_public
                ? "bg-emerald-500/10 text-emerald-700"
                : "bg-amber-500/10 text-amber-700"
            }`}
          >
            {ranking.set.is_public ? (
              <Globe2 className="h-3.5 w-3.5" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
            {ranking.set.is_public ? t("challenge.publicRanking") : t("challenge.privateRanking")}
          </span>
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
          {ranking.set.title} {t("challenge.titleRanking")}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
          {t("challenge.rankingDescription")}
        </p>
      </div>

      <div className="mt-8">
        <ChallengeRanking rows={ranking.rows} locale={await getServerLocale()} />
      </div>
    </div>
  );
}
