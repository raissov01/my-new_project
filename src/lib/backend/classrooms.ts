import "server-only";

import { fetchBackendJson } from "./server";
import type {
  StudentDashboardSummary,
  TeacherDashboardSummary,
} from "@/lib/classrooms-types";

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
