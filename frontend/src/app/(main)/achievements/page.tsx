import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getAchievements } from "@/features/gamification/api";
import { AchievementGrid } from "@/components/gamification/AchievementGrid";

export const metadata = { title: "Achievements — StudyWithRaissov" };

export default async function AchievementsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const achievements = await getAchievements();

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Achievements</h1>
          <p className="text-sm text-gray-500 mt-1">Earn badges by hitting milestones in your learning journey.</p>
        </div>
        <AchievementGrid achievements={achievements} />
      </div>
    </main>
  );
}
