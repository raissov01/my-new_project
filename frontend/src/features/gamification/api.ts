"use server";

import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

// ── Types ──────────────────────────────────────────────────────────────────

export type DayStatus = {
  date: string;
  status: "active" | "freeze" | "miss" | "future";
  xp: number;
};

export type LeagueMember = {
  userId: string;
  username: string;
  avatarUrl: string;
  weeklyXp: number;
  rank: number;
};

export type LeagueGroup = {
  id: string;
  tier: string;
  weekStartsOn: string;
};

export type FriendWithStats = {
  userId: string;
  username: string;
  avatarUrl: string;
  streakDays: number;
  weeklyXp: number;
  status: "pending" | "accepted";
};

export type AchievementRow = {
  id: string;
  title: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "diamond";
  xpBonus: number;
  category: string;
  sortOrder: number;
  unlocked: boolean;
  unlockedAt: string | null;
};

export type DailyQuest = {
  id: string;
  questType: string;
  target: number;
  progress: number;
  completed: boolean;
  xpReward: number;
};

export type XPEvent = {
  id: string;
  multiplier: number;
  startsAt: string;
  endsAt: string;
  title: string;
  bannerColor: string;
};

export type UserSearchResult = {
  id: string;
  username: string;
  avatarUrl: string | null;
  streakDays: number;
};

// ── Streak ─────────────────────────────────────────────────────────────────

export async function recordDailyActivity(xpEarned: number, lessonsCompleted: number) {
  const user = await getCurrentUser();
  if (!user) return;
  await fetchBackendJson({
    path: "/api/v1/gamification/activity",
    userId: user.id,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ xpEarned, lessonsCompleted }),
  }).catch(() => {});
}

export async function getStreakCalendar(days = 30): Promise<DayStatus[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  try {
    const res = await fetchBackendJson<{ calendar: DayStatus[] }>({
      path: `/api/v1/gamification/streak/calendar?days=${days}`,
      userId: user.id,
    });
    return res.calendar ?? [];
  } catch {
    return [];
  }
}

// ── Leagues ────────────────────────────────────────────────────────────────

export async function getLeague() {
  const user = await getCurrentUser();
  if (!user) return null;
  try {
    return await fetchBackendJson<{ group: LeagueGroup | null; members: LeagueMember[]; daysLeft: number }>({
      path: "/api/v1/gamification/league",
      userId: user.id,
    });
  } catch {
    return null;
  }
}

// ── Friends ────────────────────────────────────────────────────────────────

export async function getFriends() {
  const user = await getCurrentUser();
  if (!user) return null;
  try {
    return await fetchBackendJson<{
      inviteCode: string;
      friends: FriendWithStats[];
      pendingRequests: FriendWithStats[];
    }>({
      path: "/api/v1/gamification/friends",
      userId: user.id,
    });
  } catch {
    return null;
  }
}

export async function sendFriendRequest(targetId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return fetchBackendJson({ path: "/api/v1/gamification/friends/request", userId: user.id, method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId }) });
}

export async function acceptFriendRequest(requesterId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return fetchBackendJson({ path: "/api/v1/gamification/friends/accept", userId: user.id, method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requesterId }) });
}

export async function searchUsers(q: string): Promise<UserSearchResult[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  try {
    const res = await fetchBackendJson<{ users: UserSearchResult[] }>({
      path: `/api/v1/gamification/friends/search?q=${encodeURIComponent(q)}`,
      userId: user.id,
    });
    return res.users ?? [];
  } catch {
    return [];
  }
}

// ── Achievements ───────────────────────────────────────────────────────────

export async function getAchievements(): Promise<AchievementRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  try {
    const res = await fetchBackendJson<{ achievements: AchievementRow[] }>({
      path: "/api/v1/gamification/achievements",
      userId: user.id,
    });
    return res.achievements ?? [];
  } catch {
    return [];
  }
}

// ── Daily Quests ───────────────────────────────────────────────────────────

export async function getDailyQuests(): Promise<DailyQuest[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  try {
    const res = await fetchBackendJson<{ quests: DailyQuest[] }>({
      path: "/api/v1/gamification/quests",
      userId: user.id,
    });
    return res.quests ?? [];
  } catch {
    return [];
  }
}

// ── XP Events ─────────────────────────────────────────────────────────────

export async function getActiveXPEvent(): Promise<XPEvent | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  try {
    const res = await fetchBackendJson<{ event: XPEvent | null }>({
      path: "/api/v1/gamification/xp-event",
      userId: user.id,
    });
    return res.event ?? null;
  } catch {
    return null;
  }
}

// ── Social Proof ───────────────────────────────────────────────────────────

export async function getSocialProof(level: string): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;
  try {
    const res = await fetchBackendJson<{ studentsToday: number }>({
      path: `/api/v1/gamification/social-proof?level=${level}`,
      userId: user.id,
    });
    return res.studentsToday ?? 0;
  } catch {
    return 0;
  }
}
