import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getStreakCalendar } from "@/features/gamification/api";
import { getProgress } from "@/features/learn/api";
import { StreakCalendar } from "@/components/gamification/StreakCalendar";
import { StreakBadge } from "@/components/gamification/StreakBadge";

export const metadata = { title: "My Streak — StudyWithRaissov" };

export default async function StreakPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [calendar, progress] = await Promise.all([
    getStreakCalendar(30),
    getProgress(),
  ]);

  const streak = progress?.currentStreak ?? 0;
  const longest = progress?.longestStreak ?? 0;

  // Align calendar so it starts on Monday
  const today = new Date();
  const dayOfWeek = (today.getDay() + 6) % 7; // 0=Mon … 6=Sun
  const calWithPad = dayOfWeek > 0
    ? [...Array(dayOfWeek).fill({ date: "", status: "future" as const, xp: 0 }), ...calendar].slice(0, 35)
    : calendar;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="flex justify-center">
            <StreakBadge streak={streak} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {streak}-Day Streak
          </h1>
          <p className="text-sm text-gray-500">
            Longest streak: {longest} days
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 text-center border border-gray-200 dark:border-gray-700">
            <p className="text-3xl font-bold text-orange-500">{streak}</p>
            <p className="text-xs text-gray-500 mt-1">Current streak</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 text-center border border-gray-200 dark:border-gray-700">
            <p className="text-3xl font-bold text-gray-700 dark:text-gray-300">{longest}</p>
            <p className="text-xs text-gray-500 mt-1">Best streak</p>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Last 30 days</h2>
          <StreakCalendar
            calendar={calWithPad}
            freezesAvailable={2}
          />
        </div>

        {/* CTA */}
        {streak === 0 && (
          <div className="text-center">
            <a
              href="/learn/map"
              className="inline-block px-6 py-3 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors"
            >
              Start today's lesson →
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
