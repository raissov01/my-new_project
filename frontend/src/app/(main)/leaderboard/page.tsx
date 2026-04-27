import type { Metadata } from "next";
import { ChallengeDirectory } from "@/features/sets/components/challenge-directory";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  return {
    title: t("leaderboard.pageTitle"),
    description: t("leaderboard.pageSubtitle"),
    alternates: { canonical: "/leaderboard" },
    openGraph: {
      title: `${t("leaderboard.pageTitle")} — StudyWithRaissov`,
      description: t("leaderboard.pageSubtitle"),
      url: "/leaderboard",
    },
    robots: { index: true, follow: true },
  };
}

export default async function LeaderboardPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  return (
    <div className="page-shell py-4 sm:py-6">
      {/* Header */}
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <h3>{t("challenge.hubTitle")}</h3>
          <div className="nd-mock-timer">
            <span className="nd-mock-pulse" />
            {t("challenge.hubEyebrow")}
          </div>
        </div>
      </div>

      <ChallengeDirectory variant="full" />
    </div>
  );
}
