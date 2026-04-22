import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getLeague } from "@/features/gamification/api";
import { LeagueLeaderboard } from "@/components/gamification/LeagueLeaderboard";

export const metadata = { title: "Leagues — StudyWithRaissov" };

const TIER_CONFIG: Record<string, { icon: string; next?: string }> = {
  bronze: { icon: "🥉", next: "Silver" },
  silver: { icon: "🥈", next: "Gold" },
  gold:   { icon: "🥇", next: "Sapphire" },
  sapphire: { icon: "💙", next: "Ruby" },
  ruby:   { icon: "❤️", next: "Emerald" },
  emerald: { icon: "💚", next: "Amethyst" },
  amethyst: { icon: "💜", next: "Pearl" },
  pearl:  { icon: "🤍", next: "Obsidian" },
  obsidian: { icon: "🖤", next: "Diamond" },
  diamond: { icon: "💎" },
};

export default async function LeaguesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const data = await getLeague();

  if (!data?.group) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <p className="text-4xl">🏟️</p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Leagues</h1>
          <p className="text-sm text-gray-500 max-w-xs">
            Complete a lesson to join your first league and compete with other learners!
          </p>
          <a href="/learn/map" className="inline-block px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700">
            Start a lesson →
          </a>
        </div>
      </main>
    );
  }

  const { group, members, daysLeft } = data;
  const myMember = members.find((m) => m.userId === user.id);
  const cfg = TIER_CONFIG[group.tier] ?? TIER_CONFIG.bronze;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8">
      <div className="max-w-lg mx-auto space-y-5">
        {/* Hero */}
        <div className="text-center space-y-1">
          <span className="text-5xl">{cfg.icon}</span>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
            {group.tier} League
          </h1>
          {myMember && (
            <p className="text-sm text-gray-500">
              Your rank: <strong className="text-gray-900 dark:text-white">#{myMember.rank}</strong> · {myMember.weeklyXp.toLocaleString()} XP this week
            </p>
          )}
          <p className="text-xs text-gray-400">{daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining</p>
        </div>

        {/* Info */}
        {cfg.next && (
          <div className="rounded-xl bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3 text-sm text-center text-green-800 dark:text-green-200">
            Top 7 promote to <strong>{cfg.next} League</strong> · Bottom 5 demote
          </div>
        )}

        <LeagueLeaderboard members={members} currentUserId={user.id} tier={group.tier} />

        {/* How it works */}
        <details className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <summary className="px-4 py-3 font-medium text-sm cursor-pointer select-none text-gray-700 dark:text-gray-300">
            How leagues work
          </summary>
          <div className="px-4 pb-4 text-sm text-gray-500 space-y-2">
            <p>• Every Monday you join a group of up to 30 learners at the same tier.</p>
            <p>• Each lesson you complete earns weekly XP — the more you practice, the higher you rank.</p>
            <p>• On Sunday night the week resets: top 7 move up a tier, bottom 5 drop down.</p>
            <p>• There are 10 tiers: Bronze → Silver → Gold → Sapphire → Ruby → Emerald → Amethyst → Pearl → Obsidian → Diamond.</p>
          </div>
        </details>
      </div>
    </main>
  );
}
