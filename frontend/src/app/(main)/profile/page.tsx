import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  getCurrentProfile,
  getCurrentUser,
} from "@/server/auth";
import { getUserStats } from "@/app/(main)/sets/progress-actions";
import { getUserSetsOverview } from "@/server/services/sets-overview";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";

interface ProfilePageProps {
  searchParams: Promise<{ tab?: string; status?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  return {
    title: t("profile.title"),
    description: t("profile.metaDesc"),
    robots: { index: false, follow: false },
  };
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [{ tab = "account", status }, profile, stats, userSets] = await Promise.all([
    searchParams,
    getCurrentProfile(user),
    getUserStats(),
    getUserSetsOverview(),
  ]);

  const userMetadata =
    "user_metadata" in user && typeof user.user_metadata === "object"
      ? user.user_metadata
      : undefined;
  const fallbackUsername =
    typeof userMetadata?.username === "string" ? userMetadata.username : undefined;
  const username = profile?.username ?? fallbackUsername ?? user.email?.split("@")[0] ?? "User";
  const avatarLetter = username.charAt(0).toUpperCase();

  // Skill scores for the stats tab (IELTS bands — stubbed from stats)
  const ieltsSkills = [
    { label: "Reading", score: 7.0, max: 9 },
    { label: "Listening", score: 7.5, max: 9 },
    { label: "Writing", score: 6.5, max: 9 },
    { label: "Speaking", score: 6.0, max: 9 },
  ];

  const tabs = [
    { key: "account", label: t("profile.tabAccount") },
    { key: "stats", label: t("profile.tabStats") },
    { key: "subscription", label: t("profile.tabSubscription") },
  ];

  return (
    <div className="page-shell" style={{ padding: "32px 0" }}>
      {/* Header card */}
      <div className="nd-prof-head nd-reveal">
        <div className="nd-prof-ava">{avatarLetter}</div>
        <div className="nd-prof-info" style={{ flex: 1, minWidth: 0 }}>
          <h2>{username}</h2>
          <p>
            {user.email}
            {profile?.bio ? ` · ${profile.bio}` : ""}
          </p>
          <div className="nd-prof-stats">
            <div>
              <strong>{stats.streakDays}</strong>
              <span>STREAK</span>
            </div>
            <div>
              <strong>{Math.round(stats.totalStudied / 1000 * 10) / 10}K</strong>
              <span>{t("profile.words")}</span>
            </div>
            <div>
              <strong>{stats.xpLevel} XP</strong>
              <span>{t("profile.level")}</span>
            </div>
            <div>
              <strong>{stats.points > 0 ? (stats.accuracy >= 70 ? "6.5+" : "–") : "–"}</strong>
              <span>BAND</span>
            </div>
          </div>
        </div>
      </div>

      {status === "profile-updated" && (
        <div
          className="nd-reveal"
          style={{
            background: "var(--green-soft)",
            border: "1px solid var(--green)",
            borderRadius: 12,
            padding: "12px 18px",
            fontSize: 14,
            color: "var(--green)",
            marginBottom: 20,
          }}
        >
          {t("profile.profileUpdated")}
        </div>
      )}

      {/* Tab switcher */}
      <div className="nd-lib-filters nd-reveal nd-d1">
        {tabs.map(({ key, label }) => (
          <a
            key={key}
            href={`/profile?tab=${key}`}
            className={`nd-lib-pill${tab === key ? " on" : ""}`}
          >
            {label}
          </a>
        ))}
      </div>

      {/* Account tab */}
      {tab === "account" && (
        <div className="nd-reveal nd-d2">
          <div className="nd-settings-section">
            <h3>{t("profile.editProfile")}</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: "0",
              }}
            >
              <div className="nd-settings-row">
                <div className="nd-settings-lbl">
                  <strong>{t("profile.name")}</strong>
                  <span>{username}</span>
                </div>
              </div>
              <div className="nd-settings-row">
                <div className="nd-settings-lbl">
                  <strong>Email</strong>
                  <span>{user.email}</span>
                </div>
              </div>
              <div className="nd-settings-row">
                <div className="nd-settings-lbl">
                  <strong>{t("profile.city")}</strong>
                  <span>—</span>
                </div>
              </div>
              <div className="nd-settings-row">
                <div className="nd-settings-lbl">
                  <strong>{t("profile.targetScore")}</strong>
                  <span>7.0</span>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 18 }}>
              <a href="/profile/edit" className="nd-btn-ink" style={{ display: "inline-flex" }}>
                {t("profile.editProfile")}
              </a>
            </div>
          </div>

          <div className="nd-settings-section">
            <h3>{t("profile.statsOverview")}</h3>
            <div className="nd-settings-row">
              <div className="nd-settings-lbl">
                <strong>{t("profile.totalCardsStudied")}</strong>
                <span>{stats.totalStudied}</span>
              </div>
            </div>
            <div className="nd-settings-row">
              <div className="nd-settings-lbl">
                <strong>{t("profile.totalCorrectAnswers")}</strong>
                <span>{stats.totalCorrect}</span>
              </div>
            </div>
            <div className="nd-settings-row">
              <div className="nd-settings-lbl">
                <strong>{t("profile.accuracy")}</strong>
                <span>{stats.accuracy}%</span>
              </div>
            </div>
            <div className="nd-settings-row">
              <div className="nd-settings-lbl">
                <strong>{t("profile.createdSets")}</strong>
                <span>{userSets.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats tab */}
      {tab === "stats" && (
        <div className="nd-reveal nd-d2">
          <div className="nd-card" style={{ marginBottom: 18 }}>
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                {t("profile.ieltsSkills")}
              </div>
            </div>
            {ieltsSkills.map((skill) => (
              <div key={skill.label} className="nd-skill-row">
                <span className="nd-skill-lbl">{skill.label}</span>
                <div className="nd-skill-bar">
                  <div
                    className="nd-skill-bar-fill"
                    style={{ width: `${(skill.score / skill.max) * 100}%` }}
                  />
                </div>
                <span className="nd-skill-score">{skill.score}</span>
              </div>
            ))}
          </div>

          <div className="nd-card">
            <div
              style={{
                fontSize: 10,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
                fontWeight: 600,
                marginBottom: 16,
              }}
            >
              {t("profile.studyMetrics")}
            </div>
            <div className="nd-skill-row">
              <span className="nd-skill-lbl">{t("profile.streak")}</span>
              <div className="nd-skill-bar">
                <div
                  className="nd-skill-bar-fill"
                  style={{ width: `${Math.min(stats.streakDays * 3, 100)}%` }}
                />
              </div>
              <span className="nd-skill-score">{stats.streakDays}</span>
            </div>
            <div className="nd-skill-row">
              <span className="nd-skill-lbl">{t("profile.accuracy")}</span>
              <div className="nd-skill-bar">
                <div
                  className="nd-skill-bar-fill"
                  style={{ width: `${stats.accuracy}%` }}
                />
              </div>
              <span className="nd-skill-score">{stats.accuracy}%</span>
            </div>
            <div className="nd-skill-row">
              <span className="nd-skill-lbl">{t("profile.weakCards")}</span>
              <div className="nd-skill-bar">
                <div
                  className="nd-skill-bar-fill"
                  style={{ width: `${Math.min(stats.smart.weakCards, 100)}%` }}
                />
              </div>
              <span className="nd-skill-score">{stats.smart.weakCards}</span>
            </div>
          </div>
        </div>
      )}

      {/* Subscription tab */}
      {tab === "subscription" && (
        <div className="nd-reveal nd-d2">
          <div className="nd-card" style={{ marginBottom: 18 }}>
            <div
              style={{
                fontSize: 10,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
                fontWeight: 600,
                marginBottom: 12,
              }}
            >
              {t("profile.plan")}
            </div>
            <div className="nd-settings-row">
              <div className="nd-settings-lbl">
                <strong>Free</strong>
                <span>{t("profile.coreFeatures")}</span>
              </div>
            </div>
            <div className="nd-settings-row">
              <div className="nd-settings-lbl">
                <strong>{t("profile.earnedXP")}</strong>
                <span>{stats.points} XP</span>
              </div>
            </div>
            <div className="nd-settings-row">
              <div className="nd-settings-lbl">
                <strong>{t("profile.levelLabel")}</strong>
                <span>{stats.levelName}</span>
              </div>
            </div>
          </div>

          <div className="nd-card">
            <div
              style={{
                fontSize: 10,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
                fontWeight: 600,
                marginBottom: 12,
              }}
            >
              Premium
            </div>
            <p style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 16, lineHeight: 1.6 }}>
              {t("profile.upgradeBody")}
            </p>
            <a href="/settings" className="nd-btn-ink" style={{ display: "inline-flex" }}>
              {t("profile.upgrade")}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
