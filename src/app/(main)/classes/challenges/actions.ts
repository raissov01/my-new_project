"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getCurrentProfile, getCurrentUser } from "@/lib/supabase/server";
import { createTranslator } from "@/lib/i18n/shared";
import { getServerLocale } from "@/lib/i18n/server";
import { getAccessibleSetById, resolveInviteProfiles } from "@/lib/set-access";
import { getClassChallengeById } from "@/lib/class-challenges";
import { createClassGroupViaGo } from "@/lib/backend/classroom-write";
import { isGoBackendBridgeConfigured } from "@/lib/backend/env";
import {
  assignClassSetViaGo,
  createClassChallengeViaGo,
  joinClassByCodeViaGo,
  joinClassChallengeViaGo,
} from "@/lib/backend/classroom-actions";
import type { Database } from "@/types/database";

type TableError = { message: string } | null;

type ClassGroupsTable = {
  insert: (values: Database["public"]["Tables"]["class_groups"]["Insert"]) => {
    select: (columns: string) => {
      single: () => Promise<{
        data: Database["public"]["Tables"]["class_groups"]["Row"] | null;
        error: TableError;
      }>;
    };
  };
};

type GroupMembersTable = {
  insert: (
    values: Database["public"]["Tables"]["class_group_members"]["Insert"][]
  ) => Promise<{ error: TableError }>;
  delete: () => {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => Promise<{ error: TableError }>;
    };
  };
};

type ClassChallengesTable = {
  insert: (values: Database["public"]["Tables"]["class_challenges"]["Insert"]) => {
    select: (columns: string) => {
      single: () => Promise<{
        data: Database["public"]["Tables"]["class_challenges"]["Row"] | null;
        error: TableError;
      }>;
    };
  };
};

type ChallengeParticipantsTable = {
  insert: (
    values: Database["public"]["Tables"]["class_challenge_participants"]["Insert"]
  ) => Promise<{ error: TableError }>;
};

type ChallengeAttemptsTable = {
  insert: (
    values: Database["public"]["Tables"]["class_challenge_attempts"]["Insert"]
  ) => Promise<{ error: TableError }>;
};

type ClassAssignmentsTable = {
  insert: (values: Database["public"]["Tables"]["class_set_assignments"]["Insert"]) => Promise<{
    error: TableError;
  }>;
};

type JoinClassByCodeRpc = (
  fn: "join_class_group_by_code",
  args: Database["public"]["Functions"]["join_class_group_by_code"]["Args"]
) => Promise<{ data: string | null; error: TableError }>;

export type CreateClassGroupActionState = {
  status: "idle" | "success" | "error";
  error: string | null;
  success: string | null;
  groupId: string | null;
};

function generateJoinCode() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
}

function formatClassroomError(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("infinite recursion detected in policy") ||
    normalized.includes("public.class_groups") ||
    normalized.includes("public.class_set_assignments") ||
    normalized.includes("public.class_group_members") ||
    normalized.includes("public.class_challenges") ||
    normalized.includes("public.class_challenge_participants") ||
    normalized.includes("public.class_challenge_attempts") ||
    normalized.includes("schema cache")
  ) {
    return "Supabase classroom schema or RLS policies are outdated. Run migrations 016_classroom_schema_repair.sql and 017_classroom_rls_recursion_fix.sql.";
  }

  return message;
}

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

async function verifyTeacherOwnsGroup(groupId: string, ownerId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("class_groups")
    .select("id")
    .eq("id", groupId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  return Boolean(data);
}

async function createClassGroupWithSupabase(formData: FormData) {
  const access = await requireTeacherProfile();
  if (access.error || !access.user) {
    return { error: access.error };
  }

  const name = String(formData.get("name") ?? "").trim();
  const members = String(formData.get("members") ?? "");

  if (!name) {
    return { error: "Class name is required." };
  }

  const inviteResolution = await resolveInviteProfiles(members);
  const missing = inviteResolution.usernames.filter(
    (username) => !inviteResolution.profiles.some((profile) => profile.username === username)
  );

  if (missing.length > 0) {
    return { error: `Unknown usernames: ${missing.join(", ")}` };
  }

  const supabase = await createClient();
  const groupsTable = supabase.from("class_groups") as never as ClassGroupsTable;
  const membersTable = supabase.from("class_group_members") as never as GroupMembersTable;

  let group: Database["public"]["Tables"]["class_groups"]["Row"] | null = null;
  let error: TableError = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = await groupsTable
      .insert({
        name,
        owner_id: access.user.id,
        join_code: generateJoinCode(),
      })
      .select("*")
      .single();

    group = result.data;
    error = result.error;

    if (!error || !error.message.toLowerCase().includes("join_code")) {
      break;
    }
  }

  if (error || !group) {
    console.error("[createClassGroup] Failed to create class group:", {
      teacherId: access.user.id,
      name,
      message: error?.message ?? "Unknown insert error",
    });
    return {
      error: formatClassroomError(error?.message ?? "Failed to create class."),
    };
  }

  const memberRows = [
    {
      group_id: group.id,
      user_id: access.user.id,
      role: "owner" as const,
    },
    ...inviteResolution.profiles
      .filter((profile) => profile.id !== access.user?.id)
      .map((profile) => ({
        group_id: group.id,
        user_id: profile.id,
        role: "student" as const,
      })),
  ];

  const { error: memberError } = await membersTable.insert(memberRows);
  if (memberError) {
    console.error("[createClassGroup] Failed to insert class members:", {
      teacherId: access.user.id,
      groupId: group.id,
      message: memberError.message,
    });
    return { error: formatClassroomError(memberError.message) };
  }

  revalidatePath("/teacher/classes");
  revalidatePath("/teacher/dashboard");
  revalidatePath(`/teacher/classes/${group.id}`);

  return { error: null, groupId: group.id };
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

  if (isGoBackendBridgeConfigured()) {
    try {
      const result = await createClassGroupViaGo(access.user.id, {
        name,
        members,
      });

      revalidatePath("/teacher/classes");
      revalidatePath("/teacher/dashboard");
      revalidatePath(`/teacher/classes/${result.groupId}`);

      return { error: null, groupId: result.groupId };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create class.";
      console.error("[createClassGroup] Go backend create failed, falling back to Supabase:", {
        teacherId: access.user.id,
        name,
        message,
      });

      const normalized = message.replace(/^\[Go backend\]\s*\d+\s*/i, "").trim();
      if (
        normalized.toLowerCase().includes("unknown usernames:") ||
        normalized.toLowerCase().includes("class name is required")
      ) {
        return { error: normalized };
      }
    }
  }

  return createClassGroupWithSupabase(formData);
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

  const set = await getAccessibleSetById(setId);
  if (!set || set.user_id !== access.user.id) {
    return { error: "You can only assign your own flashcard sets to a class challenge." };
  }

  const ownsGroup = await verifyTeacherOwnsGroup(groupId, access.user.id);
  if (!ownsGroup) {
    return { error: "You can only create challenges for your own classes." };
  }

  if (isGoBackendBridgeConfigured()) {
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
      const message = error instanceof Error ? error.message : "Failed to create class challenge.";
      console.error("[createClassChallenge] Go backend create failed, falling back to Supabase:", {
        teacherId: access.user.id,
        groupId,
        setId,
        message,
      });
    }
  }

  const supabase = await createClient();
  const challengesTable = supabase.from("class_challenges") as never as ClassChallengesTable;

  const { data: challenge, error } = await challengesTable
    .insert({
      group_id: groupId,
      set_id: setId,
      title,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      created_by: access.user.id,
    })
    .select("*")
    .single();

  if (error || !challenge) {
    return {
      error: formatClassroomError(
        error?.message ?? "Failed to create class challenge."
      ),
    };
  }

  revalidatePath("/teacher/challenges");
  revalidatePath(`/teacher/classes/${groupId}`);
  revalidatePath("/student/challenges");

  return { error: null, challengeId: challenge.id };
}

export async function joinClassChallenge(challengeId: string) {
  const access = await requireStudentProfile();
  if (access.error || !access.user) {
    return { error: access.error };
  }

  const challenge = await getClassChallengeById(challengeId);
  if (!challenge) {
    return { error: "Challenge not found." };
  }

  if (isGoBackendBridgeConfigured()) {
    try {
      await joinClassChallengeViaGo(access.user.id, challengeId);
      return { error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to join challenge.";
      console.error("[joinClassChallenge] Go backend join failed, falling back to Supabase:", {
        userId: access.user.id,
        challengeId,
        message,
      });
    }
  }

  const supabase = await createClient();
  const participantsTable =
    supabase.from("class_challenge_participants") as never as ChallengeParticipantsTable;

  const { error } = await participantsTable.insert({
    challenge_id: challengeId,
    user_id: access.user.id,
  });

  if (error && !error.message.toLowerCase().includes("duplicate")) {
    return { error: error.message };
  }

  return { error: null };
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

  if (isGoBackendBridgeConfigured()) {
    try {
      const result = await joinClassByCodeViaGo(access.user.id, joinCode);

      revalidatePath("/student/classes");
      revalidatePath("/student/dashboard");

      return { error: null, groupId: result.groupId };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to join class.";
      console.error("[joinClassByCode] Go backend join failed, falling back to Supabase:", {
        userId: access.user.id,
        joinCode,
        message,
      });

      const normalized = message.replace(/^\[Go backend\]\s*\d+\s*/i, "").trim();
      if (normalized.toLowerCase().includes("class not found")) {
        return { error: normalized };
      }
    }
  }

  const supabase = await createClient();
  const joinByCode = supabase.rpc as unknown as JoinClassByCodeRpc;
  const { data, error } = await joinByCode("join_class_group_by_code", {
    p_join_code: joinCode,
  });

  if (error) {
    return { error: formatClassroomError(error.message) };
  }

  revalidatePath("/student/classes");
  revalidatePath("/student/dashboard");

  return { error: null, groupId: data };
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

  const ownsGroup = await verifyTeacherOwnsGroup(groupId, access.user.id);
  if (!ownsGroup) {
    return { error: "You can only assign sets to your own classes." };
  }

  const set = await getAccessibleSetById(setId);
  if (!set || set.user_id !== access.user.id) {
    return { error: "You can only assign your own flashcard sets." };
  }

  if (isGoBackendBridgeConfigured()) {
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
      const message = error instanceof Error ? error.message : "Failed to assign flashcard set.";
      console.error("[assignClassSet] Go backend assign failed, falling back to Supabase:", {
        teacherId: access.user.id,
        groupId,
        setId,
        message,
      });
    }
  }

  const supabase = await createClient();
  const assignmentsTable =
    supabase.from("class_set_assignments") as never as ClassAssignmentsTable;
  const { error } = await assignmentsTable.insert({
    group_id: groupId,
    set_id: setId,
    assigned_by: access.user.id,
    deadline: deadline ? new Date(deadline).toISOString() : null,
  });

  if (error && !error.message.toLowerCase().includes("duplicate")) {
    return { error: error.message };
  }

  revalidatePath(`/teacher/classes/${groupId}`);
  revalidatePath("/teacher/dashboard");
  revalidatePath("/student/classes");
  revalidatePath("/student/dashboard");

  return { error: null };
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

  if (userId === access.user.id) {
    return { error: "Teacher owner cannot be removed from the class." };
  }

  const ownsGroup = await verifyTeacherOwnsGroup(groupId, access.user.id);
  if (!ownsGroup) {
    return { error: "You can only manage students in your own classes." };
  }

  const supabase = await createClient();
  const membersTable = supabase.from("class_group_members") as never as GroupMembersTable;
  const { error } = await membersTable.delete().eq("group_id", groupId).eq("user_id", userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/teacher/classes/${groupId}`);
  revalidatePath("/teacher/dashboard");
  revalidatePath("/student/classes");
  revalidatePath("/student/challenges");

  return { error: null };
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

  const challenge = await getClassChallengeById(input.challengeId);
  if (!challenge) {
    return { error: "Challenge not found." };
  }

  const supabase = await createClient();
  const attemptsTable =
    supabase.from("class_challenge_attempts") as never as ChallengeAttemptsTable;

  const { error } = await attemptsTable.insert({
    challenge_id: input.challengeId,
    user_id: access.user.id,
    set_id: challenge.set_id,
    completion_time: Math.max(0, Math.round(input.completionTime)),
    accuracy: Number(input.accuracy.toFixed(2)),
    total_correct: input.totalCorrect,
    total_incorrect: input.totalIncorrect,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/classes/challenges/${input.challengeId}/ranking`);
  revalidatePath("/student/challenges");

  return { error: null };
}
