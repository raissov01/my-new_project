import { notFound, redirect } from "next/navigation";
import Link from "next/link";
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
    <div className="page-shell py-4 sm:py-6">
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href={`/classes/challenges/${id}`} className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>← {t("challenge.backToChallenge")}</Link>
          <h3 style={{ flex: 1 }}>{ranking.challenge.title}</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: "var(--ink-mute)" }}>{t("challenge.privateRanking")}</span>
        </div>
      </div>

      <p className="mb-6 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
        {t("challenge.privateRankingBody")}
      </p>

      <div>
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
