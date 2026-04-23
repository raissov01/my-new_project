import "server-only";

import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { getCurrentUser } from "@/server/auth";
import type { ScoreEntry } from "@/components/dashboard/ScoreRadarDashboard";

export async function getIELTSScoreHistory(): Promise<ScoreEntry[]> {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    const data = await fetchBackendJson<{ entries: ScoreEntry[] }>({
      path: "/api/v1/ielts/dashboard/score-history",
      userId: user.id,
      cache: "no-store",
    });

    return data.entries ?? [];
  } catch {
    return [];
  }
}
