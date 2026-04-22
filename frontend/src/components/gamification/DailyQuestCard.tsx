"use client";

import { CheckCircle2, Circle } from "lucide-react";
import type { DailyQuest } from "@/features/gamification/api";

const QUEST_LABELS: Record<string, string> = {
  earn_xp_50:        "Earn 50 XP today",
  earn_xp_100:       "Earn 100 XP today",
  complete_3_lessons: "Complete 3 lessons",
  complete_5_lessons: "Complete 5 lessons",
  perfect_lesson_1:  "Complete a lesson with no mistakes",
  listen_3_clips:    "Complete 3 listening exercises",
  translate_10:      "Complete 10 translation exercises",
  word_builder_5:    "Complete 5 word-builder exercises",
};

interface DailyQuestCardProps {
  quests: DailyQuest[];
}

export function DailyQuestCard({ quests }: DailyQuestCardProps) {
  if (quests.length === 0) return null;

  return (
    <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="bg-indigo-50 dark:bg-indigo-950 px-4 py-3">
        <h3 className="font-bold text-indigo-900 dark:text-indigo-100 text-sm">📋 Daily Quests</h3>
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {quests.map((q) => {
          const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
          return (
            <li key={q.id} className="px-4 py-3 space-y-2">
              <div className="flex items-start gap-2">
                {q.completed
                  ? <CheckCircle2 size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                  : <Circle size={16} className="text-gray-300 flex-shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${q.completed ? "line-through text-gray-400" : "text-gray-900 dark:text-white"}`}>
                    {QUEST_LABELS[q.questType] ?? q.questType}
                  </p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400">+{q.xpReward} XP</p>
                </div>
                <span className="text-xs text-gray-400 tabular-nums flex-shrink-0">
                  {q.progress}/{q.target}
                </span>
              </div>
              {!q.completed && (
                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
