import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/server/auth";
import { getLeague } from "@/features/gamification/api";
import { LeagueLeaderboard } from "@/components/gamification/LeagueLeaderboard";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  return { title: `${t("leagues.title")} — StudyWithRaissov` };
}

const TIER_ICONS: Record<string, string> = {
  bronze: "🥉",
  silver: "🥈",
  gold:   "🥇",
  sapphire: "💙",
  ruby:   "❤️",
  emerald: "💚",
  amethyst: "💜",
  pearl:  "🤍",
  obsidian: "🖤",
  diamond: "💎",
};

const TIER_NEXT: Record<string, string> = {
  bronze: "Silver",
  silver: "Gold",
  gold:   "Sapphire",
  sapphire: "Ruby",
  ruby:   "Emerald",
  emerald: "Amethyst",
  amethyst: "Pearl",
  pearl:  "Obsidian",
  obsidian: "Diamond",
};

export default async function LeaguesPage() {
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const data = await getLeague();

  if (!data?.group) {
    return (
      <div className="page-shell py-4 sm:py-6">
        <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
          <div className="nd-mock-bar">
            <Link href="/student/dashboard" className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
              {t("leagues.back")}
            </Link>
            <h3 style={{ flex: 1 }}>{t("leagues.title")}</h3>
          </div>
        </div>
        <div className="flex items-center justify-center p-4">
          <div className="text-center space-y-3">
            <p className="text-4xl">🏟️</p>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">{t("leagues.noLeagueTitle")}</h1>
            <p className="text-sm text-[var(--text-secondary)] max-w-xs">
              {t("leagues.noLeagueDesc")}
            </p>
            <a href="/learn/map" className="inline-block px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700">
              {t("leagues.startLesson")}
            </a>
          </div>
        </div>
      </div>
    );
  }

  const { group, members, daysLeft } = data;
  const myMember = members.find((m) => m.userId === user.id);
  const icon = TIER_ICONS[group.tier] ?? "🥉";
  const nextTier = TIER_NEXT[group.tier];

  return (
    <div className="page-shell py-4 sm:py-6">
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href="/student/dashboard" className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
            {t("leagues.back")}
          </Link>
          <h3 style={{ flex: 1 }}>{t("leagues.title")}</h3>
        </div>
      </div>

      <div className="max-w-lg mx-auto space-y-5 px-4">
        <div className="text-center space-y-1">
          <span className="text-5xl">{icon}</span>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] capitalize">
            {group.tier} {t("leagues.league")}
          </h1>
          {myMember && (
            <p className="text-sm text-[var(--text-secondary)]">
              {t("leagues.yourRank")} <strong className="text-[var(--text-primary)]">#{myMember.rank}</strong> · {myMember.weeklyXp.toLocaleString()} {t("leagues.xpThisWeek")}
            </p>
          )}
          <p className="text-xs text-[var(--text-muted)]">{t("leagues.daysRemaining", { n: daysLeft })}</p>
        </div>

        {nextTier && (
          <div className="rounded-xl bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3 text-sm text-center text-green-800 dark:text-green-200">
            {t("leagues.promote", { next: nextTier })}
          </div>
        )}

        <LeagueLeaderboard members={members} currentUserId={user.id} tier={group.tier} />

        <details className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]">
          <summary className="px-4 py-3 font-medium text-sm cursor-pointer select-none text-[var(--text-secondary)]">
            {t("leagues.howItWorks")}
          </summary>
          <div className="px-4 pb-4 text-sm text-[var(--text-muted)] space-y-2">
            <p>{t("leagues.rule1")}</p>
            <p>{t("leagues.rule2")}</p>
            <p>{t("leagues.rule3")}</p>
            <p>{t("leagues.rule4")}</p>
          </div>
        </details>
      </div>
    </div>
  );
}
