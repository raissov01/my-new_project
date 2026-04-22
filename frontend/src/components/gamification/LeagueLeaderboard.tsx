"use client";

import Image from "next/image";
import type { LeagueMember } from "@/features/gamification/api";

interface LeagueLeaderboardProps {
  members: LeagueMember[];
  currentUserId: string;
  tier: string;
}

const TIER_LABEL: Record<string, string> = {
  bronze: "🥉 Bronze", silver: "🥈 Silver", gold: "🥇 Gold",
  sapphire: "💙 Sapphire", ruby: "❤️ Ruby", emerald: "💚 Emerald",
  amethyst: "💜 Amethyst", pearl: "🤍 Pearl", obsidian: "🖤 Obsidian", diamond: "💎 Diamond",
};

export function LeagueLeaderboard({ members, currentUserId, tier }: LeagueLeaderboardProps) {
  const promote = Math.min(7, Math.floor(members.length * 0.25));
  const demote  = Math.min(5, Math.floor(members.length * 0.17));

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 flex items-center justify-between">
        <h2 className="font-bold text-gray-900 dark:text-white">{TIER_LABEL[tier] ?? tier} League</h2>
        <span className="text-xs text-gray-500">{members.length} players</span>
      </div>

      {/* Promotion zone header */}
      <div className="px-4 py-1.5 bg-green-50 dark:bg-green-950 text-xs font-semibold text-green-700 dark:text-green-300">
        ⬆ Promotion zone (top {promote})
      </div>

      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {members.map((m, idx) => {
          const isPromote = idx < promote;
          const isDemote  = idx >= members.length - demote;
          const isMe = m.userId === currentUserId;

          return (
            <li
              key={m.userId}
              className={`flex items-center gap-3 px-4 py-2.5 ${
                isMe ? "bg-indigo-50 dark:bg-indigo-950" : ""
              } ${isDemote ? "bg-red-50 dark:bg-red-950/40" : ""}`}
            >
              <span className={`w-6 text-center font-bold tabular-nums text-sm ${
                m.rank === 1 ? "text-yellow-500" : m.rank === 2 ? "text-gray-400" : m.rank === 3 ? "text-amber-600" : "text-gray-400"
              }`}>
                {m.rank <= 3 ? ["🥇","🥈","🥉"][m.rank - 1] : m.rank}
              </span>

              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                {m.avatarUrl ? (
                  <Image src={m.avatarUrl} alt={m.username} width={32} height={32} className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">
                    {m.username[0]?.toUpperCase()}
                  </div>
                )}
              </div>

              <span className={`flex-1 text-sm font-medium truncate ${isMe ? "text-indigo-700 dark:text-indigo-300" : "text-gray-900 dark:text-white"}`}>
                {m.username}{isMe && " (you)"}
              </span>

              <span className="text-sm font-bold text-gray-700 dark:text-gray-300 tabular-nums">
                {m.weeklyXp.toLocaleString()} XP
              </span>

              {isPromote && <span className="text-green-500 text-xs">⬆</span>}
              {isDemote  && <span className="text-red-400 text-xs">⬇</span>}
            </li>
          );
        })}
      </ul>

      {members.length >= demote && (
        <div className="px-4 py-1.5 bg-red-50 dark:bg-red-950/40 text-xs font-semibold text-red-600 dark:text-red-400">
          ⬇ Demotion zone (bottom {demote})
        </div>
      )}
    </div>
  );
}
