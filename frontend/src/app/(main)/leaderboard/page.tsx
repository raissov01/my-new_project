import type { Metadata } from "next";
import { ChallengeDirectory } from "@/features/sets/components/challenge-directory";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";

export const metadata: Metadata = {
  title: "Челлендж хабы",
  description: "Ашық және жабық рейтинг тізімдерін қараңыз, флешкарта жинақтарымен челленджге қатысыңыз.",
  alternates: { canonical: "/leaderboard" },
  openGraph: {
    title: "Челлендж хабы — StudyWithRaissov",
    description: "Ашық және жабық рейтинг тізімдерін қараңыз, флешкарта жинақтарымен челленджге қатысыңыз.",
    url: "/leaderboard",
    locale: "kk_KZ",
  },
  robots: { index: true, follow: true },
};

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
