import "server-only";

import {
  getStudentDashboardSummaryFromGo,
  getTeacherClassroomDetailFromGo,
  getTeacherDashboardSummaryFromGo,
} from "@/server/integrations/go-backend/classrooms";
import { getCurrentUser } from "@/server/auth";
import type {
  StudentDashboardSummary,
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
