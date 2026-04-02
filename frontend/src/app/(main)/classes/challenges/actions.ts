"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile, getCurrentUser } from "@/server/auth";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { createClassGroupViaGo } from "@/server/integrations/go-backend/classroom-write";
import {
  assignClassSetViaGo,
  createClassChallengeViaGo,
  joinClassByCodeViaGo,
  joinClassChallengeViaGo,
} from "@/server/integrations/go-backend/classroom-actions";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

export type CreateClassGroupActionState = {
  status: "idle" | "success" | "error";
  error: string | null;
  success: string | null;
  groupId: string | null;
};

async function requireTeacherProfile() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentProfile(user);
  if (profile?.role !== "teacher") {
    return { error: "Only teachers can use this action.", user: null, profile };
  }

  return { error: null, user, profile };
}

async function requireStudentProfile() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentProfile(user);
  if (profile?.role !== "student") {
    return { error: "Only students can use this action.", user: null, profile };
  }

  return { error: null, user, profile };
}

function normalizeBackendError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  return message.replace(/^\[Go backend\]\s*\d+\s*/i, "").trim() || fallback;
}

export async function createClassGroup(formData: FormData) {
  const access = await requireTeacherProfile();
  if (access.error || !access.user) {
    return { error: access.error };
  }

  const name = String(formData.get("name") ?? "").trim();
  const members = String(formData.get("members") ?? "");
  if (!name) {
    return { error: "Class name is required." };
  }

  try {
    const result = await createClassGroupViaGo(access.user.id, { name, members });
    revalidatePath("/teacher/classes");
    revalidatePath("/teacher/dashboard");
    revalidatePath(`/teacher/classes/${result.groupId}`);
    return { error: null, groupId: result.groupId };
  } catch (error) {
    return { error: normalizeBackendError(error, "Failed to create class.") };
  }
}

export async function submitCreateClassGroup(
  _previousState: CreateClassGroupActionState,
  formData: FormData
): Promise<CreateClassGroupActionState> {
  const t = createTranslator(await getServerLocale());
  const result = await createClassGroup(formData);

  if (result.error || !result.groupId) {
    return {
      status: "error",
      error: result.error ?? t("common.networkError"),
      success: null,
      groupId: null,
    };
  }

  return {
    status: "success",
    error: null,
    success: t("teacher.classCreatedSuccess"),
    groupId: result.groupId,
  };
}

export async function createClassChallenge(formData: FormData) {
  const access = await requireTeacherProfile();
  if (access.error || !access.user) {
    return { error: access.error };
  }

  const groupId = String(formData.get("group_id") ?? "").trim();
  const setId = String(formData.get("set_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const deadline = String(formData.get("deadline") ?? "").trim();

  if (!groupId || !setId || !title) {
    return { error: "Group, set, and challenge title are required." };
  }

  try {
    const result = await createClassChallengeViaGo(access.user.id, {
      groupId,
      setId,
      title,
      deadline: deadline ? new Date(deadline).toISOString() : null,
    });

    revalidatePath("/teacher/challenges");
    revalidatePath(`/teacher/classes/${groupId}`);
    revalidatePath("/student/challenges");

    return { error: null, challengeId: result.challengeId };
  } catch (error) {
    return { error: normalizeBackendError(error, "Failed to create class challenge.") };
  }
}

export async function joinClassChallenge(challengeId: string) {
  const access = await requireStudentProfile();
  if (access.error || !access.user) {
    return { error: access.error };
  }

  try {
    await joinClassChallengeViaGo(access.user.id, challengeId);
    revalidatePath(`/classes/challenges/${challengeId}`);
    revalidatePath(`/classes/challenges/${challengeId}/ranking`);
    revalidatePath("/student/challenges");
    return { error: null };
  } catch (error) {
    return { error: normalizeBackendError(error, "Failed to join challenge.") };
  }
}

export async function joinClassByCode(formData: FormData) {
  const access = await requireStudentProfile();
  if (access.error || !access.user) {
    return { error: access.error };
  }

  const joinCode = String(formData.get("join_code") ?? "").trim().toUpperCase();
  if (!joinCode) {
    return { error: "Class code is required." };
  }

  try {
    const result = await joinClassByCodeViaGo(access.user.id, joinCode);
    revalidatePath("/student/classes");
    revalidatePath("/student/dashboard");
    return { error: null, groupId: result.groupId };
  } catch (error) {
    return { error: normalizeBackendError(error, "Failed to join class.") };
  }
}

export async function assignClassSet(formData: FormData) {
  const access = await requireTeacherProfile();
  if (access.error || !access.user) {
    return { error: access.error };
  }

  const groupId = String(formData.get("group_id") ?? "").trim();
  const setId = String(formData.get("set_id") ?? "").trim();
  const deadline = String(formData.get("deadline") ?? "").trim();

  if (!groupId || !setId) {
    return { error: "Class and flashcard set are required." };
  }

  try {
    await assignClassSetViaGo(access.user.id, {
      groupId,
      setId,
      deadline: deadline ? new Date(deadline).toISOString() : null,
    });

    revalidatePath(`/teacher/classes/${groupId}`);
    revalidatePath("/teacher/dashboard");
    revalidatePath("/student/classes");
    revalidatePath("/student/dashboard");
    return { error: null };
  } catch (error) {
    return { error: normalizeBackendError(error, "Failed to assign flashcard set.") };
  }
}

export async function removeStudentFromClass(formData: FormData) {
  const access = await requireTeacherProfile();
  if (access.error || !access.user) {
    return { error: access.error };
  }

  const groupId = String(formData.get("group_id") ?? "").trim();
  const userId = String(formData.get("user_id") ?? "").trim();
  if (!groupId || !userId) {
    return { error: "Group and student are required." };
  }

  try {
    await fetchBackendJson({
      path: `/api/v1/classroom/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`,
      userId: access.user.id,
      method: "DELETE",
    });

    revalidatePath(`/teacher/classes/${groupId}`);
    revalidatePath("/teacher/dashboard");
    revalidatePath("/student/classes");
    revalidatePath("/student/challenges");
    return { error: null };
  } catch (error) {
    return { error: normalizeBackendError(error, "Failed to remove student.") };
  }
}

export async function saveClassChallengeAttempt(input: {
  challengeId: string;
  completionTime: number;
  accuracy: number;
  totalCorrect: number;
  totalIncorrect: number;
}) {
  const access = await requireStudentProfile();
  if (access.error || !access.user) {
    return { error: access.error ?? "You need to log in before your class attempt can be ranked." };
  }

  try {
    await fetchBackendJson({
      path: "/api/v1/challenges/class-attempt",
      userId: access.user.id,
      method: "POST",
      body: JSON.stringify({
        challengeId: input.challengeId,
        completionTime: Math.max(0, Math.round(input.completionTime)),
        accuracy: Math.max(0, Math.round(input.accuracy)),
        totalCorrect: input.totalCorrect,
        totalIncorrect: input.totalIncorrect,
      }),
      headers: { "Content-Type": "application/json" },
    });

    revalidatePath(`/classes/challenges/${input.challengeId}/ranking`);
    revalidatePath("/student/challenges");
    return { error: null };
  } catch (error) {
    return { error: normalizeBackendError(error, "Failed to save class attempt.") };
  }
}
