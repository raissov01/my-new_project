"use client";

import Link from "next/link";

const TIER_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  bronze:   { icon: "🥉", color: "text-amber-700",  bg: "bg-amber-50 dark:bg-amber-950" },
  silver:   { icon: "🥈", color: "text-gray-500",   bg: "bg-gray-50 dark:bg-gray-900" },
  gold:     { icon: "🥇", color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-950" },
  sapphire: { icon: "💙", color: "text-blue-500",   bg: "bg-blue-50 dark:bg-blue-950" },
  ruby:     { icon: "❤️", color: "text-red-500",    bg: "bg-red-50 dark:bg-red-950" },
  emerald:  { icon: "💚", color: "text-emerald-500",bg: "bg-emerald-50 dark:bg-emerald-950" },
  amethyst: { icon: "💜", color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950" },
  pearl:    { icon: "🤍", color: "text-gray-400",   bg: "bg-gray-50 dark:bg-gray-900" },
  obsidian: { icon: "🖤", color: "text-gray-900 dark:text-white", bg: "bg-gray-900 dark:bg-black" },
  diamond:  { icon: "💎", color: "text-cyan-400",   bg: "bg-cyan-50 dark:bg-cyan-950" },
};

interface LeagueCardProps {
  tier: string;
  weeklyXp: number;
  rank: number;
  daysLeft: number;
}

export function LeagueCard({ tier, weeklyXp, rank, daysLeft }: LeagueCardProps) {
  const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG.bronze;
  return (
    <Link
      href="/leagues"
      aria-label={`${tier} league, rank ${rank}`}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 ${cfg.bg} border border-current/10 transition-opacity hover:opacity-80`}
    >
      <span className="text-xl">{cfg.icon}</span>
      <div className="leading-tight">
        <p className={`text-xs font-bold uppercase tracking-wide ${cfg.color}`}>{tier}</p>
        <p className="text-xs text-gray-500">#{rank} · {weeklyXp} XP · {daysLeft}d left</p>
      </div>
    </Link>
  );
}
