import "server-only";

import { fetchBackendJson } from "./server";
import type {
  QuizLeaderboard,
  QuizTeacherStats,
  RecentQuizActivity,
  StudentDashboardSummary,
  StudentQuizAssignment,
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

export async function getClassQuizLeaderboardFromGo(
  userId: string,
  groupId: string,
  quizId: string
): Promise<QuizLeaderboard> {
  return fetchBackendJson<QuizLeaderboard>({
    path: `/api/v1/classroom/groups/${encodeURIComponent(groupId)}/quizzes/${encodeURIComponent(quizId)}/leaderboard`,
    userId,
  });
}

export async function getClassQuizTeacherStatsFromGo(
  userId: string,
  groupId: string,
  quizId: string
): Promise<QuizTeacherStats> {
  return fetchBackendJson<QuizTeacherStats>({
    path: `/api/v1/classroom/groups/${encodeURIComponent(groupId)}/quizzes/${encodeURIComponent(quizId)}/teacher-stats`,
    userId,
  });
}

export async function getStudentQuizAssignmentsFromGo(
  userId: string
): Promise<StudentQuizAssignment[]> {
  const res = await fetchBackendJson<{ items: StudentQuizAssignment[] }>({
    path: "/api/v1/classroom/student/quiz-assignments",
    userId,
  });
  return res.items ?? [];
}

export async function getRecentTeacherQuizActivityFromGo(
  userId: string
): Promise<RecentQuizActivity[]> {
  const res = await fetchBackendJson<{ items: RecentQuizActivity[] }>({
    path: "/api/v1/classroom/teacher/quiz-activity",
    userId,
  });
  return res.items ?? [];
}
