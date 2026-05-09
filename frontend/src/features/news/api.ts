"use server";

import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

export interface VocabWord { word: string; definition: string }
export interface NewsQuestion { level: string; prompt: string; answer: string }

export interface DailyNews {
  id: string;
  newsDate: string;
  topic: string;
  sourceUrl?: string;
  originalHeadline?: string;
  versionA2: string;
  versionB1: string;
  versionC1: string;
  vocabA2?: VocabWord[] | string;
  vocabB1?: VocabWord[] | string;
  vocabC1?: VocabWord[] | string;
  questions?: NewsQuestion[] | string;
  audioA2Url?: string;
  audioB1Url?: string;
  audioC1Url?: string;
  createdAt: string;
}

export async function getTodayNews(): Promise<DailyNews | null> {
  const user = await getCurrentUser();
  try {
    const data = await fetchBackendJson<{ news: DailyNews }>({
      path: "/api/v1/news/today",
      userId: user?.id ?? "",
    });
    return data.news;
  } catch (err) {
    console.error("[news] getTodayNews failed:", err);
    return null;
  }
}

export async function getRecentNews(): Promise<DailyNews[]> {
  const user = await getCurrentUser();
  try {
    const data = await fetchBackendJson<{ news: DailyNews[] }>({
      path: "/api/v1/news/recent?n=7",
      userId: user?.id ?? "",
    });
    return data.news ?? [];
  } catch (err) {
    console.error("[news] getRecentNews failed:", err);
    return [];
  }
}
