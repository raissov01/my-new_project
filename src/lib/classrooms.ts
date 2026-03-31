import { getStudentDashboardSummaryFromGo, getTeacherDashboardSummaryFromGo } from "@/lib/backend/classrooms";
import { isGoBackendBridgeConfigured } from "@/lib/backend/env";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import type {
  ClassChallenge,
  ClassChallengeAttempt,
  ClassGroup,
  ClassSetAssignment,
  Database,
  Profile,
} from "@/types/database";
import type {
  StudentDashboardSummary,
  TeacherDashboardSummary,
} from "@/lib/classrooms-types";

type ProfileSummary = Pick<Profile, "id" | "username" | "avatar_url" | "role">;
type GroupMembershipRow = Database["public"]["Tables"]["class_group_members"]["Row"];
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function getProfilesByIds(userIds: string[], supabase?: SupabaseClient) {
  const client = supabase ?? (await createClient());
  if (userIds.length === 0) {
    return new Map<string, ProfileSummary>();
  }

  const { data } = await client
    .from("profiles")
    .select("id, username, avatar_url, role")
    .in("id", userIds);

  return new Map(
    (((data as ProfileSummary[] | null) ?? [])).map((profile) => [profile.id, profile])
  );
}

async function getSetsByIds(setIds: string[], supabase?: SupabaseClient) {
  const client = supabase ?? (await createClient());
  if (setIds.length === 0) {
    return new Map<
      string,
      Pick<Database["public"]["Tables"]["flashcard_sets"]["Row"], "id" | "title" | "description">
    >();
  }

  const { data } = await client
    .from("flashcard_sets")
    .select("id, title, description")
    .in("id", setIds);

  return new Map(
    (((data as {
      id: string;
      title: string;
      description: string | null;
    }[] | null) ?? [])).map((set) => [set.id, set])
  );
}

async function getGroupMembershipsForUser(userId: string, supabase?: SupabaseClient) {
  const client = supabase ?? (await createClient());
  const { data } = await client
    .from("class_group_members")
    .select("*")
    .eq("user_id", userId);

  return (data as GroupMembershipRow[] | null) ?? [];
}

async function getTeacherDashboardSummaryFromSupabase(
  preloadedUserId?: string
): Promise<TeacherDashboardSummary | null> {
  const userId = preloadedUserId ?? (await getCurrentUser())?.id;

  if (!userId) {
    return null;
  }

  const supabase = await createClient();

  const { data: groupsData } = await supabase
    .from("class_groups")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  if (!groupsData) {
    console.error(
      "[getTeacherDashboardSummary] Failed to load class_groups. Make sure classroom migrations 011/012/015 are applied in Supabase."
    );
  }
  const groups = (groupsData as ClassGroup[] | null) ?? [];
  const groupIds = groups.map((group) => group.id);

  const [membersResult, assignmentsResult, challengesResult] =
    groupIds.length > 0
      ? await Promise.all([
          supabase.from("class_group_members").select("*").in("group_id", groupIds),
          supabase.from("class_set_assignments").select("*").in("group_id", groupIds),
          supabase.from("class_challenges").select("*").in("group_id", groupIds),
        ])
      : [
          { data: [] as const },
          { data: [] as const },
          { data: [] as const },
        ];
  const members = (membersResult.data as GroupMembershipRow[] | null) ?? [];
  const assignments = (assignmentsResult.data as ClassSetAssignment[] | null) ?? [];
  const challenges = (challengesResult.data as ClassChallenge[] | null) ?? [];

  const challengeIds = challenges.map((challenge) => challenge.id);
  const { data: attemptsData } =
    challengeIds.length > 0
      ? await supabase
          .from("class_challenge_attempts")
          .select("*")
          .in("challenge_id", challengeIds)
          .order("completed_at", { ascending: false })
      : { data: [] as const };
  const attempts = (attemptsData as ClassChallengeAttempt[] | null) ?? [];

  const memberIds = Array.from(
    new Set(members.filter((member) => member.role === "student").map((member) => member.user_id))
  );
  const profiles = await getProfilesByIds(memberIds, supabase);

  const memberCountByGroup = new Map<string, number>();
  for (const member of members) {
    if (member.role === "student") {
      memberCountByGroup.set(member.group_id, (memberCountByGroup.get(member.group_id) ?? 0) + 1);
    }
  }

  const assignmentCountByGroup = new Map<string, number>();
  for (const assignment of assignments) {
    assignmentCountByGroup.set(
      assignment.group_id,
      (assignmentCountByGroup.get(assignment.group_id) ?? 0) + 1
    );
  }

  const challengeCountByGroup = new Map<string, number>();
  for (const challenge of challenges) {
    challengeCountByGroup.set(
      challenge.group_id,
      (challengeCountByGroup.get(challenge.group_id) ?? 0) + 1
    );
  }

  const bestAttemptByUser = new Map<string, ClassChallengeAttempt>();
  for (const attempt of attempts) {
    const current = bestAttemptByUser.get(attempt.user_id);
    if (!current) {
      bestAttemptByUser.set(attempt.user_id, attempt);
      continue;
    }

    if (
      attempt.accuracy > current.accuracy ||
      (attempt.accuracy === current.accuracy &&
        attempt.completion_time < current.completion_time) ||
      (attempt.accuracy === current.accuracy &&
        attempt.completion_time === current.completion_time &&
        attempt.total_incorrect < current.total_incorrect)
    ) {
      bestAttemptByUser.set(attempt.user_id, attempt);
    }
  }

  const challengeCountByUser = new Map<string, number>();
  for (const attempt of attempts) {
    challengeCountByUser.set(attempt.user_id, (challengeCountByUser.get(attempt.user_id) ?? 0) + 1);
  }

  const topStudents = Array.from(bestAttemptByUser.entries())
    .map(([userId, attempt]) => {
      const profile = profiles.get(userId);
      return {
        userId,
        username: profile?.username ?? "Student",
        avatarUrl: profile?.avatar_url ?? null,
        accuracy: Number(attempt.accuracy),
        completionTime: attempt.completion_time,
        mistakes: attempt.total_incorrect,
        attempts: challengeCountByUser.get(userId) ?? 1,
      };
    })
    .sort((a, b) => {
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      if (a.completionTime !== b.completionTime) return a.completionTime - b.completionTime;
      return a.mistakes - b.mistakes;
    })
    .slice(0, 5);

  return {
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      joinCode: group.join_code,
      createdAt: group.created_at,
      membersCount: memberCountByGroup.get(group.id) ?? 0,
      assignmentsCount: assignmentCountByGroup.get(group.id) ?? 0,
      challengesCount: challengeCountByGroup.get(group.id) ?? 0,
    })),
    totalStudents: memberIds.length,
    totalAssignments: assignments.length,
    totalChallenges: challenges.length,
    topStudents,
  };
}

async function getStudentDashboardSummaryFromSupabase(
  preloadedUserId?: string
): Promise<StudentDashboardSummary | null> {
  const userId = preloadedUserId ?? (await getCurrentUser())?.id;

  if (!userId) {
    return null;
  }

  const supabase = await createClient();
  const memberships = await getGroupMembershipsForUser(userId, supabase);
  const groupIds = memberships.map((membership) => membership.group_id);

  const [groupsResult, assignmentsResult, challengesResult] =
    groupIds.length > 0
      ? await Promise.all([
          supabase.from("class_groups").select("*").in("id", groupIds),
          supabase
            .from("class_set_assignments")
            .select("*")
            .in("group_id", groupIds)
            .order("created_at", { ascending: false }),
          supabase
            .from("class_challenges")
            .select("*")
            .in("group_id", groupIds)
            .order("created_at", { ascending: false }),
        ])
      : [
          { data: [] as const },
          { data: [] as const },
          { data: [] as const },
        ];
  if (!groupsResult.data && groupIds.length > 0) {
    console.error(
      "[getStudentDashboardSummary] Failed to load class_groups. Make sure classroom migrations 011/012/015 are applied in Supabase."
    );
  }
  const groups = (groupsResult.data as ClassGroup[] | null) ?? [];
  const assignments = (assignmentsResult.data as ClassSetAssignment[] | null) ?? [];
  const challenges = (challengesResult.data as ClassChallenge[] | null) ?? [];

  const setMap = await getSetsByIds(
    Array.from(new Set(assignments.map((assignment) => assignment.set_id))),
    supabase
  );
  const groupMap = new Map(groups.map((group) => [group.id, group]));

  const { data: participantsData } =
    challenges.length > 0
      ? await supabase
          .from("class_challenge_participants")
          .select("challenge_id, user_id")
          .in("challenge_id", challenges.map((challenge) => challenge.id))
      : { data: [] as const };
  const participantRows =
    (participantsData as { challenge_id: string; user_id: string }[] | null) ?? [];
  const joinedIds = new Set(
    participantRows.filter((row) => row.user_id === userId).map((row) => row.challenge_id)
  );

  return {
    classes: groups.map((group) => ({
      id: group.id,
      name: group.name,
      joinedAt:
        memberships.find((membership) => membership.group_id === group.id)?.joined_at ??
        group.created_at,
    })),
    assignments: assignments.map((assignment) => ({
      id: assignment.id,
      groupId: assignment.group_id,
      groupName: groupMap.get(assignment.group_id)?.name ?? "Class",
      setId: assignment.set_id,
      setTitle: setMap.get(assignment.set_id)?.title ?? "Assigned set",
      deadline: assignment.deadline,
    })),
    challenges: challenges.map((challenge) => ({
      id: challenge.id,
      title: challenge.title,
      groupId: challenge.group_id,
      groupName: groupMap.get(challenge.group_id)?.name ?? "Class",
      deadline: challenge.deadline,
      joined: joinedIds.has(challenge.id),
    })),
  };
}

export async function getTeacherDashboardSummary(
  preloadedUserId?: string
): Promise<TeacherDashboardSummary | null> {
  const userId = preloadedUserId ?? (await getCurrentUser())?.id;

  if (!userId) {
    return null;
  }

  if (isGoBackendBridgeConfigured()) {
    try {
      return await getTeacherDashboardSummaryFromGo(userId);
    } catch (error) {
      console.warn("[getTeacherDashboardSummary] Falling back to Supabase:", error);
    }
  }

  return getTeacherDashboardSummaryFromSupabase(userId);
}

export async function getStudentDashboardSummary(
  preloadedUserId?: string
): Promise<StudentDashboardSummary | null> {
  const userId = preloadedUserId ?? (await getCurrentUser())?.id;

  if (!userId) {
    return null;
  }

  if (isGoBackendBridgeConfigured()) {
    try {
      return await getStudentDashboardSummaryFromGo(userId);
    } catch (error) {
      console.warn("[getStudentDashboardSummary] Falling back to Supabase:", error);
    }
  }

  return getStudentDashboardSummaryFromSupabase(userId);
}

export async function getTeacherClassroomDetail(groupId: string) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const { data: groupData } = await supabase
    .from("class_groups")
    .select("*")
    .eq("id", groupId)
    .eq("owner_id", user.id)
    .maybeSingle();
  const group = (groupData as ClassGroup | null) ?? null;

  if (!group) {
    return null;
  }

  const { data: membersData } = await supabase
    .from("class_group_members")
    .select("*")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });
  const members = (membersData as GroupMembershipRow[] | null) ?? [];
  const profileMap = await getProfilesByIds(members.map((member) => member.user_id));

  const { data: assignmentsData } = await supabase
    .from("class_set_assignments")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });
  const assignments = (assignmentsData as ClassSetAssignment[] | null) ?? [];
  const setMap = await getSetsByIds(assignments.map((assignment) => assignment.set_id));

  const { data: challengesData } = await supabase
    .from("class_challenges")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });
  const challenges = (challengesData as ClassChallenge[] | null) ?? [];

  const assignedSetIds = Array.from(new Set(assignments.map((assignment) => assignment.set_id)));
  const studentIds = members.filter((member) => member.role === "student").map((member) => member.user_id);

  const { data: flashcardsData } =
    assignedSetIds.length > 0
      ? await supabase.from("flashcards").select("id, set_id").in("set_id", assignedSetIds)
      : { data: [] as const };
  const flashcards =
    (flashcardsData as { id: string; set_id: string }[] | null) ?? [];
  const flashcardIds = flashcards.map((flashcard) => flashcard.id);
  const flashcardToSetId = new Map(flashcards.map((flashcard) => [flashcard.id, flashcard.set_id]));

  const { data: progressData } =
    flashcardIds.length > 0 && studentIds.length > 0
      ? await supabase
          .from("study_progress")
          .select("user_id, flashcard_id, times_correct, times_incorrect")
          .in("user_id", studentIds)
          .in("flashcard_id", flashcardIds)
      : { data: [] as const };
  const progressRows =
    (progressData as {
      user_id: string;
      flashcard_id: string;
      times_correct: number;
      times_incorrect: number;
    }[] | null) ?? [];

  const progressByUser = new Map<
    string,
    {
      studiedCards: Set<string>;
      touchedSets: Set<string>;
      correct: number;
      incorrect: number;
    }
  >();

  for (const row of progressRows) {
    const stats = progressByUser.get(row.user_id) ?? {
      studiedCards: new Set<string>(),
      touchedSets: new Set<string>(),
      correct: 0,
      incorrect: 0,
    };
    stats.studiedCards.add(row.flashcard_id);
    const setId = flashcardToSetId.get(row.flashcard_id);
    if (setId) {
      stats.touchedSets.add(setId);
    }
    stats.correct += row.times_correct;
    stats.incorrect += row.times_incorrect;
    progressByUser.set(row.user_id, stats);
  }

  return {
    group,
    members: members.map((member) => ({
      userId: member.user_id,
      role: member.role,
      joinedAt: member.joined_at,
      username: profileMap.get(member.user_id)?.username ?? "User",
      avatarUrl: profileMap.get(member.user_id)?.avatar_url ?? null,
      profileRole: profileMap.get(member.user_id)?.role ?? "student",
    })),
    assignments: assignments.map((assignment) => ({
      id: assignment.id,
      setId: assignment.set_id,
      setTitle: setMap.get(assignment.set_id)?.title ?? "Assigned set",
      deadline: assignment.deadline,
      createdAt: assignment.created_at,
    })),
    challenges: challenges.map((challenge) => ({
      id: challenge.id,
      title: challenge.title,
      setId: challenge.set_id,
      setTitle: setMap.get(challenge.set_id)?.title ?? "Class set",
      deadline: challenge.deadline,
      createdAt: challenge.created_at,
    })),
    progress: members
      .filter((member) => member.role === "student")
      .map((member) => {
        const stats = progressByUser.get(member.user_id);
        const totalAnswers = (stats?.correct ?? 0) + (stats?.incorrect ?? 0);
        return {
          userId: member.user_id,
          username: profileMap.get(member.user_id)?.username ?? "Student",
          avatarUrl: profileMap.get(member.user_id)?.avatar_url ?? null,
          studiedCards: stats?.studiedCards.size ?? 0,
          assignedSetsStarted: stats?.touchedSets.size ?? 0,
          accuracy: totalAnswers > 0 ? Math.round(((stats?.correct ?? 0) / totalAnswers) * 100) : 0,
          mistakes: stats?.incorrect ?? 0,
        };
      })
      .sort((a, b) => b.accuracy - a.accuracy || b.studiedCards - a.studiedCards),
  };
}
