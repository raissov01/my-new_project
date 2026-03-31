import "server-only";

import type { Profile } from "@/types/database";
import { fetchBackendJson } from "./server";

type BackendProfileResponse = {
  id: string;
  email: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  streakDays: number;
  lastActiveDate: string | null;
  points: number;
  role: Profile["role"];
};

function mapBackendProfileToProfile(response: BackendProfileResponse): Profile {
  return {
    id: response.id,
    email: response.email,
    full_name: response.fullName,
    username: response.username,
    avatar_url: response.avatarUrl,
    bio: response.bio,
    created_at: response.createdAt,
    streak_days: response.streakDays,
    last_active_date: response.lastActiveDate,
    points: response.points,
    role: response.role,
  };
}

export async function getCurrentProfileFromGo(userId: string): Promise<Profile> {
  const response = await fetchBackendJson<BackendProfileResponse>({
    path: "/api/v1/me",
    userId,
  });

  return mapBackendProfileToProfile(response);
}
