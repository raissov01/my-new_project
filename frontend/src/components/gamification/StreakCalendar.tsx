"use client";

import type { DayStatus } from "@/features/gamification/api";

interface StreakCalendarProps {
  calendar: DayStatus[];
  freezesAvailable: number;
}

const STATUS_STYLE: Record<DayStatus["status"], string> = {
  active: "bg-green-500 border-green-600",
  freeze: "bg-blue-400 border-blue-500",
  miss: "bg-gray-200 border-gray-300 dark:bg-gray-700 dark:border-gray-600",
  future: "bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700",
};

const STATUS_ICON: Record<DayStatus["status"], string> = {
  active: "✅",
  freeze: "🧊",
  miss: "",
  future: "",
};

export function StreakCalendar({ calendar, freezesAvailable }: StreakCalendarProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i} className="text-center text-xs font-semibold text-gray-400">{d}</div>
        ))}
        {calendar.map((day) => (
          <div
            key={day.date}
            title={`${day.date}${day.xp > 0 ? ` — ${day.xp} XP` : ""}`}
            className={`relative aspect-square rounded-md border-2 flex items-center justify-center text-xs ${STATUS_STYLE[day.status]}`}
          >
            {STATUS_ICON[day.status] && (
              <span className="text-[10px]">{STATUS_ICON[day.status]}</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-green-500" /> Active day</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-blue-400" /> Freeze used</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-gray-300 dark:bg-gray-600" /> Missed</span>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 p-4 flex items-center gap-3">
        <span className="text-2xl">🧊</span>
        <div>
          <p className="font-semibold text-blue-900 dark:text-blue-100">
            Streak Freezes: {freezesAvailable} available
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
            A freeze protects your streak when you miss a day. Resets weekly.
          </p>
        </div>
      </div>
    </div>
  );
}
