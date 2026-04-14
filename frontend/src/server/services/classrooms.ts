import "server-only";

import {
  getClassQuizLeaderboardFromGo,
  getClassQuizTeacherStatsFromGo,
  getRecentTeacherQuizActivityFromGo,
  getStudentDashboardSummaryFromGo,
  getStudentQuizAssignmentsFromGo,
  getTeacherClassroomDetailFromGo,
  getTeacherDashboardSummaryFromGo,
} from "@/server/integrations/go-backend/classrooms";
import { getCurrentUser } from "@/server/auth";
import type {
  QuizLeaderboard,
  QuizTeacherStats,
  RecentQuizActivity,
  StudentDashboardSummary,
  StudentQuizAssignment,
  TeacherClassroomDetail,
  TeacherDashboardSummary,
} from "@/server/services/classrooms.types";

export async function getTeacherDashboardSummary(
  preloadedUserId?: string
): Promise<TeacherDashboardSummary | null> {
  const userId = preloadedUserId ?? (await getCurrentUser())?.id;
  if (!userId) return null;

  try {
    return await getTeacherDashboardSummaryFromGo(userId);
  } catch {
    return null;
  }
}

export async function getStudentDashboardSummary(
  preloadedUserId?: string
): Promise<StudentDashboardSummary | null> {
  const userId = preloadedUserId ?? (await getCurrentUser())?.id;
  if (!userId) return null;

  try {
    return await getStudentDashboardSummaryFromGo(userId);
  } catch {
    return null;
  }
}

export async function getTeacherClassroomDetail(
  groupId: string,
  preloadedUserId?: string
): Promise<TeacherClassroomDetail | null> {
  const userId = preloadedUserId ?? (await getCurrentUser())?.id;
  if (!userId) return null;

  try {
    return await getTeacherClassroomDetailFromGo(userId, groupId);
  } catch {
    return null;
  }
}

export async function getClassQuizLeaderboard(
  groupId: string,
  quizId: string
): Promise<QuizLeaderboard | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  try {
    return await getClassQuizLeaderboardFromGo(user.id, groupId, quizId);
  } catch {
    return null;
  }
}

export async function getClassQuizTeacherStats(
  groupId: string,
  quizId: string
): Promise<QuizTeacherStats | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  try {
    return await getClassQuizTeacherStatsFromGo(user.id, groupId, quizId);
  } catch {
    return null;
  }
}

export async function getStudentQuizAssignments(): Promise<
  StudentQuizAssignment[]
> {
  const user = await getCurrentUser();
  if (!user) return [];
  try {
    return await getStudentQuizAssignmentsFromGo(user.id);
  } catch {
    return [];
  }
}

export async function getRecentTeacherQuizActivity(): Promise<
  RecentQuizActivity[]
> {
  const user = await getCurrentUser();
  if (!user) return [];
  try {
    return await getRecentTeacherQuizActivityFromGo(user.id);
  } catch {
    return [];
  }
}
