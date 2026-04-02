import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { getClassChallengeRanking } from "@/server/services/class-challenges";
import { ChallengeRanking } from "@/features/sets/components/challenge-ranking";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";

interface ClassChallengeRankingPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClassChallengeRankingPage({
  params,
}: ClassChallengeRankingPageProps) {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const ranking = await getClassChallengeRanking(id);

  if (!ranking) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href={`/classes/challenges/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("challenge.backToChallenge")}
      </Link>

      <div className="mt-6 rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700">
          <Lock className="h-3.5 w-3.5" />
          {t("challenge.privateRanking")}
        </span>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
          {ranking.challenge.title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
          {t("challenge.privateRankingBody")}
        </p>
      </div>

      <div className="mt-8">
        <ChallengeRanking
          rows={ranking.rows}
          currentUserId={user.id}
          currentUserRank={ranking.currentUserRank}
          locale={locale}
        />
      </div>
    </div>
  );
}
