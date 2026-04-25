import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Globe2, Lock } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { ChallengeRanking } from "@/features/sets/components/challenge-ranking";
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
    <div className="page-shell py-4 sm:py-6">
      {/* nd-mock-shell header */}
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href={`/sets/${id}`} className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
            <ArrowLeft className="h-4 w-4" style={{ display: "inline", marginRight: 6 }} />
            {t("challenge.backToSet")}
          </Link>
          <h3>{t("challenge.titleRanking")}</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-mute)", fontSize: 12 }}>
            {ranking.set.title}
          </span>
        </div>
      </div>

      {/* Set info card */}
      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px", marginBottom: 18 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 500,
              padding: "4px 12px",
              borderRadius: 999,
              background: ranking.set.is_public
                ? "color-mix(in srgb, var(--green) 12%, transparent)"
                : "color-mix(in srgb, orange 10%, transparent)",
              color: ranking.set.is_public ? "var(--green)" : "orange",
              border: ranking.set.is_public
                ? "1px solid color-mix(in srgb, var(--green) 20%, transparent)"
                : "1px solid color-mix(in srgb, orange 20%, transparent)",
            }}
          >
            {ranking.set.is_public ? (
              <Globe2 className="h-3.5 w-3.5" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
            {ranking.set.is_public ? t("challenge.publicRanking") : t("challenge.privateRanking")}
          </span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>
          {ranking.set.title} {t("challenge.titleRanking")}
        </h1>
        <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--ink-mute)", margin: 0 }}>
          {t("challenge.rankingDescription")}
        </p>
      </div>

      {/* Leaderboard section */}
      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px", marginBottom: 18 }}>
        <ChallengeRanking rows={ranking.rows} locale={await getServerLocale()} />
      </div>
    </div>
  );
}
