import "server-only";

import { fetchBackendJson } from "./server";
import type {
  StudentDashboardSummary,
  TeacherClassroomDetail,
  TeacherDashboardSummary,
} from "@/server/services/classrooms.types";

export async function getTeacherDashboardSummaryFromGo(
  userId: string
): Promise<TeacherDashboardSummary> {
  return fetchBackendJson<TeacherDashboardSummary>({
    path: "/api/v1/dashboard/teacher",
    userId,
  });
}

export async function getStudentDashboardSummaryFromGo(
  userId: string
): Promise<StudentDashboardSummary> {
  return fetchBackendJson<StudentDashboardSummary>({
    path: "/api/v1/dashboard/student",
    userId,
  });
}

export async function getTeacherClassroomDetailFromGo(
  userId: string,
  groupId: string
): Promise<TeacherClassroomDetail> {
  return fetchBackendJson<TeacherClassroomDetail>({
    path: `/api/v1/classroom/groups/${groupId}`,
    userId,
  });
}
