import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getAchievements } from "@/features/gamification/api";
import { getUserStats } from "@/app/(main)/sets/progress-actions";
import type { AchievementRow } from "@/features/gamification/api";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  return { title: `${t("achievements.title")} — StudyWithRaissov` };
}

const TIER_EMOJI: Record<string, string> = {
  bronze: "🥉",
  silver: "🥈",
  gold:   "🥇",
  diamond: "💎",
};

const CATEGORY_EMOJI: Record<string, string> = {
  streak:  "🔥",
  lesson:  "📚",
  xp:      "⚡",
  league:  "🏆",
  social:  "🤝",
  quest:   "🎯",
  habit:   "🌅",
  skill:   "🎯",
  level:   "⭐",
};

function badgeIcon(achievement: AchievementRow): string {
  if (achievement.icon) return achievement.icon;
  return CATEGORY_EMOJI[achievement.category] ?? TIER_EMOJI[achievement.tier] ?? "✓";
}

export default async function AchievementsPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [achievements, stats] = await Promise.all([
    getAchievements(),
    getUserStats(),
  ]);

  const unlocked = achievements.filter((a) => a.unlocked).length;
  const total = achievements.length;

  return (
    <div className="page-shell" style={{ padding: "32px 0" }}>
      {/* Page header */}
      <div className="nd-page-head nd-reveal">
        <div>
          <div className="nd-page-title">{t("achievements.title")}</div>
          <div className="nd-page-sub">
            {t("achievements.subtitle")}
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="nd-kpi-grid nd-reveal nd-d1">
        <div className="nd-kpi">
          <div className="nd-kpi-lbl">{t("achievements.totalXP")}</div>
          <div className="nd-kpi-num">{stats.points}</div>
          <div className="nd-kpi-sub">{stats.levelName}</div>
        </div>
        <div className="nd-kpi">
          <div className="nd-kpi-lbl">Streak</div>
          <div className="nd-kpi-num">{stats.streakDays}</div>
          <div className="nd-kpi-sub">{t("achievements.daysInRow")}</div>
        </div>
        <div className="nd-kpi">
          <div className="nd-kpi-lbl">{t("achievements.studiedCards")}</div>
          <div className="nd-kpi-num">{stats.totalStudied}</div>
          <div className="nd-kpi-sub">{t("common.total")}</div>
        </div>
        <div className="nd-kpi dark">
          <div className="nd-kpi-lbl">{t("achievements.badge")}</div>
          <div className="nd-kpi-num">
            {unlocked}/{total}
          </div>
          <div className="nd-kpi-sub">{t("achievements.unlocked")}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="nd-reveal nd-d2"
        style={{
          background: "var(--paper-3)",
          height: 8,
          borderRadius: 99,
          overflow: "hidden",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${total > 0 ? (unlocked / total) * 100 : 0}%`,
            background: "var(--terra)",
            borderRadius: 99,
            transition: "width .4s",
          }}
        />
      </div>

      {/* Badge grid */}
      <div className="nd-badge-grid nd-reveal nd-d3">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`nd-badge-card${achievement.unlocked ? "" : " locked"}`}
            title={achievement.description}
          >
            <div className="nd-badge-icon">{badgeIcon(achievement)}</div>
            <strong>{achievement.title}</strong>
            <small>{achievement.tier.toUpperCase()}</small>
          </div>
        ))}

        {total === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "48px 24px",
              color: "var(--ink-mute)",
              fontSize: 14,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: ".04em",
            }}
          >
            {t("achievements.empty")}
          </div>
        )}
      </div>
    </div>
  );
}
