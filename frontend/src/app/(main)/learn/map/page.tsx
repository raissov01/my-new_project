import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/server/auth";
import { getPlacement, getMap, getProgress } from "@/features/learn/api";
import { getActiveXPEvent, getDailyQuests } from "@/features/gamification/api";
import { MapClient } from "./client";

// BUG-LEARN-016: Correct page title
export const metadata: Metadata = {
  title: "Learn English | StudyWithRaissov",
  description: "Duolingo-style English learning: A1 to C2 in 17 units, 200+ lessons.",
};

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const placement = await getPlacement();
  if (!placement) redirect("/learn/placement");

  const [mapData, progress, params, xpEvent, quests] = await Promise.all([
    getMap(),
    getProgress(),
    searchParams,
    getActiveXPEvent(),
    getDailyQuests(),
  ]);

  return (
    <MapClient
      units={mapData.units}
      progress={progress}
      userLevel={placement.level}
      initialLevel={params.level}
      xpEvent={xpEvent}
      quests={quests}
    />
  );
}
