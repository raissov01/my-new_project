"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import type { AchievementRow } from "@/features/gamification/api";

const TIER_COLOR: Record<string, string> = {
  bronze:  "border-amber-400 bg-amber-50 dark:bg-amber-950",
  silver:  "border-gray-400 bg-gray-50 dark:bg-gray-900",
  gold:    "border-yellow-400 bg-yellow-50 dark:bg-yellow-950",
  diamond: "border-cyan-400 bg-cyan-50 dark:bg-cyan-950",
};

const TIER_BADGE: Record<string, string> = {
  bronze: "bg-amber-100 text-amber-700",
  silver: "bg-gray-100 text-gray-600",
  gold: "bg-yellow-100 text-yellow-700",
  diamond: "bg-cyan-100 text-cyan-700",
};

const CATEGORIES = ["all", "streak", "lesson", "xp", "league", "social", "quest", "habit", "skill", "level"];

interface AchievementGridProps {
  achievements: AchievementRow[];
}

export function AchievementGrid({ achievements }: AchievementGridProps) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<AchievementRow | null>(null);

  const unlocked = achievements.filter((a) => a.unlocked).length;

  const visible = filter === "all" ? achievements : achievements.filter((a) => a.category === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <span className="font-bold text-gray-900 dark:text-white">{unlocked}</span> / {achievements.length} unlocked
        </p>
        <div className="h-2 flex-1 mx-4 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${achievements.length ? (unlocked / achievements.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
              filter === cat
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {visible.map((a) => (
          <button
            key={a.id}
            onClick={() => setSelected(a)}
            className={`relative flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
              a.unlocked
                ? (TIER_COLOR[a.tier] ?? TIER_COLOR.bronze)
                : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-50"
            }`}
            aria-label={a.title}
          >
            <span className={`text-2xl ${!a.unlocked ? "grayscale" : ""}`}>{a.icon}</span>
            <span className="text-xs font-medium text-center leading-tight text-gray-900 dark:text-white line-clamp-2">
              {a.title}
            </span>
            {!a.unlocked && (
              <Lock size={10} className="absolute top-1.5 right-1.5 text-gray-400" />
            )}
          </button>
        ))}
      </div>

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal
            aria-label={selected.title}
          >
            <div className="text-center space-y-3">
              <span className={`text-5xl ${!selected.unlocked ? "grayscale" : ""}`}>{selected.icon}</span>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selected.title}</h3>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${TIER_BADGE[selected.tier] ?? TIER_BADGE.bronze}`}>
                {selected.tier}
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400">{selected.description}</p>
              {selected.xpBonus > 0 && (
                <p className="text-sm font-semibold text-yellow-600">+{selected.xpBonus} XP bonus</p>
              )}
              {selected.unlocked && selected.unlockedAt && (
                <p className="text-xs text-gray-400">
                  Unlocked {new Date(selected.unlockedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
            </div>
            <button
              onClick={() => setSelected(null)}
              className="mt-5 w-full py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
